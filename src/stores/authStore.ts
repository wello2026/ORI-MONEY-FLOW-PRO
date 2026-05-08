import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<User>) => void
  checkAuth: () => Promise<void>
}

const DEMO_USERS: Record<string, { name: string; role: UserRole }> = {
  'admin@ori.ly': { name: 'مدير النظام', role: 'super_admin' },
  'admin': { name: 'مدير النظام', role: 'super_admin' },
  'manager@ori.ly': { name: 'مدير', role: 'admin' },
  'manager': { name: 'مدير', role: 'admin' },
  'employee@ori.ly': { name: 'موظف', role: 'employee' },
  'employee': { name: 'موظف', role: 'employee' },
  'test': { name: 'مستخدم تجريبي', role: 'super_admin' }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        
        const emailLower = email.toLowerCase().trim()
        
        // 1. التحقق من المستخدمين التجريبيين
        const demoUser = DEMO_USERS[emailLower]
        if (demoUser && password === 'admin123') {
          console.log('Demo login match found, fetching profile...')
          
          // محاولة جلب المعرف الحقيقي من السيرفر لضمان اتساق البيانات
          let userId = crypto.randomUUID()
          if (isSupabaseConfigured()) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', emailLower.includes('@') ? emailLower : `${emailLower}@ori.ly`)
                .single()
              
              if (profile) userId = profile.id
            } catch (err) {
              console.log('Could not fetch demo profile ID, using random:', err)
            }
          }

          const user: User = {
            id: userId,
            email: emailLower.includes('@') ? emailLower : `${emailLower}@ori.ly`,
            full_name: demoUser.name,
            role: demoUser.role,
            is_active: true,
            created_at: new Date().toISOString()
          }
          set({ user, isAuthenticated: true, isLoading: false })
          return
        }

        // 2. البحث في جدول المستخدمين (profiles)
        if (isSupabaseConfigured()) {
          try {
            // البحث في جدول profiles
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', emailLower)
              .single()

            if (profile && profileError === null) {
              //找到了用户，现在检查密码
              //对于演示，我们接受任何密码与现有配置文件
              if (profile.is_active) {
                console.log('User found in profiles:', profile)
                const user: User = {
                  id: profile.id,
                  email: profile.email,
                  full_name: profile.full_name,
                  role: profile.role as UserRole,
                  phone: profile.phone,
                  is_active: profile.is_active,
                  created_at: profile.created_at
                }
                set({ user, isAuthenticated: true, isLoading: false })
                return
              } else {
                set({ error: 'الحساب غير نشط', isLoading: false })
                return
              }
            }
          } catch (err) {
            console.log('Profile lookup failed:', err)
          }
        }

        // 3. محاولة Supabase Auth كحل أخير
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: emailLower,
              password
            })

            if (!error && data.user) {
              const user: User = {
                id: data.user.id,
                email: data.user.email || emailLower,
                full_name: data.user.user_metadata?.full_name || 'مستخدم',
                role: 'employee',
                is_active: true,
                created_at: new Date().toISOString()
              }
              set({ user, isAuthenticated: true, isLoading: false })
              return
            }
          } catch (err) {
            console.log('Auth login failed:', err)
          }
        }

        // فشل كل المحاولات
        set({ error: 'بيانات الدخول غير صحيحة', isLoading: false })
      },

      logout: async () => {
        if (isSupabaseConfigured()) {
          try {
            await supabase.auth.signOut()
          } catch (err) {
            console.log('Logout error:', err)
          }
        }
        set({ user: null, isAuthenticated: false })
      },

      updateProfile: (updates) => {
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates }
          set({ user: updatedUser })
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
              set({ user: profile as User, isAuthenticated: true, isLoading: false })
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
          console.log('Auth check failed:', err)
          set({ isLoading: false })
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
)

// Hook to check if user can approve
export const useCanApprove = () => {
  const user = useAuthStore((state) => state.user)
  return user?.role === 'super_admin' || user?.role === 'admin'
}