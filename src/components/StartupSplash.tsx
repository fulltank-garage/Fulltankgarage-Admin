import { MikiJapanLogo } from './MikiJapanLogo'

type StartupSplashProps = {
  isUpdated: boolean
  progress: number
}

export function StartupSplash({ isUpdated, progress }: StartupSplashProps) {
  const normalizedProgress = Math.min(100, Math.max(0, Math.round(progress)))

  return (
    <main className="grid min-h-screen place-items-center bg-[#fbf6f0] px-6 text-[#3f2e23]">
      <section className="flex w-full max-w-sm flex-col items-center text-center">
        <MikiJapanLogo className="size-24 shadow-lg shadow-[#c9a98a]/30" />
        <h1 className="mt-6 text-2xl font-semibold text-slate-950">
          Miki Japan
        </h1>
        <p className="mt-2 text-sm text-[#6f5238]">
          {isUpdated ? 'แอปมีการอัปเดต' : 'กำลังเปิดระบบ Admin'}
        </p>
        <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-[#ead8c7]">
          <div
            className="h-full rounded-full bg-[#9a7655] transition-[width] duration-150 ease-out"
            style={{ width: `${normalizedProgress}%` }}
          />
        </div>
        <p className="mt-3 text-sm font-semibold text-[#6f5238]">
          {normalizedProgress}%
        </p>
      </section>
    </main>
  )
}
