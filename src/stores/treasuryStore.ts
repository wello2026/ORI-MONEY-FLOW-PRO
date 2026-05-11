import { create } from 'zustand'
import type {
  Treasury,
  TreasuryTransaction,
  CurrencyRate,
  TreasuryType,
  TreasuryTransactionType,
  TreasuryTransactionStatus
} from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { v4 as uuidv4 } from 'uuid'

interface TreasurySummary {
  treasury_id: string
  treasury_name: string
  currency_code: string
  treasury_type: string
  current_balance: number
  transaction_count: number
  last_transaction: string | null
}

interface TreasuryState {
  treasuries: Treasury[]
  currentTreasury: Treasury | null
  transactions: TreasuryTransaction[]
  currentTransaction: TreasuryTransaction | null
  currencyRates: CurrencyRate[]
  summary: TreasurySummary[]
  isLoading: boolean
  error: string | null
  successMessage: string | null

  fetchTreasuries: () => Promise<void>
  fetchTreasury: (id: string) => Promise<void>
  createTreasury: (data: Omit<Treasury, 'id' | 'created_at' | 'updated_at' | 'current_balance' | 'company_id' | 'is_active' | 'min_balance'>) => Promise<{ success: boolean; error?: string }>
  updateTreasury: (id: string, updates: Partial<Treasury>) => Promise<{ success: boolean; error?: string }>
  deleteTreasury: (id: string) => Promise<{ success: boolean; error?: string }>

  fetchTransactions: (treasuryId?: string) => Promise<void>
  createTransaction: (data: {
    treasury_id: string
    transaction_type: TreasuryTransactionType
    amount: number
    currency_code: string
    exchange_rate?: number
    destination_amount?: number
    destination_currency?: string
    destination_treasury_id?: string
    description?: string
    reference_number?: string
    project_id?: string
  }) => Promise<{ success: boolean; error?: string }>
  approveTransaction: (id: string) => Promise<{ success: boolean; error?: string }>
  rejectTransaction: (id: string) => Promise<{ success: boolean; error?: string }>

  createCurrencyTransfer: (data: {
    source_treasury_id: string
    destination_treasury_id: string
    source_amount: number
    exchange_rate: number
    description?: string
    reference?: string
    project_id?: string
  }) => Promise<{ success: boolean; error?: string; transaction_id?: string }>

  fetchCurrencyRates: (baseCurrency?: string) => Promise<void>
  setExchangeRate: (baseCurrency: string, targetCurrency: string, rate: number) => Promise<{ success: boolean; error?: string }>
  getExchangeRate: (from: string, to: string) => number

  getTreasuriesByCurrency: (currency: string) => Treasury[]
  getTreasuriesByType: (type: TreasuryType) => Treasury[]
  getPendingTransactions: () => TreasuryTransaction[]

  clearMessages: () => void
}

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  treasuries: [],
  currentTreasury: null,
  transactions: [],
  currentTransaction: null,
  currencyRates: [],
  summary: [],
  isLoading: false,
  error: null,
  successMessage: null,

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchTreasuries: async () => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('treasuries')
        .select('*')
        .eq('is_active', true)
        .order('treasury_name')

      if (error) throw error
      set({ treasuries: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchTreasury: async (id: string) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('treasuries')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      set({ currentTreasury: data, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createTreasury: async (data) => {
    if (!isSupabaseConfigured()) {
      set({ error: 'Supabase غير مُعد', isLoading: false })
      return { success: false, error: 'Supabase غير مُعد' }
    }
    set({ isLoading: true, error: null, successMessage: null })

    const user = useAuthStore.getState().user
    const currentCompany = useAuthStore.getState().currentCompany

    try {
      const newTreasury = {
        id: uuidv4(),
        company_id: currentCompany?.id || '',
        treasury_code: data.treasury_code || `TR-${Date.now()}`,
        treasury_name: data.treasury_name,
        treasury_name_ar: data.treasury_name_ar || data.treasury_name,
        treasury_type: data.treasury_type || 'cashbox',
        currency_code: data.currency_code || currentCompany?.default_currency || 'LYD',
        country: data.country,
        opening_balance: data.opening_balance || 0,
        current_balance: data.opening_balance || 0,
        bank_name: data.bank_name,
        account_number: data.account_number,
        iban: data.iban,
        swift: data.swift,
        notes: data.notes,
        is_active: true,
        allow_overdraft: data.allow_overdraft || false,
        min_balance: data.min_balance || 0,
        max_balance: data.max_balance,
        alert_threshold: data.alert_threshold,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase.from('treasuries').insert(newTreasury)

      if (error) {
        if (error.code === '23505') {
          set({ error: 'كود الخزينة مستخدم من قبل', isLoading: false })
          return { success: false, error: 'كود الخزينة مستخدم من قبل' }
        }
        throw error
      }

      set((state) => ({
        treasuries: [...state.treasuries, newTreasury],
        isLoading: false,
        successMessage: 'تم إنشاء الخزينة بنجاح'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  updateTreasury: async (id, updates) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('treasuries')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        treasuries: state.treasuries.map(t => t.id === id ? { ...t, ...updates } : t),
        currentTreasury: state.currentTreasury?.id === id ? { ...state.currentTreasury, ...updates } : state.currentTreasury,
        isLoading: false,
        successMessage: 'تم تحديث الخزينة بنجاح'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  deleteTreasury: async (id) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })

    try {
      // Soft delete: set is_active = false
      const { error } = await supabase
        .from('treasuries')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        treasuries: state.treasuries.filter(t => t.id !== id),
        currentTreasury: state.currentTreasury?.id === id ? null : state.currentTreasury,
        isLoading: false,
        successMessage: 'تم حذف الخزينة'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  fetchTransactions: async (treasuryId?: string) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      let query = supabase
        .from('treasury_transactions')
        .select('*, treasury:treasuries(id, treasury_name, treasury_name_ar, currency_code)')
        .order('created_at', { ascending: false })

      if (treasuryId) {
        query = query.eq('treasury_id', treasuryId)
      }

      const { data, error } = await query

      if (error) throw error
      set({ transactions: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createTransaction: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })

    const user = useAuthStore.getState().user
    const currentCompany = useAuthStore.getState().currentCompany

    try {
      const newTx = {
        id: uuidv4(),
        company_id: currentCompany?.id,
        treasury_id: data.treasury_id,
        transaction_type: data.transaction_type,
        amount: data.amount,
        currency_code: data.currency_code,
        exchange_rate: data.exchange_rate || 1,
        destination_amount: data.destination_amount,
        destination_currency: data.destination_currency,
        destination_treasury_id: data.destination_treasury_id,
        description: data.description,
        reference_number: data.reference_number || `TX-${Date.now()}`,
        project_id: data.project_id,
        status: 'pending' as TreasuryTransactionStatus,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase.from('treasury_transactions').insert(newTx)

      if (error) throw error

      set((state) => ({
        transactions: [newTx as any, ...state.transactions],
        isLoading: false,
        successMessage: 'تم إنشاء المعاملة بنجاح'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  approveTransaction: async (id) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })

    const user = useAuthStore.getState().user

    try {
      const { data, error } = await supabase.rpc('approve_treasury_transaction', {
        p_transaction_id: id,
        p_approver_id: user?.id || null
      })

      if (error) throw error

      const result = data?.[0]
      if (!result?.success) {
        set({ error: result?.message || 'فشلت الموافقة', isLoading: false })
        return { success: false, error: result?.message }
      }

      // Refresh treasury balances
      await get().fetchTreasuries()

      // Refresh transactions
      await get().fetchTransactions()

      set({ isLoading: false, successMessage: result?.message || 'تمت الموافقة بنجاح' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  rejectTransaction: async (id) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase
        .from('treasury_transactions')
        .update({ status: 'rejected' })
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        transactions: state.transactions.map(t => t.id === id ? { ...t, status: 'rejected' as TreasuryTransactionStatus } : t),
        isLoading: false,
        successMessage: 'تم الرفض'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  createCurrencyTransfer: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })

    try {
      const { data: result, error } = await supabase.rpc('create_currency_transfer', {
        p_source_treasury_id: data.source_treasury_id,
        p_destination_treasury_id: data.destination_treasury_id,
        p_source_amount: data.source_amount,
        p_exchange_rate: data.exchange_rate,
        p_description: data.description || null,
        p_reference: data.reference || null,
        p_project_id: data.project_id || null
      })

      if (error) throw error

      const rpcResult = result?.[0]
      if (!rpcResult?.success) {
        set({ error: rpcResult?.message || 'فشل التحويل', isLoading: false })
        return { success: false, error: rpcResult?.message }
      }

      await get().fetchTransactions()

      set({ isLoading: false, successMessage: 'تم إنشاء التحويل بنجاح' })
      return { success: true, transaction_id: rpcResult?.transaction_id }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  fetchCurrencyRates: async (baseCurrency?: string) => {
    if (!isSupabaseConfigured()) return

    try {
      let query = supabase
        .from('currency_rates')
        .select('*')
        .order('effective_date', { ascending: false })

      if (baseCurrency) {
        query = query.eq('base_currency', baseCurrency)
      }

      const { data, error } = await query
      if (error) throw error
      set({ currencyRates: data || [] })
    } catch (err) {
      console.error('fetchCurrencyRates error:', err)
    }
  },

  setExchangeRate: async (baseCurrency, targetCurrency, rate) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }

    const user = useAuthStore.getState().user
    const currentCompany = useAuthStore.getState().currentCompany

    try {
      const { error } = await supabase.from('currency_rates').insert({
        id: uuidv4(),
        company_id: currentCompany?.id,
        base_currency: baseCurrency,
        target_currency: targetCurrency,
        rate,
        effective_date: new Date().toISOString().split('T')[0],
        source: 'manual',
        created_by: user?.id
      })

      if (error) throw error

      await get().fetchCurrencyRates()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  },

  getExchangeRate: (from: string, to: string) => {
    if (from === to) return 1
    const rates = get().currencyRates
    const rate = rates.find(r =>
      (r.base_currency === from && r.target_currency === to) ||
      (r.base_currency === to && r.target_currency === from)
    )
    if (!rate) return 1
    return rate.base_currency === from ? rate.rate : 1 / rate.rate
  },

  getTreasuriesByCurrency: (currency: string) => {
    return get().treasuries.filter(t => t.currency_code === currency)
  },

  getTreasuriesByType: (type: TreasuryType) => {
    return get().treasuries.filter(t => t.treasury_type === type)
  },

  getPendingTransactions: () => {
    return get().transactions.filter(t => t.status === 'pending')
  }
}))
