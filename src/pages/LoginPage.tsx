import { ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AppSnackbar } from '../components/AppSnackbar'
import { MikiJapanLogo } from '../components/MikiJapanLogo'
import { authApi, type AuthSession, type LoginPayload } from '../services/api'

type LoginPageProps = {
  initialNotice?: string
  onLogin: (session: AuthSession) => void
}

export function LoginPage({ initialNotice = '', onLogin }: LoginPageProps) {
  const [payload, setPayload] = useState<LoginPayload>({
    email: '',
    password: '',
  })
  const [error, setError] = useState(initialNotice)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!payload.email || !payload.password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    try {
      setIsLoading(true)
      const nextSession = await authApi.login(payload)
      onLogin(nextSession)
    } catch {
      setError('เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbf6f0] px-4 py-8 text-slate-900 sm:px-8 sm:py-10">
      <AppSnackbar message={error} onClose={() => setError('')} />

      <section className="w-full max-w-md">
        <form
          className="rounded-2xl border border-[#ead8c7] bg-white p-5 shadow-sm sm:p-8"
          onSubmit={handleSubmit}
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <MikiJapanLogo className="size-16 shrink-0 sm:size-20" />
            <h1 className="mt-4 text-2xl font-semibold text-slate-950">
              Miki Japan
            </h1>
          </div>

          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              อีเมล
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[#dbc6b2] bg-white px-4 text-slate-900 outline-none transition focus:border-[#9a7655] focus:ring-4 focus:ring-[#f1dfcd]"
              autoCapitalize="none"
              autoComplete="username"
              inputMode="email"
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              placeholder="กรอกอีเมล"
              type="text"
              value={payload.email}
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              รหัสผ่าน
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[#dbc6b2] bg-white px-4 text-slate-900 outline-none transition focus:border-[#9a7655] focus:ring-4 focus:ring-[#f1dfcd]"
              autoComplete="current-password"
              onChange={(event) =>
                setPayload((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              placeholder="กรอกรหัสผ่าน"
              type="password"
              value={payload.password}
            />
          </label>

          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#6f5238] px-4 font-semibold text-white transition hover:bg-[#7f6043] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
            type="submit"
          >
            <ShieldCheck size={18} />
            {isLoading ? 'กำลังเข้าสู่ระบบ' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </section>
    </main>
  )
}
