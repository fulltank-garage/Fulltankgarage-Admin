import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

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
    iconClassName: 'border-[#ff3b36]/35 bg-[#2a0808] text-[#ff5a55]',
    buttonClassName:
      'bg-gradient-to-r from-[#ff3b36] to-[#d91409] text-white shadow-[0_18px_36px_rgba(255,51,47,0.24)] hover:brightness-110',
  },
  danger: {
    icon: AlertTriangle,
    iconClassName: 'border-[#ff3b36]/45 bg-[#2d0505] text-[#ff4a45]',
    buttonClassName:
      'bg-gradient-to-r from-[#ff332f] to-[#d91409] text-white shadow-[0_18px_36px_rgba(255,51,47,0.28)] hover:brightness-110',
  },
} satisfies Record<
  ConfirmationDialogVariant,
  {
    buttonClassName: string
    icon: typeof CheckCircle2
    iconClassName: string
  }
>

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

  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen, onCancel])

  if (!isOpen) {
    return null
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/78 px-4 py-6 backdrop-blur-md"
      role="dialog"
    >
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#333] bg-[#111] shadow-[0_28px_90px_rgba(0,0,0,0.72),0_0_44px_rgba(255,51,47,0.12)]">
        <div className="h-1 w-full bg-gradient-to-r from-[#ff3b36] via-[#ff5a55] to-[#d91409]" />
        <div className="flex items-start gap-3 p-5">
          <div
            className={`grid size-11 shrink-0 place-items-center rounded-2xl border ${meta.iconClassName}`}
          >
            <Icon size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black leading-7 text-white">
              {title}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#a7a7a7]">
              {description}
            </p>
            {children ? <div className="mt-4">{children}</div> : null}
          </div>

          <button
            aria-label="ปิดหน้าต่างยืนยัน"
            className="grid size-9 shrink-0 place-items-center rounded-2xl border border-[#2c2c2c] bg-[#080808] text-[#a7a7a7] transition hover:border-[#ff3b36]/50 hover:text-white"
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#2b2b2b] bg-[#080808] p-4 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#333] bg-[#141414] px-4 text-sm font-black text-[#d8d8d8] transition hover:border-[#ff3b36]/45 hover:bg-[#1c1c1c] hover:text-white"
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
