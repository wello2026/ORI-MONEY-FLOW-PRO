import { create } from 'zustand'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { db, addToSyncQueue } from '@/lib/db'
import { useAuthStore } from './authStore'

interface EmployeeState {
  employees: User[]
  currentEmployee: User | null
  isLoading: boolean
  error: string | null
  fetchEmployees: () => Promise<void>
  fetchEmployee: (id: string) => Promise<void>
  createEmployee: (employee: Omit<User, 'id' | 'created_at'> & { password?: string }) => Promise<User | null>
  updateEmployee: (id: string, updates: Partial<User>) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
  toggleEmployeeStatus: (id: string) => Promise<void>
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  currentEmployee: null,
  isLoading: false,
  error: null,

  fetchEmployees: async () => {
    set({ isLoading: true, error: null })
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        if (data) {
          set({ employees: data as User[], isLoading: false })
        }
      } else {
        const localEmployees = await db.profiles.toArray()
        set({ employees: localEmployees as User[], isLoading: false })
      }
    } catch (error) {
      const localEmployees = await db.profiles.toArray()
      set({ employees: localEmployees as User[], isLoading: false })
    }
  },

  fetchEmployee: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        set({ currentEmployee: data as User, isLoading: false })
      } else {
        const local = await db.profiles.get(id)
        set({ currentEmployee: local as User | null, isLoading: false })
      }
    } catch (error) {
      const local = await db.profiles.get(id)
      set({ currentEmployee: local as User | null, isLoading: false })
    }
  },

  createEmployee: async (employeeData) => {
    set({ isLoading: true, error: null })
    const password = employeeData.password || ''
    const cleanEmployeeData = { ...employeeData }
    delete (cleanEmployeeData as any).password
    const currentCompany = useAuthStore.getState().currentCompany

    try {
      if (isSupabaseConfigured()) {
        const authClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false
            }
          }
        )

        const { data: authData, error } = await authClient.auth.signUp({
          email: cleanEmployeeData.email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: cleanEmployeeData.full_name,
              phone: cleanEmployeeData.phone,
              role: cleanEmployeeData.role,
              company_role: cleanEmployeeData.role === 'admin' ? 'admin' : 'viewer',
              company_id: currentCompany?.id
            }
          }
        })

        if (error) throw error
        if (authData.user) {
          const employee: User = {
            id: authData.user.id,
            full_name: cleanEmployeeData.full_name,
            email: cleanEmployeeData.email,
            role: cleanEmployeeData.role,
            phone: cleanEmployeeData.phone,
            is_active: true,
            created_at: new Date().toISOString()
          }
          set((state) => ({
            employees: [employee, ...state.employees],
            isLoading: false
          }))
          return employee
        }
      } else {
        const newEmployee: User = {
          ...cleanEmployeeData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          is_active: true
        }
        await db.profiles.put({ ...newEmployee, synced: false })
        try {
          await addToSyncQueue('create', 'profiles', newEmployee as unknown as Record<string, unknown>)
        } catch { /* skip */ }

        set((state) => ({
          employees: [newEmployee, ...state.employees],
          isLoading: false
        }))
        return newEmployee
      }
    } catch (error) {
      const newEmployee: User = {
        ...cleanEmployeeData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        is_active: true
      }
      await db.profiles.put({ ...newEmployee, synced: false })
      set((state) => ({
        employees: [newEmployee, ...state.employees],
        isLoading: false
      }))
      return newEmployee
    }
    return null
  },

  updateEmployee: async (id: string, updates: Partial<User>) => {
    set({ isLoading: true, error: null })
    
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        if (data) {
          const employee = data as User
          set((state) => ({
            employees: state.employees.map((e) => (e.id === id ? employee : e)),
            currentEmployee: state.currentEmployee?.id === id ? employee : state.currentEmployee,
            isLoading: false
          }))
        }
      } else {
        await db.profiles.update(id, { ...updates, synced: false })
        try {
          await addToSyncQueue('update', 'profiles', { id, ...updates })
        } catch { /* skip */ }

        set((state) => ({
          employees: state.employees.map((e) => (e.id === id ? { ...e, ...updates } : e)),
          currentEmployee: state.currentEmployee?.id === id ? { ...state.currentEmployee, ...updates } : state.currentEmployee,
          isLoading: false
        }))
      }
    } catch (error) {
      set({ isLoading: false, error: 'Failed to update employee' })
    }
  },

  deleteEmployee: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      if (isSupabaseConfigured()) {
        await supabase.from('profiles').delete().eq('id', id)
      }
      await db.profiles.update(id, { deleted: true, synced: false })
      set((state) => ({
        employees: state.employees.filter((e) => e.id !== id),
        currentEmployee: state.currentEmployee?.id === id ? null : state.currentEmployee,
        isLoading: false
      }))
    } catch (error) {
      set({ isLoading: false, error: 'Failed to delete employee' })
    }
  },

  toggleEmployeeStatus: async (id: string) => {
    const employee = get().employees.find((e) => e.id === id)
    if (employee) {
      await get().updateEmployee(id, { is_active: !employee.is_active })
    }
  }
}))
