import { create } from 'zustand'
import type { Supplier, SupplierInvoice, SupplierPayment, SupplierSummary, PayablesAging } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { v4 as uuidv4 } from 'uuid'

interface SupplierStatementEntry {
  entry_type: string
  entry_date: string
  reference_number: string | null
  description: string | null
  invoice_number: string | null
  subtotal: number | null
  tax_amount: number | null
  total_amount: number | null
  amount_paid: number | null
  amount_due: number | null
  payment_amount: number | null
  payment_method: string | null
  balance: number | null
  created_at: string
}

interface SupplierState {
  suppliers: Supplier[]
  currentSupplier: Supplier | null
  summary: SupplierSummary[]
  invoices: SupplierInvoice[]
  payments: SupplierPayment[]
  statement: SupplierStatementEntry[]
  aging: PayablesAging[]
  isLoading: boolean
  error: string | null
  successMessage: string | null

  fetchSuppliers: () => Promise<void>
  fetchSupplier: (id: string) => Promise<void>
  createSupplier: (data: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'current_balance' | 'created_by' | 'company_id'>) => Promise<{ success: boolean; error?: string; supplier_id?: string }>
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<{ success: boolean; error?: string }>
  deleteSupplier: (id: string) => Promise<{ success: boolean; error?: string }>

  fetchInvoices: (supplierId?: string) => Promise<void>
  createInvoice: (data: {
    supplier_id: string
    invoice_number: string
    invoice_date?: string
    due_date: string
    description?: string
    subtotal: number
    tax_amount?: number
    discount_amount?: number
    total_amount: number
    currency_code?: string
    exchange_rate?: number
    project_id?: string
    reference_number?: string
    notes?: string
  }) => Promise<{ success: boolean; error?: string }>

  payInvoice: (data: {
    invoice_id: string
    amount: number
    payment_date?: string
    payment_method?: string
    treasury_transaction_id?: string
    reference_number?: string
    description?: string
  }) => Promise<{ success: boolean; error?: string }>

  fetchStatement: (supplierId: string, dateFrom?: string, dateTo?: string) => Promise<void>
  fetchSummary: () => Promise<void>
  fetchAging: () => Promise<void>

  clearMessages: () => void
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  currentSupplier: null,
  summary: [],
  invoices: [],
  payments: [],
  statement: [],
  aging: [],
  isLoading: false,
  error: null,
  successMessage: null,

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchSuppliers: async () => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('supplier_name')
      if (error) throw error
      set({ suppliers: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchSupplier: async (id: string) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      set({ currentSupplier: data, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createSupplier: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null, successMessage: null })

    const user = useAuthStore.getState().user
    const currentCompany = useAuthStore.getState().currentCompany
    if (!currentCompany) {
      const errorMsg = 'لا توجد شركة محددة'
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }

    try {
      const supplierId = uuidv4()
      const newSupplier = {
        id: supplierId,
        company_id: currentCompany.id,
        supplier_code: data.supplier_code || `S-${Date.now()}`,
        supplier_name: data.supplier_name,
        supplier_name_ar: data.supplier_name_ar,
        supplier_type: data.supplier_type || 'vendor',
        country: data.country,
        currency_code: data.currency_code || currentCompany.default_currency || 'USD',
        contact_person: data.contact_person,
        phone: data.phone,
        email: data.email,
        address: data.address,
        tax_number: data.tax_number,
        bank_name: data.bank_name,
        bank_account_number: data.bank_account_number,
        bank_iban: data.bank_iban,
        bank_swift: data.bank_swift,
        payment_terms: data.payment_terms || 30,
        credit_limit: data.credit_limit || 0,
        current_balance: 0,
        notes: data.notes,
        is_active: true,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      const { error } = await supabase.from('suppliers').insert(newSupplier)
      if (error) {
        if (error.code === '23505') return { success: false, error: 'كود المورد مستخدم من قبل' }
        throw error
      }
      set((state) => ({
        suppliers: [...state.suppliers, newSupplier as Supplier],
        isLoading: false,
        successMessage: 'تم إنشاء المورد بنجاح'
      }))
      return { success: true, supplier_id: supplierId }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  updateSupplier: async (id, updates) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      set((state) => ({
        suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...updates } : s),
        currentSupplier: state.currentSupplier?.id === id ? { ...state.currentSupplier, ...updates } : state.currentSupplier,
        isLoading: false,
        successMessage: 'تم تحديث المورد بنجاح'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  deleteSupplier: async (id) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      set((state) => ({
        suppliers: state.suppliers.filter(s => s.id !== id),
        currentSupplier: state.currentSupplier?.id === id ? null : state.currentSupplier,
        isLoading: false,
        successMessage: 'تم حذف المورد'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  fetchInvoices: async (supplierId?: string) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      let query = supabase
        .from('supplier_invoices')
        .select('*, supplier:suppliers(id, supplier_name, supplier_name_ar)')
        .order('invoice_date', { ascending: false })
      if (supplierId) query = query.eq('supplier_id', supplierId)
      const { data, error } = await query
      if (error) throw error
      set({ invoices: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createInvoice: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { data: result, error } = await supabase.rpc('create_supplier_invoice', {
        p_supplier_id: data.supplier_id,
        p_invoice_number: data.invoice_number,
        p_invoice_date: data.invoice_date || new Date().toISOString().split('T')[0],
        p_due_date: data.due_date,
        p_description: data.description || null,
        p_subtotal: data.subtotal,
        p_tax_amount: data.tax_amount || 0,
        p_discount_amount: data.discount_amount || 0,
        p_total_amount: data.total_amount,
        p_currency_code: data.currency_code || 'USD',
        p_exchange_rate: data.exchange_rate || 1,
        p_project_id: data.project_id || null,
        p_reference_number: data.reference_number || null,
        p_notes: data.notes || null
      })
      if (error) throw error
      const rpcResult = result?.[0]
      if (!rpcResult?.success) return { success: false, error: rpcResult?.message }
      await get().fetchInvoices(data.supplier_id)
      set({ isLoading: false, successMessage: rpcResult?.message || 'تم إنشاء الفاتورة بنجاح' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  payInvoice: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { data: result, error } = await supabase.rpc('pay_supplier_invoice', {
        p_invoice_id: data.invoice_id,
        p_amount: data.amount,
        p_payment_date: data.payment_date || new Date().toISOString().split('T')[0],
        p_payment_method: data.payment_method || 'bank_transfer',
        p_treasury_transaction_id: data.treasury_transaction_id || null,
        p_reference_number: data.reference_number || null,
        p_description: data.description || null
      })
      if (error) throw error
      const rpcResult = result?.[0]
      if (!rpcResult?.success) return { success: false, error: rpcResult?.message }
      await get().fetchInvoices()
      set({ isLoading: false, successMessage: rpcResult?.message || 'تم تسجيل السداد بنجاح' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  fetchStatement: async (supplierId, dateFrom, dateTo) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.rpc('get_supplier_statement', {
        p_supplier_id: supplierId,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null
      })
      if (error) throw error
      set({ statement: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchSummary: async () => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.rpc('get_suppliers_summary')
      if (error) throw error
      set({ summary: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchAging: async () => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.rpc('get_payables_aging')
      if (error) throw error
      set({ aging: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  }
}))
