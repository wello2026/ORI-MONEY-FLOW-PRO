import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

export const CURRENCY = import.meta.env.VITE_APP_CURRENCY || 'LYD'
export const CURRENCY_SYMBOL = import.meta.env.VITE_APP_CURRENCY_SYMBOL || 'د.ل'
export const DATE_FORMAT = import.meta.env.VITE_APP_DATE_FORMAT || 'DD/MM/YYYY'
export const DECIMAL_PLACES = parseInt(import.meta.env.VITE_APP_DECIMAL_PLACES || '3')

export const formatCurrency = (
  amount: number,
  currency: string = CURRENCY,
  showSymbol: boolean = true
): string => {
  const rounded = Math.round(amount * 100) / 100
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(rounded))

  const symbol = showSymbol ? (currency === 'LYD' ? CURRENCY_SYMBOL : currency) : ''

  if (amount < 0) {
    return `-${symbol}${formatted}`
  }
  return `${symbol}${formatted}`
}

export const formatNumber = (value: number, decimals: number = DECIMAL_PLACES): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

export const formatDate = (
  date: string | Date,
  format: string = DATE_FORMAT
): string => {
  return dayjs(date).format(format)
}

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

export const formatRelativeTime = (date: string | Date): string => {
  return dayjs(date).locale('ar').fromNow()
}

export const formatTime = (date: string | Date): string => {
  return dayjs(date).format('HH:mm')
}

export const formatDateForExport = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD')
}

export const parseAmount = (value: string): number => {
  const cleaned = value.replace(/[^\d.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const formatPercentage = (
  value: number,
  decimals: number = 1
): string => {
  return `${(value * 100).toFixed(decimals)}%`
}

export const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  return value.toString()
}

export const formatAccountType = (
  type: 'cashbox' | 'bank' | 'expense' | 'income' | 'employee' | 'temporary'
): string => {
  const types: Record<string, string> = {
    cashbox: 'صندوق',
    bank: 'بنك',
    expense: 'مصروف',
    income: 'دخل',
    employee: 'موظف',
    temporary: 'مؤقت'
  }
  return types[type] || type
}

export const formatTransactionType = (
  type: 'deposit' | 'withdrawal' | 'expense' | 'income' | 'salary' | 'custody' | 'adjustment' | 'settlement'
): string => {
  const types: Record<string, string> = {
    deposit: 'إيداع',
    withdrawal: 'سحب',
    expense: 'مصروف',
    income: 'دخل',
    salary: 'راتب',
    custody: 'عهده',
    adjustment: 'تعديل',
    settlement: 'تسوية'
  }
  return types[type] || type
}

export const formatStatus = (status: string): string => {
  const statuses: Record<string, string> = {
    pending: 'معلق',
    approved: 'موافق',
    rejected: 'مرفوض',
    completed: 'مكتمل',
    active: 'نشط',
    inactive: 'غير نشط',
    archived: 'مؤرشف'
  }
  return statuses[status] || status
}

export const formatRole = (
  role: 'super_admin' | 'admin' | 'employee' | 'viewer'
): string => {
  const roles: Record<string, string> = {
    super_admin: 'مدير عام',
    admin: 'مدير',
    employee: 'موظف',
    viewer: 'مشاهد'
  }
  return roles[role] || role
}