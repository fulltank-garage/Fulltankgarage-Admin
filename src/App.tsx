import {
  BadgePercent,
  CalendarDays,
  Car,
  ChevronRight,
  Film as FilmIcon,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Shuffle,
  Search,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  authApi,
  clearSession,
  dashboardApi,
  filmApi,
  getStoredSession,
  promotionApi,
  storeSession,
  subscribeFulltankEvents,
  uploadApi,
  warrantyApi,
  type AuthSession,
  type FulltankRealtimeEvent,
  type Film,
  type Promotion,
  type RealtimeStatus,
  type SerialNumber,
  type WarrantyRegistration,
} from './services/fulltankApi'
import fulltankGarageLogo from './assets/fulltank-garage-logo.jpg'
import { StartupSplash } from './components/StartupSplash'

type Page = 'dashboard' | 'promotions' | 'films' | 'customers' | 'serials'
type NoticeTone = 'success' | 'error' | 'info'

const appVersionStorageKey = 'fulltank_admin_app_version'

const getLoadedAppVersion = () => {
  const assets = Array.from(
    document.querySelectorAll<HTMLLinkElement | HTMLScriptElement>(
      'script[src^="/assets/"], link[href^="/assets/"]',
    ),
  )
    .map((element) => {
      if (element instanceof HTMLScriptElement) {
        return element.src
      }

      return element.href
    })
    .filter(Boolean)
    .sort()

  return assets.join('|')
}

const detectInstalledAppUpdate = () => {
  try {
    const currentVersion = getLoadedAppVersion()
    if (!currentVersion) {
      return false
    }

    const previousVersion = window.localStorage.getItem(appVersionStorageKey)
    window.localStorage.setItem(appVersionStorageKey, currentVersion)

    return Boolean(previousVersion && previousVersion !== currentVersion)
  } catch {
    return false
  }
}

const generateSerialNumber = (existingSerials: SerialNumber[]) => {
  const existing = new Set(existingSerials.map((item) => item.serialNumber.toUpperCase()))
  const now = new Date()
  const datePart = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const randomPart = Array.from({ length: 6 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join('')
    const serialNumber = `FTG${datePart}${randomPart}`
    if (!existing.has(serialNumber)) {
      return serialNumber
    }
  }

  return `FTG${datePart}${Date.now().toString(36).toUpperCase().slice(-6)}`
}

const upsertWarrantyRegistration = (
  items: WarrantyRegistration[],
  nextItem: WarrantyRegistration,
) => [
  nextItem,
  ...items.filter(
    (item) =>
      item.id !== nextItem.id &&
      item.serialNumber.toUpperCase() !== nextItem.serialNumber.toUpperCase(),
  ),
]

const upsertSerialNumber = (items: SerialNumber[], nextItem: SerialNumber) => {
  const normalizedSerial = nextItem.serialNumber.toUpperCase()
  const existing = items.find(
    (item) => item.serialNumber.toUpperCase() === normalizedSerial,
  )
  const mergedItem = existing ? { ...existing, ...nextItem } : nextItem

  if (!mergedItem.id && !existing) {
    return items
  }

  return [
    mergedItem,
    ...items.filter(
      (item) =>
        item.id !== mergedItem.id &&
        item.serialNumber.toUpperCase() !== normalizedSerial,
    ),
  ]
}

const shouldShowRealtimeNotice = (event: FulltankRealtimeEvent) =>
  event.type === 'warranty_registration.created' ||
  event.type === 'warranty_registration.linked' ||
  (event.type === 'rich_menu.sync' && !event.data.success)

const formatLatestRealtimeAt = (value: Date | null) => {
  if (!value) {
    return 'ยังไม่มีข้อมูลอัปเดต'
  }

  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value)
}

const pages: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { id: 'promotions', label: 'จัดการโปรโมชัน', icon: BadgePercent },
  { id: 'films', label: 'จัดการฟิล์ม', icon: FilmIcon },
  { id: 'customers', label: 'จัดการข้อมูลลูกค้า', icon: UsersRound },
  { id: 'serials', label: 'จัดการ Serial Number', icon: KeyRound },
]

const emptyPromotion: Partial<Promotion> = {
  title: '',
  description: '',
  imageUrl: '',
  isActive: true,
  startsAt: '',
  endsAt: '',
}

const formatPromotionDate = (value?: string) => {
  if (!value) {
    return 'สอบถามหน้าร้าน'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'สอบถามหน้าร้าน'
  }

  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const getPromotionImageText = (title?: string) =>
  title?.trim().split(/\s+/).slice(0, 2).join(' ').toUpperCase() || 'PROMOTION'

const emptyFilm: Partial<Film> = {
  slug: '',
  name: '',
  logo: '',
  summary: '',
  description: '',
  imageUrl: '',
  isActive: true,
}

function App() {
  const [isBooting, setIsBooting] = useState(true)
  const [bootProgress, setBootProgress] = useState(12)
  const [hasAppUpdate, setHasAppUpdate] = useState(false)
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession())
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState<NoticeTone>('info')
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(
    session ? 'connecting' : 'off',
  )
  const [latestRealtimeAt, setLatestRealtimeAt] = useState<Date | null>(null)

  const showNotice = (message: string, tone: NoticeTone = 'info') => {
    setNotice(message)
    setNoticeTone(tone)
    window.setTimeout(() => setNotice(''), 3200)
  }

  useEffect(() => {
    const updateCheckTimer = window.setTimeout(() => {
      setHasAppUpdate(detectInstalledAppUpdate())
    }, 0)

    const progressTimer = window.setInterval(() => {
      setBootProgress((current) => {
        if (current >= 100) {
          return 100
        }

        return Math.min(96, current + 14)
      })
    }, 120)
    const doneTimer = window.setTimeout(() => {
      setBootProgress(100)
      window.setTimeout(() => setIsBooting(false), 220)
    }, 780)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/admin-sw.js', { scope: '/' })
        .then((registration) => registration.update())
        .catch(() => undefined)

      navigator.serviceWorker
        .getRegistration('/admin-sw.js')
        .then((registration) => registration?.update())
        .catch(() => undefined)

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setHasAppUpdate(true)
      })
    }

    return () => {
      window.clearTimeout(updateCheckTimer)
      window.clearInterval(progressTimer)
      window.clearTimeout(doneTimer)
    }
  }, [])

  useEffect(() => {
    if (!session) {
      return undefined
    }

    return subscribeFulltankEvents({
      onEvent: () => setLatestRealtimeAt(new Date()),
      onStatus: setRealtimeStatus,
    })
  }, [session])

  if (isBooting) {
    return <StartupSplash isUpdated={hasAppUpdate} progress={bootProgress} />
  }

  if (!session) {
    return (
      <LoginPage
        onLogin={(nextSession) => {
          storeSession(nextSession)
          setSession(nextSession)
        }}
      />
    )
  }

  const logout = () => {
    clearSession()
    setSession(null)
    setRealtimeStatus('off')
    setLatestRealtimeAt(null)
    setIsSidebarOpen(false)
  }

  const selectPage = (page: Page) => {
    setActivePage(page)
    setIsSidebarOpen(false)
  }

  return (
    <div className="min-h-dvh bg-[#070707] text-white">
      {isSidebarOpen ? (
        <button
          aria-label="ปิดเมนู"
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-72 max-w-[82vw] flex-col border-r border-white/10 bg-[#101010] px-5 py-6 shadow-[18px_0_60px_rgba(0,0,0,0.42)] transition-transform duration-200 md:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar
          activePage={activePage}
          latestRealtimeAt={latestRealtimeAt}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={logout}
          onSelect={selectPage}
          realtimeStatus={realtimeStatus}
          session={session}
        />
      </aside>

      <main className="min-w-0 px-4 pb-6 md:pl-[19rem] md:pr-6 lg:px-8 lg:pl-[20rem]">
        <header className="sticky top-0 z-20 -mx-4 mb-6 flex items-center justify-between gap-3 border-b border-white/10 bg-[#070707]/94 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <button
            aria-label="เปิดเมนู"
            className="grid size-11 place-items-center rounded-xl border border-white/10 bg-[#151515] text-white md:hidden"
            onClick={() => setIsSidebarOpen(true)}
            type="button"
          >
            <Menu size={20} />
          </button>
          <div className="ml-auto min-w-0 text-right">
            <p className="text-[12px] font-bold uppercase leading-none tracking-normal text-[#ff403b]">
              FullTank Admin
            </p>
            <p className="truncate text-[21px] font-bold leading-[1.12] md:text-[32px]">
              {pages.find((page) => page.id === activePage)?.label}
            </p>
          </div>
        </header>
        {notice ? <Notice message={notice} tone={noticeTone} /> : null}
        {activePage === 'dashboard' ? <DashboardPage onNotice={showNotice} /> : null}
        {activePage === 'promotions' ? <PromotionsPage onNotice={showNotice} /> : null}
        {activePage === 'films' ? <FilmsPage onNotice={showNotice} /> : null}
        {activePage === 'customers' ? <CustomersPage onNotice={showNotice} /> : null}
        {activePage === 'serials' ? <SerialNumbersPage onNotice={showNotice} /> : null}
      </main>
    </div>
  )
}

function Sidebar({
  activePage,
  latestRealtimeAt,
  onClose,
  onLogout,
  onSelect,
  realtimeStatus,
  session,
}: {
  activePage: Page
  latestRealtimeAt: Date | null
  onClose: () => void
  onLogout: () => void
  onSelect: (page: Page) => void
  realtimeStatus: RealtimeStatus
  session: AuthSession
}) {
  const statusLabel =
    realtimeStatus === 'connected'
      ? 'เชื่อมต่อข้อมูลสด'
      : realtimeStatus === 'off'
        ? 'ปิดข้อมูลสด'
        : realtimeStatus === 'connecting'
          ? 'กำลังเชื่อมต่อ'
          : 'กำลังเชื่อมต่อใหม่'
  const statusDotClass =
    realtimeStatus === 'connected'
      ? 'bg-emerald-400'
      : realtimeStatus === 'off'
        ? 'bg-white/28'
        : 'bg-[#ff403b]'

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            alt="FullTank Garage"
            className="size-14 shrink-0 rounded-lg object-cover"
            src={fulltankGarageLogo}
          />
          <h1 className="min-w-0 text-lg font-black leading-tight">Admin Home</h1>
        </div>
        <button
          aria-label="ปิดเมนู"
          className="grid size-10 place-items-center rounded-xl border border-white/10 text-white/70 md:hidden"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="mt-7 space-y-2">
        {pages.map((page) => {
          const Icon = page.icon
          const isActive = activePage === page.id

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-black transition',
                isActive
                  ? 'bg-[#ff332f] text-white shadow-[0_12px_28px_rgba(255,51,47,0.22)]'
                  : 'bg-white/[0.04] text-white/62 hover:bg-white/[0.08] hover:text-white',
              ].join(' ')}
              key={page.id}
              onClick={() => onSelect(page.id)}
              type="button"
            >
              <Icon size={18} />
              <span className="min-w-0 truncate">{page.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-sm font-black">{session.user.name}</p>
        <p className="mt-1 break-all text-xs font-semibold text-white/48">
          {session.user.email}
        </p>
        <div className="mt-3 rounded-xl border border-white/10 bg-[#0c0c0c] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={`size-2.5 shrink-0 rounded-full ${statusDotClass}`} />
            <p className="text-xs font-black text-white/76">{statusLabel}</p>
          </div>
          <p className="mt-1 text-xs font-semibold text-white/42">
            ข้อมูลล่าสุด {formatLatestRealtimeAt(latestRealtimeAt)}
          </p>
        </div>
        <button
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-black text-white/72"
          onClick={onLogout}
          type="button"
        >
          <LogOut size={17} />
          ออกจากระบบ
        </button>
      </div>
    </>
  )
}

function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState('admin@fulltankgarage.local')
  const [password, setPassword] = useState('admin1234')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      onLogin(await authApi.login({ email, password }))
    } catch {
      setError('เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#070707] px-4 py-8 text-white">
      <form
        className="w-full max-w-md rounded-[1.5rem] border border-white/12 bg-[#151515] p-5 shadow-[0_0_42px_rgba(255,35,30,0.18)] sm:p-6"
        onSubmit={submit}
      >
        <div className="flex flex-col items-center text-center">
          <img
            alt="FullTank Garage"
            className="h-auto w-44 rounded-xl object-cover shadow-[0_14px_30px_rgba(0,0,0,0.36)] sm:w-52"
            src={fulltankGarageLogo}
          />
          <p className="mt-5 text-xs font-black uppercase tracking-normal text-[#ff403b]">
            Admin Login
          </p>
          <h1 className="mt-1 text-3xl font-black leading-tight">เข้าสู่ระบบ</h1>
        </div>

        <div className="mt-7 space-y-4">
          <label className="block text-sm font-bold text-white/72">
            อีเมล
            <input
              autoComplete="email"
              className="mt-2 h-12 w-full rounded-xl border border-white/12 bg-[#101010] px-4 text-white outline-none transition focus:border-[#ff403b] focus:ring-4 focus:ring-[#ff403b]/16"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label className="block text-sm font-bold text-white/72">
            รหัสผ่าน
            <input
              autoComplete="current-password"
              className="mt-2 h-12 w-full rounded-xl border border-white/12 bg-[#101010] px-4 text-white outline-none transition focus:border-[#ff403b] focus:ring-4 focus:ring-[#ff403b]/16"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-[#ff403b]/30 bg-[#ff403b]/12 px-3 py-2 text-sm font-bold text-[#ffd7d5]">
            {error}
          </p>
        ) : null}
        <button
          className="mt-5 h-12 w-full rounded-xl bg-[#ff332f] text-base font-black text-white shadow-[0_14px_28px_rgba(255,51,47,0.22)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </main>
  )
}

function DashboardPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [data, setData] = useState<{
    registrations: WarrantyRegistration[]
    serials: SerialNumber[]
    promotions: Promotion[]
    films: Film[]
  } | null>(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setIsLoadingDashboard(true)
      setData(await dashboardApi.summary())
    } catch {
      onNotice('โหลดข้อมูลแดชบอร์ดไม่สำเร็จ', 'error')
    } finally {
      setIsLoadingDashboard(false)
    }
  }, [onNotice])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  useEffect(() => subscribeFulltankEvents({
    onEvent: (event) => {
      setData((current) => {
        if (!current) {
          return current
        }

        if (
          event.type === 'warranty_registration.created' ||
          event.type === 'warranty_registration.linked'
        ) {
          return {
            ...current,
            registrations: upsertWarrantyRegistration(current.registrations, event.data),
          }
        }

        if (
          event.type === 'serial_number.created' ||
          event.type === 'serial_number.updated'
        ) {
          return {
            ...current,
            serials: upsertSerialNumber(current.serials, event.data),
          }
        }

        return current
      })

      if (shouldShowRealtimeNotice(event)) {
        if (event.type === 'rich_menu.sync') {
          onNotice('Rich menu sync ไม่สำเร็จ ตรวจสอบ LINE token/สิทธิ์อีกครั้ง', 'error')
          return
        }

        onNotice(
          event.type === 'warranty_registration.created'
            ? `มีการลงทะเบียนใหม่: ${event.data.serialNumber}`
            : `มีการผูกบัตรรับประกัน: ${event.data.serialNumber}`,
          'success',
        )
      }
    },
  }), [onNotice])

  const stats = [
    {
      label: 'ลงทะเบียนรับประกัน',
      value: data?.registrations.length ?? 0,
      icon: UsersRound,
    },
    {
      label: 'Serial พร้อมใช้งาน',
      value: data?.serials.filter((serial) => serial.status === 'available').length ?? 0,
      icon: Car,
    },
    {
      label: 'โปรโมชัน',
      value: data?.promotions.length ?? 0,
      icon: BadgePercent,
    },
    {
      label: 'รายการฟิล์ม',
      value: data?.films.length ?? 0,
      icon: FilmIcon,
    },
  ]

  return (
    <PageShell title="แดชบอร์ด" subtitle="ภาพรวมระบบรับประกันสินค้าและ App Home">
      <section className="grid grid-cols-2 gap-3">
        {stats.map((item) => {
          const Icon = item.icon

          return (
            <article className="min-h-32 rounded-2xl border border-white/10 bg-[#151515] p-4" key={item.label}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-black leading-5 text-white/62">{item.label}</p>
                <Icon className="shrink-0 text-[#ff403b]" size={22} />
              </div>
              {isLoadingDashboard ? (
                <SkeletonBlock className="mt-5 h-10 w-20 rounded-xl" />
              ) : (
                <p className="mt-5 text-4xl font-black leading-none">{item.value.toLocaleString('th-TH')}</p>
              )}
            </article>
          )
        })}
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-[#151515] p-4">
        <h2 className="text-lg font-black">รายการล่าสุด</h2>
        <CustomerTable customers={(data?.registrations ?? []).slice(0, 6)} isLoading={isLoadingDashboard} />
      </section>
    </PageShell>
  )
}

function PromotionsPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [items, setItems] = useState<Promotion[]>([])
  const [form, setForm] = useState<Partial<Promotion>>(emptyPromotion)
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(true)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const load = useCallback(async () => {
    try {
      setIsLoadingPromotions(true)
      setItems(await promotionApi.list())
    } catch {
      onNotice('โหลดโปรโมชันไม่สำเร็จ', 'error')
    } finally {
      setIsLoadingPromotions(false)
    }
  }, [onNotice])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [load])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      await promotionApi.save(form)
      setForm(emptyPromotion)
      await load()
      onNotice('บันทึกโปรโมชันแล้ว', 'success')
    } catch {
      onNotice('บันทึกโปรโมชันไม่สำเร็จ', 'error')
    }
  }

  const uploadPromotionImage = async (file: File) => {
    try {
      setIsUploadingImage(true)
      const imageUrl = await uploadApi.image(file)
      setForm((current) => ({ ...current, imageUrl }))
      onNotice('อัปโหลดรูปโปรโมชันแล้ว', 'success')
    } catch {
      onNotice('อัปโหลดรูปโปรโมชันไม่สำเร็จ', 'error')
    } finally {
      setIsUploadingImage(false)
    }
  }

  return (
    <PageShell title="จัดการโปรโมชัน" subtitle="ข้อมูลส่วนนี้จะถูกใช้ทั้ง card โปรโมชันและหน้าอ่านรายละเอียด">
      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <form className="space-y-4 rounded-2xl border border-white/10 bg-[#151515] p-4" onSubmit={save}>
          <UploadedImageField
            imageUrl={form.imageUrl}
            isUploading={isUploadingImage}
            label="รูปโปรโมชัน"
            onFileSelect={uploadPromotionImage}
          />
          <TextInput label="ชื่อโปรโมชัน" onChange={(value) => setForm((current) => ({ ...current, title: value }))} placeholder="เช่น ติดฟิล์มรอบคัน ราคาพิเศษ" value={form.title} />
          <TextAreaInput
            label="คำอธิบายสำหรับ card และหน้ารายละเอียด"
            onChange={(value) => setForm((current) => ({ ...current, description: value }))}
            placeholder="รายละเอียด เงื่อนไข ส่วนลด หรือข้อความที่ต้องการให้ลูกค้าอ่าน"
            value={form.description}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="เริ่ม" onChange={(value) => setForm((current) => ({ ...current, startsAt: value }))} type="date" value={form.startsAt} />
            <TextInput label="สิ้นสุด" onChange={(value) => setForm((current) => ({ ...current, endsAt: value }))} type="date" value={form.endsAt} />
          </div>
          <AdminPromotionPreview promotion={form} />
          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff332f] px-4 text-sm font-black" type="submit">
            <Plus size={17} />
            บันทึกโปรโมชัน
          </button>
        </form>
        <div className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {isLoadingPromotions ? <AdminGridSkeleton variant="promotion" /> : null}
            {items.map((item) => (
              <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]" key={item.id}>
                <div className="relative aspect-[16/9] bg-gradient-to-br from-[#ff403b] via-[#6f0908] to-[#171717]">
                  {item.imageUrl ? <img alt="" className="size-full object-cover" src={item.imageUrl} /> : null}
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent,rgba(0,0,0,0.58))]" />
                  <p className="absolute bottom-4 left-4 right-4 break-words text-3xl font-black tracking-tight text-white">
                    {getPromotionImageText(item.title)}
                  </p>
                </div>
                <div className="p-3">
                  <p className="break-words text-base font-black">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-white/52">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-white/55">
                      <CalendarDays size={15} />
                      ถึง {formatPromotionDate(item.endsAt)}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-[#ff6965]">
                      อ่านรายละเอียด
                      <ChevronRight size={16} />
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-black text-white/70" onClick={() => setForm(item)} type="button">
                      แก้ไข
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-[#ff403b]/30 px-3 py-1.5 text-xs font-black text-[#ff6965]"
                      onClick={async () => {
                        await promotionApi.remove(item.id)
                        await load()
                      }}
                      type="button"
                    >
                      <Trash2 size={14} />
                      ลบ
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!isLoadingPromotions && items.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-[#101010] px-4 py-8 text-center text-sm font-bold text-white/48 sm:col-span-2 xl:col-span-3">
                ยังไม่มีโปรโมชัน
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </PageShell>
  )
}

function FilmsPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [items, setItems] = useState<Film[]>([])
  const [form, setForm] = useState<Partial<Film>>(emptyFilm)
  const [isLoadingFilms, setIsLoadingFilms] = useState(true)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const load = useCallback(async () => {
    try {
      setIsLoadingFilms(true)
      setItems(await filmApi.list())
    } catch {
      onNotice('โหลดข้อมูลฟิล์มไม่สำเร็จ', 'error')
    } finally {
      setIsLoadingFilms(false)
    }
  }, [onNotice])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [load])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.imageUrl) {
      onNotice('กรุณาอัปโหลดรูปฟิล์ม', 'error')
      return
    }

    try {
      await filmApi.save(form)
      setForm(emptyFilm)
      await load()
      onNotice('บันทึกข้อมูลฟิล์มแล้ว', 'success')
    } catch {
      onNotice('บันทึกข้อมูลฟิล์มไม่สำเร็จ', 'error')
    }
  }

  const uploadFilmImage = async (file: File) => {
    try {
      setIsUploadingImage(true)
      const imageUrl = await uploadApi.image(file)
      setForm((current) => ({ ...current, imageUrl }))
      onNotice('อัปโหลดรูปฟิล์มแล้ว', 'success')
    } catch {
      onNotice('อัปโหลดรูปฟิล์มไม่สำเร็จ', 'error')
    } finally {
      setIsUploadingImage(false)
    }
  }

  return (
    <PageShell title="จัดการฟิล์ม" subtitle="ข้อมูลที่ใช้แสดงในหน้า Film App">
      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <form className="space-y-4 rounded-2xl border border-white/10 bg-[#151515] p-4" onSubmit={save}>
          <UploadedImageField
            help="รองรับเฉพาะไฟล์รูปภาพ ไม่ใช้ URL"
            imageUrl={form.imageUrl}
            isUploading={isUploadingImage}
            label="รูป/โลโก้ฟิล์ม"
            onFileSelect={uploadFilmImage}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Slug" onChange={(value) => setForm((current) => ({ ...current, slug: value }))} value={form.slug} />
            <TextInput label="Logo" onChange={(value) => setForm((current) => ({ ...current, logo: value }))} value={form.logo} />
          </div>
          <TextInput label="ชื่อฟิล์ม" onChange={(value) => setForm((current) => ({ ...current, name: value }))} value={form.name} />
          <TextInput label="คำอธิบายสั้น" onChange={(value) => setForm((current) => ({ ...current, summary: value }))} value={form.summary} />
          <TextInput label="รายละเอียด" onChange={(value) => setForm((current) => ({ ...current, description: value }))} value={form.description} />
          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff332f] px-4 text-sm font-black" type="submit">
            <Plus size={17} />
            บันทึกฟิล์ม
          </button>
        </form>
        <div className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {isLoadingFilms ? <AdminGridSkeleton /> : null}
            {items.map((item) => (
              <AdminListItem
                description={item.summary}
                imageUrl={item.imageUrl}
                key={item.id}
                onDelete={async () => {
                  await filmApi.remove(item.id)
                  await load()
                }}
                onEdit={() => setForm(item)}
                title={item.name}
              />
            ))}
            {!isLoadingFilms && items.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-[#101010] px-4 py-8 text-center text-sm font-bold text-white/48 sm:col-span-2 xl:col-span-3">
                ยังไม่มีข้อมูลฟิล์ม
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </PageShell>
  )
}

function CustomersPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [registrations, setRegistrations] = useState<WarrantyRegistration[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    try {
      setIsLoadingCustomers(true)
      setRegistrations(await warrantyApi.listRegistrations())
    } catch {
      onNotice('โหลดข้อมูลลูกค้าไม่สำเร็จ', 'error')
    } finally {
      setIsLoadingCustomers(false)
    }
  }, [onNotice])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => subscribeFulltankEvents({
    onEvent: (event) => {
      if (
        event.type === 'warranty_registration.created' ||
        event.type === 'warranty_registration.linked'
      ) {
        setRegistrations((current) => upsertWarrantyRegistration(current, event.data))
      }

      if (shouldShowRealtimeNotice(event)) {
        if (event.type === 'rich_menu.sync') {
          onNotice('Rich menu sync ไม่สำเร็จ ตรวจสอบ LINE token/สิทธิ์อีกครั้ง', 'error')
          return
        }

        onNotice(
          event.type === 'warranty_registration.created'
            ? `มีลูกค้าลงทะเบียนใหม่: ${event.data.serialNumber}`
            : `อัปเดตบัตรรับประกัน: ${event.data.serialNumber}`,
          'success',
        )
      }
    },
  }), [onNotice])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return registrations
    }

    return registrations.filter((item) =>
      [
        item.serialNumber,
        item.customerName,
        item.phone,
        item.carModel,
        item.licensePlate,
        item.filmBrand,
        item.filmModel,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [query, registrations])

  return (
    <PageShell title="จัดการข้อมูลลูกค้า" subtitle="ข้อมูลลงทะเบียนรับประกัน">
      <section className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-3 sm:p-4">
        <label className="relative mb-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/36" size={18} />
          <input
            className="h-11 w-full rounded-xl border border-white/12 bg-[#101010] pl-10 pr-3 text-sm font-bold text-white outline-none focus:border-[#ff403b]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อ เบอร์โทร Serial ทะเบียนรถ"
            value={query}
          />
        </label>
        <CustomerTable customers={filtered} isLoading={isLoadingCustomers} />
      </section>
    </PageShell>
  )
}

function SerialNumbersPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [serials, setSerials] = useState<SerialNumber[]>([])
  const [isLoadingSerials, setIsLoadingSerials] = useState(true)
  const [query, setQuery] = useState('')
  const [serialInput, setSerialInput] = useState('')

  const load = useCallback(async () => {
    try {
      setIsLoadingSerials(true)
      setSerials(await warrantyApi.listSerials())
    } catch {
      onNotice('โหลด Serial Number ไม่สำเร็จ', 'error')
    } finally {
      setIsLoadingSerials(false)
    }
  }, [onNotice])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => subscribeFulltankEvents({
    onEvent: (event) => {
      if (
        event.type === 'serial_number.created' ||
        event.type === 'serial_number.updated'
      ) {
        setSerials((current) => upsertSerialNumber(current, event.data))
      }
    },
  }), [])

  const createSerial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!serialInput.trim()) {
      return
    }

    try {
      const createdSerial = await warrantyApi.createSerial(serialInput.trim().toUpperCase())
      setSerials((current) => upsertSerialNumber(current, createdSerial))
      setSerialInput('')
      onNotice('เพิ่ม Serial Number แล้ว', 'success')
    } catch {
      onNotice('เพิ่ม Serial Number ไม่สำเร็จ', 'error')
    }
  }

  const fillGeneratedSerial = () => {
    setSerialInput(generateSerialNumber(serials))
  }

  const filteredSerials = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return serials
    }

    return serials.filter((serial) =>
      [serial.serialNumber, serial.status].join(' ').toLowerCase().includes(term),
    )
  }, [query, serials])
  const availableCount = serials.filter((serial) => serial.status === 'available').length
  const usedCount = serials.filter((serial) => serial.status === 'used').length

  return (
    <PageShell title="จัดการ Serial Number" subtitle="เจนและจัดการ Serial สำหรับลงทะเบียนรับประกัน">
      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,23rem)_1fr]">
        <div className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-4">
          <div className="grid grid-cols-2 gap-3">
            <SerialStatCard label="พร้อมใช้งาน" value={availableCount} tone="available" />
            <SerialStatCard label="ถูกใช้แล้ว" value={usedCount} tone="used" />
          </div>

          <form className="mt-4 grid gap-3" onSubmit={createSerial}>
            <TextInput
              label="Serial Number"
              onChange={(value) => setSerialInput(value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
              placeholder="FTG260514A1B2C3"
              value={serialInput}
            />
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#ff403b]/45 bg-[#ff403b]/12 px-3 text-sm font-black text-[#ff6965]"
              onClick={fillGeneratedSerial}
              type="button"
            >
              <Shuffle size={16} />
              เจน Serial Number
            </button>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ff332f] px-4 text-sm font-black" type="submit">
              <Plus size={17} />
              เพิ่ม Serial Number
            </button>
          </form>
        </div>

        <div className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-3 sm:p-4">
          <label className="relative mb-4 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/36" size={18} />
            <input
              className="h-11 w-full rounded-xl border border-white/12 bg-[#101010] pl-10 pr-3 text-sm font-bold text-white outline-none focus:border-[#ff403b]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหา Serial หรือสถานะ"
              value={query}
            />
          </label>
          <div className="max-h-[calc(100dvh-15rem)] space-y-2 overflow-auto pr-1">
            {isLoadingSerials ? <SerialListSkeleton /> : null}
            {filteredSerials.map((serial) => (
              <SerialRow key={serial.id} serial={serial} />
            ))}
            {!isLoadingSerials && filteredSerials.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-[#101010] px-4 py-8 text-center text-sm font-bold text-white/48">
                ไม่พบ Serial Number
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </PageShell>
  )
}

function PageShell({
  children,
  subtitle,
  title,
}: {
  children: ReactNode
  subtitle: string
  title: string
}) {
  return (
    <section aria-label={title}>
      <p className="sr-only">{subtitle}</p>
      {children}
    </section>
  )
}

function SerialStatCard({
  label,
  tone,
  value,
}: {
  label: string
  tone: 'available' | 'used'
  value: number
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#101010] p-3">
      <p className="text-xs font-black text-white/52">{label}</p>
      <p
        className={[
          'mt-2 text-3xl font-black leading-none',
          tone === 'available' ? 'text-emerald-300' : 'text-[#ff6965]',
        ].join(' ')}
      >
        {value.toLocaleString('th-TH')}
      </p>
    </article>
  )
}

function SerialRow({ serial }: { serial: SerialNumber }) {
  const isAvailable = serial.status === 'available'

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#101010] px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white">{serial.serialNumber}</p>
        <p className="mt-1 text-xs font-semibold text-white/38">
          {serial.createdAt ? `สร้างเมื่อ ${new Date(serial.createdAt).toLocaleDateString('th-TH')}` : 'ยังไม่มีวันที่สร้าง'}
        </p>
      </div>
      <span
        className={[
          'shrink-0 rounded-full px-3 py-1 text-xs font-black',
          isAvailable
            ? 'bg-emerald-400/12 text-emerald-300'
            : 'bg-[#ff403b]/12 text-[#ff6965]',
        ].join(' ')}
      >
        {isAvailable ? 'available' : 'used'}
      </span>
    </div>
  )
}

function AdminPromotionPreview({ promotion }: { promotion: Partial<Promotion> }) {
  const title = promotion.title?.trim() || 'ชื่อโปรโมชัน'
  const description =
    promotion.description?.trim() || 'คำอธิบายนี้จะแสดงใน card และหน้าอ่านรายละเอียด'

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-[#ff403b] via-[#6f0908] to-[#171717]">
        {promotion.imageUrl ? (
          <img alt="" className="absolute inset-0 size-full object-cover" src={promotion.imageUrl} />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent,rgba(0,0,0,0.58))]" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="break-words text-3xl font-black tracking-tight text-white">
            {getPromotionImageText(title)}
          </p>
          <img
            alt="FullTank Garage"
            className="mt-2 h-auto w-28 rounded-lg object-cover opacity-90"
            src={fulltankGarageLogo}
          />
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-black text-[#ff6965]">ตัวอย่างหน้าโปรโมชัน</p>
        <h3 className="mt-2 break-words text-base font-black text-white">{title}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-white/55">{description}</p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-white/55">
            <CalendarDays size={15} />
            ถึง {formatPromotionDate(promotion.endsAt)}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-[#ff6965]">
            อ่านรายละเอียด
            <ChevronRight size={16} />
          </span>
        </div>
      </div>
    </div>
  )
}

function UploadedImageField({
  help = 'เลือกไฟล์รูปภาพจากเครื่อง',
  imageUrl,
  isUploading,
  label,
  onFileSelect,
}: {
  help?: string
  imageUrl?: string
  isUploading: boolean
  label: string
  onFileSelect: (file: File) => void
}) {
  return (
    <label className="block text-sm font-bold text-white/68">
      {label}
      <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#101010]">
        <div className="grid aspect-[16/10] place-items-center bg-gradient-to-br from-[#1f1f1f] to-[#090909]">
          {imageUrl ? (
            <img alt="" className="size-full object-cover" src={imageUrl} />
          ) : (
            <div className="text-center text-white/42">
              <ImagePlus className="mx-auto" size={34} />
              <p className="mt-2 text-xs font-black">{help}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <span className="min-w-0 text-xs font-bold text-white/48">
            {isUploading ? 'กำลังอัปโหลดรูป...' : help}
          </span>
          <span className="shrink-0 rounded-lg bg-[#ff332f] px-3 py-2 text-xs font-black text-white">
            เลือกรูป
          </span>
        </div>
      </div>
      <input
        accept="image/*"
        className="sr-only"
        disabled={isUploading}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file) {
            onFileSelect(file)
          }
          event.currentTarget.value = ''
        }}
        type="file"
      />
    </label>
  )
}

function TextAreaInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <label className="block text-sm font-bold text-white/68">
      {label}
      <textarea
        className="mt-2 min-h-28 w-full resize-none rounded-xl border border-white/12 bg-[#101010] px-3 py-3 text-sm font-bold leading-6 text-white outline-none focus:border-[#ff403b]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value ?? ''}
      />
    </label>
  )
}

function TextInput({
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  value?: string
}) {
  return (
    <label className="block text-sm font-bold text-white/68">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-xl border border-white/12 bg-[#101010] px-3 text-sm font-bold text-white outline-none focus:border-[#ff403b]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value ?? ''}
      />
    </label>
  )
}

function AdminListItem({
  description,
  imageUrl,
  onDelete,
  onEdit,
  title,
}: {
  description?: string
  imageUrl?: string
  onDelete: () => void
  onEdit: () => void
  title: string
}) {
  return (
    <article className="flex gap-3 rounded-2xl border border-white/10 bg-[#101010] p-3">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#ff403b] to-[#171717]">
        {imageUrl ? <img alt="" className="size-full object-cover" src={imageUrl} /> : <BadgePercent size={24} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black">{title}</p>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-white/52">{description}</p>
        <div className="mt-3 flex gap-2">
          <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-black text-white/70" onClick={onEdit} type="button">
            แก้ไข
          </button>
          <button className="inline-flex items-center gap-1 rounded-lg border border-[#ff403b]/30 px-3 py-1.5 text-xs font-black text-[#ff6965]" onClick={onDelete} type="button">
            <Trash2 size={14} />
            ลบ
          </button>
        </div>
      </div>
    </article>
  )
}

function SkeletonBlock({ className }: { className: string }) {
  return <span aria-hidden="true" className={`block skeleton-shimmer ${className}`} />
}

function AdminGridSkeleton({ variant = 'list' }: { variant?: 'list' | 'promotion' }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <article
          aria-hidden="true"
          className={[
            'overflow-hidden rounded-2xl border border-white/10 bg-[#101010]',
            variant === 'list' ? 'flex gap-3 p-3' : '',
          ].join(' ')}
          key={index}
        >
          {variant === 'promotion' ? (
            <>
              <SkeletonBlock className="aspect-[16/9] w-full rounded-none" />
              <div className="p-3">
                <SkeletonBlock className="h-5 w-4/5 rounded-xl" />
                <SkeletonBlock className="mt-2 h-4 w-full rounded-xl" />
                <SkeletonBlock className="mt-2 h-4 w-2/3 rounded-xl" />
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <SkeletonBlock className="h-5 w-28 rounded-xl" />
                  <SkeletonBlock className="h-5 w-24 rounded-xl" />
                </div>
                <div className="mt-3 flex gap-2">
                  <SkeletonBlock className="h-8 w-16 rounded-lg" />
                  <SkeletonBlock className="h-8 w-16 rounded-lg" />
                </div>
              </div>
            </>
          ) : (
            <>
              <SkeletonBlock className="size-20 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-5 w-4/5 rounded-xl" />
                <SkeletonBlock className="mt-2 h-4 w-full rounded-xl" />
                <SkeletonBlock className="mt-2 h-4 w-2/3 rounded-xl" />
                <div className="mt-3 flex gap-2">
                  <SkeletonBlock className="h-8 w-16 rounded-lg" />
                  <SkeletonBlock className="h-8 w-16 rounded-lg" />
                </div>
              </div>
            </>
          )}
        </article>
      ))}
    </>
  )
}

function SerialListSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }, (_, index) => (
        <div
          aria-hidden="true"
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#101010] px-3 py-2"
          key={index}
        >
          <SkeletonBlock className="h-5 w-40 rounded-xl" />
          <SkeletonBlock className="h-4 w-16 rounded-xl" />
        </div>
      ))}
    </>
  )
}

function CustomerTableSkeleton() {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <article
            aria-hidden="true"
            className="rounded-2xl border border-white/10 bg-[#101010] p-3"
            key={index}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-5 w-36 max-w-full rounded-xl" />
                <SkeletonBlock className="mt-2 h-4 w-24 rounded-xl" />
              </div>
              <SkeletonBlock className="h-6 w-28 rounded-full" />
            </div>
            <div className="mt-3 grid gap-2">
              {Array.from({ length: 4 }, (_, fieldIndex) => (
                <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3" key={fieldIndex}>
                  <SkeletonBlock className="h-4 w-12 rounded-xl" />
                  <SkeletonBlock className="h-4 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[58rem] w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs font-black uppercase tracking-wide text-white/42">
              <th className="px-3 py-2">Serial</th>
              <th className="px-3 py-2">ลูกค้า</th>
              <th className="px-3 py-2">รถ</th>
              <th className="px-3 py-2">ฟิล์ม</th>
              <th className="px-3 py-2">ติดตั้ง</th>
              <th className="px-3 py-2">สาขา</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }, (_, index) => (
              <tr className="bg-[#101010]" key={index}>
                {Array.from({ length: 6 }, (_, cellIndex) => (
                  <td
                    className={[
                      'px-3 py-3',
                      cellIndex === 0 ? 'rounded-l-xl' : '',
                      cellIndex === 5 ? 'rounded-r-xl' : '',
                    ].join(' ')}
                    key={cellIndex}
                  >
                    <SkeletonBlock className="h-5 w-full rounded-xl" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function CustomerTable({
  customers,
  isLoading = false,
}: {
  customers: WarrantyRegistration[]
  isLoading?: boolean
}) {
  if (isLoading) {
    return <CustomerTableSkeleton />
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {customers.map((customer) => (
          <article
            className="rounded-2xl border border-white/10 bg-[#101010] p-3 text-sm font-bold text-white/72"
            key={customer.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-base font-black text-white">
                  {customer.customerName || '-'}
                </p>
                <p className="mt-1 break-all text-xs text-white/42">
                  {customer.phone || '-'}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#ff403b]/12 px-2.5 py-1 text-xs font-black text-[#ff6965]">
                {customer.serialNumber}
              </span>
            </div>

            <dl className="mt-3 grid gap-2">
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                <dt className="text-xs font-black text-white/38">รถ</dt>
                <dd className="min-w-0 break-words text-white/78">
                  {customer.carModel || '-'} / {customer.licensePlate || '-'}
                </dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                <dt className="text-xs font-black text-white/38">ฟิล์ม</dt>
                <dd className="min-w-0 break-words text-white/78">
                  {customer.filmBrand || '-'} {customer.filmModel || ''}
                </dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                <dt className="text-xs font-black text-white/38">ติดตั้ง</dt>
                <dd className="min-w-0 break-words text-white/78">
                  {customer.installDate || '-'}
                </dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                <dt className="text-xs font-black text-white/38">สาขา</dt>
                <dd className="min-w-0 break-words text-white/78">
                  {customer.branch || '-'}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[58rem] w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-xs font-black uppercase tracking-wide text-white/42">
            <th className="px-3 py-2">Serial</th>
            <th className="px-3 py-2">ลูกค้า</th>
            <th className="px-3 py-2">รถ</th>
            <th className="px-3 py-2">ฟิล์ม</th>
            <th className="px-3 py-2">ติดตั้ง</th>
            <th className="px-3 py-2">สาขา</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr className="bg-[#101010] text-sm font-bold text-white/72" key={customer.id}>
              <td className="rounded-l-xl px-3 py-3 text-white">{customer.serialNumber}</td>
              <td className="px-3 py-3">
                <p className="text-white">{customer.customerName}</p>
                <p className="text-xs text-white/42">{customer.phone}</p>
              </td>
              <td className="px-3 py-3">
                <p>{customer.carModel}</p>
                <p className="text-xs text-white/42">{customer.licensePlate}</p>
              </td>
              <td className="px-3 py-3">{customer.filmBrand} {customer.filmModel}</td>
              <td className="px-3 py-3">{customer.installDate || '-'}</td>
              <td className="rounded-r-xl px-3 py-3">{customer.branch || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {customers.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-[#101010] px-4 py-8 text-center text-sm font-bold text-white/48">
          ยังไม่มีข้อมูล
        </p>
      ) : null}
    </>
  )
}

function Notice({ message, tone }: { message: string; tone: NoticeTone }) {
  return (
    <div
      className={[
        'fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm font-black shadow-xl',
        tone === 'success'
          ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-100'
          : tone === 'error'
            ? 'border-[#ff403b]/30 bg-[#ff403b]/20 text-[#ffd7d5]'
            : 'border-white/12 bg-[#151515] text-white',
      ].join(' ')}
    >
      {message}
    </div>
  )
}

export default App
