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
    iconClassName: 'bg-[#fbf1e7] text-[#8f6847]',
    buttonClassName: 'bg-[#9a7655] text-white hover:bg-[#8f6847]',
  },
  danger: {
    icon: AlertTriangle,
    iconClassName: 'bg-[#f8eee8] text-[#9a5f45]',
    buttonClassName: 'bg-[#9a5f45] text-white hover:bg-[#874f39]',
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
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[#3f2e23]/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#ead8c7] bg-white shadow-2xl">
        <div className="flex items-start gap-3 p-5">
          <div
            className={`grid size-11 shrink-0 place-items-center rounded-2xl ${meta.iconClassName}`}
          >
            <Icon size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-7 text-slate-950">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
            {children ? <div className="mt-4">{children}</div> : null}
          </div>

          <button
            aria-label="ปิดหน้าต่างยืนยัน"
            className="grid size-9 shrink-0 place-items-center rounded-2xl text-slate-500 transition hover:bg-[#fff8f1] hover:text-slate-800"
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#ead8c7] bg-[#fff8f1] p-4 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#dbc6b2] bg-white px-4 text-sm font-semibold text-[#6f5238] transition hover:bg-[#fbf1e7]"
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
