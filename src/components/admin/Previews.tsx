import { CalendarDays, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Film, Promotion } from '../../services/fulltankApi'
import { createCardSummary, formatPromotionDateRange } from '../../utils/adminFormatters'

function PreviewMediaPanel({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#080205]">
      <div className="border-b border-white/10 px-4 py-3">
        <h4 className="text-base font-black text-white">{title}</h4>
      </div>
      <div className="grid min-h-56 place-items-center px-4 py-4 sm:min-h-72">
        {children}
      </div>
    </section>
  )
}

export function FormPreviewDivider() {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="h-px flex-1 bg-white/10" />
      <span className="rounded-full bg-[#C0392B] px-5 py-2 text-sm font-black text-white shadow-[0_14px_32px_rgba(192,57,43,0.24)]">
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
    <div className="overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#151515] shadow-[0_0_34px_rgba(192,57,43,0.14)]">
      <div className="border-b border-white/10 bg-[#080205] px-3 py-3 text-center">
        <p className="text-sm font-black text-white">ตัวอย่างข้อมูลก่อนบันทึก</p>
      </div>
      <div className="p-4 pb-0">
        <PreviewMediaPanel title="รูปโปรโมชัน">
          {promotion.imageUrl ? (
            <img alt="" className="max-h-[18rem] max-w-full object-contain" src={promotion.imageUrl} />
          ) : (
            <span className="text-center text-sm font-black leading-5 text-white/54">
              ตัวอย่างรูปภาพโปรโมชัน
            </span>
          )}
        </PreviewMediaPanel>
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
          <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[12px] font-black leading-none text-[#C0392B]">
            อ่านรายละเอียด
            <ChevronRight className="text-[#C0392B]" size={17} />
          </span>
        </div>
      </div>
    </div>
  )
}

export function AdminFilmPreview({ film }: { film: Partial<Film> }) {
  const name = film.name?.trim() || 'ชื่อฟิล์ม'
  const description = film.description?.trim() || 'รายละเอียดฟิล์มจะแสดงในหน้าอ่านรายละเอียด'
  const highlights = film.highlights ?? []

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#151515] shadow-[0_0_34px_rgba(192,57,43,0.18)]">
      <div className="border-b border-white/10 bg-[#080205] px-3 py-3 text-center">
        <p className="text-sm font-black text-white">ตัวอย่างข้อมูลก่อนบันทึก</p>
      </div>
      <div className="p-4 pb-0">
        <PreviewMediaPanel title="รูปโลโก้ฟิล์ม">
          {film.imageUrl ? (
            <img
              alt=""
              className="block max-h-[18rem] max-w-full object-contain object-center"
              src={film.imageUrl}
              style={{ objectPosition: 'center center' }}
            />
          ) : (
            <span className="px-5 text-center text-sm font-black leading-5 text-white/54">
              ตัวอย่างรูปภาพโลโก้
            </span>
          )}
        </PreviewMediaPanel>
      </div>

      <div className="p-4">
        <h3 className="break-words text-3xl font-black leading-tight text-white">{name}</h3>
      </div>

      <div className="mx-4 rounded-2xl border border-[#C0392B]/22 bg-[#C0392B]/8 p-4">
        <h4 className="text-sm font-black text-white">รายละเอียดฟิล์ม</h4>
        <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-white/62">
          {description}
        </p>
      </div>

      <div className="p-4 pt-0">
        {film.galleryImages?.length ? (
          <div className="mt-5 grid gap-3">
            {film.galleryImages.slice(0, 3).map((imageUrl) => (
              <PreviewMediaPanel key={imageUrl} title="รูปภาพเพิ่มเติม">
                <img alt="" className="max-h-[18rem] max-w-full object-contain" src={imageUrl} />
              </PreviewMediaPanel>
            ))}
          </div>
        ) : null}
        {film.priceTableImageUrl ? (
          <div className="mt-5">
            <PreviewMediaPanel title="ตารางราคาฟิล์ม">
              <img alt="" className="max-h-[18rem] max-w-full object-contain" src={film.priceTableImageUrl} />
            </PreviewMediaPanel>
          </div>
        ) : null}
        <div className="mt-3 grid gap-2">
          {highlights.map((highlight, index) => (
            <div className="rounded-xl border border-[#C0392B]/18 bg-[#C0392B]/8 px-3 py-3 text-sm font-bold text-white/72" key={`${highlight}-${index}`}>
              {highlight}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
