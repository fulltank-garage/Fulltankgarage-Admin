import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

type ConfirmationDialogVariant = 'primary' | 'danger'

type ConfirmationDialogProps = {
  cancelLabel?: string
  children?: ReactNode
  confirmLabel: string
  confirmDisabled?: boolean
  description: string
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
  variant?: ConfirmationDialogVariant
}

const variantMeta = {
  primary: {
    icon: CheckCircle2,
    iconClassName: 'text-[#ff3b36]',
    buttonClassName:
      'border border-[#ff3b36] bg-transparent text-[#ff6b66] hover:bg-[#ff3b36]/10 hover:text-white',
  },
  danger: {
    icon: AlertTriangle,
    iconClassName: 'text-[#ff3b36]',
    buttonClassName:
      'border border-[#ff3b36] bg-transparent text-[#ff6b66] hover:bg-[#ff3b36]/10 hover:text-white',
  },
} satisfies Record<
  ConfirmationDialogVariant,
  {
    buttonClassName: string
    icon: typeof CheckCircle2
    iconClassName: string
  }
>

const closeAnimationMs = 500

export function ConfirmationDialog({
  cancelLabel = 'ยกเลิก',
  children,
  confirmLabel,
  confirmDisabled = false,
  description,
  isOpen,
  onCancel,
  onConfirm,
  title,
  variant = 'primary',
}: ConfirmationDialogProps) {
  const meta = variantMeta[variant]
  const Icon = meta.icon
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false)
      return
    }

    setShouldRender(true)
    setIsVisible(false)

    const timeoutId = window.setTimeout(() => {
      setIsVisible(true)
    }, 24)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRender(false)
    }, closeAnimationMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isOpen])

  useEffect(() => {
    if (!shouldRender) {
      return
    }

    const originalOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [shouldRender, onCancel])

  if (!shouldRender) {
    return null
  }

  return (
    <div
      aria-modal="true"
      className={[
        'fixed inset-0 z-[60] grid place-items-center overflow-hidden px-4 py-6 backdrop-blur-md transition-colors duration-300',
        isVisible ? 'bg-black/78' : 'bg-black/0',
      ].join(' ')}
      role="dialog"
    >
      <div
        className={[
          'relative flex aspect-square w-full max-w-[420px] transform-gpu flex-col overflow-hidden rounded-[28px] border border-[#333] bg-[#111] shadow-[0_28px_90px_rgba(0,0,0,0.72),0_0_44px_rgba(255,51,47,0.12)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform',
          isVisible ? 'translate-y-0' : 'translate-y-[calc(50dvh+50%+6rem)]',
        ].join(' ')}
      >
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-6 text-center">
          <div className={`grid shrink-0 place-items-center ${meta.iconClassName}`}>
            <Icon size={46} strokeWidth={2.4} />
          </div>

          <div className="mt-5 min-w-0">
            <h2 className="text-xl font-black leading-8 text-white">
              {title}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#a7a7a7]">
              {description}
            </p>
            {children ? <div className="mt-4">{children}</div> : null}
          </div>

          <button
            aria-label="ปิดหน้าต่างยืนยัน"
            className="absolute right-4 top-4 grid size-9 shrink-0 place-items-center rounded-2xl border border-[#2c2c2c] bg-[#080808] text-[#a7a7a7] transition hover:border-[#ff3b36]/50 hover:text-white"
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#2b2b2b] bg-[#080808] p-4 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-[#ff3b36] to-[#d91409] px-4 text-sm font-black text-white shadow-[0_18px_36px_rgba(255,51,47,0.24)] transition hover:brightness-110"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${meta.buttonClassName}`}
            disabled={confirmDisabled}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
