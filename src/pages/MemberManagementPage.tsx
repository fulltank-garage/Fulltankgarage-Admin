import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Search,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminMobileMenu } from '../components/AdminMobileMenu'
import { AppSnackbar } from '../components/AppSnackbar'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { LoadingSkeletonBlock } from '../components/LoadingSkeleton'
import { MikiJapanLogo } from '../components/MikiJapanLogo'
import {
  isApiConfigured,
  memberApi,
  subscribeApplicationEvents,
  type AuthSession,
  type MemberApplicationEvent,
  type MemberApplication,
  type RealtimeStatus,
} from '../services/api'
import { useAppResumeRefresh } from '../hooks/useAppResumeRefresh'

type MemberManagementPageProps = {
  onLogout: () => void
  onOpenDashboard: () => void
  onOpenMessages: () => void
  onRefreshPendingApplicationCount: () => void
  pendingApplicationLastSyncedAt: number
  pendingApplicationCount: number
  session: AuthSession
}

const getApplicationFullName = (application: MemberApplication) =>
  `${application.firstName} ${application.lastName}`.trim()

const getStorefrontImageUrl = (application: MemberApplication) =>
  application.storefrontImageUrl || application.storefrontImage || ''

const customerSkeletonRows = ['row-1', 'row-2', 'row-3']

const upsertCustomer = (
  customers: MemberApplication[],
  nextCustomer: MemberApplication,
) => {
  const existingIndex = customers.findIndex(
    (customer) => customer.id === nextCustomer.id,
  )

  if (existingIndex === -1) {
    return [nextCustomer, ...customers]
  }

  return customers.map((customer) =>
    customer.id === nextCustomer.id ? nextCustomer : customer,
  )
}

export function MemberManagementPage({
  onLogout,
  onOpenDashboard,
  onOpenMessages,
  onRefreshPendingApplicationCount,
  pendingApplicationLastSyncedAt,
  pendingApplicationCount,
  session,
}: MemberManagementPageProps) {
  const [customers, setCustomers] = useState<MemberApplication[]>([])
  const [query, setQuery] = useState('')
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [pendingDeleteCustomer, setPendingDeleteCustomer] =
    useState<MemberApplication | null>(null)
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>('connecting')

  const loadCustomers = useCallback(async () => {
    try {
      const data = isApiConfigured ? await memberApi.list() : []
      setCustomers(data)
    } catch {
      setNotice('โหลดข้อมูลลูกค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsLoadingCustomers(false)
    }
  }, [])

  useAppResumeRefresh({
    onRefresh: () => {
      void loadCustomers()
    },
  })

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadCustomers()
    }, 0)

    return () => window.clearTimeout(initialLoadTimer)
  }, [loadCustomers])

  useEffect(() => {
    return subscribeApplicationEvents({
      onStatus: setRealtimeStatus,
      onEvent: (event: MemberApplicationEvent) => {
        try {
          if (
            event.type === 'member_application.updated' &&
            event.data.status === 'approved'
          ) {
            setCustomers((current) => upsertCustomer(current, event.data))
            return
          }

          if (event.type === 'member_application.deleted') {
            setCustomers((current) =>
              current.filter((customer) => customer.id !== event.data.id),
            )
            return
          }

          if (event.data.status !== 'approved') {
            setCustomers((current) =>
              current.filter((customer) => customer.id !== event.data.id),
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
      loadCustomers()
    }, realtimeStatus === 'connected' ? 30000 : 10000)

    return () => window.clearInterval(fallbackTimer)
  }, [loadCustomers, realtimeStatus])

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return customers
    }

    return customers.filter((customer) =>
      [
        customer.firstName,
        customer.lastName,
        customer.nickname,
        customer.phone,
        customer.citizenId,
        customer.shopPageUrl,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [customers, query])

  const deleteCustomer = async (customer: MemberApplication) => {
    setNotice('')
    setPendingDeleteCustomer(null)

    try {
      if (isApiConfigured) {
        await memberApi.remove(customer.id)
      }

      setCustomers((current) =>
        current.filter((item) => item.id !== customer.id),
      )
      setNotice('ลบข้อมูลลูกค้าแล้ว ลูกค้าสามารถสมัครใหม่ได้')
    } catch {
      setNotice('ลบข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    }
  }

  const pendingDeleteCustomerName = pendingDeleteCustomer
    ? getApplicationFullName(pendingDeleteCustomer)
    : ''

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#fbf6f0] text-slate-900">
      <AppSnackbar message={notice} onClose={() => setNotice('')} />

      <ConfirmationDialog
        confirmLabel="ลบข้อมูลลูกค้า"
        description={`ระบบจะลบข้อมูลของ ${pendingDeleteCustomerName} และให้ลูกค้าสามารถสมัครใหม่ได้อีกครั้ง`}
        isOpen={Boolean(pendingDeleteCustomer)}
        onCancel={() => setPendingDeleteCustomer(null)}
        onConfirm={() => {
          if (!pendingDeleteCustomer) {
            return
          }

          void deleteCustomer(pendingDeleteCustomer)
        }}
        title="ลบข้อมูลลูกค้านี้หรือไม่?"
        variant="danger"
      />

      <AdminMobileMenu
        activePage="customers"
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenCustomers={() => setIsMobileMenuOpen(false)}
        onOpenDashboard={onOpenDashboard}
        onOpenMessages={onOpenMessages}
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
            onClick={onOpenDashboard}
            type="button"
          >
            <LayoutDashboard size={18} />
            แดชบอร์ด
          </button>
          <button className="flex h-11 w-full items-center gap-3 rounded-2xl bg-[#f7eadc]/18 px-3 text-left text-sm font-medium text-white">
            <UsersRound size={18} />
            ข้อมูลลูกค้า
          </button>
          <button
            className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium text-[#f5dfc8] transition hover:bg-white/10 hover:text-white"
            onClick={onOpenMessages}
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
                title="เมนู"
                type="button"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#8f6847]">
                  ลูกค้าที่ผ่านการยืนยัน
                </p>
                <h1 className="break-words text-xl font-semibold text-slate-950 sm:text-2xl">
                  จัดการข้อมูลลูกค้า
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
                  รายชื่อลูกค้า Member
                </h2>
              </div>

              <label className="relative block min-w-0 xl:w-80">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  className="h-11 w-full rounded-2xl border border-[#dbc6b2] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#9a7655] focus:ring-4 focus:ring-[#f1dfcd]"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ค้นหาชื่อ เบอร์โทร เลขบัตร"
                  value={query}
                />
              </label>
            </div>

            <CustomerTable
              customers={filteredCustomers}
              isLoading={isLoadingCustomers}
              onDeleteCustomer={setPendingDeleteCustomer}
            />
          </section>
        </main>
      </div>
    </div>
  )
}

type CustomerTableProps = {
  customers: MemberApplication[]
  isLoading: boolean
  onDeleteCustomer: (customer: MemberApplication) => void
}

function CustomerTable({
  customers,
  isLoading,
  onDeleteCustomer,
}: CustomerTableProps) {
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="bg-[#fff8f1] text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">ลูกค้า</th>
              <th className="px-5 py-3">ชื่อเล่น</th>
              <th className="px-5 py-3">เบอร์โทร</th>
              <th className="px-5 py-3">เลขบัตรประชาชน</th>
              <th className="px-5 py-3">ลิงก์ร้าน</th>
              <th className="px-5 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ead8c7]">
            {isLoading ? (
              <CustomerTableSkeletonRows />
            ) : null}

            {!isLoading && customers.length === 0 ? (
              <CustomerTableMessage
                colSpan={6}
                message="ไม่พบข้อมูลลูกค้าที่ผ่านการยืนยัน"
              />
            ) : null}

            {!isLoading &&
              customers.map((customer) => (
                <tr
                  className="align-middle transition hover:bg-[#fff8f1]"
                  key={customer.id}
                >
                  <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <StorefrontThumb customer={customer} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-950">
                          {getApplicationFullName(customer)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">สมาชิก</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {customer.nickname}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {customer.phone}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {customer.citizenId}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    <CustomerShopLink value={customer.shopPageUrl} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <DeleteCustomerButton
                      customer={customer}
                      onDeleteCustomer={onDeleteCustomer}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 lg:hidden">
        {isLoading ? (
          customerSkeletonRows.map((row) => <CustomerCardSkeleton key={row} />)
        ) : null}

        {!isLoading && customers.length === 0 ? (
          <p className="rounded-2xl border border-[#ead8c7] bg-[#fff8f1] p-6 text-center text-sm text-slate-500">
            ไม่พบข้อมูลลูกค้าที่ผ่านการยืนยัน
          </p>
        ) : null}

        {!isLoading &&
          customers.map((customer) => (
            <article
              className="min-w-0 overflow-hidden rounded-2xl border border-[#ead8c7] bg-white p-4 shadow-sm"
              key={customer.id}
            >
              <div className="flex min-w-0 items-start gap-3">
                <StorefrontThumb customer={customer} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-950">
                    {getApplicationFullName(customer)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {customer.nickname} · {customer.phone}
                  </p>
                </div>
                <DeleteCustomerButton
                  customer={customer}
                  iconOnly
                  onDeleteCustomer={onDeleteCustomer}
                />
              </div>

              <div className="mt-4 grid min-w-0 gap-2 text-sm">
                <p className="break-words text-slate-700">
                  เลขบัตรประชาชน: {customer.citizenId}
                </p>
                <CustomerShopLink value={customer.shopPageUrl} />
              </div>
            </article>
          ))}
      </div>
    </>
  )
}

function CustomerTableSkeletonRows() {
  return (
    <>
      {customerSkeletonRows.map((row) => (
        <tr className="align-middle" key={row}>
          <td className="px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <LoadingSkeletonBlock className="size-12 shrink-0 rounded-2xl" />
              <div className="min-w-0">
                <LoadingSkeletonBlock className="h-4 w-36 rounded-xl" />
                <LoadingSkeletonBlock className="mt-2 h-3 w-16 rounded-xl" />
              </div>
            </div>
          </td>
          <td className="px-5 py-4">
            <LoadingSkeletonBlock className="h-4 w-20 rounded-xl" />
          </td>
          <td className="px-5 py-4">
            <LoadingSkeletonBlock className="h-4 w-28 rounded-xl" />
          </td>
          <td className="px-5 py-4">
            <LoadingSkeletonBlock className="h-4 w-36 rounded-xl" />
          </td>
          <td className="px-5 py-4">
            <LoadingSkeletonBlock className="h-4 w-52 rounded-xl" />
          </td>
          <td className="px-5 py-4">
            <LoadingSkeletonBlock className="ml-auto h-10 w-24 rounded-2xl" />
          </td>
        </tr>
      ))}
    </>
  )
}

function CustomerCardSkeleton() {
  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-[#ead8c7] bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <LoadingSkeletonBlock className="size-12 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <LoadingSkeletonBlock className="h-5 w-40 max-w-full rounded-xl" />
          <LoadingSkeletonBlock className="mt-2 h-4 w-44 max-w-full rounded-xl" />
        </div>
        <LoadingSkeletonBlock className="size-10 shrink-0 rounded-2xl" />
      </div>

      <div className="mt-4 grid min-w-0 gap-2">
        <LoadingSkeletonBlock className="h-4 w-full rounded-xl" />
        <LoadingSkeletonBlock className="h-4 w-4/5 rounded-xl" />
      </div>
    </article>
  )
}

function CustomerTableMessage({
  colSpan,
  message,
}: {
  colSpan: number
  message: string
}) {
  return (
    <tr>
      <td
        className="px-5 py-10 text-center text-sm text-slate-500"
        colSpan={colSpan}
      >
        {message}
      </td>
    </tr>
  )
}

function StorefrontThumb({ customer }: { customer: MemberApplication }) {
  const imageUrl = getStorefrontImageUrl(customer)
  const [hasImageError, setHasImageError] = useState(false)

  if (!imageUrl || hasImageError) {
    return (
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#f3e8dd] text-slate-600">
        <UserRound size={21} />
      </div>
    )
  }

  return (
    <img
      alt={`รูปหน้าร้านของ ${getApplicationFullName(customer)}`}
      className="size-12 shrink-0 rounded-2xl border border-[#ead8c7] object-cover"
      onError={() => setHasImageError(true)}
      src={imageUrl}
    />
  )
}

function CustomerShopLink({ value }: { value: string }) {
  return (
    <a
      className="inline-flex w-full min-w-0 max-w-full items-center gap-2 font-medium text-[#8f6847] hover:text-[#6f5238]"
      href={value}
      rel="noreferrer"
      target="_blank"
    >
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap lg:max-w-56 xl:max-w-64">
        {value}
      </span>
      <ExternalLink className="shrink-0" size={14} />
    </a>
  )
}

function DeleteCustomerButton({
  customer,
  iconOnly = false,
  onDeleteCustomer,
}: {
  customer: MemberApplication
  iconOnly?: boolean
  onDeleteCustomer: (customer: MemberApplication) => void
}) {
  return (
    <button
      aria-label={`ลบข้อมูลของ ${getApplicationFullName(customer)}`}
      className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#d8b8a7] bg-white text-sm font-semibold text-[#9a5f45] transition hover:bg-[#f8eee8] ${
        iconOnly ? 'w-10 px-0' : 'px-3'
      }`}
      onClick={() => onDeleteCustomer(customer)}
      title="ลบข้อมูล"
      type="button"
    >
      <Trash2 size={17} />
      {iconOnly ? null : 'ลบข้อมูล'}
    </button>
  )
}
