import {
  BadgePercent,
  CalendarDays,
  Car,
  ChevronRight,
  Download,
  Film as FilmIcon,
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
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { CustomerTable } from './components/admin/CustomerTable'
import { FilmGalleryField, TextAreaInput, TextInput, UploadedImageField } from './components/admin/FormFields'
import { BottomEditorSheet, ManagementToolbar, PageShell } from './components/admin/Layout'
import { Notice } from './components/admin/Notice'
import { AdminFilmPreview, AdminPromotionPreview, FormPreviewDivider } from './components/admin/Previews'
import { SerialRow, SerialStatCard } from './components/admin/Serials'
import { AdminGridSkeleton, SerialListSkeleton, SkeletonBlock } from './components/admin/Skeletons'
import { ConfirmationDialog } from './components/ConfirmationDialog'
import { StartupSplash } from './components/StartupSplash'
import type { NoticeTone, Page } from './types/admin'
import {
  createCardSummary,
  formatCustomerInstallDate,
  formatDateInput,
  formatPromotionDateRange,
} from './utils/adminFormatters'

const appVersionStorageKey = 'fulltank_admin_app_version'
const appUpdateCheckIntervalMs = 60 * 1000
const maxImageBytes = 5 * 1024 * 1024

const getAssetVersionFromElements = (
  elements: Array<HTMLLinkElement | HTMLScriptElement>,
) =>
  elements
    .map((element) => {
      if (element instanceof HTMLScriptElement) {
        return new URL(element.src, window.location.origin).pathname
      }

      return new URL(element.href, window.location.origin).pathname
    })
    .filter(Boolean)
    .sort()
    .join('|')

const getLoadedAppVersion = () => {
  const assets = Array.from(
    document.querySelectorAll<HTMLLinkElement | HTMLScriptElement>(
      'script[src^="/assets/"], link[href^="/assets/"]',
    ),
  )

  return getAssetVersionFromElements(assets)
}

const getRemoteAppVersion = async () => {
  const response = await fetch(`${window.location.origin}/?t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
    },
  })

  if (!response.ok) {
    return ''
  }

  const html = await response.text()
  const documentSnapshot = new DOMParser().parseFromString(html, 'text/html')
  const assets = Array.from(
    documentSnapshot.querySelectorAll<HTMLLinkElement | HTMLScriptElement>(
      'script[src^="/assets/"], link[href^="/assets/"]',
    ),
  )

  return getAssetVersionFromElements(assets)
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
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const serialNumber = Array.from({ length: 8 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join('')
    if (!existing.has(serialNumber.toUpperCase())) {
      return serialNumber
    }
  }

  return Date.now().toString(36).slice(-8).padStart(8, '0')
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

const formatAdminDisplayName = (value: string) =>
  value.replace(/FullTank/gi, 'FULLTANK')

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
  detail: '',
  imageUrl: '',
  isActive: true,
  startsAt: '',
  endsAt: '',
}

const escapeCsvCell = (value: unknown) => {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

const downloadCsv = (filename: string, headers: string[], rows: unknown[][]) => {
  const csv = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const compressImageFile = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('รองรับเฉพาะไฟล์รูปภาพ')
  }

  if (file.size <= maxImageBytes) {
    return file
  }

  const imageBitmap = await createImageBitmap(file)
  const maxSide = 1800
  const scale = Math.min(1, maxSide / Math.max(imageBitmap.width, imageBitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(imageBitmap.width * scale))
  canvas.height = Math.max(1, Math.round(imageBitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    imageBitmap.close()
    throw new Error('ไม่สามารถบีบอัดรูปภาพได้')
  }

  context.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height)
  imageBitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) {
        resolve(nextBlob)
      } else {
        reject(new Error('ไม่สามารถบีบอัดรูปภาพได้'))
      }
    }, 'image/jpeg', 0.82)
  })

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }

    return entities[character]
  })

const emptyFilm: Partial<Film> = {
  slug: '',
  name: '',
  logo: '',
  summary: '',
  description: '',
  imageUrl: '',
  priceTableImageUrl: '',
  galleryImages: [],
  irr: '90%+',
  uvProtection: '99%',
  filmType: 'AUTO',
  isActive: true,
}

const createFilmLogo = (name?: string) =>
  (name || 'FT')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'FT'

function App() {
  const [isBooting, setIsBooting] = useState(true)
  const [isBootReady, setIsBootReady] = useState(false)
  const [isInitialUpdateCheckDone, setIsInitialUpdateCheckDone] = useState(false)
  const [bootProgress, setBootProgress] = useState(12)
  const [hasAppUpdate, setHasAppUpdate] = useState(false)
  const [hasPendingAppUpdate, setHasPendingAppUpdate] = useState(false)
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession())
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState<NoticeTone>('info')
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(
    session ? 'connecting' : 'off',
  )
  const [latestRealtimeAt, setLatestRealtimeAt] = useState<Date | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const appUpdateRegistrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const isApplyingAppUpdateRef = useRef(false)
  const isBootingRef = useRef(true)
  const loadedAppVersionRef = useRef('')
  const watchedServiceWorkerRegistrationsRef = useRef<WeakSet<ServiceWorkerRegistration>>(new WeakSet())

  const showNotice = useCallback((message: string, tone: NoticeTone = 'info') => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current)
    }

    setNotice(message)
    setNoticeTone(tone)
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice('')
      noticeTimerRef.current = null
    }, 3200)
  }, [])

  useEffect(() => {
    isBootingRef.current = isBooting
  }, [isBooting])

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined
    }

    const scrollY = window.scrollY
    const originalHtmlOverflow = document.documentElement.style.overflow
    const originalBodyOverflow = document.body.style.overflow
    const originalBodyPosition = document.body.style.position
    const originalBodyTop = document.body.style.top
    const originalBodyWidth = document.body.style.width

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow
      document.body.style.overflow = originalBodyOverflow
      document.body.style.position = originalBodyPosition
      document.body.style.top = originalBodyTop
      document.body.style.width = originalBodyWidth
      window.scrollTo(0, scrollY)
    }
  }, [isSidebarOpen])

  const applyAppUpdate = useCallback((registration?: ServiceWorkerRegistration | null) => {
    if (registration) {
      appUpdateRegistrationRef.current = registration
    }

    const waitingWorker = appUpdateRegistrationRef.current?.waiting
    isApplyingAppUpdateRef.current = true
    setHasPendingAppUpdate(false)

    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      return
    }

    window.location.reload()
  }, [])

  const showAppUpdatePrompt = useCallback((registration?: ServiceWorkerRegistration | null) => {
    if (registration) {
      appUpdateRegistrationRef.current = registration
    }

    setHasAppUpdate(true)

    if (isBootingRef.current) {
      applyAppUpdate(registration)
      return
    }

    setHasPendingAppUpdate(true)
  }, [applyAppUpdate])

  const watchServiceWorkerUpdate = useCallback((registration: ServiceWorkerRegistration) => {
    appUpdateRegistrationRef.current = registration

    if (registration.waiting && navigator.serviceWorker.controller) {
      showAppUpdatePrompt(registration)
    }

    if (watchedServiceWorkerRegistrationsRef.current.has(registration)) {
      return
    }
    watchedServiceWorkerRegistrationsRef.current.add(registration)

    registration.addEventListener('updatefound', () => {
      const nextWorker = registration.installing
      if (!nextWorker) {
        return
      }

      nextWorker.addEventListener('statechange', () => {
        if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showAppUpdatePrompt(registration)
        }
      })
    })
  }, [showAppUpdatePrompt])

  useEffect(() => {
    const updateCheckTimer = window.setTimeout(() => {
      loadedAppVersionRef.current = getLoadedAppVersion()
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
    const bootReadyTimer = window.setTimeout(() => {
      setIsBootReady(true)
    }, 780)
    const initialUpdateTimeout = window.setTimeout(() => {
      setIsInitialUpdateCheckDone(true)
    }, 3500)

    const finishInitialUpdateCheck = () => {
      window.clearTimeout(initialUpdateTimeout)
      window.setTimeout(() => setIsInitialUpdateCheckDone(true), 180)
    }

    const checkRemoteAppUpdate = async () => {
      const loadedVersion = loadedAppVersionRef.current || getLoadedAppVersion()
      loadedAppVersionRef.current = loadedVersion

      if (!loadedVersion) {
        return false
      }

      try {
        const remoteVersion = await getRemoteAppVersion()
        if (remoteVersion && remoteVersion !== loadedVersion) {
          showAppUpdatePrompt()
          return true
        }
      } catch {
        return false
      }

      return false
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/admin-sw.js', { scope: '/' })
        .then((registration) => {
          watchServiceWorkerUpdate(registration)
          return registration.update().then(() => {
            watchServiceWorkerUpdate(registration)
            void checkRemoteAppUpdate().finally(finishInitialUpdateCheck)
          })
        })
        .catch(() => {
          void checkRemoteAppUpdate().finally(finishInitialUpdateCheck)
        })

      const checkForAppUpdate = () => {
        void checkRemoteAppUpdate()

        navigator.serviceWorker
          .getRegistration('/admin-sw.js')
          .then((registration) => {
            if (!registration) {
              return undefined
            }

            watchServiceWorkerUpdate(registration)
            return registration.update()
          })
          .catch(() => undefined)
      }

      checkForAppUpdate()

      const handleControllerChange = () => {
        setHasAppUpdate(true)

        if (isApplyingAppUpdateRef.current || isBootingRef.current) {
          window.location.reload()
          return
        }

        setHasPendingAppUpdate(true)
      }
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          checkForAppUpdate()
        }
      }
      const updateInterval = window.setInterval(checkForAppUpdate, appUpdateCheckIntervalMs)

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('focus', checkForAppUpdate)

      return () => {
        window.clearTimeout(updateCheckTimer)
        window.clearInterval(progressTimer)
        window.clearTimeout(bootReadyTimer)
        window.clearTimeout(initialUpdateTimeout)
        window.clearInterval(updateInterval)
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', checkForAppUpdate)
      }
    }

    void checkRemoteAppUpdate().finally(() => setIsInitialUpdateCheckDone(true))

    return () => {
      window.clearTimeout(updateCheckTimer)
      window.clearInterval(progressTimer)
      window.clearTimeout(bootReadyTimer)
      window.clearTimeout(initialUpdateTimeout)
    }
  }, [watchServiceWorkerUpdate])

  useEffect(() => {
    if (!isBooting || !isBootReady || !isInitialUpdateCheckDone) {
      return undefined
    }

    setBootProgress(100)
    const doneTimer = window.setTimeout(() => setIsBooting(false), 220)

    return () => window.clearTimeout(doneTimer)
  }, [isBootReady, isBooting, isInitialUpdateCheckDone])

  useEffect(() => {
    if (!session) {
      return undefined
    }

    return subscribeFulltankEvents({
      onEvent: () => setLatestRealtimeAt(new Date()),
      onStatus: setRealtimeStatus,
    })
  }, [session])

  useEffect(() => () => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current)
    }
  }, [])

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
      <button
        aria-label="ปิดเมนู"
        aria-hidden={!isSidebarOpen}
        className={[
          'fixed inset-0 z-30 bg-black/68 backdrop-blur-[2px] transition-[opacity,backdrop-filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden',
          isSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0 backdrop-blur-0',
        ].join(' ')}
        onClick={() => setIsSidebarOpen(false)}
        type="button"
      />

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-72 max-w-[82vw] transform-gpu flex-col border-r border-white/10 bg-[#101010] px-5 py-6 shadow-[18px_0_60px_rgba(0,0,0,0.42)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform md:translate-x-0 md:transition-none',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar
          activePage={activePage}
          latestRealtimeAt={latestRealtimeAt}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={logout}
          onSelect={selectPage}
          hasPendingAppUpdate={hasPendingAppUpdate}
          onUpdateApp={applyAppUpdate}
          realtimeStatus={realtimeStatus}
          session={session}
        />
      </aside>

      <main className="min-w-0 px-4 pb-6 pt-[5.75rem] md:pl-[19rem] md:pr-6 md:pt-[6.25rem] lg:px-8 lg:pl-[20rem]">
        <header className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#070707]/96 px-4 py-3 backdrop-blur md:left-72 md:px-6 lg:px-8">
          <button
            aria-label="เปิดเมนู"
            className="relative grid size-11 place-items-center rounded-xl border border-white/10 bg-[#151515] text-white md:hidden"
            onClick={() => setIsSidebarOpen(true)}
            type="button"
          >
            <Menu size={20} />
            {hasPendingAppUpdate ? (
              <span
                aria-hidden="true"
                className="app-update-pulse absolute -right-1 -top-1 size-3.5 rounded-full bg-[#ff403b] shadow-[0_0_0_4px_rgba(255,64,59,0.18)]"
              />
            ) : null}
          </button>
          <div className="ml-auto min-w-0 text-right">
            <p className="text-[12px] font-bold uppercase leading-none tracking-normal text-[#ff403b]">
              FULLTANK Admin
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
  hasPendingAppUpdate,
  latestRealtimeAt,
  onClose,
  onLogout,
  onSelect,
  onUpdateApp,
  realtimeStatus,
  session,
}: {
  activePage: Page
  hasPendingAppUpdate: boolean
  latestRealtimeAt: Date | null
  onClose: () => void
  onLogout: () => void
  onSelect: (page: Page) => void
  onUpdateApp: () => void
  realtimeStatus: RealtimeStatus
  session: AuthSession
}) {
  const statusLabel =
    realtimeStatus === 'connected'
      ? 'เชื่อมต่อข้อมูลล่าสุด'
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
            alt="FULLTANK Garage"
            className="size-14 shrink-0 rounded-lg object-cover"
            src={fulltankGarageLogo}
          />
          <h1 className="min-w-0 text-lg font-black leading-tight">หน้าแอดมิน</h1>
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
        <p className="text-sm font-black">{formatAdminDisplayName(session.user.name)}</p>
        <p className="mt-1 break-all text-xs font-semibold text-white/48">
          {session.user.email}
        </p>
        <div className="mt-3 rounded-xl border border-white/10 bg-[#0c0c0c] px-3 py-3">
          <div className="flex items-start gap-2">
            <span className={`mt-1 size-2.5 shrink-0 rounded-full ${statusDotClass}`} />
            <div className="min-w-0">
              <p className="text-xs font-black text-white/76">{statusLabel}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/42">
                ข้อมูลล่าสุด {formatLatestRealtimeAt(latestRealtimeAt)}
              </p>
            </div>
          </div>
        </div>
        <div
          className={[
            'mt-3 rounded-xl border px-3 py-3',
            hasPendingAppUpdate
              ? 'border-[#ff403b]/36 bg-[#ff403b]/12'
              : 'border-white/10 bg-[#0c0c0c]',
          ].join(' ')}
        >
          <div className="flex items-start gap-2">
            <span
              className={[
                'mt-1 size-2.5 shrink-0 rounded-full',
                hasPendingAppUpdate ? 'app-update-pulse bg-[#ff403b]' : 'bg-white/22',
              ].join(' ')}
            />
            <div className="min-w-0">
              <p className="text-xs font-black text-white/76">อัปเดตแอป</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/42">
                {hasPendingAppUpdate
                  ? 'มีเวอร์ชันใหม่พร้อมใช้งาน'
                  : 'กำลังใช้เวอร์ชันล่าสุด'}
              </p>
            </div>
          </div>
          {hasPendingAppUpdate ? (
            <button
              className="mt-3 h-10 w-full rounded-xl bg-[#ff332f] text-xs font-black text-white shadow-[0_12px_24px_rgba(255,51,47,0.18)]"
              onClick={onUpdateApp}
              type="button"
            >
              อัปเดตตอนนี้
            </button>
          ) : null}
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
            alt="FULLTANK Garage"
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
      const summary = await dashboardApi.summary()
      setData(summary)
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

    </PageShell>
  )
}

function PromotionsPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [items, setItems] = useState<Promotion[]>([])
  const [form, setForm] = useState<Partial<Promotion>>(emptyPromotion)
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(true)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [pendingDeletePromotion, setPendingDeletePromotion] = useState<Promotion | null>(null)
  const [query, setQuery] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)

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
    if (!form.title?.trim()) {
      onNotice('กรุณากรอกชื่อโปรโมชัน', 'error')
      return
    }
    if (!form.imageUrl) {
      onNotice('กรุณาอัปโหลดรูปโปรโมชัน', 'error')
      return
    }
    if (form.startsAt && form.endsAt && form.startsAt > form.endsAt) {
      onNotice('วันที่เริ่มโปรโมชันต้องไม่เกินวันที่สิ้นสุด', 'error')
      return
    }
    try {
      await promotionApi.save({
        ...form,
        description: createCardSummary(form.detail) || form.title?.trim() || '',
      })
      setForm(emptyPromotion)
      setIsEditorOpen(false)
      await load()
      onNotice('บันทึกโปรโมชันแล้ว', 'success')
    } catch {
      onNotice('บันทึกโปรโมชันไม่สำเร็จ', 'error')
    }
  }

  const uploadPromotionImage = async (file: File) => {
    try {
      setIsUploadingImage(true)
      const optimizedFile = await compressImageFile(file)
      const imageUrl = await uploadApi.image(optimizedFile)
      setForm((current) => ({ ...current, imageUrl }))
      onNotice('อัปโหลดรูปโปรโมชันแล้ว', 'success')
    } catch {
      onNotice('อัปโหลดรูปโปรโมชันไม่สำเร็จ', 'error')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const deletePromotion = async (promotion: Promotion) => {
    try {
      await promotionApi.remove(promotion.id)
      setPendingDeletePromotion(null)
      await load()
      onNotice('ลบโปรโมชันแล้ว', 'success')
    } catch {
      onNotice('ลบโปรโมชันไม่สำเร็จ', 'error')
    }
  }

  const openNewPromotion = () => {
    setForm(emptyPromotion)
    setIsEditorOpen(true)
  }

  const editPromotion = (promotion: Promotion) => {
    setForm(promotion)
    setIsEditorOpen(true)
  }

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return items
    }

    return items.filter((item) =>
      [item.title, item.description, item.detail]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [items, query])

  const promotionEditor = (
    <form className="space-y-4 rounded-2xl border border-white/10 bg-[#151515] p-4" onSubmit={save}>
      <UploadedImageField
        help="ตัวอย่างรูปภาพโปรโมชัน"
        imageUrl={form.imageUrl}
        isUploading={isUploadingImage}
        label="รูปโปรโมชัน"
        onFileSelect={uploadPromotionImage}
      />
      <TextInput label="ชื่อโปรโมชัน" onChange={(value) => setForm((current) => ({ ...current, title: value }))} placeholder="เช่น ติดฟิล์มรอบคัน ราคาพิเศษ" value={form.title} />
      <TextAreaInput
        label="รายละเอียดโปรโมชัน"
        onChange={(value) => setForm((current) => ({ ...current, detail: value }))}
        placeholder="เงื่อนไข ส่วนลด ระยะเวลา วิธีใช้สิทธิ์ หรือรายละเอียดเพิ่มเติมสำหรับหน้าอ่านรายละเอียด"
        value={form.detail}
      />
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-6">
        <div className="min-w-0">
          <TextInput label="เริ่ม" onChange={(value) => setForm((current) => ({ ...current, startsAt: value }))} type="date" value={form.startsAt} />
        </div>
        <div className="min-w-0">
          <TextInput label="สิ้นสุด" onChange={(value) => setForm((current) => ({ ...current, endsAt: value }))} type="date" value={form.endsAt} />
        </div>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#101010] px-3 py-3">
        <span className="min-w-0">
          <span className="block text-sm font-black text-white">เปิดใช้งานโปรโมชัน</span>
          <span className="block text-xs font-bold text-white/45">ปิดไว้หากยังไม่ต้องการให้แสดงในหน้าโปรโมชัน</span>
        </span>
        <input
          checked={form.isActive ?? true}
          className="size-5 shrink-0 accent-[#ff332f]"
          onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
          type="checkbox"
        />
      </label>
      <FormPreviewDivider />
      <AdminPromotionPreview promotion={form} />
      <div className="flex justify-end">
        <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff332f] px-4 text-sm font-black" type="submit">
          <Plus size={17} />
          บันทึกโปรโมชัน
        </button>
      </div>
    </form>
  )

  return (
    <>
      <PageShell title="จัดการโปรโมชัน" subtitle="ข้อมูลส่วนนี้จะถูกใช้ทั้ง card โปรโมชันและหน้าอ่านรายละเอียด">
        <ManagementToolbar
          addLabel="เพิ่มโปรโมชัน"
          onAdd={openNewPromotion}
          onSearch={setQuery}
          placeholder="ค้นหาโปรโมชัน"
          query={query}
        />
        <section className="mt-20 min-w-0">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {isLoadingPromotions ? <AdminGridSkeleton variant="promotion" /> : null}
            {filteredItems.map((item) => (
              <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]" key={item.id}>
                <div className="promotion-square-media relative bg-[#080808]">
                  {item.imageUrl ? <img alt="" className="absolute inset-0 size-full object-contain" src={item.imageUrl} /> : null}
                </div>
                <div className="p-3">
                  <p className="break-words text-base font-black">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-white/52">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-white/55">
                      <CalendarDays size={15} />
                      {formatPromotionDateRange(item.startsAt, item.endsAt)}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-[#ff6965]">
                      อ่านรายละเอียด
                      <ChevronRight size={16} />
                    </span>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-white/70" onClick={() => editPromotion(item)} type="button">
                      แก้ไข
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-xl border border-[#ff403b]/30 px-4 py-2 text-sm font-black text-[#ff6965]"
                      onClick={() => setPendingDeletePromotion(item)}
                      type="button"
                    >
                      <Trash2 size={14} />
                      ลบ
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!isLoadingPromotions && filteredItems.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-[#101010] px-4 py-8 text-center text-sm font-bold text-white/48 sm:col-span-2 xl:col-span-3">
                {items.length === 0 ? 'ยังไม่มีโปรโมชัน' : 'ไม่พบโปรโมชันที่ค้นหา'}
              </p>
            ) : null}
          </div>
        </div>
        </section>
      </PageShell>
      <BottomEditorSheet
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={form.id ? 'แก้ไขโปรโมชัน' : 'เพิ่มโปรโมชัน'}
      >
        {promotionEditor}
      </BottomEditorSheet>
      <ConfirmationDialog
        confirmLabel="ลบโปรโมชัน"
        description={`ระบบจะลบโปรโมชัน "${pendingDeletePromotion?.title ?? ''}" ออกจากหน้าโปรโมชันของลูกค้า`}
        isOpen={Boolean(pendingDeletePromotion)}
        onCancel={() => setPendingDeletePromotion(null)}
        onConfirm={() => {
          if (!pendingDeletePromotion) {
            return
          }
          void deletePromotion(pendingDeletePromotion)
        }}
        title="ลบโปรโมชันนี้หรือไม่?"
        variant="danger"
      />
    </>
  )
}

function FilmsPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [items, setItems] = useState<Film[]>([])
  const [form, setForm] = useState<Partial<Film>>(emptyFilm)
  const [isLoadingFilms, setIsLoadingFilms] = useState(true)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isUploadingPriceTable, setIsUploadingPriceTable] = useState(false)
  const [isUploadingGallery, setIsUploadingGallery] = useState(false)
  const [pendingDeleteFilm, setPendingDeleteFilm] = useState<Film | null>(null)
  const [pendingRemoveGalleryImage, setPendingRemoveGalleryImage] = useState('')
  const [query, setQuery] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)

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
    if (!form.name?.trim()) {
      onNotice('กรุณากรอกชื่อฟิล์ม', 'error')
      return
    }
    if (!form.imageUrl) {
      onNotice('กรุณาอัปโหลดรูปฟิล์ม', 'error')
      return
    }
    if (!form.description?.trim()) {
      onNotice('กรุณากรอกรายละเอียดฟิล์ม', 'error')
      return
    }

    try {
      await filmApi.save({
        ...form,
        logo: form.logo?.trim() || createFilmLogo(form.name),
        summary: createCardSummary(form.description, 120),
        slug: form.slug?.trim() || undefined,
      })
      setForm(emptyFilm)
      setIsEditorOpen(false)
      await load()
      onNotice('บันทึกข้อมูลฟิล์มแล้ว', 'success')
    } catch {
      onNotice('บันทึกข้อมูลฟิล์มไม่สำเร็จ', 'error')
    }
  }

  const uploadFilmImage = async (file: File) => {
    try {
      setIsUploadingImage(true)
      const optimizedFile = await compressImageFile(file)
      const imageUrl = await uploadApi.image(optimizedFile)
      setForm((current) => ({ ...current, imageUrl }))
      onNotice('อัปโหลดรูปฟิล์มแล้ว', 'success')
    } catch {
      onNotice('อัปโหลดรูปฟิล์มไม่สำเร็จ', 'error')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const uploadFilmGalleryImage = async (file: File) => {
    try {
      setIsUploadingGallery(true)
      const optimizedFile = await compressImageFile(file)
      const imageUrl = await uploadApi.image(optimizedFile)
      setForm((current) => ({
        ...current,
        galleryImages: [...(current.galleryImages ?? []), imageUrl],
      }))
      onNotice('เพิ่มรูปแกลเลอรีฟิล์มแล้ว', 'success')
    } catch {
      onNotice('อัปโหลดรูปแกลเลอรีไม่สำเร็จ', 'error')
    } finally {
      setIsUploadingGallery(false)
    }
  }

  const uploadFilmPriceTableImage = async (file: File) => {
    try {
      setIsUploadingPriceTable(true)
      const optimizedFile = await compressImageFile(file)
      const imageUrl = await uploadApi.image(optimizedFile)
      setForm((current) => ({ ...current, priceTableImageUrl: imageUrl }))
      onNotice('อัปโหลดรูปตารางราคาฟิล์มแล้ว', 'success')
    } catch {
      onNotice('อัปโหลดรูปตารางราคาไม่สำเร็จ', 'error')
    } finally {
      setIsUploadingPriceTable(false)
    }
  }

  const removeFilmGalleryImage = (imageUrl: string) => {
    setForm((current) => ({
      ...current,
      galleryImages: (current.galleryImages ?? []).filter((item) => item !== imageUrl),
    }))
    setPendingRemoveGalleryImage('')
  }

  const deleteFilm = async (film: Film) => {
    try {
      await filmApi.remove(film.id)
      setPendingDeleteFilm(null)
      await load()
      onNotice('ลบข้อมูลฟิล์มแล้ว', 'success')
    } catch {
      onNotice('ลบข้อมูลฟิล์มไม่สำเร็จ', 'error')
    }
  }

  const openNewFilm = () => {
    setForm(emptyFilm)
    setIsEditorOpen(true)
  }

  const editFilm = (film: Film) => {
    setForm(film)
    setIsEditorOpen(true)
  }

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return items
    }

    return items.filter((item) =>
      [
        item.name,
        item.description,
        item.irr,
        item.uvProtection,
        item.filmType,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [items, query])

  const filmEditor = (
    <form className="space-y-4 rounded-2xl border border-white/10 bg-[#151515] p-4" onSubmit={save}>
      <UploadedImageField
        help="ตัวอย่างรูปภาพโลโก้"
        imageUrl={form.imageUrl}
        isUploading={isUploadingImage}
        label="รูปฟิล์ม"
        onFileSelect={uploadFilmImage}
      />
      <TextInput label="ชื่อฟิล์ม" onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="เช่น VK CERAMIC" value={form.name} />
      <TextAreaInput
        label="รายละเอียดฟิล์ม"
        onChange={(value) => setForm((current) => ({ ...current, description: value }))}
        placeholder="คุณสมบัติ การกันความร้อน การกัน UV หรือรายละเอียดเพิ่มเติมสำหรับหน้าอ่านรายละเอียด"
        value={form.description}
      />
      <div className="grid grid-cols-3 gap-2">
        <TextInput label="IRR" onChange={(value) => setForm((current) => ({ ...current, irr: value }))} placeholder="90%+" value={form.irr} />
        <TextInput label="UV" onChange={(value) => setForm((current) => ({ ...current, uvProtection: value }))} placeholder="99%" value={form.uvProtection} />
        <TextInput label="TYPE" onChange={(value) => setForm((current) => ({ ...current, filmType: value }))} placeholder="AUTO" value={form.filmType} />
      </div>
      <FilmGalleryField
        images={form.galleryImages ?? []}
        isUploading={isUploadingGallery}
        onFileSelect={uploadFilmGalleryImage}
        onRemove={setPendingRemoveGalleryImage}
      />
      <UploadedImageField
        frame="document"
        help="เพิ่มรูปตารางราคาของฟิล์ม"
        imageUrl={form.priceTableImageUrl}
        isUploading={isUploadingPriceTable}
        label="รูปตารางราคาฟิล์ม"
        onFileSelect={uploadFilmPriceTableImage}
      />
      <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#101010] px-3 py-3">
        <span className="min-w-0">
          <span className="block text-sm font-black text-white">เปิดใช้งานฟิล์ม</span>
          <span className="block text-xs font-bold text-white/45">ปิดไว้หากยังไม่ต้องการให้แสดงในหน้าข้อมูลฟิล์ม</span>
        </span>
        <input
          checked={form.isActive ?? true}
          className="size-5 shrink-0 accent-[#ff332f]"
          onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
          type="checkbox"
        />
      </label>
      <FormPreviewDivider />
      <AdminFilmPreview film={form} />
      <div className="flex justify-end">
        <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff332f] px-4 text-sm font-black" type="submit">
          <Plus size={17} />
          บันทึกฟิล์ม
        </button>
      </div>
    </form>
  )

  return (
    <>
      <PageShell title="จัดการฟิล์ม" subtitle="ข้อมูลส่วนนี้จะถูกใช้ทั้ง card ฟิล์มและหน้าอ่านรายละเอียด">
        <ManagementToolbar
          addLabel="เพิ่มฟิล์ม"
          onAdd={openNewFilm}
          onSearch={setQuery}
          placeholder="ค้นหาฟิล์ม"
          query={query}
        />
        <section className="mt-20 min-w-0">
        <div className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {isLoadingFilms ? <AdminGridSkeleton variant="film" /> : null}
            {filteredItems.map((item) => (
              <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]" key={item.id}>
                <div className="promotion-square-media relative bg-[#080808]">
                  {item.imageUrl ? <img alt="" className="absolute inset-0 size-full object-contain" src={item.imageUrl} /> : null}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-base font-black">{item.name}</p>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-white/70" onClick={() => editFilm(item)} type="button">
                      แก้ไข
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-xl border border-[#ff403b]/30 px-4 py-2 text-sm font-black text-[#ff6965]"
                      onClick={() => setPendingDeleteFilm(item)}
                      type="button"
                    >
                      <Trash2 size={14} />
                      ลบ
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {!isLoadingFilms && filteredItems.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-[#101010] px-4 py-8 text-center text-sm font-bold text-white/48 sm:col-span-2">
                {items.length === 0 ? 'ยังไม่มีข้อมูลฟิล์ม' : 'ไม่พบฟิล์มที่ค้นหา'}
              </p>
            ) : null}
          </div>
        </div>
        </section>
      </PageShell>
      <BottomEditorSheet
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={form.id ? 'แก้ไขฟิล์ม' : 'เพิ่มฟิล์ม'}
      >
        {filmEditor}
      </BottomEditorSheet>
      <ConfirmationDialog
        confirmLabel="ลบฟิล์ม"
        description={`ระบบจะลบข้อมูลฟิล์ม "${pendingDeleteFilm?.name ?? ''}" ออกจากหน้าข้อมูลฟิล์มของลูกค้า`}
        isOpen={Boolean(pendingDeleteFilm)}
        onCancel={() => setPendingDeleteFilm(null)}
        onConfirm={() => {
          if (!pendingDeleteFilm) {
            return
          }
          void deleteFilm(pendingDeleteFilm)
        }}
        title="ลบข้อมูลฟิล์มนี้หรือไม่?"
        variant="danger"
      />
      <ConfirmationDialog
        confirmLabel="ลบรูปภาพ"
        description="ระบบจะลบรูปภาพนี้ออกจากฟอร์มข้อมูลฟิล์ม ต้องกดบันทึกฟิล์มอีกครั้งเพื่อบันทึกการเปลี่ยนแปลง"
        isOpen={Boolean(pendingRemoveGalleryImage)}
        onCancel={() => setPendingRemoveGalleryImage('')}
        onConfirm={() => removeFilmGalleryImage(pendingRemoveGalleryImage)}
        title="ลบรูปภาพนี้หรือไม่?"
        variant="danger"
      />
    </>
  )
}

function CustomersPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [registrations, setRegistrations] = useState<WarrantyRegistration[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [query, setQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

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

    return registrations.filter((item) => {
      const installDate = item.installDate?.slice(0, 10) ?? ''
      const matchesDate =
        (!startDate || installDate >= startDate) &&
        (!endDate || installDate <= endDate)
      const matchesTerm = [
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
        .includes(term)

      return matchesDate && matchesTerm
    })
  }, [endDate, query, registrations, startDate])

  const exportCustomers = () => {
    downloadCsv(
      `fulltank-customers-${formatDateInput(new Date())}.csv`,
      ['Serial', 'ลูกค้า', 'เบอร์โทร', 'รุ่นรถ', 'ทะเบียน', 'แบรนด์ฟิล์ม', 'รุ่นฟิล์ม', 'วันที่ติดตั้ง', 'สาขา', 'ช่างติดตั้ง', 'หมายเหตุ'],
      filtered.map((customer) => [
        customer.serialNumber,
        customer.customerName,
        customer.phone,
        customer.carModel,
        customer.licensePlate,
        customer.filmBrand,
        customer.filmModel,
        formatCustomerInstallDate(customer.installDate),
        customer.branch,
        customer.installerName,
        customer.remarks,
      ]),
    )
  }

  return (
    <PageShell title="จัดการข้อมูลลูกค้า" subtitle="ข้อมูลลงทะเบียนรับประกัน">
      <section className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[8.5rem] flex-1">
            <TextInput label="ตั้งแต่วันที่ติดตั้ง" onChange={setStartDate} type="date" value={startDate} />
          </div>
          <div className="min-w-[8.5rem] flex-1">
            <TextInput label="ถึงวันที่ติดตั้ง" onChange={setEndDate} type="date" value={endDate} />
          </div>
          <button className="h-11 rounded-xl border border-white/10 bg-[#101010] px-3 text-xs font-black text-white/70" onClick={() => { setStartDate(''); setEndDate('') }} type="button">
            ล้างวันที่
          </button>
          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff332f] px-3 text-xs font-black text-white" onClick={exportCustomers} type="button">
            <Download size={15} />
            Export
          </button>
        </div>
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
  const [batchCount, setBatchCount] = useState('10')

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

  const createBatchSerials = async () => {
    const count = Math.min(100, Math.max(1, Number(batchCount) || 1))
    const created: SerialNumber[] = []
    const existing = [...serials]

    try {
      for (let index = 0; index < count; index += 1) {
        const nextSerial = generateSerialNumber([...existing, ...created])
        const createdSerial = await warrantyApi.createSerial(nextSerial)
        created.push(createdSerial)
      }
      setSerials((current) => created.reduce(upsertSerialNumber, current))
      onNotice(`สร้าง Serial Number แล้ว ${created.length} รายการ`, 'success')
    } catch {
      onNotice('สร้าง Serial Number แบบชุดไม่สำเร็จ', 'error')
    }
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

  const exportSerials = () => {
    const availableSerials = filteredSerials.filter((serial) => serial.status === 'available')
    if (availableSerials.length === 0) {
      onNotice('ไม่มี Serial Number ที่พร้อมใช้งานสำหรับ Export', 'error')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      onNotice('กรุณาอนุญาต Pop-up เพื่อเปิดไฟล์ PDF สำหรับพิมพ์', 'error')
      return
    }

    const labelItems = availableSerials
      .map((serial) => {
        const serialNumber = escapeHtml(serial.serialNumber)

        return `
          <article class="serial-card">
            <div class="brand">FULLTANK GARAGE</div>
            <div class="title">Serial Number</div>
            <div class="serial">${serialNumber}</div>
          </article>
        `
      })
      .join('')

    printWindow.document.write(`
      <!doctype html>
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>FULLTANK Serial Numbers ${formatDateInput(new Date())}</title>
          <style>
            @page { size: A4; margin: 6mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #111;
              font-family: Arial, "Helvetica Neue", sans-serif;
            }
            .grid {
              display: grid;
              gap: 2mm;
              grid-template-columns: repeat(5, minmax(0, 1fr));
            }
            .serial-card {
              border: 1px dashed #111;
              border-radius: 2mm;
              padding: 1.5mm;
              page-break-inside: avoid;
            }
            .brand {
              color: #d71919;
              font-size: 6px;
              font-weight: 900;
              letter-spacing: .08em;
            }
            .title {
              color: #555;
              font-size: 5px;
              font-weight: 800;
              margin-top: .8mm;
              text-transform: uppercase;
            }
            .serial {
              font-size: 14px;
              font-weight: 900;
              letter-spacing: .08em;
              margin-top: 1.2mm;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <main class="grid">${labelItems}</main>
          <script>
            window.addEventListener('load', () => {
              window.print()
            })
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <PageShell title="จัดการ Serial Number" subtitle="เจนและจัดการ Serial สำหรับลงทะเบียนรับประกัน">
      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,23rem)_1fr]">
        <div className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-4 xl:sticky xl:top-24 xl:self-start">
          <div className="grid grid-cols-2 gap-3">
            <SerialStatCard label="พร้อมใช้งาน" value={availableCount} tone="available" />
            <SerialStatCard label="ถูกใช้แล้ว" value={usedCount} tone="used" />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-[#101010] p-3">
            <TextInput
              label="จำนวนที่ต้องการเจน"
              onChange={(value) => setBatchCount(value.replace(/\D/g, ''))}
              placeholder="10"
              value={batchCount}
            />
            <button
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/8 px-4 text-sm font-black text-white"
              onClick={createBatchSerials}
              type="button"
            >
              <Shuffle size={16} />
              เพิ่ม Serial Number เป็นชุด
            </button>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-white/10 bg-[#151515] p-3 sm:p-4">
          <div className="mb-4 flex min-w-0 items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/36" size={18} />
              <input
                className="h-11 w-full rounded-xl border border-white/12 bg-[#101010] pl-10 pr-3 text-sm font-bold text-white outline-none focus:border-[#ff403b]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหา Serial หรือสถานะ"
                value={query}
              />
            </label>
            <button className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#101010] px-3 text-xs font-black text-white/70" onClick={exportSerials} type="button">
              <Download size={15} />
              <span className="hidden sm:inline">ดาวน์โหลดเป็น PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
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

export default App
