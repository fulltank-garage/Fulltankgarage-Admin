import {
  BadgePercent,
  Film as FilmIcon,
  KeyRound,
  LayoutDashboard,
  UsersRound,
} from 'lucide-react'
import type { Page } from '../types/admin'

export const pages: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { id: 'promotions', label: 'จัดการโปรโมชัน', icon: BadgePercent },
  { id: 'films', label: 'จัดการฟิล์ม', icon: FilmIcon },
  { id: 'film-models', label: 'จัดการรุ่นฟิล์ม', icon: FilmIcon },
  { id: 'customers', label: 'จัดการข้อมูลลูกค้า', icon: UsersRound },
  { id: 'serials', label: 'จัดการ Serial Number', icon: KeyRound },
]
