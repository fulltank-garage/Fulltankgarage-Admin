import mikiJapanLogo from '../assets/miki-japan-logo.jpg'

type MikiJapanLogoProps = {
  className?: string
  title?: string
}

export function MikiJapanLogo({
  className = 'size-10',
  title = 'Miki Japan logo',
}: MikiJapanLogoProps) {
  return (
    <img
      alt={title}
      className={`${className} rounded-full border border-[#ead8c7] bg-[#f7eadc] object-cover`}
      src={mikiJapanLogo}
    />
  )
}
