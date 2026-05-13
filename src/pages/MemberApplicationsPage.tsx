import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  IdCard,
  LayoutDashboard,
  Link2,
  LogOut,
  Mail,
  Menu,
  Phone,
  Search,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminMobileMenu } from '../components/AdminMobileMenu'
import { AppSnackbar } from '../components/AppSnackbar'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { LoadingSkeletonBlock } from '../components/LoadingSkeleton'
import { MikiJapanLogo } from '../components/MikiJapanLogo'
import {
  applicationApi,
  isApiConfigured,
  subscribeApplicationEvents,
  type ApplicationStatus,
  type AuthSession,
  type MemberApplicationEvent,
  type MemberApplication,
  type RealtimeStatus,
} from '../services/api'
import { useAppResumeRefresh } from '../hooks/useAppResumeRefresh'

type MemberApplicationsPageProps = {
  onBackToDashboard: () => void
  onLogout: () => void
  onOpenCustomers: () => void
  onRefreshPendingApplicationCount: () => void
  pendingApplicationLastSyncedAt: number
  pendingApplicationCount: number
  session: AuthSession
}

type PendingStatusChange = {
  application: MemberApplication
  status: ApplicationStatus
}

const statusMeta: Record<
  ApplicationStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  pending: {
    label: 'รอตรวจสอบ',
    className: 'border-[#e6d0b8] bg-[#fff8f1] text-[#9a7655]',
    icon: Clock3,
  },
  approved: {
    label: 'ยืนยันแล้ว',
    className: 'border-[#d8c1a8] bg-[#fbf1e7] text-[#8f6847]',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'ปฏิเสธแล้ว',
    className: 'border-[#d8b8a7] bg-[#f8eee8] text-[#9a5f45]',
    icon: XCircle,
  },
}

const getApplicationFullName = (application: MemberApplication) =>
  `${application.firstName} ${application.lastName}`.trim()

const getStorefrontImageUrl = (application: MemberApplication) =>
  application.storefrontImageUrl || application.storefrontImage || ''

const applicationSkeletonRows = ['application-1', 'application-2', 'application-3']
const applicationDetailSkeletonFields = [
  'field-1',
  'field-2',
  'field-3',
  'field-4',
  'field-5',
  'field-6',
]

const rejectionReasonOptions = [
  'รูปหน้าร้านไม่ชัดเจนหรือไม่ตรงกับร้าน',
  'ข้อมูลชื่อ เบอร์โทร หรือเลขบัตรประชาชนไม่ถูกต้อง',
  'ลิงก์ร้านหรือเพจเปิดไม่ได้',
  'ข้อมูลร้านไม่ครบถ้วนตามเกณฑ์ที่ร้านกำหนด',
  'พบข้อมูลสมัครซ้ำหรือข้อมูลไม่ตรงกับที่เคยแจ้งไว้',
]

const upsertApplication = (
  applications: MemberApplication[],
  nextApplication: MemberApplication,
) => {
  const existingIndex = applications.findIndex(
    (application) => application.id === nextApplication.id,
  )

  if (existingIndex === -1) {
    return [nextApplication, ...applications]
  }

  return applications.map((application) =>
    application.id === nextApplication.id ? nextApplication : application,
  )
}

export function MemberApplicationsPage({
  onBackToDashboard,
  onLogout,
  onOpenCustomers,
  onRefreshPendingApplicationCount,
  pendingApplicationLastSyncedAt,
  pendingApplicationCount,
  session,
}: MemberApplicationsPageProps) {
  const [customerApplications, setCustomerApplications] =
    useState<MemberApplication[]>([])
  const [query, setQuery] = useState('')
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [selectedApplicationId, setSelectedApplicationId] = useState('')
  const [expandedApplicationId, setExpandedApplicationId] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedRejectionReasons, setSelectedRejectionReasons] = useState<
    string[]
  >([])
  const [pendingStatusChange, setPendingStatusChange] =
    useState<PendingStatusChange | null>(null)
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>('connecting')

  const loadApplications = useCallback(async () => {
    try {
      const data = isApiConfigured ? await applicationApi.list() : []
      const pendingApplications = data.filter(
        (application) => application.status === 'pending',
      )
      setCustomerApplications(data)
      setSelectedApplicationId((current) =>
        pendingApplications.some((application) => application.id === current)
          ? current
          : pendingApplications[0]?.id || '',
      )
    } catch {
      setNotice('โหลดข้อมูลการสมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsLoadingApplications(false)
    }
  }, [])

  useAppResumeRefresh({
    onRefresh: () => {
      void loadApplications()
    },
  })

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadApplications()
    }, 0)

    return () => window.clearTimeout(initialLoadTimer)
  }, [loadApplications])

  useEffect(() => {
    return subscribeApplicationEvents({
      onStatus: setRealtimeStatus,
      onEvent: (event: MemberApplicationEvent) => {
        try {
          if (event.type === 'member_application.created') {
            setCustomerApplications((current) =>
              upsertApplication(current, event.data),
            )
            setSelectedApplicationId((current) => current || event.data.id)
            return
          }

          if (event.type === 'member_application.updated') {
            setCustomerApplications((current) =>
              upsertApplication(current, event.data),
            )
            if (event.data.status !== 'pending') {
              setSelectedApplicationId((current) =>
                current === event.data.id ? '' : current,
              )
              setExpandedApplicationId((current) =>
                current === event.data.id ? '' : current,
              )
            }
            return
          }

          if (event.type === 'member_application.deleted') {
            setCustomerApplications((current) =>
              current.filter((application) => application.id !== event.data.id),
            )
            setSelectedApplicationId((current) =>
              current === event.data.id ? '' : current,
            )
            setExpandedApplicationId((current) =>
              current === event.data.id ? '' : current,
            )
          }
        } catch {
          setNotice('อัปเดตข้อมูลล่าสุดไม่สำเร็จ')
        }
      },
    })
  }, [])

  useEffect(() => {
    const fallbackTimer = window.setInterval(() => {
      loadApplications()
    }, realtimeStatus === 'connected' ? 30000 : 10000)

    return () => window.clearInterval(fallbackTimer)
  }, [loadApplications, realtimeStatus])

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const pendingApplications = customerApplications.filter(
      (application) => application.status === 'pending',
    )

    if (!normalizedQuery) {
      return pendingApplications
    }

    return pendingApplications.filter((application) =>
      [
        application.firstName,
        application.lastName,
        application.nickname,
        application.phone,
        application.citizenId,
        application.shopPageUrl,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [customerApplications, query])

  const selectedApplication =
    filteredApplications.find(
      (application) => application.id === selectedApplicationId,
    ) ||
    filteredApplications[0] ||
    null

  const openApplicationDetail = (applicationId: string) => {
    setSelectedApplicationId(applicationId)
    setExpandedApplicationId((current) =>
      current === applicationId ? '' : applicationId,
    )
  }

  const updateApplicationStatus = async (
    application: MemberApplication,
    status: ApplicationStatus,
    rejectionReasons: string[] = [],
  ) => {
    setNotice('')
    setPendingStatusChange(null)
    setSelectedRejectionReasons([])

    try {
      const updatedApplication = isApiConfigured
        ? await applicationApi.updateStatus(
            application.id,
            status,
            status === 'rejected' ? rejectionReasons : undefined,
          )
        : { ...application, status }

      const remainingPendingApplications = customerApplications.filter(
        (application) =>
          application.id !== updatedApplication.id &&
          application.status === 'pending',
      )
      setCustomerApplications((current) =>
        status === 'approved'
          ? current.map((application) =>
              application.id === updatedApplication.id
                ? updatedApplication
                : application,
            )
          : current.filter(
              (application) => application.id !== updatedApplication.id,
            ),
      )
      setSelectedApplicationId(remainingPendingApplications[0]?.id || '')
      setExpandedApplicationId('')
      setNotice(
        status === 'approved'
          ? 'ยืนยันการสมัครแล้ว ข้อมูลลูกค้าถูกย้ายไปหน้าข้อมูลลูกค้าแล้ว'
          : 'ปฏิเสธการสมัครแล้ว ลบข้อมูลการสมัครเรียบร้อยแล้ว',
      )
    } catch {
      setNotice('อัปเดตสถานะการสมัครไม่สำเร็จ')
    }
  }

  const pendingStatusCustomerName = pendingStatusChange
    ? getApplicationFullName(pendingStatusChange.application)
    : ''
  const isApprovingApplication = pendingStatusChange?.status === 'approved'
  const isRejectingApplication = pendingStatusChange?.status === 'rejected'
  const isRejectConfirmDisabled =
    isRejectingApplication && selectedRejectionReasons.length === 0

  const toggleRejectionReason = (reason: string) => {
    setSelectedRejectionReasons((current) =>
      current.includes(reason)
        ? current.filter((selectedReason) => selectedReason !== reason)
        : [...current, reason],
    )
  }

  const closeStatusDialog = () => {
    setPendingStatusChange(null)
    setSelectedRejectionReasons([])
  }

  const renderApplicationDetail = (
    application: MemberApplication,
    variant: 'inline' | 'panel',
  ) => (
    <>
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <ApplicationThumb
            application={application}
            className="size-14"
            iconSize={22}
          />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-950">
              {getApplicationFullName(application)}
            </p>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {application.nickname} · {application.phone}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#9a7655] px-3 text-sm font-semibold text-white transition hover:bg-[#8f6847] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={application.status === 'approved'}
            onClick={() => {
              setSelectedRejectionReasons([])
              setPendingStatusChange({
                application,
                status: 'approved',
              })
            }}
            type="button"
          >
            <CheckCircle2 size={17} />
            <span className="hidden sm:inline">ยืนยันการสมัคร</span>
            <span className="sm:hidden">ยืนยัน</span>
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8b8a7] bg-white px-3 text-sm font-semibold text-[#9a5f45] transition hover:bg-[#f8eee8] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={application.status === 'rejected'}
            onClick={() => {
              setSelectedRejectionReasons([])
              setPendingStatusChange({
                application,
                status: 'rejected',
              })
            }}
            type="button"
          >
            <XCircle size={17} />
            <span className="hidden sm:inline">ปฏิเสธการสมัคร</span>
            <span className="sm:hidden">ปฏิเสธ</span>
          </button>
        </div>
      </div>

      <div
        className={`grid gap-4 ${
          variant === 'inline'
            ? 'md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]'
            : 'xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]'
        }`}
      >
        <StorefrontPreview application={application} />

        <div
          className={`grid gap-2 ${
            variant === 'inline'
              ? 'sm:grid-cols-2 md:grid-cols-1'
              : 'sm:grid-cols-2 xl:grid-cols-1'
          }`}
        >
          <InfoItem icon={UserRound} label="ชื่อ" value={application.firstName} />
          <InfoItem
            icon={UserRound}
            label="นามสกุล"
            value={application.lastName}
          />
          <InfoItem
            icon={UserRound}
            label="ชื่อเล่น"
            value={application.nickname}
          />
          <InfoItem icon={Phone} label="เบอร์โทร" value={application.phone} />
          <InfoItem
            icon={IdCard}
            label="เลขบัตรประชาชน"
            value={application.citizenId}
          />
          <LinkItem icon={Link2} label="ลิงก์ร้าน" value={application.shopPageUrl} />
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#fbf6f0] text-slate-900">
      <AppSnackbar message={notice} onClose={() => setNotice('')} />

      <ConfirmationDialog
        confirmLabel={
          isApprovingApplication ? 'ยืนยันการสมัคร' : 'ปฏิเสธการสมัคร'
        }
        confirmDisabled={isRejectConfirmDisabled}
        description={
          isApprovingApplication
            ? `ระบบจะยืนยันข้อมูลของ ${pendingStatusCustomerName} ย้ายไปหน้าข้อมูลลูกค้า และส่งข้อความแจ้งลูกค้า`
            : `เลือกเหตุผลที่ข้อมูลของ ${pendingStatusCustomerName} ไม่ผ่านเกณฑ์ ระบบจะลบข้อมูลการสมัครและส่งข้อความแจ้งลูกค้า`
        }
        isOpen={Boolean(pendingStatusChange)}
        onCancel={closeStatusDialog}
        onConfirm={() => {
          if (!pendingStatusChange) {
            return
          }

          if (
            pendingStatusChange.status === 'rejected' &&
            selectedRejectionReasons.length === 0
          ) {
            setNotice('กรุณาเลือกเหตุผลที่ไม่ผ่านเกณฑ์อย่างน้อย 1 ข้อ')
            return
          }

          void updateApplicationStatus(
            pendingStatusChange.application,
            pendingStatusChange.status,
            selectedRejectionReasons,
          )
        }}
        title={
          isApprovingApplication
            ? 'ยืนยันการสมัครนี้หรือไม่?'
            : 'ปฏิเสธการสมัครนี้หรือไม่?'
        }
        variant={isApprovingApplication ? 'primary' : 'danger'}
      >
        {isRejectingApplication ? (
          <div>
            <p className="text-sm font-semibold text-slate-800">
              เหตุผลที่ไม่ผ่านเกณฑ์
            </p>
            <div className="mt-2 space-y-2">
              {rejectionReasonOptions.map((reason) => (
                <label
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#ead8c7] bg-[#fff8f1] px-3 py-2.5 text-sm leading-6 text-slate-700 transition hover:border-[#d8b8a7]"
                  key={reason}
                >
                  <input
                    checked={selectedRejectionReasons.includes(reason)}
                    className="mt-1 size-4 accent-[#9a5f45]"
                    onChange={() => toggleRejectionReason(reason)}
                    type="checkbox"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
            {isRejectConfirmDisabled ? (
              <p className="mt-2 text-xs font-medium leading-5 text-[#9a5f45]">
                ต้องเลือกเหตุผลอย่างน้อย 1 ข้อก่อนยืนยันการปฏิเสธ
              </p>
            ) : null}
          </div>
        ) : null}
      </ConfirmationDialog>

      <AdminMobileMenu
        activePage="messages"
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenCustomers={onOpenCustomers}
        onOpenDashboard={onBackToDashboard}
        onOpenMessages={() => setIsMobileMenuOpen(false)}
        onRefreshPendingApplicationCount={onRefreshPendingApplicationCount}
        pendingApplicationLastSyncedAt={pendingApplicationLastSyncedAt}
        pendingApplicationCount={pendingApplicationCount}
        session={session}
      />

      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col bg-[#6f5238] px-5 py-6 text-white xl:flex">
        <div className="mb-9 flex items-center gap-3">
          <MikiJapanLogo className="size-11 shrink-0" />
          <div>
            <p className="text-lg font-semibold">Miki Japan</p>
          </div>
        </div>

        <nav className="space-y-2">
          <button
            className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium text-[#f5dfc8] transition hover:bg-white/10 hover:text-white"
            onClick={onBackToDashboard}
            type="button"
          >
            <LayoutDashboard size={18} />
            แดชบอร์ด
          </button>
          <button
            className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium text-[#f5dfc8] transition hover:bg-white/10 hover:text-white"
            onClick={onOpenCustomers}
            type="button"
          >
            <UsersRound size={18} />
            ข้อมูลลูกค้า
          </button>
          <button
            className="flex h-11 w-full items-center gap-3 rounded-2xl bg-[#f7eadc]/18 px-3 text-left text-sm font-medium text-white"
            type="button"
          >
            <Mail size={18} />
            <span className="min-w-0 flex-1">ข้อมูลการสมัคร</span>
            {pendingApplicationCount > 0 ? (
              <span className="grid min-w-6 place-items-center rounded-full bg-white px-2 py-0.5 text-xs font-bold leading-5 text-[#6f5238]">
                {pendingApplicationCount}
              </span>
            ) : null}
          </button>
        </nav>

        <div className="mt-auto rounded-2xl border border-[#ead8c7]/25 bg-white/10 p-4">
          <p className="text-sm font-medium text-white">{session.user.name}</p>
          <p className="mt-1 break-all text-xs text-[#f5dfc8]">
            {session.user.email}
          </p>
          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#ead8c7]/25 bg-white/10 text-sm font-semibold text-white transition hover:bg-white/15"
            onClick={onLogout}
            type="button"
          >
            <LogOut size={17} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="max-w-full overflow-x-hidden xl:pl-72">
        <header className="sticky top-0 z-20 max-w-full border-b border-[#ead8c7] bg-white/95 px-4 py-4 backdrop-blur sm:px-6 xl:px-8">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-expanded={isMobileMenuOpen}
                aria-label="เปิดเมนูหมวด"
                className="grid size-10 place-items-center rounded-2xl border border-[#ead8c7] bg-white text-slate-700 xl:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
                title="Menu"
                type="button"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#8f6847]">
                  ข้อมูลการสมัคร
                </p>
                <h1 className="break-words text-xl font-semibold text-slate-950 sm:text-2xl">
                  ข้อมูลการสมัครของลูกค้า
                </h1>
              </div>
            </div>

          </div>
        </header>

        <main className="max-w-full overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5 xl:px-8">
          <section className="max-w-full overflow-hidden rounded-2xl border border-[#ead8c7] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#ead8c7] p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  รายการรอตรวจสอบ
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isLoadingApplications ? (
                    <LoadingSkeletonBlock className="h-5 w-32 rounded-xl" />
                  ) : (
                    `${filteredApplications.length} รายการที่ต้องจัดการ`
                  )}
                </p>
              </div>

              <label className="relative block min-w-0 xl:w-80">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  className="h-11 w-full rounded-2xl border border-[#dbc6b2] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#9a7655] focus:ring-4 focus:ring-[#f1dfcd]"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ค้นหาข้อมูลการสมัคร"
                  value={query}
                />
              </label>
            </div>

            <div className="grid lg:min-h-[34rem] lg:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
              <div className="border-b border-[#ead8c7] lg:border-b-0 lg:border-r">
                <div className="divide-y divide-[#ead8c7] lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto">
                  {isLoadingApplications ? (
                    <ApplicationListSkeleton />
                  ) : (
                    filteredApplications.map((application) => (
                      <div key={application.id}>
                        <button
                          aria-expanded={
                            expandedApplicationId === application.id
                          }
                          className={`block w-full min-w-0 px-4 py-3 text-left transition-colors duration-200 hover:bg-[#fff8f1] sm:px-5 ${
                            selectedApplication?.id === application.id
                              ? 'bg-[#fbf1e7]/80 shadow-[inset_4px_0_0_#9a7655]'
                              : ''
                          }`}
                          onClick={() => openApplicationDetail(application.id)}
                          type="button"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <ApplicationThumb application={application} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-slate-950">
                                {getApplicationFullName(application)}
                              </p>
                              <p className="mt-1 truncate text-sm text-slate-500">
                                {application.nickname} · {application.phone}
                              </p>
                            </div>
                            <ApplicationStatusBadge status={application.status} />
                          </div>
                        </button>

                        <div
                          aria-hidden={expandedApplicationId !== application.id}
                          className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
                            expandedApplicationId === application.id
                              ? 'grid-rows-[1fr] opacity-100'
                              : 'pointer-events-none grid-rows-[0fr] opacity-0'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div
                              className={`px-4 pb-5 pt-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5 ${
                                expandedApplicationId === application.id
                                  ? 'translate-y-0'
                                  : '-translate-y-2'
                              }`}
                            >
                              {renderApplicationDetail(application, 'inline')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {!isLoadingApplications && filteredApplications.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-slate-500">
                      ไม่พบข้อมูลการสมัคร
                    </div>
                  ) : null}
                </div>
              </div>

              <article className="hidden min-w-0 p-5 lg:block">
                {isLoadingApplications ? (
                  <ApplicationDetailSkeleton />
                ) : selectedApplication ? (
                  renderApplicationDetail(selectedApplication, 'panel')
                ) : (
                  <div className="grid min-h-80 place-items-center rounded-2xl border border-[#ead8c7] bg-[#fff8f1] px-5 text-center text-sm text-slate-500">
                    เลือกข้อมูลการสมัครเพื่อดูรายละเอียด
                  </div>
                )}
              </article>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

type InfoItemProps = {
  icon: typeof UserRound
  label: string
  value: string
}

function ApplicationListSkeleton() {
  return (
    <>
      {applicationSkeletonRows.map((row) => (
        <div className="px-4 py-3 sm:px-5" key={row}>
          <div className="flex min-w-0 items-center gap-3">
            <LoadingSkeletonBlock className="size-12 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <LoadingSkeletonBlock className="h-4 w-40 max-w-full rounded-xl" />
              <LoadingSkeletonBlock className="mt-2 h-4 w-32 max-w-[80%] rounded-xl" />
            </div>
            <LoadingSkeletonBlock className="h-7 w-24 shrink-0 rounded-full" />
          </div>
        </div>
      ))}
    </>
  )
}

function ApplicationDetailSkeleton() {
  return (
    <>
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <LoadingSkeletonBlock className="size-14 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <LoadingSkeletonBlock className="h-5 w-48 max-w-full rounded-xl" />
            <LoadingSkeletonBlock className="mt-2 h-4 w-36 max-w-[80%] rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <LoadingSkeletonBlock className="h-11 rounded-2xl sm:w-36" />
          <LoadingSkeletonBlock className="h-11 rounded-2xl sm:w-36" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-[#ead8c7] bg-[#fff8f1]">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <LoadingSkeletonBlock className="h-5 w-24 rounded-xl" />
            <LoadingSkeletonBlock className="h-4 w-14 rounded-xl" />
          </div>
          <LoadingSkeletonBlock className="h-40 w-full rounded-none sm:h-52 lg:h-56 xl:h-80" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {applicationDetailSkeletonFields.map((row) => (
            <div
              className="min-w-0 rounded-2xl border border-[#ead8c7] bg-[#fff8f1] px-3 py-2.5"
              key={row}
            >
              <div className="flex items-start gap-2">
                <LoadingSkeletonBlock className="mt-0.5 size-4 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <LoadingSkeletonBlock className="h-3 w-20 rounded-xl" />
                  <LoadingSkeletonBlock className="mt-2 h-5 w-36 max-w-full rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#ead8c7] bg-[#fff8f1] px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 shrink-0 text-slate-500" size={16} />
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-0.5 break-words text-sm font-semibold text-slate-950 sm:text-base">
            {value || '-'}
          </p>
        </div>
      </div>
    </div>
  )
}

function LinkItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#ead8c7] bg-[#fff8f1] px-3 py-2.5 sm:col-span-2 xl:col-span-1">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 shrink-0 text-slate-500" size={16} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <a
            className="mt-0.5 inline-flex w-full min-w-0 max-w-full items-center gap-2 text-sm font-semibold text-[#8f6847] hover:text-[#6f5238] sm:text-base"
            href={value}
            rel="noreferrer"
            target="_blank"
          >
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {value || '-'}
            </span>
            <ExternalLink className="shrink-0" size={15} />
          </a>
        </div>
      </div>
    </div>
  )
}

function ApplicationThumb({
  application,
  className = 'size-12',
  iconSize = 20,
}: {
  application: MemberApplication
  className?: string
  iconSize?: number
}) {
  const imageUrl = getStorefrontImageUrl(application)
  const [hasImageError, setHasImageError] = useState(false)

  if (!imageUrl || hasImageError) {
    return (
      <div
        className={`grid shrink-0 place-items-center rounded-2xl border border-[#ead8c7] bg-[#f3e8dd] text-slate-600 ${className}`}
      >
        <UserRound size={iconSize} />
      </div>
    )
  }

  return (
    <img
      alt={`หน้าร้านของ ${getApplicationFullName(application)}`}
      className={`shrink-0 rounded-2xl border border-[#ead8c7] object-cover ${className}`}
      onError={() => setHasImageError(true)}
      src={imageUrl}
    />
  )
}

function StorefrontPreview({
  application,
}: {
  application: MemberApplication
}) {
  const imageUrl = getStorefrontImageUrl(application)

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[#ead8c7] bg-[#fff8f1]">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <p className="text-sm font-semibold text-[#6f5238]">รูปหน้าร้าน</p>
        {imageUrl ? (
          <a
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8f6847] hover:text-[#6f5238]"
            href={imageUrl}
            rel="noreferrer"
            target="_blank"
          >
            เปิดรูป
            <ExternalLink size={13} />
          </a>
        ) : null}
      </div>

      {imageUrl ? (
        <img
          alt={`รูปหน้าร้านของ ${getApplicationFullName(application)}`}
          className="h-40 w-full object-cover sm:h-52 lg:h-56 xl:h-full xl:min-h-80"
          src={imageUrl}
        />
      ) : (
        <div className="grid h-40 place-items-center px-5 text-center text-sm text-slate-500 sm:h-52 lg:h-56 xl:h-80">
          ไม่มีรูปหน้าร้าน
        </div>
      )}
    </div>
  )
}

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = statusMeta[status]
  const Icon = meta.icon

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  )
}
