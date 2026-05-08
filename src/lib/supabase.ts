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
          status: 'pending' | 'approved' | 'rejected' | 'completed'
          attachments: Record<string, unknown> | null
          metadata: Record<string, unknown> | null
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
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          attachments?: Record<string, unknown> | null
          metadata?: Record<string, unknown> | null
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
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          attachments?: Record<string, unknown> | null
          metadata?: Record<string, unknown> | null
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
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ip_address?: string | null
          device_info?: Record<string, unknown> | null
          user_agent?: string | null
          success?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ip_address?: string | null
          device_info?: Record<string, unknown> | null
          user_agent?: string | null
          success?: boolean
          created_at?: string
        }
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