import { CheckCircle2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Customer, CustomerSegment, CustomerStatus } from '../services/api'
import { TextField, type CustomerDraft } from './TextField'

const emptyCustomer = (): CustomerDraft => ({
  name: '',
  email: '',
  phone: '',
  country: 'Thailand',
  segment: 'New',
  status: 'active',
  totalOrders: 0,
  totalSpent: 0,
  lastContact: new Date().toISOString().slice(0, 10),
  note: '',
})

type CustomerFormModalProps = {
  customer: Customer | null
  isSaving: boolean
  onClose: () => void
  onSubmit: (draft: CustomerDraft) => Promise<void>
}

export function CustomerFormModal({
  customer,
  isSaving,
  onClose,
  onSubmit,
}: CustomerFormModalProps) {
  const [form, setForm] = useState<CustomerDraft>(() =>
    customer
      ? {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          country: customer.country,
          segment: customer.segment,
          status: customer.status,
          totalOrders: customer.totalOrders,
          totalSpent: customer.totalSpent,
          lastContact: customer.lastContact,
          note: customer.note,
        }
      : emptyCustomer(),
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(form)
  }

  const updateField = (name: keyof CustomerDraft, value: string | number) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <form
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl"
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between border-b border-[#ead8c7] px-5 py-4">
          <div>
            <p className="text-sm font-medium text-[#8f6847]">
              {customer ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล'}
            </p>
            <h2 className="text-xl font-semibold text-slate-950">
              {customer ? customer.name : 'ลูกค้าใหม่'}
            </h2>
          </div>
          <button
            className="grid size-10 place-items-center rounded-2xl border border-[#ead8c7] bg-white text-slate-600 transition hover:bg-[#fff8f1]"
            onClick={onClose}
            title="ปิด"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <TextField
            label="ชื่อลูกค้า"
            name="name"
            onChange={updateField}
            required
            value={form.name}
          />
          <TextField
            label="อีเมล"
            name="email"
            onChange={updateField}
            required
            type="email"
            value={form.email}
          />
          <TextField
            label="เบอร์โทร"
            name="phone"
            onChange={updateField}
            required
            value={form.phone}
          />
          <TextField
            label="ประเทศ"
            name="country"
            onChange={updateField}
            required
            value={form.country}
          />

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              กลุ่มลูกค้า
            </span>
            <select
              className="h-11 w-full rounded-2xl border border-[#dbc6b2] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#9a7655] focus:ring-4 focus:ring-[#f1dfcd]"
              onChange={(event) =>
                updateField('segment', event.target.value as CustomerSegment)
              }
              value={form.segment}
            >
              <option value="VIP">VIP</option>
              <option value="Regular">Regular</option>
              <option value="New">New</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              สถานะ
            </span>
            <select
              className="h-11 w-full rounded-2xl border border-[#dbc6b2] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#9a7655] focus:ring-4 focus:ring-[#f1dfcd]"
              onChange={(event) =>
                updateField('status', event.target.value as CustomerStatus)
              }
              value={form.status}
            >
              <option value="active">ใช้งาน</option>
              <option value="pending">รอติดตาม</option>
              <option value="inactive">พักการใช้งาน</option>
            </select>
          </label>

          <TextField
            label="จำนวนคำสั่งซื้อ"
            min={0}
            name="totalOrders"
            onChange={updateField}
            required
            type="number"
            value={form.totalOrders}
          />
          <TextField
            label="ยอดใช้จ่าย"
            min={0}
            name="totalSpent"
            onChange={updateField}
            required
            type="number"
            value={form.totalSpent}
          />
          <TextField
            label="ติดต่อล่าสุด"
            name="lastContact"
            onChange={updateField}
            required
            type="date"
            value={form.lastContact}
          />
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              หมายเหตุ
            </span>
            <textarea
              className="min-h-28 w-full resize-y rounded-2xl border border-[#dbc6b2] bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-[#9a7655] focus:ring-4 focus:ring-[#f1dfcd]"
              onChange={(event) => updateField('note', event.target.value)}
              value={form.note}
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#ead8c7] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#dbc6b2] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-[#fff8f1]"
            onClick={onClose}
            type="button"
          >
            ยกเลิก
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#6f5238] px-4 text-sm font-semibold text-white transition hover:bg-[#7f6043] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSaving}
            type="submit"
          >
            <CheckCircle2 size={18} />
            {isSaving ? 'กำลังบันทึก' : 'บันทึกข้อมูล'}
          </button>
        </div>
      </form>
    </div>
  )
}
