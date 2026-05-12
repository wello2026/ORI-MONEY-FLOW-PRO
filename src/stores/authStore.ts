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
  login: (email: string, password: string) => Promise<boolean>
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
          return false
        }

        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: emailLower,
            password
          })

          if (authError || !authData.user) {
            set({ error: authError?.message || 'بيانات الدخول غير صحيحة', isLoading: false })
            return false
          }

          let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single()

          if (profileError || !profile) {
            await supabase.rpc('bootstrap_current_user')

            const retry = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single()

            profile = retry.data
            profileError = retry.error
          }

          if (profileError || !profile) {
            set({ error: 'تعذر تجهيز ملف المستخدم تلقائياً. تحقق من تطبيق migration الإنقاذ.', isLoading: false })
            return false
          }

          if (!profile.is_active) {
            set({ error: 'الحساب غير نشط. يرجى التواصل مع المدير.', isLoading: false })
            return false
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
          return true
        } catch (err) {
          console.error('Login error:', err)
          set({ error: 'حدث خطأ أثناء تسجيل الدخول', isLoading: false })
          return false
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

            const currentRow = data.find((r: { is_current: boolean }) => r.is_current) || data[0]
            const current = companies.find(c => c.id === currentRow.company_id)
            const role = currentRow?.role as CompanyRole | null

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
            let { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (!profile) {
              await supabase.rpc('bootstrap_current_user')
              const retry = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
              profile = retry.data
            }

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
              await supabase.auth.signOut()
              set({ user: null, isAuthenticated: false, isLoading: false, error: 'تعذر تجهيز جلسة المستخدم' })
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
