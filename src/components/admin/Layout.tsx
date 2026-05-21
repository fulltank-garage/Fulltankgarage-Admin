import { Plus, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

export function PageShell({
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

export function ManagementToolbar({
  addLabel,
  onAdd,
  onSearch,
  placeholder,
  query,
}: {
  addLabel: string
  onAdd: () => void
  onSearch: (value: string) => void
  placeholder: string
  query: string
}) {
  return (
    <div className="fixed left-4 right-4 top-[5.25rem] z-20 rounded-2xl border border-white/10 bg-[#101010]/96 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.35)] backdrop-blur lg:left-[20rem] lg:right-8 lg:top-[5.5rem]">
      <div className="flex min-w-0 items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/36" size={18} />
          <input
            className="h-12 w-full rounded-xl border border-white/12 bg-[#080205] pl-10 pr-3 text-sm font-bold text-white outline-none focus:border-[#C0392B]"
            onChange={(event) => onSearch(event.target.value)}
            placeholder={placeholder}
            value={query}
          />
        </label>
        <button
          className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#C0392B] px-3 text-xs font-black text-white shadow-[0_16px_34px_rgba(192,57,43,0.22)] sm:gap-2 sm:px-4 sm:text-sm"
          onClick={onAdd}
          type="button"
        >
          <Plus size={18} />
          <span className="whitespace-nowrap">{addLabel}</span>
        </button>
      </div>
    </div>
  )
}

export function BottomEditorSheet({
  children,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  title: string
}) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  return (
    <div
      aria-hidden={!isOpen}
      className={[
        'fixed inset-y-0 left-0 right-0 z-50 lg:left-72',
        isOpen ? 'pointer-events-auto' : 'pointer-events-none',
      ].join(' ')}
    >
      <button
        aria-label="ปิดฟอร์ม"
        className={[
          'absolute inset-0 bg-black/72 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label={title}
        className={[
          'absolute inset-x-3 bottom-3 top-[5.25rem] mx-auto flex w-auto transform-gpu flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#080205] shadow-[0_-28px_80px_rgba(0,0,0,0.72)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:inset-x-8 lg:bottom-8 lg:top-[5.5rem]',
          isOpen ? 'translate-y-0' : 'translate-y-[calc(100%+6rem)]',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#080205]/96 px-4 py-3 backdrop-blur">
          <h2 className="text-lg font-black text-white">{title}</h2>
          <button
            aria-label="ปิดฟอร์ม"
            className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#101010] text-white/72"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  )
}
