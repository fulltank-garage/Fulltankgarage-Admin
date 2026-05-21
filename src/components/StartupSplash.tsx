import { FullTankGarageLogo } from './FullTankGarageLogo'

type StartupSplashProps = {
  isUpdated: boolean
  progress: number
}

export function StartupSplash({ isUpdated, progress }: StartupSplashProps) {
  const normalizedProgress = Math.min(100, Math.max(0, Math.round(progress)))

  return (
    <main className="grid min-h-screen place-items-center bg-[#080205] px-6 text-white">
      <section className="flex w-full max-w-sm flex-col items-center text-center">
        <FullTankGarageLogo className="size-24 rounded-2xl shadow-lg shadow-[#C0392B]/20" />
        <h1 className="mt-6 whitespace-nowrap text-2xl font-black text-white">
          FULLTANK Garage
        </h1>
        <p className="mt-2 text-sm font-bold text-white/58">
          {isUpdated ? 'มีการอัพเดตแอป' : 'กำลังเปิดระบบ Admin'}
        </p>
        <p className="mt-5 text-4xl font-black leading-none text-white">
          {normalizedProgress}%
        </p>
      </section>
    </main>
  )
}
