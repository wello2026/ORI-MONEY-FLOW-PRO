import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole, Company, CompanyRole } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface AuthState {
  user: User | null
  currentCompany: Company | null
  userCompanies: Company[]
  companyRole: CompanyRole | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  setUser: (user: User | null) => void
  setCurrentCompany: (company: Company | null) => void
  setUserCompanies: (companies: Company[]) => void
  setCompanyRole: (role: CompanyRole | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<User>) => void
  checkAuth: () => Promise<void>
  switchCompany: (companyId: string) => Promise<void>
  loadUserCompanies: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      currentCompany: null,
      userCompanies: [],
      companyRole: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setCurrentCompany: (company) => set({ currentCompany: company }),
      setUserCompanies: (companies) => set({ userCompanies: companies }),
      setCompanyRole: (role) => set({ companyRole: role }),

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        const emailLower = email.toLowerCase().trim()

        if (!isSupabaseConfigured()) {
          set({ error: 'Supabase غير مُعد. يرجى الاتصال بالمدير.', isLoading: false })
          return
        }

        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: emailLower,
            password
          })

          if (authError || !authData.user) {
            set({ error: authError?.message || 'بيانات الدخول غير صحيحة', isLoading: false })
            return
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single()

          if (profileError || !profile) {
            set({ error: 'لم يتم العثور على ملف شخصي للمستخدم', isLoading: false })
            return
          }

          if (!profile.is_active) {
            set({ error: 'الحساب غير نشط. يرجى التواصل مع المدير.', isLoading: false })
            return
          }

          const user: User = {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role as UserRole,
            phone: profile.phone,
            is_active: profile.is_active,
            created_at: profile.created_at,
            default_company_id: profile.default_company_id
          }
          set({ user, isAuthenticated: true, isLoading: false })

          // Load user's companies after successful login
          await get().loadUserCompanies()
          return
        } catch (err) {
          console.error('Login error:', err)
          set({ error: 'حدث خطأ أثناء تسجيل الدخول', isLoading: false })
        }
      },

      logout: async () => {
        if (isSupabaseConfigured()) {
          try {
            await supabase.auth.signOut()
          } catch (err) {
            console.log('Logout error:', err)
          }
        }
        set({
          user: null,
          currentCompany: null,
          userCompanies: [],
          companyRole: null,
          isAuthenticated: false
        })
      },

      updateProfile: (updates) => {
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates }
          set({ user: updatedUser })
        }
      },

      loadUserCompanies: async () => {
        if (!isSupabaseConfigured()) return
        try {
          const { data, error } = await supabase.rpc('get_user_companies')
          if (error) {
            console.error('Failed to load user companies:', error)
            return
          }
          if (data && data.length > 0) {
            const companies: Company[] = data.map((row: {
              company_id: string
              company_name: string
              company_name_ar: string | null
              country: string
              default_currency: string
              role: CompanyRole
              is_current: boolean
            }) => ({
              id: row.company_id,
              company_name: row.company_name,
              company_name_ar: row.company_name_ar || row.company_name,
              country: row.country,
              default_currency: row.default_currency,
              is_active: true,
              created_at: ''
            }))
            set({ userCompanies: companies })

            const current = companies.find(c => data.find((r: { is_current: boolean }) => r.is_current))
            const role = data.find((r: { is_current: boolean }) => r.is_current)?.role as CompanyRole | null

            if (current) {
              set({ currentCompany: current, companyRole: role })
            } else if (companies.length > 0) {
              set({ currentCompany: companies[0], companyRole: data[0].role as CompanyRole })
            }
          }
        } catch (err) {
          console.error('loadUserCompanies error:', err)
        }
      },

      switchCompany: async (companyId: string) => {
        if (!isSupabaseConfigured()) return
        try {
          const { error } = await supabase.rpc('make_current_company', { p_company_id: companyId })
          if (error) {
            console.error('Failed to switch company:', error)
            return
          }
          // Reload companies to get updated is_current state
          await get().loadUserCompanies()
        } catch (err) {
          console.error('switchCompany error:', err)
        }
      },

      checkAuth: async () => {
        if (!isSupabaseConfigured()) {
          set({ isLoading: false })
          return
        }

        try {
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (profile) {
              const user: User = {
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name,
                role: profile.role as UserRole,
                phone: profile.phone,
                is_active: profile.is_active,
                created_at: profile.created_at,
                default_company_id: profile.default_company_id
              }
              set({ user, isAuthenticated: true, isLoading: false })
              await get().loadUserCompanies()
            } else {
              set({
                user: {
                  id: session.user.id,
                  email: session.user.email || '',
                  full_name: session.user.user_metadata?.full_name || 'مستخدم',
                  role: 'employee',
                  is_active: true,
                  created_at: new Date().toISOString()
                },
                isAuthenticated: true,
                isLoading: false
              })
            }
          } else {
            set({ isLoading: false })
          }
        } catch (err) {
          console.error('Auth check failed:', err)
          set({ isLoading: false })
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        currentCompany: state.currentCompany,
        companyRole: state.companyRole,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Hook to check if user can approve
export const useCanApprove = () => {
  const user = useAuthStore((state) => state.user)
  return user?.role === 'super_admin' || user?.role === 'admin'
}