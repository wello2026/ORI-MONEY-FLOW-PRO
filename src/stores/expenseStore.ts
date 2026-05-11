import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import type { Expense, ExpenseSummary, ExpenseListItem } from '@/types'

interface ExpenseState {
  expenses: ExpenseListItem[]
  currentExpense: Expense | null
  summary: ExpenseSummary | null
  isLoading: boolean
  error: string | null
  successMessage: string | null
  totalCount: number

  fetchExpenses: (filters?: {
    category?: string
    status?: string
    start_date?: string
    end_date?: string
    search?: string
  }) => Promise<void>
  fetchExpense: (id: string) => Promise<void>
  fetchSummary: (filters?: {
    start_date?: string
    end_date?: string
    category?: string
    status?: string
  }) => Promise<void>
  createExpense: (data: {
    title: string
    category: string
    amount: number
    expense_date?: string
    description?: string
    currency_code?: string
    exchange_rate?: number
    project_id?: string
    supplier_id?: string
    partner_id?: string
    employee_id?: string
    payment_method?: string
    treasury_account_id?: string
    reference_number?: string
    vendor_name?: string
    notes?: string
    requires_approval?: boolean
  }) => Promise<{ success: boolean; error?: string; expense_id?: string }>
  approveExpense: (id: string, rejection_reason?: string) => Promise<{ success: boolean; error?: string }>
  markPaid: (id: string, treasury_account_id?: string) => Promise<{ success: boolean; error?: string }>
  deleteExpense: (id: string) => Promise<{ success: boolean; error?: string }>

  clearMessages: () => void
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  currentExpense: null,
  summary: null,
  isLoading: false,
  error: null,
  successMessage: null,
  totalCount: 0,

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchExpenses: async (filters) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.rpc('get_expenses_list', {
        p_limit: 50,
        p_offset: 0,
        p_category: filters?.category || null,
        p_status: filters?.status || null,
        p_start_date: filters?.start_date || null,
        p_end_date: filters?.end_date || null,
        p_search: filters?.search || null
      })
      if (error) throw error
      set({ expenses: data || [], isLoading: false, totalCount: data?.length || 0 })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchExpense: async (id: string) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      set({ currentExpense: data, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchSummary: async (filters) => {
    if (!isSupabaseConfigured()) return
    try {
      const { data, error } = await supabase.rpc('get_expenses_summary', {
        p_start_date: filters?.start_date || null,
        p_end_date: filters?.end_date || null,
        p_category: filters?.category || null,
        p_status: filters?.status || null
      })
      if (error) throw error
      set({ summary: data ? {
        total_amount: data.total_amount || 0,
        approved_amount: data.approved_amount || 0,
        pending_amount: data.pending_amount || 0,
        rejected_amount: data.rejected_amount || 0,
        total_count: data.total_count || 0,
        category_breakdown: data.category_breakdown || []
      } : null })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  createExpense: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    const user = useAuthStore.getState().user
    const currentCompany = useAuthStore.getState().currentCompany
    if (!currentCompany) return { success: false, error: 'لا توجد شركة محددة' }
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase.rpc('create_expense', {
        p_title: data.title,
        p_category: data.category,
        p_amount: data.amount,
        p_expense_date: data.expense_date || new Date().toISOString().split('T')[0],
        p_description: data.description || null,
        p_currency_code: data.currency_code || currentCompany.default_currency || 'USD',
        p_exchange_rate: data.exchange_rate || 1,
        p_project_id: data.project_id || null,
        p_supplier_id: data.supplier_id || null,
        p_partner_id: data.partner_id || null,
        p_employee_id: data.employee_id || null,
        p_payment_method: data.payment_method || 'cash',
        p_treasury_account_id: data.treasury_account_id || null,
        p_reference_number: data.reference_number || null,
        p_vendor_name: data.vendor_name || null,
        p_notes: data.notes || null,
        p_requires_approval: data.requires_approval !== false
      })
      if (error) throw error
      set({ isLoading: false, successMessage: 'تم تسجيل المصروف بنجاح' })
      await get().fetchExpenses()
      await get().fetchSummary()
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  approveExpense: async (id, rejection_reason) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.rpc('approve_expense', {
        p_expense_id: id,
        p_rejection_reason: rejection_reason || null
      })
      if (error) throw error
      set({ isLoading: false, successMessage: rejection_reason ? 'تم رفض المصروف' : 'تم اعتماد المصروف بنجاح' })
      await get().fetchExpenses()
      await get().fetchSummary()
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  markPaid: async (id, treasury_account_id) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.rpc('mark_expense_paid', {
        p_expense_id: id,
        p_treasury_account_id: treasury_account_id || null
      })
      if (error) throw error
      set({ isLoading: false, successMessage: 'تم تسجيل الدفع' })
      await get().fetchExpenses()
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  deleteExpense: async (id) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.from('expenses').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      set({ isLoading: false, successMessage: 'تم إلغاء المصروف' })
      await get().fetchExpenses()
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  }
}))