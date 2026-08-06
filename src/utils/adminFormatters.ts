export const formatPromotionDate = (value?: string) => {
  if (!value) {
    return 'สอบถามหน้าร้าน'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'สอบถามหน้าร้าน'
  }

  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const formatPromotionDateRange = (startsAt?: string, endsAt?: string) => {
  const start = formatPromotionDate(startsAt)
  const end = formatPromotionDate(endsAt)

  if (start === 'สอบถามหน้าร้าน' && end === 'สอบถามหน้าร้าน') {
    return 'สอบถามหน้าร้าน'
  }

  if (start === 'สอบถามหน้าร้าน') {
    return `ถึง ${end}`
  }

  if (end === 'สอบถามหน้าร้าน') {
    return `เริ่ม ${start}`
  }

  return `เริ่ม ${start} ถึง ${end}`
}

export const formatCustomerInstallDate = (value?: string) => {
  if (!value) {
    return '-'
  }

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    return `${day}/${month}/${Number(year) + 543}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const formatWarrantyPeriod = (value?: string | null) => {
  const expiryDate = formatCustomerInstallDate(value ?? undefined)
  return expiryDate === '-' ? '-' : `7 ปี ถึง ${expiryDate}`
}

export const formatDateInput = (date: Date) => date.toISOString().slice(0, 10)

export const createCardSummary = (value: string | undefined, maxLength = 140) => {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? ''
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength).trim()}...`
}
