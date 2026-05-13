import axios from 'axios'

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

export type Film = {
  id: number
  slug: string
  name: string
  logo: string
  summary: string
  description: string
  imageUrl: string
  isActive: boolean
  createdAt: string
}

export type Promotion = {
  id: number
  title: string
  description: string
  imageUrl: string
  isActive: boolean
  startsAt: string
  endsAt: string
  createdAt: string
}

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
})

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

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fulltank_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

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
      promotions: promotions.data,
      films: films.data,
    }
  },
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
}

export const filmApi = {
  async list() {
    const { data } = await api.get<Film[]>('/films')
    return data
  },
  async save(payload: Partial<Film>) {
    if (payload.id) {
      const { data } = await api.patch<Film>(`/films/${payload.id}`, payload)
      return data
    }
    const { data } = await api.post<Film>('/films', payload)
    return data
  },
  async remove(id: number) {
    await api.delete(`/films/${id}`)
  },
}

export const promotionApi = {
  async list() {
    const { data } = await api.get<Promotion[]>('/promotions')
    return data
  },
  async save(payload: Partial<Promotion>) {
    if (payload.id) {
      const { data } = await api.patch<Promotion>(`/promotions/${payload.id}`, payload)
      return data
    }
    const { data } = await api.post<Promotion>('/promotions', payload)
    return data
  },
  async remove(id: number) {
    await api.delete(`/promotions/${id}`)
  },
}
