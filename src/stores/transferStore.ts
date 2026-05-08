import { create } from 'zustand'
import type { Transfer, TransferStatus } from '@/types'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { useAccountStore } from './accountStore'
import { v4 as uuidv4 } from 'uuid'
import { db, addToSyncQueue } from '@/lib/db'
import { useSyncStore } from './syncStore'

interface TransferState {
  transfers: Transfer[]
  currentTransfer: Transfer | null
  isLoading: boolean
  error: string | null
  successMessage: string | null
  fetchTransfers: () => Promise<void>
  fetchTransfer: (id: string) => Promise<void>
  createTransfer: (data: { source_account_id: string; destination_account_id: string; amount: number; description?: string }) => Promise<{ success: boolean; error?: string }>
  approveTransfer: (id: string) => Promise<{ success: boolean; error?: string }>
  rejectTransfer: (id: string) => Promise<{ success: boolean; error?: string }>
  deleteTransfer: (id: string) => Promise<{ success: boolean; error?: string }>
  getPendingTransfers: () => Transfer[]
  clearMessages: () => void
}

// Helper removed for unused warning

export const useTransferStore = create<TransferState>((set, get) => ({
  transfers: [],
  currentTransfer: null,
  isLoading: false,
  error: null,
  successMessage: null,

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchTransfers: async () => {
    set({ isLoading: true, error: null })
    const isOnline = useSyncStore.getState().isOnline
    
    try {
      const currentUser = useAuthStore.getState().user
      
      // 1. Fetch from Local DB (Dexie)
      let localData = await db.transfers.orderBy('created_at').reverse().toArray()
      if (currentUser?.role === 'viewer' || currentUser?.role === 'employee') {
        localData = localData.filter(t => t.created_by === currentUser.id)
      }
      set({ transfers: localData as unknown as Transfer[], isLoading: false })

      // 2. Sync from Supabase if online
      if (isOnline) {
        let query = supabase
          .from('transfers')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })

        if (currentUser?.role === 'viewer' || currentUser?.role === 'employee') {
          query = query.eq('created_by', currentUser.id)
        }

        const { data, error } = await query

        if (error) {
          console.error(`خطأ في جلب التحويلات: ${error.message}`)
        } else if (data) {
          const localTransfers = await db.transfers.toArray()
          const pendingQueue = await db.sync_queue.filter(q => q.table === 'transfers').toArray()
          const pendingIds = new Set(pendingQueue.map(q => (q.data as any).id))
          const remoteIds = new Set(data.map(t => t.id))

          // Delete dead local rows
          const deadIds = localTransfers
            .filter(t => !remoteIds.has(t.id) && !pendingIds.has(t.id))
            .map(t => t.id)
          
          if (deadIds.length > 0) {
            await db.transfers.bulkDelete(deadIds)
          }

          // Merge remote data
          const mergedData = data.map(remoteTrf => {
            if (pendingIds.has(remoteTrf.id)) {
               return localTransfers.find(t => t.id === remoteTrf.id) || { ...remoteTrf, synced: true }
            }
            return { ...remoteTrf, synced: true }
          })

          await db.transfers.bulkPut(mergedData as any)
          const finalData = await db.transfers.orderBy('created_at').reverse().toArray()
          
          let stateData = finalData
          if (currentUser?.role === 'viewer' || currentUser?.role === 'employee') {
            stateData = finalData.filter(t => t.created_by === currentUser.id)
          }
          
          set({ transfers: stateData as unknown as Transfer[] })
        }
      }
    } catch (err: any) {
      console.error('fetchTransfers catch:', err)
      set({ error: err.message || 'خطأ في الاتصال', isLoading: false })
    }
  },

  fetchTransfer: async (id: string) => {
    set({ isLoading: true, error: null })
    const isOnline = useSyncStore.getState().isOnline
    
    try {
      // 1. Fetch locally first
      let localData = await db.transfers.get(id)
      if (localData) {
        set({ currentTransfer: localData as unknown as Transfer, isLoading: false })
      } else {
        // Fallback to state
        const stateTransfer = get().transfers.find(t => t.id === id)
        if (stateTransfer) {
          set({ currentTransfer: stateTransfer, isLoading: false })
        }
      }

      // 2. Fetch from Supabase if online
      if (isOnline) {
        const { data, error } = await supabase
          .from('transfers')
          .select('*')
          .eq('id', id)
          .single()

        if (!error && data) {
          set({ currentTransfer: data as Transfer, isLoading: false })
          await db.transfers.put({ ...data, synced: true } as any)
        }
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createTransfer: async (data) => {
    set({ isLoading: true, error: null, successMessage: null })
    const user = useAuthStore.getState().user
    const isOnline = useSyncStore.getState().isOnline
    
    if (data.source_account_id === data.destination_account_id) {
      set({ error: 'لا يمكن التحويل للحساب نفسه', isLoading: false })
      return { success: false, error: 'لا يمكن التحويل للحساب نفسه' }
    }

    // التحقق من الرصيد محلياً
    const sourceAccount = await db.accounts.get(data.source_account_id)
    if (sourceAccount && sourceAccount.balance < data.amount) {
      set({ error: 'رصيد غير كافي', isLoading: false })
      return { success: false, error: 'رصيد غير كافي' }
    }

    const newTransfer = {
      id: uuidv4(),
      reference: `TRF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      source_account_id: data.source_account_id,
      destination_account_id: data.destination_account_id,
      amount: Math.round(data.amount * 100) / 100,
      description: data.description || null,
      status: 'pending' as TransferStatus,
      created_by: user?.id || null,
      created_at: new Date().toISOString(),
      synced: false
    }

    try {
      const transferToInsert = { ...newTransfer }
      delete (transferToInsert as any).synced

      if (isOnline) {
        const { error } = await supabase
          .from('transfers')
          .insert(transferToInsert)

        if (error) {
          // If FK error (parent account not synced yet) or network issue
          await addToSyncQueue('create', 'transfers', transferToInsert)
          useSyncStore.getState().updatePendingCount()
        } else {
          newTransfer.synced = true
        }
      } else {
        await addToSyncQueue('create', 'transfers', transferToInsert)
        useSyncStore.getState().updatePendingCount()
      }

      await db.transfers.put(newTransfer as any)

      set((state) => ({
        transfers: [newTransfer as unknown as Transfer, ...state.transfers],
        isLoading: false,
        successMessage: isOnline && newTransfer.synced ? 'تم إنشاء التحويل بنجاح' : 'تم حفظ التحويل محلياً وسيتم مزامنته لاحقاً'
      }))
      
      return { success: true }
    } catch (err: any) {
      const errorMsg = err.message || 'حدث خطأ غير معروف'
      set({ error: errorMsg, isLoading: false })
      return { success: false, error: errorMsg }
    }
  },

  approveTransfer: async (id) => {
    const transfer = get().transfers.find(t => t.id === id)
    if (!transfer) return { success: false, error: 'التحويل غير موجود' }

    set({ isLoading: true, error: null, successMessage: null })
    const user = useAuthStore.getState().user
    const isOnline = useSyncStore.getState().isOnline

    try {
      const approved = { 
        ...transfer, 
        status: 'approved' as TransferStatus, 
        approved_by: user?.id,
        synced: false 
      }
      await db.transfers.put(approved as any)

      // البيانات المطلوبة للـ RPC
      const rpcData = { transfer_id: id, approver_id: user?.id || null }
      
      if (isOnline && (transfer as any).synced !== false) {
        const { error: trfError } = await supabase.rpc('approve_transfer', rpcData)

        if (trfError) {
          console.error("Supabase RPC error:", trfError)
          await addToSyncQueue('rpc', 'approve_transfer', rpcData)
        } else {
          approved.synced = true
          await db.transfers.put(approved as any)
        }
      } else {
        await addToSyncQueue('rpc', 'approve_transfer', rpcData)
      }

      // خصم من المصدر محلياً
      const src = await db.accounts.get(transfer.source_account_id)
      if (src) {
        src.balance -= transfer.amount
        ;(src as any).synced = false
        await db.accounts.put(src)
        useAccountStore.setState(state => ({
          accounts: state.accounts.map(a => a.id === src.id ? { ...a, balance: src.balance } : a)
        }))
        if (isOnline) {
          const { error } = await supabase.from('accounts').update({ balance: src.balance }).eq('id', src.id)
          if (error) {
            await addToSyncQueue('update', 'accounts', src)
          } else {
            ;(src as any).synced = true
            await db.accounts.put(src)
          }
        } else {
          await addToSyncQueue('update', 'accounts', src)
        }
      }

      // إضافة للوجهة محلياً
      const dst = await db.accounts.get(transfer.destination_account_id)
      if (dst) {
        dst.balance += transfer.amount
        ;(dst as any).synced = false
        await db.accounts.put(dst)
        useAccountStore.setState(state => ({
          accounts: state.accounts.map(a => a.id === dst.id ? { ...a, balance: dst.balance } : a)
        }))
        if (isOnline) {
          const { error } = await supabase.from('accounts').update({ balance: dst.balance }).eq('id', dst.id)
          if (error) {
            await addToSyncQueue('update', 'accounts', dst)
          } else {
            ;(dst as any).synced = true
            await db.accounts.put(dst)
          }
        } else {
          await addToSyncQueue('update', 'accounts', dst)
        }
      }

      await db.transfers.put(approved as any)
      useSyncStore.getState().updatePendingCount()

      set((state) => ({
        transfers: state.transfers.map(t => t.id === id ? approved : t),
        currentTransfer: state.currentTransfer?.id === id ? approved : state.currentTransfer,
        isLoading: false,
        successMessage: 'تمت الموافقة'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  rejectTransfer: async (id) => {
    const transfer = get().transfers.find(t => t.id === id)
    if (!transfer) return { success: false, error: 'التحويل غير موجود' }

    set({ isLoading: true, error: null, successMessage: null })
    const user = useAuthStore.getState().user
    const isOnline = useSyncStore.getState().isOnline

    try {
      const rejected = { ...transfer, status: 'rejected' as TransferStatus, approved_by: user?.id }
      
      if (isOnline && (transfer as any).synced !== false) {
        const { error } = await supabase
          .from('transfers')
          .update({ status: 'rejected', approved_by: user?.id || null })
          .eq('id', id)

        if (error) {
          await addToSyncQueue('update', 'transfers', { id, status: 'rejected', approved_by: user?.id })
        }
      } else {
        await addToSyncQueue('update', 'transfers', { id, status: 'rejected', approved_by: user?.id })
      }

      await db.transfers.put(rejected as any)
      useSyncStore.getState().updatePendingCount()

      set((state) => ({
        transfers: state.transfers.map(t => t.id === id ? rejected : t),
        currentTransfer: state.currentTransfer?.id === id ? rejected : state.currentTransfer,
        isLoading: false,
        successMessage: 'تم الرفض'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  deleteTransfer: async (id) => {
    set({ isLoading: true, error: null, successMessage: null })
    const isOnline = useSyncStore.getState().isOnline
    const transfer = get().transfers.find(t => t.id === id)
    
    try {
      if (isOnline && transfer && (transfer as any).synced !== false) {
        const { error } = await supabase.from('transfers').delete().eq('id', id)
        if (error) {
          await addToSyncQueue('delete', 'transfers', { id })
        }
      } else {
        await addToSyncQueue('delete', 'transfers', { id })
      }

      await db.transfers.delete(id)
      useSyncStore.getState().updatePendingCount()

      set((state) => ({
        transfers: state.transfers.filter(t => t.id !== id),
        isLoading: false,
        successMessage: 'تم الحذف'
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  getPendingTransfers: () => get().transfers.filter(t => t.status === 'pending')
}))