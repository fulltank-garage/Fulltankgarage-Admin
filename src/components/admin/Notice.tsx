import type { NoticeTone } from '../../types/admin'

export function Notice({ message, tone }: { message: string; tone: NoticeTone }) {
  return (
    <div className="pointer-events-none fixed left-0 right-0 top-[4.75rem] z-[120] flex justify-center px-4 lg:left-72 lg:px-8">
      <div
        className={[
          'snackbar-notice w-[min(100%,28rem)] rounded-2xl border px-4 py-3 text-center text-sm font-black text-white shadow-[0_18px_42px_rgba(0,0,0,0.35)]',
          tone === 'success'
            ? 'border-[#00d084]/30 bg-[#00d084]'
            : tone === 'error'
              ? 'border-[#C0392B]/30 bg-[#C0392B]'
              : 'border-[#00b5e8]/30 bg-[#00b5e8]',
        ].join(' ')}
      >
        {message}
      </div>
    </div>
  )
}
