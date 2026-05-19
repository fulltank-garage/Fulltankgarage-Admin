import type { FormEvent } from 'react'
import { useState } from 'react'
import fulltankGarageLogo from '../../assets/fulltank-garage-logo.jpg'
import { authApi, type AuthSession } from '../../services/fulltankApi'

export function LoginPage({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState('admin@fulltankgarage.local')
  const [password, setPassword] = useState('admin1234')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      onLogin(await authApi.login({ email, password }))
    } catch {
      setError('เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#070707] px-4 py-8 text-white">
      <form
        className="w-full max-w-md rounded-[1.5rem] border border-white/12 bg-[#151515] p-5 shadow-[0_0_42px_rgba(255,35,30,0.18)] sm:p-6"
        onSubmit={submit}
      >
        <div className="flex flex-col items-center text-center">
          <img
            alt="FULLTANK Garage"
            className="h-auto w-44 rounded-xl object-cover shadow-[0_14px_30px_rgba(0,0,0,0.36)] sm:w-52"
            src={fulltankGarageLogo}
          />
          <p className="mt-5 text-xs font-black uppercase tracking-normal text-[#ff403b]">
            Admin Login
          </p>
          <h1 className="mt-1 text-3xl font-black leading-tight">เข้าสู่ระบบ</h1>
        </div>

        <div className="mt-7 space-y-4">
          <label className="block text-sm font-bold text-white/72">
            อีเมล
            <input
              autoComplete="email"
              className="mt-2 h-12 w-full rounded-xl border border-white/12 bg-[#101010] px-4 text-white outline-none transition focus:border-[#ff403b] focus:ring-4 focus:ring-[#ff403b]/16"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label className="block text-sm font-bold text-white/72">
            รหัสผ่าน
            <input
              autoComplete="current-password"
              className="mt-2 h-12 w-full rounded-xl border border-white/12 bg-[#101010] px-4 text-white outline-none transition focus:border-[#ff403b] focus:ring-4 focus:ring-[#ff403b]/16"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-[#ff403b]/30 bg-[#ff403b]/12 px-3 py-2 text-sm font-bold text-[#ffd7d5]">
            {error}
          </p>
        ) : null}
        <button
          className="mt-5 h-12 w-full rounded-xl bg-[#ff332f] text-base font-black text-white shadow-[0_14px_28px_rgba(255,51,47,0.22)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </main>
  )
}
