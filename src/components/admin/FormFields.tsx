import { ImagePlus, X } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

const maxTextareaHeight = 288

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto'
  const nextHeight = Math.min(textarea.scrollHeight, maxTextareaHeight)
  textarea.style.height = `${nextHeight}px`
  textarea.style.overflowY = textarea.scrollHeight > maxTextareaHeight ? 'auto' : 'hidden'
}

export function UploadedImageField({
  frame = 'square',
  help = 'เลือกไฟล์รูปภาพจากเครื่อง',
  imageUrl,
  isUploading,
  label,
  name,
  onFileSelect,
}: {
  frame?: 'square' | 'document'
  help?: string
  imageUrl?: string
  isUploading: boolean
  label: string
  name?: string
  onFileSelect: (file: File) => void
}) {
  const isDocumentFrame = frame === 'document'
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState('')
  const displayImageUrl = localPreviewUrl || imageUrl
  const frameClass = isDocumentFrame
    ? 'min-h-56 border border-white/12 bg-[#080205] px-4 py-4 text-white sm:min-h-72'
    : 'h-64 border border-white/12 bg-transparent px-4 sm:h-80'
  const buttonClass = isDocumentFrame
    ? 'mt-2 block w-full cursor-pointer rounded-2xl border border-white/10 bg-[#101010] p-3 text-left transition hover:border-[#C0392B]/45'
    : 'mt-2 block w-full cursor-pointer rounded-2xl border-0 bg-transparent p-0 text-left transition hover:opacity-90'

  useEffect(() => () => {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  const openFilePicker = () => {
    if (!isUploading) {
      inputRef.current?.click()
    }
  }

  return (
    <div className="block text-sm font-bold text-white/68">
      <span>{label}</span>
      <button
        className={buttonClass}
        disabled={isUploading}
        onClick={openFilePicker}
        type="button"
      >
        <div
          className={[
            'relative mx-auto grid w-full place-items-center overflow-hidden rounded-xl',
            frameClass,
          ].join(' ')}
        >
          {displayImageUrl ? (
            <>
              <img
                alt=""
                className={
                  isDocumentFrame
                    ? 'max-h-[18rem] max-w-full object-contain'
                    : 'h-full max-w-full object-contain'
                }
                src={displayImageUrl}
              />
              <div
                className={[
                  'pointer-events-none absolute inset-0 grid place-items-center opacity-100',
                  isDocumentFrame ? 'bg-black/24' : 'bg-transparent',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-2 rounded-2xl border border-white/16 bg-black/70 px-4 py-2 text-xs font-black text-white shadow-[0_14px_34px_rgba(0,0,0,0.45)]">
                  <ImagePlus size={16} />
                  {isUploading ? 'กำลังอัปโหลดรูป...' : 'คลิกเพื่อเปลี่ยนรูป'}
                </span>
              </div>
            </>
          ) : (
            <div className="grid size-full place-items-center px-4 text-center text-white/58">
              <div>
                <ImagePlus className="mx-auto text-[#C0392B]" size={34} />
                <p className="mt-2 text-xs font-black text-white/72">
                  {isUploading ? 'กำลังอัปโหลดรูป...' : help}
                </p>
                <span className="mt-3 inline-flex h-9 items-center rounded-xl bg-[#C0392B] px-4 text-xs font-black text-white">
                  เลือกรูป
                </span>
              </div>
            </div>
          )}
        </div>
      </button>
      <input
        accept="image/*"
        className="sr-only"
        disabled={isUploading}
        name={name ?? label}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file) {
            setLocalPreviewUrl((current) => {
              if (current) {
                URL.revokeObjectURL(current)
              }

              return URL.createObjectURL(file)
            })
            onFileSelect(file)
          }
          event.currentTarget.value = ''
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  )
}

export function FilmGalleryField({
  images,
  isUploading,
  name = 'film-gallery-images',
  onFileSelect,
  onRemove,
}: {
  images: string[]
  isUploading: boolean
  name?: string
  onFileSelect: (file: File) => void
  onRemove: (imageUrl: string) => void
}) {
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>([])
  const previousImageCountRef = useRef(images.length)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => () => {
    pendingPreviewUrls.forEach((imageUrl) => URL.revokeObjectURL(imageUrl))
  }, [pendingPreviewUrls])

  useEffect(() => {
    if (images.length <= previousImageCountRef.current) {
      previousImageCountRef.current = images.length
      return
    }

    previousImageCountRef.current = images.length
    if (pendingPreviewUrls.length > 0) {
      const clearPendingTimer = window.setTimeout(() => {
        setPendingPreviewUrls((current) => {
          current.forEach((imageUrl) => URL.revokeObjectURL(imageUrl))
          return []
        })
      }, 0)

      return () => window.clearTimeout(clearPendingTimer)
    }

    return undefined
  }, [images.length, pendingPreviewUrls.length])

  const visibleImages = [...pendingPreviewUrls, ...images]
  const hasImages = visibleImages.length > 0
  const openFilePicker = () => {
    if (!isUploading) {
      inputRef.current?.click()
    }
  }

  return (
    <div className="text-sm font-bold text-white/68">
      <div className="flex items-center justify-between gap-3">
        <span>รูปภาพเพิ่มเติม</span>
        <button
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#C0392B]/28 bg-[#C0392B]/12 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUploading}
          onClick={openFilePicker}
          type="button"
        >
          <ImagePlus size={15} />
          {isUploading ? 'กำลังอัปโหลด' : 'เพิ่มรูป'}
        </button>
        <input
          accept="image/*"
          className="sr-only"
          disabled={isUploading}
          name={name}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file) {
              const previewUrl = URL.createObjectURL(file)
              setPendingPreviewUrls((current) => [...current, previewUrl])
              onFileSelect(file)
            }
            event.currentTarget.value = ''
          }}
          ref={inputRef}
          type="file"
        />
      </div>
      <div className="mt-2 grid gap-3">
        {!hasImages ? (
          <div className="grid min-h-36 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#161616] via-[#101010] to-[#080205] px-5 text-center text-xs font-black leading-5 text-white/42">
            เพิ่มรูปสี่เหลี่ยมผืนผ้า จัตุรัส หรือสัดส่วนอื่นสำหรับหน้าอ่านรายละเอียดฟิล์ม
          </div>
        ) : null}
        {visibleImages.map((imageUrl) => (
          <figure
            className="relative grid h-64 place-items-center overflow-hidden rounded-2xl border border-white/12 bg-transparent px-4 sm:h-80"
            key={imageUrl}
          >
            <img
              alt=""
              className="h-full max-w-full object-contain"
              src={imageUrl}
            />
            {pendingPreviewUrls.includes(imageUrl) ? (
              <figcaption className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-black text-white/72">
                กำลังอัปโหลด
              </figcaption>
            ) : (
              <button
                aria-label="ลบรูปภาพ"
                className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/78 text-white shadow-[0_10px_24px_rgba(0,0,0,0.36)]"
                onClick={() => onRemove(imageUrl)}
                type="button"
              >
                <X size={17} />
              </button>
            )}
          </figure>
        ))}
      </div>
    </div>
  )
}

export function TextAreaInput({
  label,
  name,
  onChange,
  placeholder,
  value,
}: {
  label: string
  name?: string
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    resizeTextarea(textarea)
  }, [value])

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget
    resizeTextarea(textarea)
    onChange(textarea.value)
  }

  return (
    <label className="block text-sm font-bold text-white/68">
      {label}
      <textarea
        className="mt-2 max-h-72 min-h-28 w-full resize-none rounded-xl border border-white/12 bg-[#101010] px-3 py-3 text-sm font-bold leading-6 text-white outline-none focus:border-[#C0392B]"
        name={name ?? label}
        onChange={handleChange}
        placeholder={placeholder}
        ref={textareaRef}
        rows={4}
        value={value ?? ''}
      />
    </label>
  )
}

export function TextInput({
  label,
  name,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  label: string
  name?: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  value?: string
}) {
  const isDateInput = type === 'date'
  const openDatePicker = (input: HTMLInputElement) => {
    if (!isDateInput) {
      return
    }

    const canUseDesktopPicker =
      typeof window === 'undefined' || window.matchMedia('(pointer: fine)').matches

    if (!canUseDesktopPicker) {
      return
    }

    try {
      input.showPicker?.()
    } catch {
      input.focus()
    }
  }

  return (
    <label className="block min-w-0 text-sm font-bold text-white/68">
      {label}
      <input
        className={[
          'mt-2 h-11 w-full min-w-0 max-w-full rounded-xl border border-white/12 bg-[#101010] font-bold text-white outline-none focus:border-[#C0392B]',
          isDateInput ? 'px-1.5 text-[clamp(0.68rem,2.8vw,0.82rem)]' : 'px-3 text-sm',
        ].join(' ')}
        name={name ?? label}
        onClick={(event) => openDatePicker(event.currentTarget)}
        onFocus={(event) => openDatePicker(event.currentTarget)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value ?? ''}
      />
    </label>
  )
}
