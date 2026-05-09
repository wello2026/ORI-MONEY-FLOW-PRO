export type UserRole = 'super_admin' | 'admin' | 'employee' | 'viewer'

export interface User {
  id: string
  full_name: string
  email: string
  role: UserRole
  phone?: string
  avatar_url?: string
  is_active: boolean
  device_info?: Record<string, unknown>
  last_login?: string
  created_at: string
}

export type AccountType = 'cashbox' | 'bank' | 'expense' | 'income' | 'employee' | 'temporary'
export type AccountStatus = 'active' | 'inactive' | 'archived'

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  balance: number
  currency: string
  parent_id?: string
  owner_id?: string
  status: AccountStatus
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
  children?: Account[]
}

export type TransactionType = 'deposit' | 'withdrawal' | 'expense' | 'income' | 'salary' | 'custody' | 'adjustment' | 'settlement'
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export interface Transaction {
  id: string
  reference: string
  type: TransactionType
  amount: number
  currency?: string
  exchange_rate?: number
  description?: string
  account_id: string
  project_id?: string
  offset_account_id?: string
  created_by: string
  approved_by?: string
  status: TransactionStatus
  attachments?: string[] // URLs to images
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  account?: Account
  offset_account?: Account
  creator?: User
  approver?: User
}

export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export interface Transfer {
  id: string
  reference: string
  source_account_id: string
  destination_account_id: string
  amount: number
  source_currency?: string
  destination_currency?: string
  exchange_rate?: number
  description?: string
  status: TransferStatus
  created_by: string
  approved_by?: string
  created_at: string
  source_account?: Account
  destination_account?: Account
  creator?: User
  approver?: User
}

export interface Project {
  id: string
  name: string
  code: string
  status: 'active' | 'completed' | 'on_hold' | 'archived'
  budget: number
  currency: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
}

export type ApprovalEntityType = 'transaction' | 'transfer' | 'account' | 'employee'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Approval {
  id: string
  entity_type: ApprovalEntityType
  entity_id: string
  status: ApprovalStatus
  notes?: string
  requested_by: string
  approved_by?: string
  device_info?: Record<string, unknown>
  ip_address?: string
  created_at: string
  decided_at?: string
  requester?: User
  approver?: User
}

export type NotificationType = 'approval' | 'transaction' | 'alert' | 'info' | 'summary'

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: NotificationType
  is_read: boolean
  data?: Record<string, unknown>
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id?: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  ip_address?: string
  device_info?: Record<string, unknown>
  created_at: string
  user?: User
}

export interface LoginHistory {
  id: string
  user_id: string
  ip_address?: string
  device_info?: Record<string, unknown>
  user_agent?: string
  success: boolean
  created_at: string
}

export interface DashboardStats {
  totalBalance: number
  totalIncome: number
  totalExpense: number
  netCashflow: number
  pendingApprovals: number
  activeAccounts: number
  totalTransactions: number
}

export interface ChartDataPoint {
  name: string
  value: number
  color?: string
}

export interface TransactionFilter {
  search?: string
  type?: TransactionType | 'all'
  status?: TransactionStatus | 'all'
  account_id?: string
  project_id?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface TransferFilter {
  search?: string
  status?: TransferStatus | 'all'
  source_account_id?: string
  destination_account_id?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface ApprovalFilter {
  search?: string
  entity_type?: ApprovalEntityType | 'all'
  status?: ApprovalStatus | 'all'
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface PaginationParams {
  page: number
  limit: number
  total?: number
}

export interface ApiResponse<T> {
  data: T
  error?: string
  pagination?: PaginationParams
}

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime?: string
  pendingCount: number
}

export interface ThemeMode {
  mode: 'light' | 'dark'
  system: boolean
}

export interface AppSettings {
  theme: ThemeMode
  language: string
  notifications: boolean
  offlineMode: boolean
}

export type Permission =
  // الحسابات
  | 'accounts_view'
  | 'accounts_create'
  | 'accounts_edit'
  | 'accounts_delete'
  // المعاملات
  | 'transactions_view'
  | 'transactions_create'
  | 'transactions_edit'
  | 'transactions_delete'
  | 'transactions_approve'
  // التحويلات
  | 'transfers_view'
  | 'transfers_create'
  | 'transfers_approve'
  // المستخدمين
  | 'users_view'
  | 'users_create'
  | 'users_edit'
  | 'users_delete'
  // الموظفين
  | 'employees_view'
  | 'employees_create'
  | 'employees_edit'
  | 'employees_delete'
  // الموافقات
  | 'approvals_view'
  | 'approvals_manage'
  // التقارير
  | 'reports_view'
  | 'reports_export'
  // الإعدادات
  | 'settings_view'
  | 'settings_edit'
  // السجل
  | 'audit_view'
  // الصلاحيات
  | 'roles_manage'

// قائمة جميع الصلاحيات مع التسميات
export const PERMISSIONS_LIST: { key: Permission; label: string; category: string }[] = [
  // الحسابات
  { key: 'accounts_view', label: 'عرض الحسابات', category: 'الحسابات' },
  { key: 'accounts_create', label: 'إنشاء حسابات', category: 'الحسابات' },
  { key: 'accounts_edit', label: 'تعديل الحسابات', category: 'الحسابات' },
  { key: 'accounts_delete', label: 'حذف الحسابات', category: 'الحسابات' },
  // المعاملات
  { key: 'transactions_view', label: 'عرض المعاملات', category: 'المعاملات' },
  { key: 'transactions_create', label: 'إنشاء معاملات', category: 'المعاملات' },
  { key: 'transactions_edit', label: 'تعديل المعاملات', category: 'المعاملات' },
  { key: 'transactions_delete', label: 'حذف المعاملات', category: 'المعاملات' },
  { key: 'transactions_approve', label: 'موافقة على معاملات', category: 'المعاملات' },
  // التحويلات
  { key: 'transfers_view', label: 'عرض التحويلات', category: 'التحويلات' },
  { key: 'transfers_create', label: 'إنشاء تحويلات', category: 'التحويلات' },
  { key: 'transfers_approve', label: 'موافقة على تحويلات', category: 'التحويلات' },
  // المستخدمين
  { key: 'users_view', label: 'عرض المستخدمين', category: 'المستخدمين' },
  { key: 'users_create', label: 'إنشاء مستخدمين', category: 'المستخدمين' },
  { key: 'users_edit', label: 'تعديل مستخدمين', category: 'المستخدمين' },
  { key: 'users_delete', label: 'حذف مستخدمين', category: 'المستخدمين' },
  // الموظفين
  { key: 'employees_view', label: 'عرض الموظفين', category: 'الموظفين' },
  { key: 'employees_create', label: 'إنشاء موظفين', category: 'الموظفين' },
  { key: 'employees_edit', label: 'تعديل موظفين', category: 'الموظفين' },
  { key: 'employees_delete', label: 'حذف موظفين', category: 'الموظفين' },
  // الموافقات
  { key: 'approvals_view', label: 'عرض الموافقات', category: 'الموافقات' },
  { key: 'approvals_manage', label: 'إدارة الموافقات', category: 'الموافقات' },
  // التقارير
  { key: 'reports_view', label: 'عرض التقارير', category: 'التقارير' },
  { key: 'reports_export', label: 'تصدير التقارير', category: 'التقارير' },
  // الإعدادات
  { key: 'settings_view', label: 'عرض الإعدادات', category: 'الإعدادات' },
  { key: 'settings_edit', label: 'تعديل الإعدادات', category: 'الإعدادات' },
  // السجل
  { key: 'audit_view', label: 'عرض سجل_activity', category: 'السجل' },
  // الأدوار
  { key: 'roles_manage', label: 'إدارة الأدوار والصلاحيات', category: 'الأدوار' }
]

// الأدوار الافتراضية مع صلاحياتها
export const DEFAULT_ROLES: Record<UserRole, Permission[]> = {
  super_admin: PERMISSIONS_LIST.map(p => p.key), // كل الصلاحيات
  admin: [
    'accounts_view', 'accounts_create', 'accounts_edit',
    'transactions_view', 'transactions_create', 'transactions_approve',
    'transfers_view', 'transfers_create', 'transfers_approve',
    'users_view', 'users_create', 'users_edit',
    'employees_view', 'employees_create', 'employees_edit',
    'approvals_view', 'approvals_manage',
    'reports_view', 'reports_export',
    'settings_view',
    'audit_view'
  ],
  employee: [
    'accounts_view',
    'transactions_view', 'transactions_create',
    'transfers_view', 'transfers_create',
    'reports_view'
  ],
  viewer: [
    'accounts_view',
    'transactions_view',
    'transfers_view',
    'reports_view'
  ]
}

export const hasPermission = (permissions: Permission[], permission: Permission): boolean => {
  return permissions.includes(permission) || permissions.includes('all' as Permission)
}