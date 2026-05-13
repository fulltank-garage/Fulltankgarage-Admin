import { FullTankGarageLogo } from './FullTankGarageLogo'

type StartupSplashProps = {
  isUpdated: boolean
  progress: number
}

export function StartupSplash({ isUpdated, progress }: StartupSplashProps) {
  const normalizedProgress = Math.min(100, Math.max(0, Math.round(progress)))

  return (
    <main className="grid min-h-screen place-items-center bg-[#070707] px-6 text-white">
      <section className="flex w-full max-w-sm flex-col items-center text-center">
        <FullTankGarageLogo className="size-24 rounded-2xl shadow-lg shadow-[#ff403b]/20" />
        <h1 className="mt-6 whitespace-nowrap text-2xl font-black text-white">
          FullTank Garage
        </h1>
        <p className="mt-2 text-sm font-bold text-white/58">
          {isUpdated ? 'มีการอัพเดตแอป' : 'กำลังเปิดระบบ Admin'}
        </p>
        <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#ff332f] transition-[width] duration-150 ease-out"
            style={{ width: `${normalizedProgress}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-black text-white/58">
          {normalizedProgress}%
        </p>
      </section>
    </main>
  )
}
