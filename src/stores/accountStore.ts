import { create } from 'zustand'
import type { Account } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { generateReference } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import { db, addToSyncQueue } from '@/lib/db'
import { useSyncStore } from './syncStore'

interface AccountState {
  accounts: Account[]
  currentAccount: Account | null
  isLoading: boolean
  error: string | null
  successMessage: string | null
  fetchAccounts: () => Promise<void>
  fetchAccount: (id: string) => Promise<void>
  createAccount: (account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>
  updateAccount: (id: string, updates: Partial<Account>) => Promise<{ success: boolean; error?: string }>
  deleteAccount: (id: string) => Promise<{ success: boolean; error?: string }>
  getAccountBalance: (id: string) => number
  getAccountsByType: (type: string) => Account[]
  getActiveAccounts: () => Account[]
  clearMessages: () => void
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  currentAccount: null,
  isLoading: false,
  error: null,
  successMessage: null,

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchAccounts: async () => {
    set({ isLoading: true, error: null })
    const isOnline = useSyncStore.getState().isOnline
    
    try {
      // 1. Fetch from Local DB (Dexie) first
      const localData = await db.accounts.orderBy('created_at').reverse().toArray()
      set({ accounts: localData as unknown as Account[], isLoading: false })

      // 2. If online, sync from Supabase
      if (isOnline) {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error(`خطأ في جلب الحسابات من الخادم: ${error.message}`)
        } else if (data) {
          const localAccounts = await db.accounts.toArray()
          const pendingQueue = await db.sync_queue.filter(q => q.table === 'accounts').toArray()
          const pendingIds = new Set(pendingQueue.map(q => (q.data as any).id))
          const remoteIds = new Set(data.map(a => a.id))

          // 1. Delete dead local rows (rejected by server, not in sync queue)
          const deadIds = localAccounts
            .filter(a => !remoteIds.has(a.id) && !pendingIds.has(a.id))
            .map(a => a.id)
          
          if (deadIds.length > 0) {
            await db.accounts.bulkDelete(deadIds)
          }

          // 2. Merge remote data
          const mergedData = data.map(remoteAcc => {
            if (pendingIds.has(remoteAcc.id)) {
               return localAccounts.find(a => a.id === remoteAcc.id) || { ...remoteAcc, synced: true }
            }
            return { ...remoteAcc, synced: true }
          })

          await db.accounts.bulkPut(mergedData as any)
          const finalData = await db.accounts.orderBy('created_at').reverse().toArray()
          set({ accounts: finalData as unknown as Account[] })
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'حدث خطأ غير معروف', isLoading: false })
    }
  },

  fetchAccount: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw new Error(`خطأ في جلب الحساب: ${error.message}`)
      }
      set({ currentAccount: data as Account, isLoading: false })
    } catch (err: any) {
      set({ error: err.message || 'حدث خطأ غير معروف', isLoading: false })
    }
  },

  createAccount: async (accountData) => {
    set({ isLoading: true, error: null, successMessage: null })
    const user = useAuthStore.getState().user

    let validCreatedBy: string | null = null
    if (user?.id) {
      validCreatedBy = user.id
    }

    const newAccount = {
      id: uuidv4(),
      code: accountData.code || generateReference('ACC').slice(0, 8),
      name: accountData.name,
      type: accountData.type,
      balance: Math.round((accountData.balance ?? 0) * 100) / 100,
      currency: accountData.currency || 'LYD',
      status: accountData.status || 'active',
      notes: accountData.notes || null,
      created_by: validCreatedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced: false
    }

    try {
      const isOnline = useSyncStore.getState().isOnline
      const accountToInsert = { ...newAccount }
      delete (accountToInsert as any).synced

      if (isOnline) {
        const { error } = await supabase
          .from('accounts')
          .insert(accountToInsert)

        if (error) {
          if (error.message.includes('duplicate') || error.code === '23505') {
            const errorMsg = 'كود الحساب مستخدم من قبل، يرجى اختيار كود آخر'
            set({ error: errorMsg, isLoading: false })
            return { success: false, error: errorMsg }
          }
          await addToSyncQueue('create', 'accounts', accountToInsert)
          useSyncStore.getState().updatePendingCount()
        } else {
          newAccount.synced = true
        }
      } else {
        await addToSyncQueue('create', 'accounts', accountToInsert)
        useSyncStore.getState().updatePendingCount()
      }

      await db.accounts.put(newAccount as any)

      set((state) => ({
        accounts: [newAccount as unknown as Account, ...state.accounts],
        isLoading: false,
        successMessage: isOnline && newAccount.synced ? 'تم إنشاء الحساب بنجاح' : 'تم حفظ الحساب محلياً وسيتم مزامنته لاحقاً'
      }))
      
      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'حدث خطأ غير معروف أثناء إنشاء الحساب'
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  updateAccount: async (id: string, updates: Partial<Account>) => {
    set({ isLoading: true, error: null, successMessage: null })
    const updatedData = { ...updates, updated_at: new Date().toISOString() }

    try {
      const { data, error } = await supabase
        .from('accounts')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        const errorMsg = `خطأ في تحديث الحساب: ${error.message}`
        set({ error: errorMsg, isLoading: false })
        return { success: false, error: errorMsg }
      }

      set((state) => ({
        accounts: state.accounts.map((a) => (a.id === id ? data as Account : a)),
        currentAccount: state.currentAccount?.id === id ? data as Account : state.currentAccount,
        isLoading: false,
        successMessage: 'تم تحديث الحساب بنجاح'
      }))
      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'حدث خطأ غير معروف أثناء التحديث'
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  deleteAccount: async (id: string) => {
    set({ isLoading: true, error: null, successMessage: null })
    
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)

      if (error) {
        const errorMsg = error.message.includes('foreign key')
          ? 'لا يمكن حذف هذا الحساب لأنه مرتبط بعمليات أخرى'
          : `خطأ في حذف الحساب: ${error.message}`
        set({ error: errorMsg, isLoading: false })
        return { success: false, error: errorMsg }
      }

      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        currentAccount: state.currentAccount?.id === id ? null : state.currentAccount,
        isLoading: false,
        successMessage: 'تم حذف الحساب بنجاح'
      }))
      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'حدث خطأ غير معروف أثناء الحذف'
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  getAccountBalance: (id: string) => {
    const account = get().accounts.find((a) => a.id === id)
    return account?.balance ?? 0
  },

  getAccountsByType: (type: string) => {
    return get().accounts.filter((a) => a.type === type)
  },

  getActiveAccounts: () => {
    return get().accounts.filter((a) => a.status === 'active')
  }
}))