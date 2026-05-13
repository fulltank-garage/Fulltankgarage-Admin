import { X } from 'lucide-react'
import { useEffect } from 'react'

type AppSnackbarProps = {
  message: string
  onClose: () => void
}

export function AppSnackbar({ message, onClose }: AppSnackbarProps) {
  useEffect(() => {
    if (!message) {
      return
    }

    const timeout = window.setTimeout(onClose, 4200)
    return () => window.clearTimeout(timeout)
  }, [message, onClose])

  if (!message) {
    return null
  }

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 sm:top-5">
      <div className="pointer-events-auto flex min-h-12 items-center gap-3 rounded-2xl border border-[#d8c1a8] bg-[#6f5238] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-[#6f5238]/20">
        <span className="min-w-0 flex-1">{message}</span>
        <button
          aria-label="ปิดแจ้งเตือน"
          className="grid size-7 shrink-0 place-items-center rounded-xl text-[#f5dfc8] transition hover:bg-white/10 hover:text-white"
          onClick={onClose}
          type="button"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
