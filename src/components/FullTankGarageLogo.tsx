import fulltankGarageLogo from '../assets/fulltank-garage-logo.jpg'

type FullTankGarageLogoProps = {
  className?: string
  title?: string
}

export function FullTankGarageLogo({
  className = 'size-10',
  title = 'FullTank Garage logo',
}: FullTankGarageLogoProps) {
  return (
    <img
      alt={title}
      className={`${className} rounded-xl border border-white/12 bg-[#0b0b0b] object-cover`}
      src={fulltankGarageLogo}
    />
  )
}
