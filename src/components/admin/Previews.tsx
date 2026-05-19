import { CalendarDays, ChevronRight } from 'lucide-react'
import type { Film, Promotion } from '../../services/fulltankApi'
import { createCardSummary, formatPromotionDateRange } from '../../utils/adminFormatters'

export function FormPreviewDivider() {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="h-px flex-1 bg-white/10" />
      <span className="rounded-full bg-[#ff332f] px-5 py-2 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,51,47,0.24)]">
        ตัวอย่างข้อมูลก่อนบันทึก
      </span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  )
}

export function AdminPromotionPreview({ promotion }: { promotion: Partial<Promotion> }) {
  const title = promotion.title?.trim() || 'ชื่อโปรโมชัน'
  const description =
    createCardSummary(promotion.detail) || promotion.description?.trim() || 'รายละเอียดจะแสดงใน card'

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#151515] shadow-[0_0_34px_rgba(255,30,26,0.14)]">
      <div className="border-b border-white/10 bg-[#080808] px-3 py-3 text-center">
        <p className="text-sm font-black text-white">ตัวอย่างข้อมูลก่อนบันทึก</p>
      </div>
      <div className="relative grid aspect-[16/9] max-h-80 place-items-center overflow-hidden bg-gradient-to-br from-[#2a1111] via-[#151515] to-[#070707]">
        {promotion.imageUrl ? (
          <img alt="" className="max-h-full max-w-full object-contain" src={promotion.imageUrl} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#2a1111] via-[#151515] to-[#070707] px-5">
            <span className="text-center text-sm font-black leading-5 text-white/72">
              ตัวอย่างรูปภาพโปรโมชัน
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="break-words text-xl font-black text-white">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/62">{description}</p>
        <div className="mt-4 flex min-w-0 items-center justify-between gap-2 border-t border-white/10 pt-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-bold leading-none text-white/62">
            <CalendarDays className="shrink-0" size={14} />
            <span className="truncate whitespace-nowrap">
              {formatPromotionDateRange(promotion.startsAt, promotion.endsAt)}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[12px] font-black leading-none text-[#ff6965]">
            อ่านรายละเอียด
            <ChevronRight className="text-[#ff403b]" size={17} />
          </span>
        </div>
      </div>
    </div>
  )
}

export function AdminFilmPreview({ film }: { film: Partial<Film> }) {
  const name = film.name?.trim() || 'ชื่อฟิล์ม'
  const description = film.description?.trim() || 'รายละเอียดฟิล์มจะแสดงในหน้าอ่านรายละเอียด'
  const specs = [
    { label: 'IRR', value: film.irr?.trim() || '90%+' },
    { label: 'UV', value: film.uvProtection?.trim() || '99%' },
    { label: 'TYPE', value: film.filmType?.trim() || 'AUTO' },
  ]

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#151515] shadow-[0_0_34px_rgba(255,30,26,0.18)]">
      <div className="border-b border-white/10 bg-[#080808] px-3 py-3 text-center">
        <p className="text-sm font-black text-white">ตัวอย่างข้อมูลก่อนบันทึก</p>
      </div>
      <div className="relative grid aspect-[16/9] max-h-80 place-items-center overflow-hidden bg-gradient-to-br from-[#ff312b] via-[#7e1110] to-[#151515]">
        {film.imageUrl ? (
          <img alt="" className="max-h-full max-w-full object-contain" src={film.imageUrl} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#ff403b] via-[#161616] to-[#050505]">
            <span className="px-5 text-center text-sm font-black leading-5 text-white/72">
              ตัวอย่างรูปภาพโลโก้
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="break-words text-3xl font-black leading-tight text-white">{name}</h3>
      </div>

      <div className="mx-4 rounded-2xl border border-[#ff403b]/22 bg-[#ff403b]/8 p-4">
        <h4 className="text-sm font-black text-white">รายละเอียดฟิล์ม</h4>
        <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-white/62">
          {description}
        </p>
      </div>

      <div className="p-4 pt-0">
        {film.galleryImages?.length ? (
          <div className="mt-5 grid gap-3">
            {film.galleryImages.slice(0, 3).map((imageUrl) => (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]" key={imageUrl}>
                <img alt="" className="h-auto w-full object-contain" src={imageUrl} />
              </div>
            ))}
          </div>
        ) : null}
        {film.priceTableImageUrl ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">
            <div className="border-b border-white/10 px-3 py-2 text-sm font-black text-white">
              ตารางราคาฟิล์ม
            </div>
            <img alt="" className="h-auto w-full object-contain" src={film.priceTableImageUrl} />
          </div>
        ) : null}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {specs.map((spec) => (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center" key={spec.label}>
              <p className="text-xs font-black text-[#ff4a45]">{spec.label}</p>
              <p className="mt-1 text-lg font-black text-white">{spec.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
