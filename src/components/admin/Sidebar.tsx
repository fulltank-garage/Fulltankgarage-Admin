import { LogOut, X } from 'lucide-react'
import fulltankGarageLogo from '../../assets/fulltank-garage-logo.jpg'
import { pages } from '../../config/adminPages'
import type { AuthSession, RealtimeStatus } from '../../services/fulltankApi'
import type { Page } from '../../types/admin'
import { formatAdminDisplayName, formatLatestRealtimeAt } from '../../utils/adminRealtime'

export function Sidebar({
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
        : 'bg-[#C0392B]'

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
          className="grid size-10 place-items-center rounded-xl border border-white/10 text-white/70 lg:hidden"
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
                  ? 'bg-[#C0392B] text-white shadow-[0_12px_28px_rgba(192,57,43,0.22)]'
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
        <div className="mt-3 rounded-xl border border-white/10 bg-[#080205] px-3 py-3">
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
              ? 'border-[#C0392B]/36 bg-[#C0392B]/12'
              : 'border-white/10 bg-[#080205]',
          ].join(' ')}
        >
          <div className="flex items-start gap-2">
            <span
              className={[
                'mt-1 size-2.5 shrink-0 rounded-full',
                hasPendingAppUpdate ? 'app-update-pulse bg-[#C0392B]' : 'bg-white/22',
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
              className="mt-3 h-10 w-full rounded-xl bg-[#C0392B] text-xs font-black text-white shadow-[0_12px_24px_rgba(192,57,43,0.18)]"
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
