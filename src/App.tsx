import {
  BadgePercent,
  Car,
  Film as FilmIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
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
  warrantyApi,
  type AuthSession,
  type Film,
  type Promotion,
  type SerialNumber,
  type WarrantyRegistration,
} from './services/fulltankApi'
import fulltankGarageLogo from './assets/fulltank-garage-logo.jpg'

type Page = 'dashboard' | 'promotions' | 'films' | 'customers'
type NoticeTone = 'success' | 'error' | 'info'

const pages: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { id: 'promotions', label: 'จัดการโปรโมชัน', icon: BadgePercent },
  { id: 'films', label: 'จัดการฟิล์ม', icon: FilmIcon },
  { id: 'customers', label: 'จัดการข้อมูลลูกค้า', icon: UsersRound },
]

const emptyPromotion: Partial<Promotion> = {
  title: '',
  description: '',
  imageUrl: '',
  isActive: true,
  startsAt: '',
  endsAt: '',
}

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
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession())
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState<NoticeTone>('info')

  const showNotice = (message: string, tone: NoticeTone = 'info') => {
    setNotice(message)
    setNoticeTone(tone)
    window.setTimeout(() => setNotice(''), 3200)
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
          onClose={() => setIsSidebarOpen(false)}
          onLogout={logout}
          onSelect={selectPage}
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
      </main>
    </div>
  )
}

function Sidebar({
  activePage,
  onClose,
  onLogout,
  onSelect,
  session,
}: {
  activePage: Page
  onClose: () => void
  onLogout: () => void
  onSelect: (page: Page) => void
  session: AuthSession
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <img
            alt="FullTank Garage"
            className="h-auto w-40 rounded-lg object-cover"
            src={fulltankGarageLogo}
          />
          <h1 className="mt-1 text-xl font-black">Admin Home</h1>
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
    <main className="grid min-h-dvh place-items-center bg-[#070707] px-4 text-white">
      <form
        className="w-full max-w-md rounded-[1.5rem] border border-white/12 bg-[#151515] p-5 shadow-[0_0_42px_rgba(255,35,30,0.18)]"
        onSubmit={submit}
      >
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#ff403b]">
          Admin Login
        </p>
        <img
          alt="FullTank Garage"
          className="mt-4 h-auto w-60 rounded-xl object-cover"
          src={fulltankGarageLogo}
        />
        <h1 className="mt-2 text-3xl font-black">เข้าสู่ระบบ Admin</h1>
        <label className="mt-6 block text-sm font-bold text-white/72">
          อีเมล
          <input
            className="mt-2 h-12 w-full rounded-xl border border-white/12 bg-[#101010] px-4 text-white outline-none focus:border-[#ff403b] focus:ring-4 focus:ring-[#ff403b]/16"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="mt-4 block text-sm font-bold text-white/72">
          รหัสผ่าน
          <input
            className="mt-2 h-12 w-full rounded-xl border border-white/12 bg-[#101010] px-4 text-white outline-none focus:border-[#ff403b] focus:ring-4 focus:ring-[#ff403b]/16"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="mt-3 text-sm font-bold text-[#ff6965]">{error}</p> : null}
        <button
          className="mt-5 h-12 w-full rounded-xl bg-[#ff332f] text-base font-black text-white disabled:opacity-60"
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

  const loadData = useCallback(async () => {
    try {
      setData(await dashboardApi.summary())
    } catch {
      onNotice('โหลดข้อมูลแดชบอร์ดไม่สำเร็จ', 'error')
    }
  }, [onNotice])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

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
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon

          return (
            <article className="rounded-2xl border border-white/10 bg-[#151515] p-4" key={item.label}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-white/56">{item.label}</p>
                <Icon className="text-[#ff403b]" size={22} />
              </div>
              <p className="mt-4 text-4xl font-black">{item.value.toLocaleString('th-TH')}</p>
            </article>
          )
        })}
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-[#151515] p-4">
        <h2 className="text-lg font-black">รายการล่าสุด</h2>
        <CustomerTable customers={(data?.registrations ?? []).slice(0, 6)} />
      </section>
    </PageShell>
  )
}

function PromotionsPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [items, setItems] = useState<Promotion[]>([])
  const [form, setForm] = useState<Partial<Promotion>>(emptyPromotion)

  const load = useCallback(async () => {
    try {
      setItems(await promotionApi.list())
    } catch {
      onNotice('โหลดโปรโมชันไม่สำเร็จ', 'error')
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

  return (
    <PageShell title="จัดการโปรโมชัน" subtitle="เพิ่มรูปภาพและคำอธิบายสำหรับหน้าโปรโมชัน">
      <EditorGrid
        form={
          <form className="space-y-3" onSubmit={save}>
            <TextInput label="ชื่อโปรโมชัน" onChange={(value) => setForm((current) => ({ ...current, title: value }))} value={form.title} />
            <TextInput label="คำอธิบาย" onChange={(value) => setForm((current) => ({ ...current, description: value }))} value={form.description} />
            <TextInput label="URL รูปภาพ" onChange={(value) => setForm((current) => ({ ...current, imageUrl: value }))} value={form.imageUrl} />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="เริ่ม" onChange={(value) => setForm((current) => ({ ...current, startsAt: value }))} type="date" value={form.startsAt} />
              <TextInput label="สิ้นสุด" onChange={(value) => setForm((current) => ({ ...current, endsAt: value }))} type="date" value={form.endsAt} />
            </div>
            <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff332f] px-4 text-sm font-black" type="submit">
              <Plus size={17} />
              บันทึกโปรโมชัน
            </button>
          </form>
        }
        list={
          <div className="space-y-3">
            {items.map((item) => (
              <AdminListItem
                description={item.description}
                imageUrl={item.imageUrl}
                key={item.id}
                onDelete={async () => {
                  await promotionApi.remove(item.id)
                  await load()
                }}
                onEdit={() => setForm(item)}
                title={item.title}
              />
            ))}
          </div>
        }
      />
    </PageShell>
  )
}

function FilmsPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [items, setItems] = useState<Film[]>([])
  const [form, setForm] = useState<Partial<Film>>(emptyFilm)

  const load = useCallback(async () => {
    try {
      setItems(await filmApi.list())
    } catch {
      onNotice('โหลดข้อมูลฟิล์มไม่สำเร็จ', 'error')
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
      await filmApi.save(form)
      setForm(emptyFilm)
      await load()
      onNotice('บันทึกข้อมูลฟิล์มแล้ว', 'success')
    } catch {
      onNotice('บันทึกข้อมูลฟิล์มไม่สำเร็จ', 'error')
    }
  }

  return (
    <PageShell title="จัดการฟิล์ม" subtitle="ข้อมูลที่ใช้แสดงในหน้า Film App">
      <EditorGrid
        form={
          <form className="space-y-3" onSubmit={save}>
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Slug" onChange={(value) => setForm((current) => ({ ...current, slug: value }))} value={form.slug} />
              <TextInput label="Logo" onChange={(value) => setForm((current) => ({ ...current, logo: value }))} value={form.logo} />
            </div>
            <TextInput label="ชื่อฟิล์ม" onChange={(value) => setForm((current) => ({ ...current, name: value }))} value={form.name} />
            <TextInput label="คำอธิบายสั้น" onChange={(value) => setForm((current) => ({ ...current, summary: value }))} value={form.summary} />
            <TextInput label="รายละเอียด" onChange={(value) => setForm((current) => ({ ...current, description: value }))} value={form.description} />
            <TextInput label="URL รูป/โลโก้" onChange={(value) => setForm((current) => ({ ...current, imageUrl: value }))} value={form.imageUrl} />
            <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff332f] px-4 text-sm font-black" type="submit">
              <Plus size={17} />
              บันทึกฟิล์ม
            </button>
          </form>
        }
        list={
          <div className="space-y-3">
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
          </div>
        }
      />
    </PageShell>
  )
}

function CustomersPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [registrations, setRegistrations] = useState<WarrantyRegistration[]>([])
  const [serials, setSerials] = useState<SerialNumber[]>([])
  const [query, setQuery] = useState('')
  const [serialInput, setSerialInput] = useState('')

  const load = useCallback(async () => {
    try {
      const [nextRegistrations, nextSerials] = await Promise.all([
        warrantyApi.listRegistrations(),
        warrantyApi.listSerials(),
      ])
      setRegistrations(nextRegistrations)
      setSerials(nextSerials)
    } catch {
      onNotice('โหลดข้อมูลลูกค้าไม่สำเร็จ', 'error')
    }
  }, [onNotice])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [load])

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

  const createSerial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!serialInput.trim()) {
      return
    }

    try {
      await warrantyApi.createSerial(serialInput.trim().toUpperCase())
      setSerialInput('')
      await load()
      onNotice('เพิ่ม Serial Number แล้ว', 'success')
    } catch {
      onNotice('เพิ่ม Serial Number ไม่สำเร็จ', 'error')
    }
  }

  return (
    <PageShell title="จัดการข้อมูลลูกค้า" subtitle="ข้อมูลลงทะเบียนรับประกันและ Serial Number">
      <section className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <label className="relative mb-4 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/36" size={18} />
            <input
              className="h-11 w-full rounded-xl border border-white/12 bg-[#101010] pl-10 pr-3 text-sm font-bold text-white outline-none focus:border-[#ff403b]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อ เบอร์โทร Serial ทะเบียนรถ"
              value={query}
            />
          </label>
          <CustomerTable customers={filtered} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <h2 className="text-lg font-black">Serial Number</h2>
          <form className="mt-3 flex gap-2" onSubmit={createSerial}>
            <input
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/12 bg-[#101010] px-3 text-sm font-bold uppercase text-white outline-none focus:border-[#ff403b]"
              onChange={(event) => setSerialInput(event.target.value)}
              placeholder="FTG-0001"
              value={serialInput}
            />
            <button className="grid size-11 place-items-center rounded-xl bg-[#ff332f]" type="submit">
              <Plus size={18} />
            </button>
          </form>
          <div className="mt-4 max-h-[34rem] space-y-2 overflow-auto pr-1">
            {serials.map((serial) => (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#101010] px-3 py-2" key={serial.id}>
                <span className="min-w-0 truncate text-sm font-black">{serial.serialNumber}</span>
                <span className={serial.status === 'available' ? 'text-xs font-black text-emerald-300' : 'text-xs font-black text-[#ff6965]'}>
                  {serial.status === 'available' ? 'available' : 'used'}
                </span>
              </div>
            ))}
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

function EditorGrid({ form, list }: { form: ReactNode; list: ReactNode }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[24rem_1fr]">
      <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">{form}</div>
      <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">{list}</div>
    </section>
  )
}

function TextInput({
  label,
  onChange,
  type = 'text',
  value,
}: {
  label: string
  onChange: (value: string) => void
  type?: string
  value?: string
}) {
  return (
    <label className="block text-sm font-bold text-white/68">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-xl border border-white/12 bg-[#101010] px-3 text-sm font-bold text-white outline-none focus:border-[#ff403b]"
        onChange={(event) => onChange(event.target.value)}
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

function CustomerTable({ customers }: { customers: WarrantyRegistration[] }) {
  return (
    <div className="overflow-x-auto">
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
      {customers.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-[#101010] px-4 py-8 text-center text-sm font-bold text-white/48">
          ยังไม่มีข้อมูล
        </p>
      ) : null}
    </div>
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
