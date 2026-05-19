export const formatLatestRealtimeAt = (value: Date | null) => {
  if (!value) {
    return 'ยังไม่มีข้อมูลอัปเดต'
  }

  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value)
}

export const formatAdminDisplayName = (value: string) =>
  value.replace(/FullTank/gi, 'FULLTANK')
