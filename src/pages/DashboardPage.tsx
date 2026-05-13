import {
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminMobileMenu } from '../components/AdminMobileMenu'
import { AppSnackbar } from '../components/AppSnackbar'
import { LoadingSkeletonBlock } from '../components/LoadingSkeleton'
import { MikiJapanLogo } from '../components/MikiJapanLogo'
import {
  isApiConfigured,
  memberApi,
  subscribeApplicationEvents,
  type AuthSession,
  type MemberApplication,
  type MemberApplicationEvent,
} from '../services/api'
import { useAppResumeRefresh } from '../hooks/useAppResumeRefresh'
import { numberFormatter } from '../utils/formatters'

type DashboardPageProps = {
  onLogout: () => void
  onOpenCustomers: () => void
  onOpenMessages: () => void
  onRefreshPendingApplicationCount: () => void
  pendingApplicationLastSyncedAt: number
  pendingApplicationCount: number
  session: AuthSession
}

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

export function DashboardPage({
  onLogout,
  onOpenCustomers,
  onOpenMessages,
  onRefreshPendingApplicationCount,
  pendingApplicationLastSyncedAt,
  pendingApplicationCount,
  session,
}: DashboardPageProps) {
  const [customers, setCustomers] = useState<MemberApplication[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(isApiConfigured)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const loadCustomers = useCallback(async () => {
    if (!isApiConfigured) {
      return
    }

    try {
      const data = await memberApi.list()
      setCustomers(data)
    } catch {
      setNotice('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
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
    if (!isApiConfigured) {
      return
    }

    let isMounted = true

    const loadInitialCustomers = async () => {
      try {
        const data = await memberApi.list()

        if (isMounted) {
          setCustomers(data)
        }
      } catch {
        if (isMounted) {
          setNotice('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
        }
      } finally {
        if (isMounted) {
          setIsLoadingCustomers(false)
        }
      }
    }

    loadInitialCustomers()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    return subscribeApplicationEvents({
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
          }
        } catch {
          setNotice('อัปเดตข้อมูลล่าสุดไม่สำเร็จ')
        }
      },
    })
  }, [])

  const stats = useMemo(() => {
    return [
      {
        label: 'สมาชิกทั้งหมด',
        value: numberFormatter.format(customers.length),
        helper: 'ผ่านการยืนยันแล้ว',
        icon: UsersRound,
        className: 'bg-[#fbf1e7] text-[#8f6847]',
        isLoading: isLoadingCustomers,
      },
      {
        label: 'รอตรวจสอบ',
        value: numberFormatter.format(pendingApplicationCount),
        helper: 'ใบสมัครใหม่',
        icon: Mail,
        className: 'bg-[#f4e7d9] text-[#6f5238]',
        isLoading: false,
      },
    ]
  }, [customers, isLoadingCustomers, pendingApplicationCount])

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#fbf6f0] text-slate-900">
      <AppSnackbar message={notice} onClose={() => setNotice('')} />

      <AdminMobileMenu
        activePage="dashboard"
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenCustomers={onOpenCustomers}
        onOpenDashboard={() => setIsMobileMenuOpen(false)}
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
          <button className="flex h-11 w-full items-center gap-3 rounded-2xl bg-[#f7eadc]/18 px-3 text-left text-sm font-medium text-white">
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
                  ภาพรวมลูกค้า
                </p>
                <h1 className="break-words text-xl font-semibold text-slate-950 sm:text-2xl">
                  แดชบอร์ดจัดการลูกค้า
                </h1>
              </div>
            </div>

          </div>
        </header>

        <main className="max-w-full overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5 xl:px-8">
          <section className="grid grid-cols-2 gap-2 sm:gap-4">
            {stats.map((item) => {
              const Icon = item.icon

              return (
                <article
                  className="min-w-0 rounded-2xl border border-[#ead8c7] bg-white px-3 py-2.5 shadow-sm sm:p-4 lg:p-5"
                  key={item.label}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium leading-snug text-slate-500 sm:text-xs lg:text-sm">
                        {item.label}
                      </p>
                      {item.isLoading ? (
                        <LoadingSkeletonBlock className="mt-2 h-7 w-16 rounded-xl" />
                      ) : (
                        <p className="mt-1 text-xl font-semibold leading-7 text-slate-950 sm:mt-2 sm:text-2xl">
                          {item.value}
                        </p>
                      )}
                    </div>
                    <div
                      className={`hidden size-11 shrink-0 place-items-center rounded-2xl md:grid ${item.className}`}
                    >
                      <Icon size={22} />
                    </div>
                  </div>
                  <p className="mt-3 hidden text-sm text-slate-500 lg:block">
                    {item.helper}
                  </p>
                </article>
              )
            })}
          </section>

          <section className="mt-4 rounded-2xl border border-[#ead8c7] bg-white p-4 shadow-sm sm:mt-5 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  ภาพรวมการจัดการ
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isLoadingCustomers ? (
                    <LoadingSkeletonBlock className="h-5 w-full max-w-[22rem] rounded-xl" />
                  ) : (
                    `มีสมาชิก ${numberFormatter.format(customers.length)} คน และใบสมัครรอตรวจสอบ ${numberFormatter.format(pendingApplicationCount)} รายการ`
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#dbc6b2] bg-white px-4 text-sm font-semibold text-[#6f5238] transition hover:bg-[#fff8f1]"
                  onClick={onOpenCustomers}
                  type="button"
                >
                  <UsersRound size={18} />
                  ไปหน้าข้อมูลลูกค้า
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#9a7655] px-4 text-sm font-semibold text-white transition hover:bg-[#8f6847]"
                  onClick={onOpenMessages}
                  type="button"
                >
                  <Mail size={18} />
                  ตรวจข้อมูลการสมัคร
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
