import fulltankGarageLogo from '../assets/fulltank-garage-logo.jpg'

type FullTankGarageLogoProps = {
  className?: string
  title?: string
}

export function FullTankGarageLogo({
  className = 'size-10',
  title = 'FULLTANK Garage logo',
}: FullTankGarageLogoProps) {
  return (
    <img
      alt={title}
      className={`${className} rounded-xl border border-white/12 bg-[#080205] object-cover`}
      src={fulltankGarageLogo}
    />
  )
}
