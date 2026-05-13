import { useEffect } from 'react'

type AppResumeRefreshOptions = {
  enabled?: boolean
  onRefresh: () => void
}

export function useAppResumeRefresh({
  enabled = true,
  onRefresh,
}: AppResumeRefreshOptions) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const refreshWhenActive = () => {
      if (document.visibilityState === 'hidden') {
        return
      }

      onRefresh()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onRefresh()
      }
    }

    window.addEventListener('focus', refreshWhenActive)
    window.addEventListener('online', refreshWhenActive)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', refreshWhenActive)
      window.removeEventListener('online', refreshWhenActive)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, onRefresh])
}
