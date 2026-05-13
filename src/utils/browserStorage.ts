export const browserStorage = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },

  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Ignore storage failures so the app can keep rendering in standalone mode.
    }
  },

  remove(key: string) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Ignore storage failures so logout and recovery flows do not crash.
    }
  },
}
