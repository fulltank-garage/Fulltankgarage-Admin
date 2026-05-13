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
      <main className="grid min-h-screen place-items-center bg-[#fbf6f0] px-6 text-[#3f2e23]">
        <section className="w-full max-w-sm rounded-3xl border border-[#ead8c7] bg-white p-6 text-center shadow-xl">
          <h1 className="text-xl font-semibold">เปิดหน้า Admin ไม่สำเร็จ</h1>
          <p className="mt-2 text-sm leading-6 text-[#6f5238]">
            กรุณาปิดแอปแล้วเปิดใหม่อีกครั้ง
          </p>
          <button
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-[#9a7655] px-5 text-sm font-semibold text-white"
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
