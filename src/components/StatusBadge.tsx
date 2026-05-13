import type { CustomerStatus } from '../services/api'

const statusMeta: Record<
  CustomerStatus,
  { label: string; className: string; dotClassName: string }
> = {
  active: {
    label: 'ใช้งาน',
    className: 'border-[#d8c1a8] bg-[#fbf1e7] text-[#8f6847]',
    dotClassName: 'bg-[#9a7655]',
  },
  pending: {
    label: 'รอติดตาม',
    className: 'border-[#e6d0b8] bg-[#fff8f1] text-[#9a7655]',
    dotClassName: 'bg-[#c49a6c]',
  },
  inactive: {
    label: 'พักการใช้งาน',
    className: 'border-[#d7c4b4] bg-[#f3ebe3] text-[#6f5238]',
    dotClassName: 'bg-[#a9917d]',
  },
}

export function StatusBadge({ status }: { status: CustomerStatus }) {
  const meta = statusMeta[status]

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
    >
      <span className={`size-2 rounded-full ${meta.dotClassName}`} />
      {meta.label}
    </span>
  )
}
