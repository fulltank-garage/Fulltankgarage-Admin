import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

export type AuthSession = {
  token: string
  refreshToken: string
  user: {
    name: string
    email: string
  }
}

export type WarrantyRegistration = {
  id: number
  serialNumber: string
  customerName: string
  phone: string
  carModel: string
  licensePlate: string
  filmBrand: string
  filmModel: string
  frontFilmCode: string
  fullCarFilmCode: string
  sunroofFilmCode: string
  installDate: string
  branch: string
  installerName: string
  receiptFile: string
  remarks: string
  createdAt: string
}

export type SerialNumber = {
  id: number
  serialNumber: string
  status: 'available' | 'used'
  createdAt: string
}

export type WarrantyRegistrationFormPayload = {
  customerName: string
  phone: string
  carModel: string
  licensePlate: string
  filmBrand: string
  filmModel: string
  frontFilmCode: string
  fullCarFilmCode: string
  sunroofFilmCode: string
  installDate: string
  branch: string
  installerName: string
  remarks?: string
}

export type WarrantyRegistrationCreateResponse = {
  registration: WarrantyRegistration
  serialNumber: SerialNumber
}

export type Film = {
  id: number
  slug: string
  name: string
  logo: string
  summary: string
  description: string
  imageUrl: string
  priceTableImageUrl: string
  galleryImages: string[]
  irr: string
  uvProtection: string
  vlt: string
  tser: string
  vlr: string
  filmType: string
  vehicleType: string
  installPosition: string
  highlights: string[]
  isActive: boolean
  createdAt: string
}

export type Promotion = {
  id: number
  title: string
  description: string
  detail: string
  imageUrl: string
  isActive: boolean
  startsAt: string
  endsAt: string
  createdAt: string
}

const toDateInputValue = (value?: string | null) => {
  if (!value) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

const normalizePromotion = (promotion: Promotion): Promotion => ({
  ...promotion,
  imageUrl: resolveImageUrl(promotion.imageUrl),
  startsAt: toDateInputValue(promotion.startsAt),
  endsAt: toDateInputValue(promotion.endsAt),
})

const normalizeFilm = (film: Film): Film => ({
  ...film,
  imageUrl: resolveImageUrl(film.imageUrl),
  priceTableImageUrl: resolveImageUrl(film.priceTableImageUrl),
  galleryImages: (film.galleryImages ?? []).map(resolveImageUrl),
  highlights: film.highlights ?? [],
})

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'off'

export type RichMenuSyncEvent = {
  lineUserId?: string
  serialNumber?: string
  success: boolean
  linkedRichMenuId?: string
  targetRichMenuId?: string
  source?: string
  message?: string
}

export type FulltankRealtimeEvent =
  | { type: 'warranty_registration.created'; data: WarrantyRegistration }
  | { type: 'warranty_registration.linked'; data: WarrantyRegistration }
  | { type: 'warranty_registration.updated'; data: WarrantyRegistration }
  | { type: 'serial_number.created'; data: SerialNumber }
  | { type: 'serial_number.updated'; data: SerialNumber }
  | { type: 'promotion.created'; data: Promotion }
  | { type: 'promotion.updated'; data: Promotion }
  | { type: 'promotion.deleted'; data: { id: number | string } }
  | { type: 'film.created'; data: Film }
  | { type: 'film.updated'; data: Film }
  | { type: 'film.deleted'; data: { id: number | string } }
  | { type: 'rich_menu.sync'; data: RichMenuSyncEvent }

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')

export const resolveImageUrl = (value?: string | null) => {
  const imageUrl = value?.trim()
  if (!imageUrl) {
    return ''
  }

  if (/^(https?:|data:|blob:)/i.test(imageUrl)) {
    return imageUrl
  }

  const apiUrl = new URL(apiBaseUrl, window.location.origin)
  apiUrl.pathname = apiUrl.pathname.replace(/\/api\/?$/, '/')
  apiUrl.search = ''
  apiUrl.hash = ''

  return new URL(imageUrl, apiUrl).toString()
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
})

const authClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
})

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

const tokenRefreshWindowMs = 2 * 60 * 1000
let refreshPromise: Promise<AuthSession> | null = null

export const storeSession = (session: AuthSession) => {
  localStorage.setItem('fulltank_admin_token', session.token)
  localStorage.setItem('fulltank_admin_session', JSON.stringify(session))
}

export const getStoredSession = () => {
  const stored = localStorage.getItem('fulltank_admin_session')
  if (!stored) {
    return null
  }

  try {
    return JSON.parse(stored) as AuthSession
  } catch {
    return null
  }
}

export const clearSession = () => {
  localStorage.removeItem('fulltank_admin_token')
  localStorage.removeItem('fulltank_admin_session')
}

const getTokenExpiryMs = (token: string) => {
  try {
    const [, payload] = token.split('.')
    if (!payload) {
      return 0
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const parsed = JSON.parse(window.atob(normalizedPayload)) as { exp?: number }
    return parsed.exp ? parsed.exp * 1000 : 0
  } catch {
    return 0
  }
}

const requestSessionRefresh = async () => {
  const session = getStoredSession()
  if (!session?.refreshToken) {
    throw new Error('missing refresh token')
  }

  if (!refreshPromise) {
    refreshPromise = authClient
      .post<AuthSession>('/auth/refresh', { refreshToken: session.refreshToken })
      .then((response) => {
        storeSession(response.data)
        return response.data
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

const ensureFreshToken = async () => {
  const token = localStorage.getItem('fulltank_admin_token')
  if (!token) {
    return ''
  }

  const expiresAt = getTokenExpiryMs(token)
  if (!expiresAt || expiresAt - Date.now() > tokenRefreshWindowMs) {
    return token
  }

  const session = await requestSessionRefresh()
  return session.token
}

api.interceptors.request.use(async (config) => {
  const token = await ensureFreshToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const responseStatus = error.response?.status
    const requestConfig = error.config as RetriableRequestConfig | undefined
    const isAuthRequest =
      requestConfig?.url?.includes('/auth/login') ||
      requestConfig?.url?.includes('/auth/refresh')

    if (responseStatus !== 401 || !requestConfig || requestConfig._retry || isAuthRequest) {
      throw error
    }

    try {
      requestConfig._retry = true
      const session = await requestSessionRefresh()
      requestConfig.headers.Authorization = `Bearer ${session.token}`
      return api.request(requestConfig)
    } catch (refreshError) {
      clearSession()
      window.dispatchEvent(new Event('fulltank-admin-session-expired'))
      throw refreshError
    }
  },
)

export const authApi = {
  async login(payload: { email: string; password: string }) {
    const { data } = await api.post<AuthSession>('/auth/login', payload)
    return data
  },
}

export const dashboardApi = {
  async summary() {
    const [registrations, serials, promotions, films] = await Promise.all([
      api.get<WarrantyRegistration[]>('/warranty/registrations'),
      api.get<SerialNumber[]>('/serial-numbers'),
      api.get<Promotion[]>('/promotions'),
      api.get<Film[]>('/films'),
    ])

    return {
      registrations: registrations.data,
      serials: serials.data,
      promotions: promotions.data.map(normalizePromotion),
      films: films.data.map(normalizeFilm),
    }
  },
}

const createWarrantyFormData = (
  payload: WarrantyRegistrationFormPayload,
  receiptFile?: File | null,
) => {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, value ?? '')
  })
  if (receiptFile) {
    formData.append('receiptFile', receiptFile)
  }
  return formData
}

export const warrantyApi = {
  async listRegistrations() {
    const { data } = await api.get<WarrantyRegistration[]>('/warranty/registrations')
    return data
  },
  async listSerials() {
    const { data } = await api.get<SerialNumber[]>('/serial-numbers')
    return data
  },
  async createSerial(serialNumber: string) {
    const { data } = await api.post<SerialNumber>('/serial-numbers', { serialNumber })
    return data
  },
  async updateRegistration(
    id: number,
    payload: WarrantyRegistrationFormPayload,
    receiptFile?: File | null,
  ) {
    const { data } = await api.patch<WarrantyRegistration>(
      `/warranty/registrations/${id}`,
      createWarrantyFormData(payload, receiptFile),
    )
    return data
  },
  async createRegistrationForSerial(
    serialNumber: string,
    payload: WarrantyRegistrationFormPayload,
    receiptFile?: File | null,
  ) {
    const { data } = await api.post<WarrantyRegistrationCreateResponse>(
      `/serial-numbers/${encodeURIComponent(serialNumber)}/warranty-registration`,
      createWarrantyFormData(payload, receiptFile),
    )
    return data
  },
}

export const filmApi = {
  async list() {
    const { data } = await api.get<Film[]>('/films')
    return data.map(normalizeFilm)
  },
  async save(payload: Partial<Film>) {
    if (payload.id) {
      const { data } = await api.patch<Film>(`/films/${payload.id}`, payload)
      return normalizeFilm(data)
    }
    const { data } = await api.post<Film>('/films', payload)
    return normalizeFilm(data)
  },
  async remove(id: number) {
    await api.delete(`/films/${id}`)
  },
}

export const promotionApi = {
  async list() {
    const { data } = await api.get<Promotion[]>('/promotions')
    return data.map(normalizePromotion)
  },
  async save(payload: Partial<Promotion>) {
    if (payload.id) {
      const { data } = await api.patch<Promotion>(`/promotions/${payload.id}`, payload)
      return normalizePromotion(data)
    }
    const { data } = await api.post<Promotion>('/promotions', payload)
    return normalizePromotion(data)
  },
  async remove(id: number) {
    await api.delete(`/promotions/${id}`)
  },
}

export const uploadApi = {
  async image(file: File) {
    const formData = new FormData()
    formData.append('image', file)

    const { data } = await api.post<{ imageUrl: string }>('/uploads/images', formData)
    return resolveImageUrl(data.imageUrl)
  },
}

const createFulltankEventsSocket = async () => {
  const token = await ensureFreshToken()
  if (!token) {
    return null
  }

  const baseUrl = new URL(apiBaseUrl, window.location.origin)
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, '')}/members/events`
  baseUrl.search = ''
  baseUrl.searchParams.set('token', token)

  return new WebSocket(baseUrl.toString())
}

const normalizeRealtimeEvent = (event: FulltankRealtimeEvent): FulltankRealtimeEvent => {
  if (event.type === 'promotion.created' || event.type === 'promotion.updated') {
    return { ...event, data: normalizePromotion(event.data) }
  }

  if (event.type === 'film.created' || event.type === 'film.updated') {
    return { ...event, data: normalizeFilm(event.data) }
  }

  return event
}

export const subscribeFulltankEvents = ({
  onEvent,
  onStatus,
}: {
  onEvent: (event: FulltankRealtimeEvent) => void
  onStatus?: (status: RealtimeStatus) => void
}) => {
  let socket: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryCount = 0
  let isClosed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let isConnecting = false

  const isSocketLive = () =>
    socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING

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
    if (isClosed || isConnecting || isSocketLive()) {
      return
    }

    isConnecting = true
    onStatus?.(retryCount === 0 ? 'connecting' : 'reconnecting')

    void createFulltankEventsSocket()
      .then((nextSocket) => {
        isConnecting = false
        if (isClosed) {
          nextSocket?.close()
          return
        }

        socket = nextSocket
        if (!socket) {
          onStatus?.('off')
          return
        }

        socket.onopen = () => {
          retryCount = 0
          onStatus?.('connected')
        }

        socket.onmessage = (message) => {
          try {
            onEvent(normalizeRealtimeEvent(JSON.parse(message.data) as FulltankRealtimeEvent))
          } catch {
            // Ignore malformed realtime payloads so one bad message does not close the stream.
          }
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
      })
      .catch(() => {
        isConnecting = false
        if (isClosed) {
          return
        }

        retryCount += 1
        onStatus?.('reconnecting')
        retryTimer = setTimeout(connect, Math.min(1000 * retryCount, 10000))
      })
  }

  const reconnect = () => {
    if (isClosed || document.visibilityState === 'hidden') {
      return
    }

    if (isSocketLive()) {
      return
    }

    clearRetry()
    clearReconnect()
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
    isConnecting = false
    window.removeEventListener('focus', reconnectWhenActive)
    window.removeEventListener('online', reconnectWhenActive)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    onStatus?.('off')
    socket?.close()
  }
}
