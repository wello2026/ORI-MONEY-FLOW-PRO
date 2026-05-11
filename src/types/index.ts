export type UserRole = 'super_admin' | 'admin' | 'employee' | 'viewer'
export type CompanyRole = 'owner' | 'admin' | 'accountant' | 'treasury' | 'operations' | 'viewer'

export interface Company {
  id: string
  company_name: string
  company_name_ar: string
  commercial_registration?: string
  tax_number?: string
  address?: string
  phone?: string
  email?: string
  country: string
  default_currency: string
  logo_url?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface UserCompany {
  id: string
  user_id: string
  company_id: string
  role: CompanyRole
  is_current: boolean
  joined_at: string
  company?: Company
}

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
  default_company_id?: string
}

// ==================== TREASURY TYPES ====================
export type TreasuryType = 'cashbox' | 'bank' | 'reserve' | 'petty_cash' | 'escrow'
export type TreasuryTransactionType = 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'exchange_in' | 'exchange_out' | 'adjustment' | 'reconciliation'
export type TreasuryTransactionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface Treasury {
  id: string
  company_id: string
  treasury_code: string
  treasury_name: string
  treasury_name_ar?: string
  treasury_type: TreasuryType
  currency_code: string
  country?: string
  opening_balance: number
  current_balance: number
  bank_name?: string
  account_number?: string
  iban?: string
  swift?: string
  notes?: string
  is_active: boolean
  allow_overdraft: boolean
  min_balance?: number
  max_balance?: number
  alert_threshold?: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface TreasuryTransaction {
  id: string
  company_id: string
  treasury_id: string
  transaction_type: TreasuryTransactionType
  amount: number
  currency_code: string
  exchange_rate: number
  destination_amount?: number
  destination_currency?: string
  destination_treasury_id?: string
  description?: string
  reference_number?: string
  project_id?: string
  partner_id?: string
  journal_entry_id?: string
  status: TreasuryTransactionStatus
  approved_by?: string
  approved_at?: string
  created_by?: string
  created_at: string
  updated_at: string
  treasury?: Treasury
  destination_treasury?: Treasury
}

export interface CurrencyRate {
  id: string
  company_id: string
  base_currency: string
  target_currency: string
  rate: number
  effective_date: string
  source: string
  notes?: string
  created_by?: string
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
  manager_id?: string // The engineer responsible for this project
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
  priority?: NotificationPriority
  action_url?: string
  related_entity_type?: string
  related_entity_id?: string
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

// ==================== PARTNER TYPES ====================
export type PartnerEntryType =
  | 'advance_sent'
  | 'advance_received'
  | 'material_purchase'
  | 'labor_cost'
  | 'reimbursement'
  | 'adjustment'
  | 'settlement'
  | 'return'
  | 'other'

export interface FinancialPartner {
  id: string
  company_id: string
  partner_code: string
  partner_name: string
  partner_name_ar?: string
  country?: string
  currency_code: string
  balance: number
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  bank_name?: string
  bank_account_number?: string
  bank_iban?: string
  bank_swift?: string
  tax_number?: string
  notes?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface PartnerLedgerEntry {
  id: string
  company_id: string
  partner_id: string
  entry_type: PartnerEntryType
  amount: number
  currency_code: string
  balance_after: number
  description?: string
  reference_number?: string
  treasury_transaction_id?: string
  journal_entry_id?: string
  project_id?: string
  recorded_by?: string
  created_at: string
  project_name?: string
  recorded_by_name?: string
}

export interface PartnerStatement extends PartnerLedgerEntry {}

export interface PartnerBalance {
  partner_id: string
  partner_name: string
  currency_code: string
  balance: number
  total_advances: number
  total_expenses: number
  net_balance: number
}

export interface PartnerSummary {
  id: string
  partner_code: string
  partner_name: string
  partner_name_ar?: string
  country?: string
  currency_code: string
  balance: number
  total_advances: number
  total_expenses: number
  total_entries: number
  last_entry_date?: string
  is_active: boolean
}

// ==================== SUPPLIER TYPES ====================
export type SupplierInvoiceStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other'

export interface Supplier {
  id: string
  company_id: string
  supplier_code: string
  supplier_name: string
  supplier_name_ar?: string
  supplier_type?: string
  country?: string
  currency_code: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  tax_number?: string
  bank_name?: string
  bank_account_number?: string
  bank_iban?: string
  bank_swift?: string
  payment_terms: number
  credit_limit: number
  current_balance: number
  notes?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface SupplierInvoice {
  id: string
  company_id: string
  supplier_id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  description?: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  currency_code: string
  exchange_rate: number
  amount_paid: number
  amount_due: number
  status: SupplierInvoiceStatus
  project_id?: string
  reference_number?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  supplier?: Supplier
  project_name?: string
}

export interface SupplierPayment {
  id: string
  company_id: string
  supplier_id: string
  invoice_id?: string
  payment_number: string
  payment_date: string
  amount: number
  currency_code: string
  exchange_rate: number
  payment_method: PaymentMethod
  treasury_transaction_id?: string
  journal_entry_id?: string
  reference_number?: string
  description?: string
  recorded_by?: string
  created_at: string
}

export interface SupplierSummary {
  id: string
  supplier_code: string
  supplier_name: string
  supplier_name_ar?: string
  country?: string
  currency_code: string
  current_balance: number
  payment_terms: number
  is_active: boolean
  total_invoiced: number
  total_paid: number
  total_due: number
  invoices_count: number
  overdue_amount: number
}

export interface PayablesAging {
  supplier_id: string
  supplier_name: string
  currency_code: string
  current_due: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  days_over_90: number
  overdue_amount: number
}

// ==================== PROJECT FINANCIAL TYPES ====================
export type ExpenseCategory = 'materials' | 'labor' | 'equipment' | 'transportation' | 'subcontractor' | 'permits' | 'utilities' | 'insurance' | 'maintenance' | 'consulting' | 'other'
export type ProjectExpenseStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type RevenueType = 'contract_value' | 'change_order' | 'milestone_payment' | 'advance_received' | 'final_payment' | 'penalty' | 'other'
export type RevenueStatus = 'pending' | 'confirmed' | 'invoiced' | 'received' | 'cancelled'

export interface ProjectExpense {
  id: string
  company_id: string
  project_id: string
  expense_category: ExpenseCategory
  description?: string
  amount: number
  currency_code: string
  exchange_rate: number
  amount_in_base: number
  expense_date: string
  vendor_id?: string
  partner_id?: string
  treasury_transaction_id?: string
  journal_entry_id?: string
  receipt_url?: string
  reference_number?: string
  status: ProjectExpenseStatus
  approved_by?: string
  approved_at?: string
  recorded_by?: string
  created_at: string
}

export interface ProjectRevenue {
  id: string
  company_id: string
  project_id: string
  revenue_type: RevenueType
  description?: string
  amount: number
  currency_code: string
  exchange_rate: number
  amount_in_base: number
  revenue_date: string
  invoice_number?: string
  treasury_transaction_id?: string
  journal_entry_id?: string
  reference_number?: string
  status: RevenueStatus
  recorded_by?: string
  created_at: string
}

export interface ProjectFinancials {
  project_id: string
  project_name: string
  project_code: string
  project_budget: number
  project_currency: string
  project_status: string
  total_expenses: number
  total_revenues: number
  net_profit: number
  budget_utilization_pct: number
  materials_cost: number
  labor_cost: number
  equipment_cost: number
  transportation_cost: number
  subcontractor_cost: number
  other_costs: number
  expense_count: number
  revenue_count: number
}

// ==================== NOTIFICATION & ALERT TYPES ====================
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface NotificationPreference {
  id: string
  user_id: string
  company_id?: string
  push_approval: boolean
  push_transaction: boolean
  push_alert: boolean
  push_info: boolean
  push_summary: boolean
  treasury_low_balance_alert: boolean
  treasury_low_balance_threshold: number
  partner_outstanding_alert: boolean
  partner_outstanding_threshold: number
  supplier_overdue_alert: boolean
  supplier_overdue_days: number
  project_budget_alert: boolean
  project_budget_threshold_pct: number
  expense_approval_alert: boolean
  email_approval: boolean
  email_alert: boolean
  email_summary_daily: boolean
  email_summary_weekly: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  created_at: string
  updated_at: string
}

export interface AlertRule {
  id: string
  company_id: string
  rule_type: string
  name: string
  description?: string
  is_active: boolean
  threshold_value: number
  threshold_operator: string
  notification_channel: string
  target_entity_type?: string
  target_entity_id?: string
  notify_user_ids: string[]
  check_frequency: string
  last_checked?: string
  last_triggered?: string
  trigger_count: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface AlertLog {
  id: string
  company_id?: string
  alert_rule_id?: string
  alert_type: string
  severity: AlertSeverity
  title: string
  message: string
  entity_type?: string
  entity_id?: string
  is_read: boolean
  is_dismissed: boolean
  read_by?: string
  read_at?: string
  action_taken?: string
  action_by?: string
  action_at?: string
  metadata?: Record<string, unknown>
  triggered_at: string
}

// قائمة جميع الصلاحيات مع التسميات
export type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled'
export type ExpensePaymentMethod = 'cash' | 'bank' | 'cheque' | 'transfer' | 'card'

export interface Expense {
  id: string
  company_id: string
  expense_number: string
  title: string
  description?: string
  amount: number
  currency_code: string
  exchange_rate: number
  amount_in_base: number
  category: string
  expense_date: string
  project_id?: string
  supplier_id?: string
  partner_id?: string
  employee_id?: string
  payment_method: ExpensePaymentMethod
  treasury_account_id?: string
  receipt_url?: string
  reference_number?: string
  vendor_name?: string
  notes?: string
  status: ExpenseStatus
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  is_recurring: boolean
  recurring_pattern?: Record<string, unknown>
  recorded_by?: string
  created_at: string
  updated_at: string
  project_name?: string
  recorded_by_name?: string
}

export interface ExpenseSummary {
  total_amount: number
  approved_amount: number
  pending_amount: number
  rejected_amount: number
  total_count: number
  category_breakdown: { category: string; total: number; count: number }[]
}

export interface ExpenseListItem {
  id: string
  expense_number: string
  title: string
  description: string
  amount: number
  currency_code: string
  amount_in_base: number
  category: string
  expense_date: string
  status: ExpenseStatus
  project_name: string
  vendor_name: string
  reference_number: string
  is_recurring: boolean
  recorded_by_name: string
  created_at: string
}

// قائمة جميع الصلاحيات مع التسميات
export interface ProductCostCard {
  id: string
  company_id: string
  card_code: string
  product_name: string
  product_name_ar?: string
  product_category?: string
  unit_of_measure: string
  description?: string
  material_cost: number
  labor_cost: number
  accessory_cost: number
  overhead_cost: number
  total_cost: number
  selling_price: number
  target_margin_pct: number
  currency_code: string
  labor_rate_per_hour: number
  labor_hours: number
  is_active: boolean
  last_updated: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type ComponentType = 'material' | 'labor' | 'accessory' | 'overhead' | 'other'

export interface ProductCostComponent {
  id: string
  company_id: string
  cost_card_id: string
  component_type: ComponentType
  component_name: string
  component_name_ar?: string
  quantity: number
  unit_cost: number
  total_cost: number
  currency_code: string
  supplier_id?: string
  reference_number?: string
  notes?: string
  created_by?: string
  created_at: string
}

export interface ProductCostSummary {
  id: string
  card_code: string
  product_name: string
  product_name_ar?: string
  product_category?: string
  unit_of_measure: string
  material_cost: number
  labor_cost: number
  accessory_cost: number
  overhead_cost: number
  total_cost: number
  selling_price: number
  target_margin_pct: number
  actual_margin_pct: number
  currency_code: string
  component_count: number
  is_active: boolean
}

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