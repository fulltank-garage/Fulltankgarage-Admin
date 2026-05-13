import axios from 'axios'
import { browserStorage } from '../utils/browserStorage'

export type CustomerStatus = 'active' | 'pending' | 'inactive'
export type CustomerSegment = 'VIP' | 'Regular' | 'New'

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
  country: string
  segment: CustomerSegment
  status: CustomerStatus
  totalOrders: number
  totalSpent: number
  lastContact: string
  note: string
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export type MemberApplication = {
  id: string
  firstName: string
  lastName: string
  nickname: string
  phone: string
  citizenId: string
  shopPageUrl: string
  storefrontImage?: string
  storefrontImageUrl?: string
  status: ApplicationStatus
}

export type MemberApplicationEvent = {
  type:
    | 'member_application.created'
    | 'member_application.updated'
    | 'member_application.deleted'
  data: MemberApplication
}

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'off'

export type LoginPayload = {
  email: string
  password: string
}

export type AuthSession = {
  token: string
  refreshToken: string
  user: {
    name: string
    email: string
  }
}

export type PushPublicKeyResponse = {
  configured: boolean
  publicKey: string
}

type ApiErrorData = {
  message?: string
}

export const adminAuthExpiredEvent = 'mikijapan-admin-auth-expired'

export const clearAdminAuthStorage = () => {
  browserStorage.remove('admin_token')
  browserStorage.remove('admin_refresh_token')
  browserStorage.remove('admin_session')
}

export const storeAdminSession = (session: AuthSession) => {
  browserStorage.set('admin_token', session.token)
  browserStorage.set('admin_refresh_token', session.refreshToken)
  browserStorage.set('admin_session', JSON.stringify(session))
}

const getStoredRefreshToken = () => {
  const refreshToken = browserStorage.get('admin_refresh_token')
  if (refreshToken) {
    return refreshToken
  }

  const storedSession = browserStorage.get('admin_session')
  if (!storedSession) {
    return ''
  }

  try {
    return (JSON.parse(storedSession) as Partial<AuthSession>).refreshToken || ''
  } catch {
    return ''
  }
}

const notifyAdminAuthExpired = () => {
  clearAdminAuthStorage()

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(adminAuthExpiredEvent))
  }
}

export const getApiErrorMessage = (
  error: unknown,
  fallback = 'ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
) => {
  if (axios.isAxiosError<ApiErrorData>(error)) {
    return error.response?.data?.message || fallback
  }

  return error instanceof Error ? error.message : fallback
}

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:8080/api' : '')

export const isApiConfigured = Boolean(apiBaseUrl)

export const api = axios.create({
  baseURL: apiBaseUrl || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

let refreshSessionPromise: Promise<AuthSession> | null = null

const refreshAdminSession = async () => {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) {
    throw new Error('missing refresh token')
  }

  refreshSessionPromise ??= axios
    .post<AuthSession>(
      `${apiBaseUrl || '/api'}/auth/refresh`,
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    )
    .then(({ data }) => {
      storeAdminSession(data)
      return data
    })
    .finally(() => {
      refreshSessionPromise = null
    })

  return refreshSessionPromise
}

api.interceptors.request.use((config) => {
  const token = browserStorage.get('admin_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    const originalRequest = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined
    const requestUrl = originalRequest?.url || ''

    if (requestUrl.includes('/auth/login')) {
      return Promise.reject(error)
    }

    if (
      !originalRequest ||
      originalRequest._retry ||
      requestUrl.includes('/auth/refresh')
    ) {
      notifyAdminAuthExpired()
      return Promise.reject(error)
    }

    try {
      originalRequest._retry = true
      const session = await refreshAdminSession()
      originalRequest.headers.Authorization = `Bearer ${session.token}`

      return api(originalRequest)
    } catch {
      notifyAdminAuthExpired()
    }

    return Promise.reject(error)
  },
)

export const authApi = {
  async login(payload: LoginPayload) {
    try {
      const { data } = await api.post<AuthSession>('/auth/login', payload)
      return data
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        throw new Error(
          error.response?.data?.message ??
            'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง',
          { cause: error },
        )
      }

      throw error
    }
  },
}

export const customerApi = {
  async list() {
    const { data } = await api.get<Customer[]>('/customers')
    return data
  },

  async create(customer: Omit<Customer, 'id'>) {
    const { data } = await api.post<Customer>('/customers', customer)
    return data
  },

  async update(id: string, customer: Omit<Customer, 'id'>) {
    const { data } = await api.put<Customer>(`/customers/${id}`, customer)
    return data
  },

  async remove(id: string) {
    await api.delete(`/customers/${id}`)
  },
}

export const memberApi = {
  async list() {
    const { data } = await api.get<MemberApplication[]>('/members')
    return data
  },

  async remove(id: string) {
    await api.delete(`/members/${id}`)
  },
}

export const applicationApi = {
  async list() {
    const { data } = await api.get<MemberApplication[]>('/member-applications')
    return data
  },

  async updateStatus(
    id: string,
    status: ApplicationStatus,
    rejectionReasons?: string[],
  ) {
    const { data } = await api.patch<MemberApplication>(
      `/member-applications/${id}/status`,
      { rejectionReasons, status },
    )
    return data
  },

  async remove(id: string) {
    await api.delete(`/member-applications/${id}`)
  },
}

export const pushNotificationApi = {
  async getPublicKey() {
    try {
      const { data } = await api.get<PushPublicKeyResponse>(
        '/push-notifications/public-key',
      )
      return data
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'โหลดข้อมูลแจ้งเตือนไม่สำเร็จ'), {
        cause: error,
      })
    }
  },

  async subscribe(subscription: PushSubscription) {
    try {
      await api.post('/push-notifications/subscriptions', subscription.toJSON())
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'บันทึกการแจ้งเตือนไม่สำเร็จ'), {
        cause: error,
      })
    }
  },

  async unsubscribe(subscription: PushSubscription) {
    await api.delete('/push-notifications/subscriptions', {
      data: {
        endpoint: subscription.endpoint,
      },
    })
  },
}

const createApplicationEventsSocket = () => {
  if (!isApiConfigured) {
    return null
  }

  const token = browserStorage.get('admin_token')
  if (!token) {
    return null
  }

  const baseUrl = new URL(apiBaseUrl)
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, '')}/members/events`
  baseUrl.search = ''
  baseUrl.searchParams.set('token', token)

  return new WebSocket(baseUrl.toString())
}

export const subscribeApplicationEvents = ({
  onEvent,
  onStatus,
}: {
  onEvent: (event: MemberApplicationEvent) => void
  onStatus?: (status: RealtimeStatus) => void
}) => {
  let socket: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryCount = 0
  let isClosed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const clearRetry = () => {
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const connect = () => {
    if (isClosed) {
      return
    }

    socket = createApplicationEventsSocket()
    if (!socket) {
      onStatus?.('off')
      return
    }

    onStatus?.(retryCount === 0 ? 'connecting' : 'reconnecting')

    socket.onopen = () => {
      retryCount = 0
      onStatus?.('connected')
    }

    socket.onmessage = (message) => {
      onEvent(JSON.parse(message.data) as MemberApplicationEvent)
    }

    socket.onerror = () => {
      socket?.close()
    }

    socket.onclose = () => {
      if (isClosed) {
        return
      }

      retryCount += 1
      onStatus?.('reconnecting')
      const retryDelay = Math.min(1000 * retryCount, 10000)
      retryTimer = setTimeout(connect, retryDelay)
    }
  }

  const reconnect = () => {
    if (isClosed || document.visibilityState === 'hidden') {
      return
    }

    clearRetry()
    clearReconnect()
    socket?.close()
    onStatus?.('reconnecting')
    reconnectTimer = setTimeout(connect, 100)
  }

  const reconnectWhenActive = () => {
    if (document.visibilityState !== 'hidden') {
      reconnect()
    }
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      reconnect()
    }
  }

  connect()
  window.addEventListener('focus', reconnectWhenActive)
  window.addEventListener('online', reconnectWhenActive)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    isClosed = true
    clearRetry()
    clearReconnect()
    window.removeEventListener('focus', reconnectWhenActive)
    window.removeEventListener('online', reconnectWhenActive)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    onStatus?.('off')
    socket?.close()
  }
}
