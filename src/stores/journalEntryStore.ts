import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { v4 as uuidv4 } from 'uuid'

export interface JournalEntryLine {
  id?: string
  journal_entry_id?: string
  account_id: string
  account_name?: string
  debit: number
  credit: number
  currency_code?: string
  exchange_rate?: number
  line_description?: string
}

export interface JournalEntry {
  id: string
  company_id?: string
  entry_number: string
  entry_date: string
  description: string
  reference_number?: string
  source_type?: string
  source_id?: string
  project_id?: string
  status: 'draft' | 'posted' | 'cancelled'
  posted_by?: string
  posted_at?: string
  created_at: string
  lines?: JournalEntryLine[]
}

interface AccountingState {
  journalEntries: JournalEntry[]
  currentEntry: JournalEntry | null
  trialBalance: any[]
  generalJournal: any[]
  incomeStatement: any[]
  balanceSheet: any[]
  accounts: any[]
  isLoading: boolean
  error: string | null
  successMessage: string | null

  fetchJournalEntries: (filters?: { date_from?: string; date_to?: string }) => Promise<void>
  fetchJournalEntry: (id: string) => Promise<void>
  createJournalEntry: (data: {
    description: string
    reference_number?: string
    entry_date?: string
    project_id?: string
    lines: JournalEntryLine[]
  }) => Promise<{ success: boolean; error?: string; entry_id?: string }>

  fetchTrialBalance: (dateFrom?: string, dateTo?: string) => Promise<void>
  fetchGeneralJournal: (dateFrom?: string, dateTo?: string, accountId?: string) => Promise<void>
  fetchIncomeStatement: (dateFrom?: string, dateTo?: string) => Promise<void>
  fetchBalanceSheet: (asOfDate?: string) => Promise<void>
  fetchAccountLedger: (accountId: string, dateFrom?: string, dateTo?: string) => Promise<any[]>
  searchAccounts: (query: string, currency?: string) => Promise<any[]>

  clearMessages: () => void
}

export const useAccountingStore = create<AccountingState>((set, get) => ({
  journalEntries: [],
  currentEntry: null,
  trialBalance: [],
  generalJournal: [],
  incomeStatement: [],
  balanceSheet: [],
  accounts: [],
  isLoading: false,
  error: null,
  successMessage: null,

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchJournalEntries: async (filters) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      let query = supabase
        .from('journal_entries')
        .select('*')
        .order('entry_date', { ascending: false })

      if (filters?.date_from) {
        query = query.gte('entry_date', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('entry_date', filters.date_to)
      }

      const { data, error } = await query

      if (error) throw error

      // Fetch lines for each entry
      const entriesWithLines = await Promise.all(
        (data || []).map(async (entry) => {
          const { data: lines } = await supabase
            .from('journal_entry_lines')
            .select('*')
            .eq('journal_entry_id', entry.id)
            .order('id')
          return { ...entry, lines: lines || [] }
        })
      )

      set({ journalEntries: entriesWithLines, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchJournalEntry: async (id) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data: entry, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      const { data: lines } = await supabase
        .from('journal_entry_lines')
        .select('*')
        .eq('journal_entry_id', id)
        .order('id')

      set({ currentEntry: { ...entry, lines: lines || [] }, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createJournalEntry: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }

    // Validate balance
    const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0)
    const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return {
        success: false,
        error: `السجل غير متوازن! المدين: ${totalDebit.toFixed(4)} والدائن: ${totalCredit.toFixed(4)}`
      }
    }

    set({ isLoading: true, error: null })

    try {
      const linesJson = data.lines.map(l => ({
        account_id: l.account_id,
        debit: l.debit || 0,
        credit: l.credit || 0,
        currency_code: l.currency_code || 'LYD',
        exchange_rate: l.exchange_rate || 1,
        description: l.line_description || ''
      }))

      const { data: result, error } = await supabase.rpc('create_journal_entry', {
        p_lines: linesJson,
        p_description: data.description,
        p_reference_number: data.reference_number || null,
        p_entry_date: data.entry_date || new Date().toISOString().split('T')[0],
        p_project_id: data.project_id || null
      })

      if (error) throw error

      const rpcResult = result?.[0]
      if (!rpcResult?.success) {
        set({ error: rpcResult?.message || 'فشل إنشاء القيد', isLoading: false })
        return { success: false, error: rpcResult?.message }
      }

      await get().fetchJournalEntries()

      set({ isLoading: false, successMessage: 'تم إنشاء القيد المحاسبي بنجاح' })
      return { success: true, entry_id: rpcResult?.journal_entry_id }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  fetchTrialBalance: async (dateFrom, dateTo) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase.rpc('get_trial_balance', {
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null
      })

      if (error) throw error
      set({ trialBalance: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchGeneralJournal: async (dateFrom, dateTo, accountId) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase.rpc('get_general_journal', {
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
        p_account_id: accountId || null
      })

      if (error) throw error
      set({ generalJournal: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchIncomeStatement: async (dateFrom, dateTo) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase.rpc('get_income_statement', {
        p_date_from: dateFrom || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        p_date_to: dateTo || new Date().toISOString().split('T')[0]
      })

      if (error) throw error
      set({ incomeStatement: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchBalanceSheet: async (asOfDate) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase.rpc('get_balance_sheet', {
        p_date: asOfDate || new Date().toISOString().split('T')[0]
      })

      if (error) throw error
      set({ balanceSheet: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchAccountLedger: async (accountId, dateFrom, dateTo) => {
    if (!isSupabaseConfigured()) return []

    try {
      const { data, error } = await supabase.rpc('get_account_ledger', {
        p_account_id: accountId,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null
      })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('fetchAccountLedger error:', err)
      return []
    }
  },

  searchAccounts: async (query, currency) => {
    if (!isSupabaseConfigured()) return []

    try {
      const { data, error } = await supabase.rpc('search_accounts_for_journal', {
        p_query: query || '',
        p_currency: currency || null
      })

      if (error) throw error
      set({ accounts: data || [] })
      return data || []
    } catch (err) {
      console.error('searchAccounts error:', err)
      return []
    }
  }
}))