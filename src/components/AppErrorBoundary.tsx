import { Component, type ErrorInfo, type ReactNode } from 'react'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Admin app render failed', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main className="grid min-h-dvh place-items-center bg-[#070707] px-5 text-white">
        <section className="w-full max-w-sm rounded-[1.35rem] border border-white/12 bg-[#151515] p-5 text-center shadow-[0_0_38px_rgba(255,35,30,0.16)]">
          <p className="text-xs font-black uppercase tracking-normal text-[#ff403b]">
            FULLTANK ADMIN
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight">
            เปิดหน้า Admin ไม่สำเร็จ
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/56">
            กรุณาโหลดหน้าใหม่อีกครั้ง หากยังไม่หายให้ปิดแอปแล้วเข้าใหม่
          </p>
          <button
            className="mt-5 h-11 w-full rounded-xl bg-[#ff332f] text-sm font-black text-white shadow-[0_14px_28px_rgba(255,51,47,0.22)]"
            onClick={() => window.location.reload()}
            type="button"
          >
            โหลดใหม่
          </button>
        </section>
      </main>
    )
  }
}
