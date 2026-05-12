import { create } from 'zustand'
import type { Transaction, TransactionType, TransactionStatus, TransactionFilter } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { generateReference } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import { db, addToSyncQueue } from '@/lib/db'
import { useSyncStore } from './syncStore'

interface TransactionState {
  transactions: Transaction[]
  currentTransaction: Transaction | null
  isLoading: boolean
  error: string | null
  successMessage: string | null
  pagination: { page: number; limit: number; total: number }
  fetchTransactions: (filter?: TransactionFilter) => Promise<void>
  fetchTransaction: (id: string) => Promise<void>
  createTransaction: (data: {
    type: TransactionType
    amount: number
    currency?: string
    exchange_rate?: number
    account_id: string
    offset_account_id?: string
    description?: string
    status: TransactionStatus
    attachments?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }) => Promise<{ success: boolean; error?: string }>
  approveTransaction: (id: string) => Promise<{ success: boolean; error?: string }>
  rejectTransaction: (id: string) => Promise<{ success: boolean; error?: string }>
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<{ success: boolean; error?: string }>
  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>
  getTransactionsByAccount: (accountId: string) => Transaction[]
  getTransactionsByStatus: (status: TransactionStatus) => Transaction[]
  getTotalByType: (type: TransactionType) => number
  clearMessages: () => void
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  currentTransaction: null,
  isLoading: false,
  error: null,
  successMessage: null,
  pagination: { page: 1, limit: 20, total: 0 },

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchTransactions: async (filter?: TransactionFilter) => {
    set({ isLoading: true, error: null })
    
    const currentUser = useAuthStore.getState().user
    const isOnline = useSyncStore.getState().isOnline
    
    try {
      const page = filter?.page || 1
      const limit = filter?.limit || 20
      const from = (page - 1) * limit
      const to = from + limit - 1

      // 1. Fetch from Local DB (Dexie) first
      let localData = await db.transactions.orderBy('created_at').reverse().toArray()
      
      if (filter?.type && filter.type !== 'all') {
        localData = localData.filter(t => t.type === filter.type)
      }
      if (filter?.status && filter.status !== 'all') {
        localData = localData.filter(t => t.status === filter.status)
      }
      if (filter?.project_id) {
        localData = localData.filter(t => (t as any).project_id === filter.project_id)
      }
      if (currentUser?.role === 'employee') {
        localData = localData.filter(t => t.created_by === currentUser.id)
      }

      const totalLocal = localData.length
      const pagedLocalData = localData.slice(from, from + limit)

      set({
        transactions: pagedLocalData as unknown as Transaction[],
        pagination: { page, limit, total: totalLocal },
        isLoading: false
      })

      // 2. If online and Supabase configured, sync from Supabase
      if (isOnline && isSupabaseConfigured()) {
        let query = supabase
          .from('transactions')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to)

        if (filter?.type && filter.type !== 'all') {
          query = query.eq('type', filter.type)
        }
        if (filter?.status && filter.status !== 'all') {
          query = query.eq('status', filter.status)
        }
        if (filter?.project_id) {
          query = query.eq('project_id', filter.project_id)
        }
        if (currentUser?.role === 'employee') {
          query = query.eq('created_by', currentUser.id)
        }

        const { data, count, error } = await query

        if (!error && data) {
          const allLocalTransactions = await db.transactions.toArray()
          const pendingQueue = await db.sync_queue.filter(q => q.table === 'transactions').toArray()
          const pendingIds = new Set(pendingQueue.map(q => (q.data as any).id))
          const remoteIds = new Set(data.map(t => t.id))

          const deadIds = allLocalTransactions
            .filter(t => {
              if (currentUser?.role === 'employee' && t.created_by !== currentUser.id) return false
              return !remoteIds.has(t.id) && !pendingIds.has(t.id)
            })
            .map(t => t.id)

          if (deadIds.length > 0) {
            await db.transactions.bulkDelete(deadIds)
          }

          await db.transactions.bulkPut(data.map(t => ({ ...t, synced: true })) as any)

          set({
            transactions: (data || []) as Transaction[],
            pagination: { page, limit, total: count || 0 }
          })
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'حدث خطأ غير معروف', isLoading: false })
    }
  },

  fetchTransaction: async (id: string) => {
    set({ isLoading: true, error: null })
    const isOnline = useSyncStore.getState().isOnline
    
    try {
      // 1. Check local first
      const localData = await db.transactions.get(id)
      if (localData) {
        set({ currentTransaction: localData as unknown as Transaction, isLoading: false })
      }

      // 2. Sync from remote if online
      if (isOnline) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single()

        if (!error && data) {
          set({ currentTransaction: data as Transaction, isLoading: false })
          await db.transactions.put({ ...data, synced: true } as any)
        } else if (error && !localData) {
          throw new Error(`خطأ في جلب المعاملة: ${error.message}`)
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'حدث خطأ غير معروف', isLoading: false })
    }
  },

  createTransaction: async (data) => {
    set({ isLoading: true, error: null, successMessage: null })
    const user = useAuthStore.getState().user
    const currentCompany = useAuthStore.getState().currentCompany
    const companyId = currentCompany?.id || user?.default_company_id || null

    if (!companyId) {
      const errorMsg = 'لا توجد شركة محددة لإنشاء المعاملة'
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }

    let validCreatedBy: string | null = null
    if (user?.id) {
      // For offline support, avoid mandatory Supabase call for profile if possible
      // We assume user.id is valid if they are logged in
      validCreatedBy = user.id
    }

    const newTransaction = {
      id: uuidv4(),
      company_id: companyId,
      reference: generateReference('TXN'),
      type: data.type,
      amount: data.amount,
      currency: data.currency || currentCompany?.default_currency || 'LYD',
      exchange_rate: data.exchange_rate || 1,
      description: data.description || null,
      account_id: data.account_id,
      offset_account_id: data.offset_account_id || null,
      created_by: validCreatedBy,
      status: 'pending' as TransactionStatus,
      attachments: data.attachments || null,
      metadata: data.metadata || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced: false
    }

    try {
      const isOnline = useSyncStore.getState().isOnline
      const transactionToInsert = { ...newTransaction }
      delete (transactionToInsert as any).synced // remove local-only flag for supabase

      if (isOnline && isSupabaseConfigured()) {
        const { error } = await supabase
          .from('transactions')
          .insert(transactionToInsert)

        if (error) {
          if (error.code === '23505') {
            const errorMsg = 'رقم المرجع مستخدم من قبل، يرجى المحاولة مرة أخرى'
            set({ error: errorMsg, isLoading: false })
            return { success: false, error: errorMsg }
          }
          // If network fails unexpectedly despite isOnline being true
          await addToSyncQueue('create', 'transactions', transactionToInsert)
          useSyncStore.getState().updatePendingCount()
        } else {
          newTransaction.synced = true
        }
      } else {
        await addToSyncQueue('create', 'transactions', transactionToInsert)
        useSyncStore.getState().updatePendingCount()
      }

      await db.transactions.put(newTransaction as any)

      set((state) => ({
        transactions: [newTransaction as unknown as Transaction, ...state.transactions],
        isLoading: false,
        successMessage: isOnline && newTransaction.synced ? 'تم إنشاء المعاملة بنجاح' : 'تم حفظ المعاملة محلياً وسيتم مزامنتها لاحقاً'
      }))

      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'حدث خطأ غير معروف أثناء إنشاء المعاملة'
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  approveTransaction: async (id) => {
    const transaction = get().transactions.find(t => t.id === id)
    if (!transaction) {
      return { success: false, error: 'المعاملة غير موجودة' }
    }

    set({ isLoading: true, error: null, successMessage: null })
    const user = useAuthStore.getState().user
    const isOnline = useSyncStore.getState().isOnline

    try {
      // 1. تحديث محلي في Dexie (المعاملة)
      const approvedTx = { 
        ...transaction, 
        status: 'approved' as TransactionStatus, 
        approved_by: user?.id,
        updated_at: new Date().toISOString(),
        synced: false
      }
      await db.transactions.put(approvedTx as any)

      // 2. تحديث الرصيد محلياً في Dexie (الحساب)
      const account = await db.accounts.get(transaction.account_id)
      if (account) {
        if (transaction.type === 'deposit' || transaction.type === 'income') {
          account.balance += transaction.amount
        } else if (transaction.type === 'withdrawal' || transaction.type === 'expense' || transaction.type === 'salary') {
          account.balance -= transaction.amount
        }
        ;(account as any).synced = false
        await db.accounts.put(account)

        // تحديث متجر الحسابات فوراً للواجهة
        const { useAccountStore } = await import('./accountStore')
        useAccountStore.setState(state => ({
          accounts: state.accounts.map(a => a.id === account.id ? { ...a, balance: account.balance } : a)
        }))
      }

      // 3. Sync with Supabase
      const rpcData = { p_transaction_id: id, p_notes: null }

      if (isOnline && isSupabaseConfigured()) {
        const { error: txError } = await supabase.rpc('approve_transaction', rpcData)

        if (txError) {
          await addToSyncQueue('rpc', 'approve_transaction', rpcData)
        } else {
          await db.transactions.update(id, { synced: true })
          if (account) {
            await db.accounts.update(account.id, { synced: true })
          }
        }
      } else if (isOnline) {
        await addToSyncQueue('rpc', 'approve_transaction', rpcData)
      }

      // 4. Update store state
      set((state) => ({
        transactions: state.transactions.map(t => t.id === id ? { ...approvedTx, synced: isOnline && isSupabaseConfigured() } : t),
        currentTransaction: state.currentTransaction?.id === id ? { ...approvedTx, synced: isOnline && isSupabaseConfigured() } : state.currentTransaction,
        isLoading: false,
        successMessage: 'تمت الموافقة محلياً'
      }))

      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'حدث خطأ غير معروف أثناء الموافقة'
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  rejectTransaction: async (id) => {
    const transaction = get().transactions.find(t => t.id === id)
    if (!transaction) {
      return { success: false, error: 'المعاملة غير موجودة' }
    }

    set({ isLoading: true, error: null, successMessage: null })
    const user = useAuthStore.getState().user

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('transactions')
          .update({
            status: 'rejected' as TransactionStatus,
            approved_by: user?.id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)

        if (error) {
          await db.transactions.update(id, { status: 'rejected' } as any)
        }
      } else {
        await db.transactions.update(id, { status: 'rejected' } as any)
      }

      const rejectedTx = { ...transaction, status: 'rejected' as TransactionStatus }
      set((state) => ({
        transactions: state.transactions.map(t => t.id === id ? rejectedTx : t),
        currentTransaction: state.currentTransaction?.id === id ? rejectedTx : state.currentTransaction,
        isLoading: false,
        successMessage: 'تم رفض المعاملة'
      }))
      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'حدث خطأ غير معروف أثناء الرفض'
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  updateTransaction: async (id: string, updates: Partial<Transaction>) => {
    set({ isLoading: true, error: null, successMessage: null })
    const updatedData = { ...updates, updated_at: new Date().toISOString() }

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('transactions')
          .update(updatedData)
          .eq('id', id)
          .select()
          .single()

        if (!error && data) {
          set((state) => ({
            transactions: state.transactions.map((t) => (t.id === id ? data as Transaction : t)),
            currentTransaction: state.currentTransaction?.id === id ? data as Transaction : state.currentTransaction,
            isLoading: false,
            successMessage: 'تم تحديث المعاملة بنجاح'
          }))
          return { success: true }
        }
      }

      await db.transactions.update(id, updatedData as any)
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        currentTransaction: state.currentTransaction?.id === id ? { ...state.currentTransaction, ...updates } : state.currentTransaction,
        isLoading: false,
        successMessage: 'تم تحديث المعاملة محلياً'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message || 'خطأ', isLoading: false })
      return { success: false, error: err.message }
    }
  },

  deleteTransaction: async (id: string) => {
    set({ isLoading: true, error: null, successMessage: null })

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('transactions').delete().eq('id', id)
        if (error) {
          set({ error: error.message, isLoading: false })
          return { success: false, error: error.message }
        }
      } else {
        await db.transactions.delete(id)
      }

      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
        currentTransaction: state.currentTransaction?.id === id ? null : state.currentTransaction,
        isLoading: false,
        successMessage: 'تم حذف المعاملة بنجاح'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message || 'خطأ', isLoading: false })
      return { success: false, error: err.message }
    }
  },

  getTransactionsByAccount: (accountId: string) => {
    return get().transactions.filter((t) => t.account_id === accountId)
  },

  getTransactionsByStatus: (status: TransactionStatus) => {
    return get().transactions.filter((t) => t.status === status)
  },

  getTotalByType: (type: TransactionType) => {
    return get()
      .transactions.filter((t) => t.type === type && t.status === 'approved')
      .reduce((sum, t) => sum + t.amount, 0)
  }
}))
