import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key: string) => {
        const value = localStorage.getItem(key)
        return Promise.resolve(value)
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value)
        return Promise.resolve()
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key)
        return Promise.resolve()
      }
    }
  }
})

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '')
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          role: 'super_admin' | 'admin' | 'employee' | 'viewer'
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          device_info: Record<string, unknown> | null
          last_login: string | null
          created_at: string
          default_company_id: string | null
        }
        Insert: {
          id: string
          full_name: string
          email: string
          role?: 'super_admin' | 'admin' | 'employee' | 'viewer'
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          device_info?: Record<string, unknown> | null
          last_login?: string | null
          created_at?: string
          default_company_id?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          role?: 'super_admin' | 'admin' | 'employee' | 'viewer'
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          device_info?: Record<string, unknown> | null
          last_login?: string | null
          created_at?: string
          default_company_id?: string | null
        }
      }
      companies: {
        Row: {
          id: string
          company_name: string
          company_name_ar: string | null
          commercial_registration: string | null
          tax_number: string | null
          address: string | null
          phone: string | null
          email: string | null
          country: string
          default_currency: string
          logo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          company_name_ar?: string | null
          commercial_registration?: string | null
          tax_number?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          country?: string
          default_currency?: string
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          company_name_ar?: string | null
          commercial_registration?: string | null
          tax_number?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          country?: string
          default_currency?: string
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_companies: {
        Row: {
          id: string
          user_id: string
          company_id: string
          role: 'owner' | 'admin' | 'accountant' | 'treasury' | 'operations' | 'viewer'
          is_current: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          role?: 'owner' | 'admin' | 'accountant' | 'treasury' | 'operations' | 'viewer'
          is_current?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          role?: 'owner' | 'admin' | 'accountant' | 'treasury' | 'operations' | 'viewer'
          is_current?: boolean
          joined_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          code: string
          name: string
          type: 'cashbox' | 'bank' | 'expense' | 'income' | 'employee' | 'temporary'
          balance: number
          currency: string
          status: 'active' | 'inactive' | 'archived'
          notes: string | null
          created_by: string
          company_id: string | null
          owner_id: string | null
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          type: 'cashbox' | 'bank' | 'expense' | 'income' | 'employee' | 'temporary'
          balance?: number
          currency?: string
          status?: 'active' | 'inactive' | 'archived'
          notes?: string | null
          created_by: string
          company_id?: string | null
          owner_id?: string | null
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          type?: 'cashbox' | 'bank' | 'expense' | 'income' | 'employee' | 'temporary'
          balance?: number
          currency?: string
          status?: 'active' | 'inactive' | 'archived'
          notes?: string | null
          created_by?: string
          company_id?: string | null
          owner_id?: string | null
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          reference: string
          type: 'deposit' | 'withdrawal' | 'expense' | 'income' | 'salary' | 'custody' | 'adjustment' | 'settlement'
          amount: number
          description: string | null
          account_id: string
          created_by: string
          approved_by: string | null
          project_id: string | null
          status: 'pending' | 'approved' | 'rejected' | 'completed'
          attachments: Record<string, unknown> | null
          metadata: Record<string, unknown> | null
          company_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reference: string
          type: 'deposit' | 'withdrawal' | 'expense' | 'income' | 'salary' | 'custody' | 'adjustment' | 'settlement'
          amount: number
          description?: string | null
          account_id: string
          created_by: string
          approved_by?: string | null
          project_id?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          attachments?: Record<string, unknown> | null
          metadata?: Record<string, unknown> | null
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reference?: string
          type?: 'deposit' | 'withdrawal' | 'expense' | 'income' | 'salary' | 'custody' | 'adjustment' | 'settlement'
          amount?: number
          description?: string | null
          account_id?: string
          created_by?: string
          approved_by?: string | null
          project_id?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          attachments?: Record<string, unknown> | null
          metadata?: Record<string, unknown> | null
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transfers: {
        Row: {
          id: string
          reference: string
          source_account_id: string
          destination_account_id: string
          amount: number
          description: string | null
          status: 'pending' | 'approved' | 'rejected' | 'completed'
          created_by: string
          approved_by: string | null
          project_id: string | null
          company_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reference: string
          source_account_id: string
          destination_account_id: string
          amount: number
          description?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          created_by: string
          approved_by?: string | null
          project_id?: string | null
          company_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reference?: string
          source_account_id?: string
          destination_account_id?: string
          amount?: number
          description?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          created_by?: string
          approved_by?: string | null
          project_id?: string | null
          company_id?: string | null
          created_at?: string
        }
      }
      approvals: {
        Row: {
          id: string
          entity_type: 'transaction' | 'transfer' | 'account' | 'employee'
          entity_id: string
          status: 'pending' | 'approved' | 'rejected'
          notes: string | null
          requested_by: string
          approved_by: string | null
          device_info: Record<string, unknown> | null
          ip_address: string | null
          company_id: string | null
          created_at: string
          decided_at: string | null
        }
        Insert: {
          id?: string
          entity_type: 'transaction' | 'transfer' | 'account' | 'employee'
          entity_id: string
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          requested_by: string
          approved_by?: string | null
          device_info?: Record<string, unknown> | null
          ip_address?: string | null
          company_id?: string | null
          created_at?: string
          decided_at?: string | null
        }
        Update: {
          id?: string
          entity_type?: 'transaction' | 'transfer' | 'account' | 'employee'
          entity_id?: string
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          requested_by?: string
          approved_by?: string | null
          device_info?: Record<string, unknown> | null
          ip_address?: string | null
          company_id?: string | null
          created_at?: string
          decided_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          type: 'approval' | 'transaction' | 'alert' | 'info' | 'summary'
          is_read: boolean
          data: Record<string, unknown> | null
          company_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body: string
          type: 'approval' | 'transaction' | 'alert' | 'info' | 'summary'
          is_read?: boolean
          data?: Record<string, unknown> | null
          company_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          body?: string
          type?: 'approval' | 'transaction' | 'alert' | 'info' | 'summary'
          is_read?: boolean
          data?: Record<string, unknown> | null
          company_id?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string | null
          old_value: Record<string, unknown> | null
          new_value: Record<string, unknown> | null
          ip_address: string | null
          device_info: Record<string, unknown> | null
          company_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          old_value?: Record<string, unknown> | null
          new_value?: Record<string, unknown> | null
          ip_address?: string | null
          device_info?: Record<string, unknown> | null
          company_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_value?: Record<string, unknown> | null
          new_value?: Record<string, unknown> | null
          ip_address?: string | null
          device_info?: Record<string, unknown> | null
          company_id?: string | null
          created_at?: string
        }
      }
      login_history: {
        Row: {
          id: string
          user_id: string
          ip_address: string | null
          device_info: Record<string, unknown> | null
          user_agent: string | null
          success: boolean
          company_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ip_address?: string | null
          device_info?: Record<string, unknown> | null
          user_agent?: string | null
          success?: boolean
          company_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ip_address?: string | null
          device_info?: Record<string, unknown> | null
          user_agent?: string | null
          success?: boolean
          company_id?: string | null
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          code: string
          status: 'active' | 'completed' | 'on_hold' | 'archived'
          budget: number
          currency: string
          description: string | null
          manager_id: string | null
          company_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          status?: 'active' | 'completed' | 'on_hold' | 'archived'
          budget?: number
          currency?: string
          description?: string | null
          manager_id?: string | null
          company_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          status?: 'active' | 'completed' | 'on_hold' | 'archived'
          budget?: number
          currency?: string
          description?: string | null
          manager_id?: string | null
          company_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      journal_entries: {
        Row: {
          id: string
          entry_number: string | null
          entry_date: string | null
          description: string | null
          reference_number: string | null
          source_type: string | null
          source_id: string | null
          project_id: string | null
          status: string | null
          posted_by: string | null
          posted_at: string | null
          company_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entry_number?: string | null
          entry_date?: string | null
          description?: string | null
          reference_number?: string | null
          source_type?: string | null
          source_id?: string | null
          project_id?: string | null
          status?: string | null
          posted_by?: string | null
          posted_at?: string | null
          company_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entry_number?: string | null
          entry_date?: string | null
          description?: string | null
          reference_number?: string | null
          source_type?: string | null
          source_id?: string | null
          project_id?: string | null
          status?: string | null
          posted_by?: string | null
          posted_at?: string | null
          company_id?: string | null
          created_at?: string
        }
      }
      journal_entry_lines: {
        Row: {
          id: string
          journal_entry_id: string | null
          account_id: string | null
          debit: number | null
          credit: number | null
          currency_code: string | null
          exchange_rate: number | null
          description: string | null
          partner_id: string | null
          company_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          journal_entry_id?: string | null
          account_id?: string | null
          debit?: number | null
          credit?: number | null
          currency_code?: string | null
          exchange_rate?: number | null
          description?: string | null
          partner_id?: string | null
          company_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          journal_entry_id?: string | null
          account_id?: string | null
          debit?: number | null
          credit?: number | null
          currency_code?: string | null
          exchange_rate?: number | null
          description?: string | null
          partner_id?: string | null
          company_id?: string | null
          created_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          contact_type: string | null
          name: string | null
          email: string | null
          phone: string | null
          address: string | null
          company_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contact_type?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          company_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contact_type?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          company_id?: string | null
          created_at?: string
        }
      }
            treasuries: {
        Row: {
          id: string
          company_id: string
          treasury_code: string
          treasury_name: string
          treasury_name_ar: string | null
          treasury_type: 'cashbox' | 'bank' | 'reserve' | 'petty_cash' | 'escrow'
          currency_code: string
          country: string | null
          opening_balance: number
          current_balance: number
          bank_name: string | null
          account_number: string | null
          iban: string | null
          swift: string | null
          notes: string | null
          is_active: boolean
          allow_overdraft: boolean
          min_balance: number
          max_balance: number | null
          alert_threshold: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          treasury_code: string
          treasury_name: string
          treasury_name_ar?: string | null
          treasury_type?: 'cashbox' | 'bank' | 'reserve' | 'petty_cash' | 'escrow'
          currency_code?: string
          country?: string | null
          opening_balance?: number
          current_balance?: number
          bank_name?: string | null
          account_number?: string | null
          iban?: string | null
          swift?: string | null
          notes?: string | null
          is_active?: boolean
          allow_overdraft?: boolean
          min_balance?: number
          max_balance?: number | null
          alert_threshold?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          treasury_code?: string
          treasury_name?: string
          treasury_name_ar?: string | null
          treasury_type?: 'cashbox' | 'bank' | 'reserve' | 'petty_cash' | 'escrow'
          currency_code?: string
          country?: string | null
          opening_balance?: number
          current_balance?: number
          bank_name?: string | null
          account_number?: string | null
          iban?: string | null
          swift?: string | null
          notes?: string | null
          is_active?: boolean
          allow_overdraft?: boolean
          min_balance?: number
          max_balance?: number | null
          alert_threshold?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      treasury_transactions: {
        Row: {
          id: string
          company_id: string
          treasury_id: string
          transaction_type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'exchange_in' | 'exchange_out' | 'adjustment' | 'reconciliation'
          amount: number
          currency_code: string
          exchange_rate: number
          destination_amount: number | null
          destination_currency: string | null
          destination_treasury_id: string | null
          description: string | null
          reference_number: string | null
          project_id: string | null
          partner_id: string | null
          journal_entry_id: string | null
          status: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by: string | null
          approved_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          treasury_id: string
          transaction_type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'exchange_in' | 'exchange_out' | 'adjustment' | 'reconciliation'
          amount: number
          currency_code: string
          exchange_rate?: number
          destination_amount?: number | null
          destination_currency?: string | null
          destination_treasury_id?: string | null
          description?: string | null
          reference_number?: string | null
          project_id?: string | null
          partner_id?: string | null
          journal_entry_id?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          treasury_id?: string
          transaction_type?: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'exchange_in' | 'exchange_out' | 'adjustment' | 'reconciliation'
          amount?: number
          currency_code?: string
          exchange_rate?: number
          destination_amount?: number | null
          destination_currency?: string | null
          destination_treasury_id?: string | null
          description?: string | null
          reference_number?: string | null
          project_id?: string | null
          partner_id?: string | null
          journal_entry_id?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      currency_rates: {
        Row: {
          id: string
          company_id: string
          base_currency: string
          target_currency: string
          rate: number
          effective_date: string
          source: string
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          base_currency: string
          target_currency: string
          rate: number
          effective_date: string
          source?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          base_currency?: string
          target_currency?: string
          rate?: number
          effective_date?: string
          source?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      financial_partners: {
        Row: {
          id: string
          company_id: string
          partner_code: string
          partner_name: string
          partner_name_ar: string | null
          country: string | null
          currency_code: string
          balance: number
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_iban: string | null
          bank_swift: string | null
          tax_number: string | null
          notes: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          partner_code: string
          partner_name: string
          partner_name_ar?: string | null
          country?: string | null
          currency_code?: string
          balance?: number
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_swift?: string | null
          tax_number?: string | null
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          partner_code?: string
          partner_name?: string
          partner_name_ar?: string | null
          country?: string | null
          currency_code?: string
          balance?: number
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_swift?: string | null
          tax_number?: string | null
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      partner_ledger_entries: {
        Row: {
          id: string
          company_id: string
          partner_id: string
          entry_type: string
          amount: number
          currency_code: string
          balance_after: number
          description: string | null
          reference_number: string | null
          treasury_transaction_id: string | null
          journal_entry_id: string | null
          project_id: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          partner_id: string
          entry_type: string
          amount: number
          currency_code?: string
          balance_after?: number
          description?: string | null
          reference_number?: string | null
          treasury_transaction_id?: string | null
          journal_entry_id?: string | null
          project_id?: string | null
          recorded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          partner_id?: string
          entry_type?: string
          amount?: number
          currency_code?: string
          balance_after?: number
          description?: string | null
          reference_number?: string | null
          treasury_transaction_id?: string | null
          journal_entry_id?: string | null
          project_id?: string | null
          recorded_by?: string | null
          created_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          company_id: string
          supplier_code: string
          supplier_name: string
          supplier_name_ar: string | null
          contact_person: string | null
          country: string | null
          currency_code: string | null
          phone: string | null
          email: string | null
          address: string | null
          tax_number: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_iban: string | null
          bank_swift: string | null
          payment_terms: number
          credit_limit: number
          current_balance: number
          notes: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          supplier_code: string
          supplier_name: string
          supplier_name_ar?: string | null
          contact_person?: string | null
          country?: string | null
          currency_code?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          tax_number?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_swift?: string | null
          payment_terms?: number
          credit_limit?: number
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          supplier_code?: string
          supplier_name?: string
          supplier_name_ar?: string | null
          contact_person?: string | null
          country?: string | null
          currency_code?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          tax_number?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          bank_swift?: string | null
          payment_terms?: number
          credit_limit?: number
          current_balance?: number
          notes?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      supplier_invoices: {
        Row: {
          id: string
          company_id: string
          supplier_id: string
          invoice_number: string
          invoice_date: string
          due_date: string | null
          description: string | null
          subtotal: number | null
          tax_amount: number | null
          discount_amount: number | null
          total_amount: number
          currency_code: string | null
          exchange_rate: number
          amount_paid: number
          amount_due: number
          status: string
          project_id: string | null
          reference_number: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          supplier_id: string
          invoice_number: string
          invoice_date?: string
          due_date?: string | null
          description?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount: number
          currency_code?: string | null
          exchange_rate?: number
          amount_paid?: number
          amount_due?: number
          status?: string
          project_id?: string | null
          reference_number?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          supplier_id?: string
          invoice_number?: string
          invoice_date?: string
          due_date?: string | null
          description?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number
          currency_code?: string | null
          exchange_rate?: number
          amount_paid?: number
          amount_due?: number
          status?: string
          project_id?: string | null
          reference_number?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      supplier_payments: {
        Row: {
          id: string
          company_id: string
          supplier_id: string
          invoice_id: string | null
          payment_number: string | null
          payment_date: string
          amount: number
          currency_code: string | null
          exchange_rate: number
          payment_method: string | null
          treasury_transaction_id: string | null
          journal_entry_id: string | null
          reference_number: string | null
          description: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          supplier_id: string
          invoice_id?: string | null
          payment_number?: string | null
          payment_date?: string
          amount: number
          currency_code?: string | null
          exchange_rate?: number
          payment_method?: string | null
          treasury_transaction_id?: string | null
          journal_entry_id?: string | null
          reference_number?: string | null
          description?: string | null
          recorded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          supplier_id?: string
          invoice_id?: string | null
          payment_number?: string | null
          payment_date?: string
          amount?: number
          currency_code?: string | null
          exchange_rate?: number
          payment_method?: string | null
          treasury_transaction_id?: string | null
          journal_entry_id?: string | null
          reference_number?: string | null
          description?: string | null
          recorded_by?: string | null
          created_at?: string
        }
      }
      project_expenses: {
        Row: {
          id: string
          company_id: string
          project_id: string
          expense_category: string
          description: string | null
          amount: number
          currency_code: string
          exchange_rate: number
          amount_in_base: number
          expense_date: string
          vendor_id: string | null
          partner_id: string | null
          treasury_transaction_id: string | null
          journal_entry_id: string | null
          receipt_url: string | null
          reference_number: string | null
          status: string
          approved_by: string | null
          approved_at: string | null
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          project_id: string
          expense_category: string
          description?: string | null
          amount: number
          currency_code?: string
          exchange_rate?: number
          expense_date?: string
          vendor_id?: string | null
          partner_id?: string | null
          treasury_transaction_id?: string | null
          journal_entry_id?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          recorded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          project_id?: string
          expense_category?: string
          description?: string | null
          amount?: number
          currency_code?: string
          exchange_rate?: number
          expense_date?: string
          vendor_id?: string | null
          partner_id?: string | null
          treasury_transaction_id?: string | null
          journal_entry_id?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          recorded_by?: string | null
          created_at?: string
        }
      }
      project_revenues: {
        Row: {
          id: string
          company_id: string
          project_id: string
          revenue_type: string
          description: string | null
          amount: number
          currency_code: string
          exchange_rate: number
          amount_in_base: number
          revenue_date: string
          invoice_number: string | null
          treasury_transaction_id: string | null
          journal_entry_id: string | null
          reference_number: string | null
          status: string
          recorded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          project_id: string
          revenue_type: string
          description?: string | null
          amount: number
          currency_code?: string
          exchange_rate?: number
          revenue_date?: string
          invoice_number?: string | null
          treasury_transaction_id?: string | null
          journal_entry_id?: string | null
          reference_number?: string | null
          status?: string
          recorded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          project_id?: string
          revenue_type?: string
          description?: string | null
          amount?: number
          currency_code?: string
          exchange_rate?: number
          revenue_date?: string
          invoice_number?: string | null
          treasury_transaction_id?: string | null
          journal_entry_id?: string | null
          reference_number?: string | null
          status?: string
          recorded_by?: string | null
          created_at?: string
        }
      }
      product_cost_cards: {
        Row: {
          id: string
          company_id: string
          card_code: string
          product_name: string
          product_name_ar: string | null
          product_category: string | null
          unit_of_measure: string
          description: string | null
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
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          card_code: string
          product_name: string
          product_name_ar?: string | null
          product_category?: string | null
          unit_of_measure?: string
          description?: string | null
          material_cost?: number
          labor_cost?: number
          accessory_cost?: number
          overhead_cost?: number
          total_cost?: number
          selling_price?: number
          target_margin_pct?: number
          currency_code?: string
          labor_rate_per_hour?: number
          labor_hours?: number
          is_active?: boolean
          last_updated?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          card_code?: string
          product_name?: string
          product_name_ar?: string | null
          product_category?: string | null
          unit_of_measure?: string
          description?: string | null
          material_cost?: number
          labor_cost?: number
          accessory_cost?: number
          overhead_cost?: number
          total_cost?: number
          selling_price?: number
          target_margin_pct?: number
          currency_code?: string
          labor_rate_per_hour?: number
          labor_hours?: number
          is_active?: boolean
          last_updated?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      product_cost_components: {
        Row: {
          id: string
          company_id: string
          cost_card_id: string
          component_type: string
          component_name: string
          component_name_ar: string | null
          quantity: number
          unit_cost: number
          total_cost: number
          currency_code: string
          supplier_id: string | null
          reference_number: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          cost_card_id: string
          component_type: string
          component_name: string
          component_name_ar?: string | null
          quantity?: number
          unit_cost: number
          currency_code?: string
          supplier_id?: string | null
          reference_number?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          cost_card_id?: string
          component_type?: string
          component_name?: string
          component_name_ar?: string | null
          quantity?: number
          unit_cost?: number
          currency_code?: string
          supplier_id?: string | null
          reference_number?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          company_id: string
          expense_number: string
          title: string
          description: string | null
          amount: number
          currency_code: string
          exchange_rate: number
          amount_in_base: number
          category: string
          expense_date: string
          project_id: string | null
          supplier_id: string | null
          partner_id: string | null
          employee_id: string | null
          payment_method: string | null
          treasury_account_id: string | null
          receipt_url: string | null
          reference_number: string | null
          vendor_name: string | null
          notes: string | null
          status: string
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          is_recurring: boolean
          recurring_pattern: Record<string, unknown> | null
          recorded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          expense_number?: string
          title: string
          description?: string | null
          amount: number
          currency_code?: string
          exchange_rate?: number
          category: string
          expense_date?: string
          project_id?: string | null
          supplier_id?: string | null
          partner_id?: string | null
          employee_id?: string | null
          payment_method?: string | null
          treasury_account_id?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          vendor_name?: string | null
          notes?: string | null
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          is_recurring?: boolean
          recurring_pattern?: Record<string, unknown> | null
          recorded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          expense_number?: string
          title?: string
          description?: string | null
          amount?: number
          currency_code?: string
          exchange_rate?: number
          category?: string
          expense_date?: string
          project_id?: string | null
          supplier_id?: string | null
          partner_id?: string | null
          employee_id?: string | null
          payment_method?: string | null
          treasury_account_id?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          vendor_name?: string | null
          notes?: string | null
          status?: string
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          is_recurring?: boolean
          recurring_pattern?: Record<string, unknown> | null
          recorded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notification_preferences: {
        Row: {
          id: string; user_id: string; company_id: string | null;
          push_approval: boolean; push_transaction: boolean; push_alert: boolean; push_info: boolean; push_summary: boolean;
          treasury_low_balance_alert: boolean; treasury_low_balance_threshold: number;
          partner_outstanding_alert: boolean; partner_outstanding_threshold: number;
          supplier_overdue_alert: boolean; supplier_overdue_days: number;
          project_budget_alert: boolean; project_budget_threshold_pct: number; expense_approval_alert: boolean;
          email_approval: boolean; email_alert: boolean; email_summary_daily: boolean; email_summary_weekly: boolean;
          quiet_hours_enabled: boolean; quiet_hours_start: string; quiet_hours_end: string;
          created_at: string; updated_at: string;
        }
        Insert: { id?: string; user_id: string; company_id?: string | null; push_approval?: boolean; push_transaction?: boolean; push_alert?: boolean; push_info?: boolean; push_summary?: boolean; treasury_low_balance_alert?: boolean; treasury_low_balance_threshold?: number; partner_outstanding_alert?: boolean; partner_outstanding_threshold?: number; supplier_overdue_alert?: boolean; supplier_overdue_days?: number; project_budget_alert?: boolean; project_budget_threshold_pct?: number; expense_approval_alert?: boolean; email_approval?: boolean; email_alert?: boolean; email_summary_daily?: boolean; email_summary_weekly?: boolean; quiet_hours_enabled?: boolean; quiet_hours_start?: string; quiet_hours_end?: string; created_at?: string; updated_at?: string; }
        Update: { id?: string; user_id?: string; company_id?: string | null; push_approval?: boolean; push_transaction?: boolean; push_alert?: boolean; push_info?: boolean; push_summary?: boolean; treasury_low_balance_alert?: boolean; treasury_low_balance_threshold?: number; partner_outstanding_alert?: boolean; partner_outstanding_threshold?: number; supplier_overdue_alert?: boolean; supplier_overdue_days?: number; project_budget_alert?: boolean; project_budget_threshold_pct?: number; expense_approval_alert?: boolean; email_approval?: boolean; email_alert?: boolean; email_summary_daily?: boolean; email_summary_weekly?: boolean; quiet_hours_enabled?: boolean; quiet_hours_start?: string; quiet_hours_end?: string; created_at?: string; updated_at?: string; }
      }
      alert_rules: {
        Row: {
          id: string; company_id: string; rule_type: string; name: string; description: string | null;
          is_active: boolean; threshold_value: number; threshold_operator: string; notification_channel: string;
          target_entity_type: string | null; target_entity_id: string | null; notify_user_ids: string[];
          check_frequency: string; last_checked: string | null; last_triggered: string | null; trigger_count: number;
          created_by: string | null; created_at: string; updated_at: string;
        }
        Insert: { id?: string; company_id: string; rule_type: string; name: string; description?: string | null; is_active?: boolean; threshold_value?: number; threshold_operator?: string; notification_channel?: string; target_entity_type?: string | null; target_entity_id?: string | null; notify_user_ids?: string[]; check_frequency?: string; last_checked?: string | null; last_triggered?: string | null; trigger_count?: number; created_by?: string | null; created_at?: string; updated_at?: string; }
        Update: { id?: string; company_id?: string; rule_type?: string; name?: string; description?: string | null; is_active?: boolean; threshold_value?: number; threshold_operator?: string; notification_channel?: string; target_entity_type?: string | null; target_entity_id?: string | null; notify_user_ids?: string[]; check_frequency?: string; last_checked?: string | null; last_triggered?: string | null; trigger_count?: number; created_by?: string | null; created_at?: string; updated_at?: string; }
      }
      alert_logs: {
        Row: {
          id: string; company_id: string | null; alert_rule_id: string | null; alert_type: string;
          severity: string; title: string; message: string; entity_type: string | null; entity_id: string | null;
          is_read: boolean; is_dismissed: boolean; read_by: string | null; read_at: string | null;
          action_taken: string | null; action_by: string | null; action_at: string | null;
          metadata: Record<string, unknown> | null; triggered_at: string;
        }
        Insert: { id?: string; company_id?: string | null; alert_rule_id?: string | null; alert_type: string; severity?: string; title: string; message: string; entity_type?: string | null; entity_id?: string | null; is_read?: boolean; is_dismissed?: boolean; read_by?: string | null; read_at?: string | null; action_taken?: string | null; action_by?: string | null; action_at?: string | null; metadata?: Record<string, unknown> | null; triggered_at?: string; }
        Update: { id?: string; company_id?: string | null; alert_rule_id?: string | null; alert_type?: string; severity?: string; title?: string; message?: string; entity_type?: string | null; entity_id?: string | null; is_read?: boolean; is_dismissed?: boolean; read_by?: string | null; read_at?: string | null; action_taken?: string | null; action_by?: string | null; action_at?: string | null; metadata?: Record<string, unknown> | null; triggered_at?: string; }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}