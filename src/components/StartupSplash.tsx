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
        <p className="mt-8 grid size-24 place-items-center rounded-full border border-[#ff403b]/28 bg-[#ff403b]/10 text-3xl font-black text-white shadow-[0_0_36px_rgba(255,64,59,0.16)]">
          {normalizedProgress}%
        </p>
      </section>
    </main>
  )
}
