import type { SerialNumber } from '../../services/fulltankApi'

export function SerialStatCard({
  label,
  tone,
  value,
}: {
  label: string
  tone: 'available' | 'used'
  value: number
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#101010] p-3">
      <p className="text-xs font-black text-white/52">{label}</p>
      <p
        className={[
          'mt-2 text-3xl font-black leading-none',
          tone === 'available' ? 'text-emerald-300' : 'text-[#ff6965]',
        ].join(' ')}
      >
        {value.toLocaleString('th-TH')}
      </p>
    </article>
  )
}

export function SerialRow({ serial }: { serial: SerialNumber }) {
  const isAvailable = serial.status === 'available'

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#101010] px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white">{serial.serialNumber}</p>
        <p className="mt-1 text-xs font-semibold text-white/38">
          {serial.createdAt
            ? `สร้างเมื่อ ${new Date(serial.createdAt).toLocaleDateString('th-TH')}`
            : 'ยังไม่มีวันที่สร้าง'}
        </p>
      </div>
      <span
        className={[
          'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black text-white',
          isAvailable ? 'bg-[#00d084]' : 'bg-[#4a1717]',
        ].join(' ')}
      >
        {isAvailable ? 'พร้อมใช้งาน' : 'ถูกใช้งานแล้ว'}
      </span>
    </div>
  )
}
