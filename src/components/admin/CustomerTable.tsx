import type { WarrantyRegistration } from '../../services/fulltankApi'
import { formatCustomerInstallDate } from '../../utils/adminFormatters'
import { CustomerTableSkeleton } from './Skeletons'

export function CustomerTable({
  customers,
  isLoading = false,
}: {
  customers: WarrantyRegistration[]
  isLoading?: boolean
}) {
  if (isLoading) {
    return <CustomerTableSkeleton />
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {customers.map((customer) => (
          <article
            className="rounded-2xl border border-white/10 bg-[#101010] p-3 text-sm font-bold text-white/72"
            key={customer.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-base font-black text-white">
                  {customer.customerName || '-'}
                </p>
                <p className="mt-1 break-all text-xs text-white/42">
                  {customer.phone || '-'}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#C0392B]/12 px-2.5 py-1 text-xs font-black text-[#C0392B]">
                {customer.serialNumber}
              </span>
            </div>

            <dl className="mt-3 grid gap-2">
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                <dt className="text-xs font-black text-white/38">รถ</dt>
                <dd className="min-w-0 break-words text-white/78">
                  {customer.carModel || '-'} / {customer.licensePlate || '-'}
                </dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                <dt className="text-xs font-black text-white/38">ฟิล์ม</dt>
                <dd className="min-w-0 break-words text-white/78">
                  {customer.filmBrand || '-'} {customer.filmModel || ''}
                </dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                <dt className="text-xs font-black text-white/38">ติดตั้ง</dt>
                <dd className="min-w-0 break-words text-white/78">
                  {formatCustomerInstallDate(customer.installDate)}
                </dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                <dt className="text-xs font-black text-white/38">สาขา</dt>
                <dd className="min-w-0 break-words text-white/78">
                  {customer.branch || '-'}
                </dd>
              </div>
            </dl>
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
            {customers.map((customer) => (
              <tr className="bg-[#101010] text-sm font-bold text-white/72" key={customer.id}>
                <td className="rounded-l-xl px-3 py-3 text-white">{customer.serialNumber}</td>
                <td className="px-3 py-3">
                  <p className="text-white">{customer.customerName}</p>
                  <p className="text-xs text-white/42">{customer.phone}</p>
                </td>
                <td className="px-3 py-3">
                  <p>{customer.carModel}</p>
                  <p className="text-xs text-white/42">{customer.licensePlate}</p>
                </td>
                <td className="px-3 py-3">
                  {customer.filmBrand} {customer.filmModel}
                </td>
                <td className="px-3 py-3">{formatCustomerInstallDate(customer.installDate)}</td>
                <td className="rounded-r-xl px-3 py-3">{customer.branch || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {customers.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-[#101010] px-4 py-8 text-center text-sm font-bold text-white/48">
          ยังไม่มีข้อมูล
        </p>
      ) : null}
    </>
  )
}
