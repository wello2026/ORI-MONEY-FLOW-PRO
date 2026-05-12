import { create } from 'zustand'
import type { Project, ProjectExpense, ProjectRevenue, ProjectFinancials, ExpenseCategory, RevenueType } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { v4 as uuidv4 } from 'uuid'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  financials: ProjectFinancials | null
  expenses: ProjectExpense[]
  revenues: ProjectRevenue[]
  isLoading: boolean
  error: string | null
  successMessage: string | null

  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>
  updateProject: (id: string, updates: Partial<Project>) => Promise<{ success: boolean; error?: string }>

  fetchProjectFinancials: (projectId: string) => Promise<void>
  fetchProjectExpenses: (projectId: string) => Promise<void>
  fetchProjectRevenues: (projectId: string) => Promise<void>

  addProjectExpense: (data: {
    project_id: string
    expense_category: ExpenseCategory
    description?: string
    amount: number
    currency_code?: string
    exchange_rate?: number
    expense_date?: string
    vendor_id?: string
    partner_id?: string
    reference_number?: string
  }) => Promise<{ success: boolean; error?: string }>

  addProjectRevenue: (data: {
    project_id: string
    revenue_type: RevenueType
    description?: string
    amount: number
    currency_code?: string
    exchange_rate?: number
    revenue_date?: string
    invoice_number?: string
    reference_number?: string
  }) => Promise<{ success: boolean; error?: string }>

  clearMessages: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  financials: null,
  expenses: [],
  revenues: [],
  isLoading: false,
  error: null,
  successMessage: null,

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchProjects: async () => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      set({ projects: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchProject: async (id: string) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      set({ currentProject: data, isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createProject: async (projectData) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    const user = useAuthStore.getState().user
    const currentCompany = useAuthStore.getState().currentCompany
    set({ isLoading: true, error: null })
    if (!currentCompany) {
      const errorMsg = 'لا توجد شركة محددة'
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }

    try {
      const newProject = {
        ...projectData,
        id: uuidv4(),
        company_id: currentCompany.id,
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      const { error } = await supabase.from('projects').insert(newProject)
      if (error) throw error
      set((state) => ({
        projects: [newProject as Project, ...state.projects],
        isLoading: false,
        successMessage: 'تم إنشاء المشروع بنجاح'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  updateProject: async (id, updates) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p),
        currentProject: state.currentProject?.id === id ? { ...state.currentProject, ...updates } : state.currentProject,
        isLoading: false,
        successMessage: 'تم تحديث المشروع بنجاح'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  fetchProjectFinancials: async (projectId) => {
    if (!isSupabaseConfigured()) return
    try {
      const { data, error } = await supabase.rpc('get_project_financials', { p_project_id: projectId })
      if (error) throw error
      set({ financials: data?.[0] || null })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  fetchProjectExpenses: async (projectId) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.rpc('get_project_expenses', { p_project_id: projectId })
      if (error) throw error
      set({ expenses: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchProjectRevenues: async (projectId) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('project_revenues')
        .select('*')
        .eq('project_id', projectId)
        .order('revenue_date', { ascending: false })
      if (error) throw error
      set({ revenues: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  addProjectExpense: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { data: result, error } = await supabase.rpc('add_project_expense', {
        p_project_id: data.project_id,
        p_expense_category: data.expense_category,
        p_description: data.description || null,
        p_amount: data.amount,
        p_currency_code: data.currency_code || 'USD',
        p_exchange_rate: data.exchange_rate || 1,
        p_expense_date: data.expense_date || new Date().toISOString().split('T')[0],
        p_vendor_id: data.vendor_id || null,
        p_partner_id: data.partner_id || null,
        p_reference_number: data.reference_number || null,
        p_treasury_transaction_id: null
      })
      if (error) throw error
      const rpcResult = result?.[0]
      if (!rpcResult?.success) return { success: false, error: rpcResult?.message }
      await get().fetchProjectFinancials(data.project_id)
      await get().fetchProjectExpenses(data.project_id)
      set({ isLoading: false, successMessage: rpcResult?.message || 'تم تسجيل المصروف بنجاح' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  addProjectRevenue: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { data: result, error } = await supabase.rpc('add_project_revenue', {
        p_project_id: data.project_id,
        p_revenue_type: data.revenue_type,
        p_description: data.description || null,
        p_amount: data.amount,
        p_currency_code: data.currency_code || 'USD',
        p_exchange_rate: data.exchange_rate || 1,
        p_revenue_date: data.revenue_date || new Date().toISOString().split('T')[0],
        p_invoice_number: data.invoice_number || null,
        p_reference_number: data.reference_number || null
      })
      if (error) throw error
      const rpcResult = result?.[0]
      if (!rpcResult?.success) return { success: false, error: rpcResult?.message }
      await get().fetchProjectFinancials(data.project_id)
      await get().fetchProjectRevenues(data.project_id)
      set({ isLoading: false, successMessage: rpcResult?.message || 'تم تسجيل الإيراد بنجاح' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  }
}))
