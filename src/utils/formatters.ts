export const moneyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
})

export const numberFormatter = new Intl.NumberFormat('th-TH')
