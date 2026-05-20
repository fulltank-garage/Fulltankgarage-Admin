import { CalendarDays } from 'lucide-react'

export function SkeletonBlock({ className }: { className: string }) {
  return <span aria-hidden="true" className={`block skeleton-shimmer ${className}`} />
}

export function AdminGridSkeleton({
  variant = 'list',
}: {
  variant?: 'list' | 'promotion' | 'film'
}) {
  const itemCount = variant === 'film' || variant === 'promotion' ? 8 : 6

  return (
    <>
      {Array.from({ length: itemCount }, (_, index) => (
        <article
          aria-hidden="true"
          className={[
            'overflow-hidden rounded-2xl border border-white/10 bg-[#101010]',
            variant === 'list' ? 'flex gap-3 p-3' : '',
          ].join(' ')}
          key={index}
        >
          {variant === 'promotion' || variant === 'film' ? (
            <>
              <SkeletonBlock className="promotion-square-media w-full rounded-none" />
              <div className="p-3">
                {variant === 'film' ? (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <SkeletonBlock className="h-5 w-4/5 rounded-xl" />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <SkeletonBlock className="h-9 w-16 rounded-xl" />
                      <SkeletonBlock className="h-9 w-16 rounded-xl" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <SkeletonBlock className="h-5 w-4/5 rounded-xl" />
                    </div>
                    <div className="mt-3 flex min-w-0 items-center gap-1.5 border-t border-white/10 pt-3">
                      <CalendarDays className="shrink-0 text-white/85" size={14} />
                      <SkeletonBlock className="h-4 min-w-0 flex-1 rounded-xl" />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <SkeletonBlock className="h-9 w-16 rounded-xl" />
                      <SkeletonBlock className="h-9 w-16 rounded-xl" />
                    </div>
                  </>
                )}
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

export function SerialListSkeleton() {
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

export function CustomerTableSkeleton() {
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
