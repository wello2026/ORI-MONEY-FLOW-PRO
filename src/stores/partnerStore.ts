import { create } from 'zustand'
import type { FinancialPartner, PartnerLedgerEntry, PartnerStatement, PartnerBalance, PartnerSummary, PartnerEntryType } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { v4 as uuidv4 } from 'uuid'

interface PartnerState {
  partners: FinancialPartner[]
  currentPartner: FinancialPartner | null
  summary: PartnerSummary[]
  statement: PartnerStatement[]
  balance: PartnerBalance | null
  isLoading: boolean
  error: string | null
  successMessage: string | null

  fetchPartners: () => Promise<void>
  fetchPartner: (id: string) => Promise<void>
  createPartner: (data: Omit<FinancialPartner, 'id' | 'created_at' | 'updated_at' | 'balance' | 'created_by' | 'company_id'>) => Promise<{ success: boolean; error?: string; partner_id?: string }>
  updatePartner: (id: string, updates: Partial<FinancialPartner>) => Promise<{ success: boolean; error?: string }>
  deletePartner: (id: string) => Promise<{ success: boolean; error?: string }>

  recordAdvance: (data: {
    partner_id: string
    amount: number
    currency_code?: string
    description?: string
    reference_number?: string
    project_id?: string
    treasury_transaction_id?: string
  }) => Promise<{ success: boolean; error?: string }>

  recordExpense: (data: {
    partner_id: string
    entry_type: 'material_purchase' | 'labor_cost' | 'reimbursement' | 'other'
    amount: number
    currency_code?: string
    description?: string
    reference_number?: string
    project_id?: string
  }) => Promise<{ success: boolean; error?: string }>

  settlePartner: (data: {
    partner_id: string
    settlement_amount: number
    direction: 'we_pay' | 'partner_pays'
    currency_code?: string
    description?: string
    reference_number?: string
  }) => Promise<{ success: boolean; error?: string }>

  fetchStatement: (partnerId: string, dateFrom?: string, dateTo?: string) => Promise<void>
  fetchBalance: (partnerId: string) => Promise<void>
  fetchSummary: () => Promise<void>

  clearMessages: () => void
}

export const usePartnerStore = create<PartnerState>((set, get) => ({
  partners: [],
  currentPartner: null,
  summary: [],
  statement: [],
  balance: null,
  isLoading: false,
  error: null,
  successMessage: null,

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchPartners: async () => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('financial_partners')
        .select('*')
        .eq('is_active', true)
        .order('partner_name')

      if (error) throw error
      set({ partners: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchPartner: async (id: string) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('financial_partners')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      set({ currentPartner: data, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createPartner: async (data) => {
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
      const partnerId = uuidv4()
      const newPartner = {
        id: partnerId,
        company_id: currentCompany.id,
        partner_code: data.partner_code || `P-${Date.now()}`,
        partner_name: data.partner_name,
        partner_name_ar: data.partner_name_ar,
        country: data.country,
        currency_code: data.currency_code || currentCompany.default_currency || 'USD',
        balance: 0,
        contact_person: data.contact_person,
        phone: data.phone,
        email: data.email,
        address: data.address,
        bank_name: data.bank_name,
        bank_account_number: data.bank_account_number,
        bank_iban: data.bank_iban,
        bank_swift: data.bank_swift,
        tax_number: data.tax_number,
        notes: data.notes,
        is_active: true,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase.from('financial_partners').insert(newPartner)

      if (error) {
        if (error.code === '23505') {
          set({ error: 'كود الشريك مستخدم من قبل', isLoading: false })
          return { success: false, error: 'كود الشريك مستخدم من قبل' }
        }
        throw error
      }

      set((state) => ({
        partners: [...state.partners, newPartner as FinancialPartner],
        isLoading: false,
        successMessage: 'تم إنشاء الشريك بنجاح'
      }))
      return { success: true, partner_id: partnerId }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  updatePartner: async (id, updates) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('financial_partners')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        partners: state.partners.map(p => p.id === id ? { ...p, ...updates } : p),
        currentPartner: state.currentPartner?.id === id ? { ...state.currentPartner, ...updates } : state.currentPartner,
        isLoading: false,
        successMessage: 'تم تحديث الشريك بنجاح'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  deletePartner: async (id) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('financial_partners')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        partners: state.partners.filter(p => p.id !== id),
        currentPartner: state.currentPartner?.id === id ? null : state.currentPartner,
        isLoading: false,
        successMessage: 'تم حذف الشريك'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  recordAdvance: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })

    try {
      const { data: result, error } = await supabase.rpc('record_partner_advance', {
        p_partner_id: data.partner_id,
        p_amount: data.amount,
        p_currency_code: data.currency_code || 'USD',
        p_description: data.description || null,
        p_reference_number: data.reference_number || null,
        p_project_id: data.project_id || null,
        p_treasury_transaction_id: data.treasury_transaction_id || null
      })

      if (error) throw error

      const rpcResult = result?.[0]
      if (!rpcResult?.success) {
        set({ error: rpcResult?.message || 'فشل تسجيل السلفة', isLoading: false })
        return { success: false, error: rpcResult?.message }
      }

      await get().fetchPartners()
      await get().fetchStatement(data.partner_id)

      set({ isLoading: false, successMessage: rpcResult?.message || 'تم تسجيل السلفة بنجاح' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  recordExpense: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })

    try {
      const { data: result, error } = await supabase.rpc('record_partner_expense', {
        p_partner_id: data.partner_id,
        p_entry_type: data.entry_type,
        p_amount: data.amount,
        p_currency_code: data.currency_code || 'USD',
        p_description: data.description || null,
        p_reference_number: data.reference_number || null,
        p_project_id: data.project_id || null
      })

      if (error) throw error

      const rpcResult = result?.[0]
      if (!rpcResult?.success) {
        set({ error: rpcResult?.message || 'فشل تسجيل العملية', isLoading: false })
        return { success: false, error: rpcResult?.message }
      }

      await get().fetchPartners()
      await get().fetchStatement(data.partner_id)

      set({ isLoading: false, successMessage: rpcResult?.message || 'تم تسجيل العملية بنجاح' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  settlePartner: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })

    try {
      const { data: result, error } = await supabase.rpc('settle_partner', {
        p_partner_id: data.partner_id,
        p_settlement_amount: data.settlement_amount,
        p_direction: data.direction,
        p_currency_code: data.currency_code || 'USD',
        p_description: data.description || null,
        p_reference_number: data.reference_number || null
      })

      if (error) throw error

      const rpcResult = result?.[0]
      if (!rpcResult?.success) {
        set({ error: rpcResult?.message || 'فشل التسوية', isLoading: false })
        return { success: false, error: rpcResult?.message }
      }

      await get().fetchPartners()
      await get().fetchStatement(data.partner_id)

      set({ isLoading: false, successMessage: rpcResult?.message || 'تمت التسوية بنجاح' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  fetchStatement: async (partnerId, dateFrom, dateTo) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase.rpc('get_partner_statement', {
        p_partner_id: partnerId,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null
      })

      if (error) throw error
      set({ statement: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchBalance: async (partnerId) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase.rpc('get_partner_balance', {
        p_partner_id: partnerId
      })

      if (error) throw error
      set({ balance: data?.[0] || null, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchSummary: async () => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase.rpc('get_partners_summary')

      if (error) throw error
      set({ summary: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  }
}))
