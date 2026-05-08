export const APP_NAME = import.meta.env.VITE_APP_NAME || 'ORI Finance Pro'

export const DEFAULT_CURRENCY = 'LYD'
export const DEFAULT_CURRENCY_SYMBOL = 'د.ل'

export const ACCOUNT_TYPES = [
  { value: 'cashbox', label: 'صندوق', icon: 'wallet' },
  { value: 'bank', label: 'بنك', icon: 'building-bank' },
  { value: 'expense', label: 'مصروف', icon: 'trending-down' },
  { value: 'income', label: 'دخل', icon: 'trending-up' },
  { value: 'employee', label: 'موظف', icon: 'user' },
  { value: 'temporary', label: 'مؤقت', icon: 'clock' }
] as const

export const ACCOUNT_STATUS = [
  { value: 'active', label: 'نشط', color: 'success' },
  { value: 'inactive', label: 'غير نشط', color: 'warning' },
  { value: 'archived', label: 'مؤرشف', color: 'muted' }
] as const

export const TRANSACTION_TYPES = [
  { value: 'deposit', label: 'إيداع', icon: 'arrow-down-circle', color: 'success' },
  { value: 'withdrawal', label: 'سحب', icon: 'arrow-up-circle', color: 'error' },
  { value: 'expense', label: 'مصروف', icon: 'receipt', color: 'warning' },
  { value: 'income', label: 'دخل', icon: 'dollar-sign', color: 'success' },
  { value: 'salary', label: 'راتب', icon: 'users', color: 'primary' },
  { value: 'custody', label: 'عهده', icon: 'briefcase', color: 'info' },
  { value: 'adjustment', label: 'تعديل', icon: 'edit-3', color: 'muted' },
  { value: 'settlement', label: 'تسوية', icon: 'check-circle', color: 'success' }
] as const

export const TRANSACTION_STATUS = [
  { value: 'pending', label: 'معلق', color: 'warning' },
  { value: 'approved', label: 'موافق', color: 'success' },
  { value: 'rejected', label: 'مرفوض', color: 'error' },
  { value: 'completed', label: 'مكتمل', color: 'primary' }
] as const

export const APPROVAL_THRESHOLD_HIGH = parseInt(import.meta.env.VITE_APPROVAL_THRESHOLD_HIGH || '10000')
export const APPROVAL_THRESHOLD_MEDIUM = parseInt(import.meta.env.VITE_APPROVAL_THRESHOLD_MEDIUM || '5000')

export const ROLES = [
  { value: 'super_admin', label: 'مدير عام', permissions: ['all'] },
  { value: 'admin', label: 'مدير', permissions: ['manage_accounts', 'manage_transactions', 'manage_employees', 'approve', 'view_reports'] },
  { value: 'employee', label: 'موظف', permissions: ['create_transactions', 'create_transfers', 'view_own'] },
  { value: 'viewer', label: 'مشاهد', permissions: ['view_only'] }
] as const

export const NOTIFICATION_TYPES = [
  { value: 'approval', label: 'موافقة', icon: 'check-square' },
  { value: 'transaction', label: 'معاملة', icon: 'dollar-sign' },
  { value: 'alert', label: 'تنبيه', icon: 'alert-triangle' },
  { value: 'info', label: 'معلومات', icon: 'info' },
  { value: 'summary', label: 'ملخص', icon: 'file-text' }
] as const

export const PAGE_SIZES = [10, 25, 50, 100] as const

export const DATE_RANGES = [
  { value: 'today', label: 'اليوم' },
  { value: 'yesterday', label: 'أمس' },
  { value: 'last_7_days', label: 'آخر 7 أيام' },
  { value: 'last_30_days', label: 'آخر 30 يوم' },
  { value: 'this_month', label: 'هذا الشهر' },
  { value: 'last_month', label: 'الشهر الماضي' },
  { value: 'this_year', label: 'هذه السنة' },
  { value: 'custom', label: 'مخصص' }
] as const

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  ACCOUNTS: '/accounts',
  ACCOUNT_DETAIL: '/accounts/:id',
  ACCOUNT_NEW: '/accounts/new',
  EMPLOYEES: '/employees',
  EMPLOYEE_DETAIL: '/employees/:id',
  EMPLOYEE_NEW: '/employees/new',
  TRANSACTIONS: '/transactions',
  TRANSACTION_DETAIL: '/transactions/:id',
  TRANSACTION_NEW: '/transactions/new',
  TRANSFERS: '/transfers',
  TRANSFER_DETAIL: '/transfers/:id',
  TRANSFER_NEW: '/transfers/new',
  APPROVALS: '/approvals',
  APPROVAL_DETAIL: '/approvals/:id',
  REPORTS: '/reports',
  AUDIT: '/audit',
  USERS: '/users',
  ROLES: '/roles',
  TEST: '/test',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications'
} as const

export const NAV_ITEMS = [
  { path: ROUTES.DASHBOARD, label: 'الرئيسية', icon: 'home' },
  { path: ROUTES.ACCOUNTS, label: 'الحسابات', icon: 'wallet' },
  { path: ROUTES.TRANSACTIONS, label: 'المعاملات', icon: 'repeat' },
  { path: ROUTES.TRANSFERS, label: 'التحويلات', icon: 'shuffle' },
  { path: ROUTES.APPROVALS, label: 'الموافقات', icon: 'check-circle' },
  { path: ROUTES.USERS, label: 'المستخدمين', icon: 'users' },
  { path: ROUTES.ROLES, label: 'الأدوار', icon: 'shield' },
  { path: ROUTES.SETTINGS, label: 'الإعدادات', icon: 'settings' },
  { path: ROUTES.REPORTS, label: 'التقارير', icon: 'file-text' },
  { path: ROUTES.AUDIT, label: 'السجل', icon: 'history' }
] as const

export const INITIAL_SYNC_DELAY = 2000
export const SYNC_RETRY_DELAY = 5000
export const MAX_SYNC_RETRIES = 3

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language',
  LAST_SYNC: 'last_sync',
  OFFLINE_MODE: 'offline_mode'
} as const