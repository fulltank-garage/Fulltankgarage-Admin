import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { filmModelApi, type FilmModel } from '../../services/fulltankApi'
import type { NoticeTone } from '../../types/admin'
import { ConfirmationDialog } from '../ConfirmationDialog'
import { TextInput } from './FormFields'
import { BottomEditorSheet, PageShell } from './Layout'

const emptyFilmModel: Partial<FilmModel> = {
  brand: '',
  series: '',
  code: '',
  notes: '',
  isActive: true,
}

export function FilmModelsPage({ onNotice }: { onNotice: (message: string, tone?: NoticeTone) => void }) {
  const [items, setItems] = useState<FilmModel[]>([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<Partial<FilmModel>>(emptyFilmModel)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingItem, setDeletingItem] = useState<FilmModel | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      setItems(await filmModelApi.list())
    } catch {
      onNotice('โหลดข้อมูลรุ่นฟิล์มไม่สำเร็จ', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [onNotice])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [load])

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return items
    }
    return items.filter((item) => [item.brand, item.series, item.code, item.notes].join(' ').toLowerCase().includes(term))
  }, [items, query])

  const closeEditor = () => {
    setForm(emptyFilmModel)
    setIsEditorOpen(false)
  }
  const openEditor = (item?: FilmModel) => {
    setForm(item ? { ...item } : emptyFilmModel)
    setIsEditorOpen(true)
  }

  const save = async () => {
    if (!form.brand?.trim() || !form.series?.trim() || !form.code?.trim()) {
      onNotice('กรุณากรอกแบรนด์ ซีรีส์ และรหัสรุ่นฟิล์ม', 'error')
      return
    }
    try {
      setIsSaving(true)
      const saved = await filmModelApi.save(form)
      setItems((current) => {
        const exists = current.some((item) => item.id === saved.id)
        return (exists ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved])
          .toSorted((left, right) => `${left.brand} ${left.series} ${left.code}`.localeCompare(`${right.brand} ${right.series} ${right.code}`))
      })
      closeEditor()
      onNotice('บันทึกรุ่นฟิล์มแล้ว', 'success')
    } catch {
      onNotice('บันทึกรุ่นฟิล์มไม่สำเร็จ รหัสรุ่นอาจซ้ำ', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async () => {
    if (!deletingItem) return
    try {
      await filmModelApi.remove(deletingItem.id)
      setItems((current) => current.filter((item) => item.id !== deletingItem.id))
      onNotice('ลบรุ่นฟิล์มแล้ว', 'success')
    } catch {
      onNotice('ลบรุ่นฟิล์มไม่สำเร็จ', 'error')
    } finally {
      setDeletingItem(null)
    }
  }

  return (
    <>
      <PageShell title="จัดการรุ่นฟิล์ม" subtitle="เก็บแบรนด์ ซีรีส์ และรหัสรุ่นฟิล์มสำหรับใช้งานในการลงทะเบียน">
        <section className="rounded-2xl border border-white/10 bg-[#151515] p-3 sm:p-4">
          <div className="mb-4 flex gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/36" size={18} />
              <input className="h-11 w-full rounded-xl border border-white/12 bg-[#101010] pl-10 pr-3 text-sm font-bold text-white outline-none focus:border-[#C0392B]" onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาแบรนด์ ซีรีส์ หรือรหัสฟิล์ม" value={query} />
            </label>
            <button className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C0392B] px-3 text-xs font-black text-white" onClick={() => openEditor()} type="button"><Plus size={16} />เพิ่มรุ่น</button>
          </div>
          {isLoading ? <p className="px-4 py-8 text-center text-sm font-bold text-white/48">กำลังโหลดรุ่นฟิล์ม…</p> : null}
          {!isLoading && filteredItems.length === 0 ? <p className="rounded-xl border border-white/10 bg-[#101010] px-4 py-8 text-center text-sm font-bold text-white/48">ยังไม่มีรุ่นฟิล์ม</p> : null}
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <article className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#101010] px-3 py-3" key={item.id}>
                <div className="min-w-0 flex-1"><p className="font-black text-white">{item.brand} <span className="text-white/58">/ {item.series}</span></p><p className="mt-1 text-sm font-bold text-white/62">{item.code}{item.notes ? <span className="text-white/38"> · {item.notes}</span> : null}</p></div>
                <span className={item.isActive ? 'rounded-full bg-emerald-400/12 px-2 py-1 text-xs font-black text-emerald-300' : 'rounded-full bg-white/8 px-2 py-1 text-xs font-black text-white/45'}>{item.isActive ? 'ใช้งาน' : 'ปิดใช้'}</span>
                <button aria-label="แก้ไขรุ่นฟิล์ม" className="grid size-9 place-items-center rounded-lg border border-white/10 text-white/70" onClick={() => openEditor(item)} type="button"><Pencil size={15} /></button>
                <button aria-label="ลบรุ่นฟิล์ม" className="grid size-9 place-items-center rounded-lg border border-white/10 text-[#ff6b61]" onClick={() => setDeletingItem(item)} type="button"><Trash2 size={15} /></button>
              </article>
            ))}
          </div>
        </section>
      </PageShell>
      <BottomEditorSheet isOpen={isEditorOpen} onClose={closeEditor} title={form.id ? 'แก้ไขรุ่นฟิล์ม' : 'เพิ่มรุ่นฟิล์ม'}>
        <div className="space-y-4">
          <TextInput label="แบรนด์" onChange={(brand) => setForm((current) => ({ ...current, brand }))} placeholder="เช่น 3M" value={form.brand ?? ''} />
          <TextInput label="ซีรีส์" onChange={(series) => setForm((current) => ({ ...current, series }))} placeholder="เช่น Crystalline" value={form.series ?? ''} />
          <TextInput label="รหัสรุ่นฟิล์ม" onChange={(code) => setForm((current) => ({ ...current, code }))} placeholder="เช่น C 70" value={form.code ?? ''} />
          <TextInput label="หมายเหตุ (ถ้ามี)" onChange={(notes) => setForm((current) => ({ ...current, notes }))} value={form.notes ?? ''} />
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#101010] px-3 py-3 text-sm font-black text-white"><input checked={form.isActive ?? true} className="size-4 accent-[#C0392B]" onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} type="checkbox" />เปิดให้ใช้งาน</label>
          <button className="h-11 w-full rounded-xl bg-[#C0392B] text-sm font-black text-white disabled:opacity-55" disabled={isSaving} onClick={() => void save()} type="button">{isSaving ? 'กำลังบันทึก…' : 'บันทึกรุ่นฟิล์ม'}</button>
        </div>
      </BottomEditorSheet>
      <ConfirmationDialog cancelLabel="ยกเลิก" confirmLabel="ลบรุ่นฟิล์ม" description={`ต้องการลบ ${deletingItem?.brand ?? ''} ${deletingItem?.series ?? ''} ${deletingItem?.code ?? ''} ใช่หรือไม่`} isOpen={Boolean(deletingItem)} onCancel={() => setDeletingItem(null)} onConfirm={() => void remove()} title="ยืนยันการลบ" variant="danger" />
    </>
  )
}
