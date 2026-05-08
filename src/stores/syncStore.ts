import { create } from 'zustand'
import type { SyncStatus } from '@/types'
import { getPendingSyncItems, removeSyncQueueItem, getSyncQueueCount } from '@/lib/db'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { STORAGE_KEYS } from '@/lib/constants'

interface SyncState extends SyncStatus {
  setOnline: (isOnline: boolean) => void
  setSyncing: (isSyncing: boolean) => void
  updatePendingCount: () => Promise<void>
  syncData: () => Promise<void>
  initialize: () => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncTime: localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || undefined,
  pendingCount: 0,

  setOnline: (isOnline) => {
    set({ isOnline })
    if (isOnline && get().pendingCount > 0) {
      get().syncData()
    }
  },

  setSyncing: (isSyncing) => set({ isSyncing }),

  updatePendingCount: async () => {
    const count = await getSyncQueueCount()
    set({ pendingCount: count })
  },

  syncData: async () => {
    if (!isSupabaseConfigured() || get().isSyncing || !get().isOnline) {
      return
    }

    set({ isSyncing: true })

    try {
      const pendingItems = await getPendingSyncItems()

      for (const item of pendingItems) {
        try {
          const { table, operation, data } = item
          const id = item.id

          const cleanData = { ...data }
          delete (cleanData as any).synced
          delete (cleanData as any).creator
          delete (cleanData as any).account
          delete (cleanData as any).offset_account

          let opError: any = null
          switch (operation) {
            case 'create':
              console.log(`Syncing create to ${table}:`, cleanData)
              const { error: cErr } = await supabase.from(table).upsert(cleanData)
              opError = cErr
              break
            case 'update':
              console.log(`Syncing update to ${table}:`, cleanData)
              const { error: uErr } = await supabase.from(table).update(cleanData).eq('id', (cleanData as any).id)
              opError = uErr
              break
            case 'delete':
              const { error: dErr } = await supabase.from(table).delete().eq('id', (cleanData as any).id)
              opError = dErr
              break
            case 'rpc':
              console.log(`Syncing RPC ${table}:`, cleanData)
              const { error: rErr } = await supabase.rpc(table, cleanData)
              opError = rErr
              break
          }

          if (opError) {
            const status = (opError as any)?.status;
            const code = String((opError as any)?.code || '');
            
            if (['400', '406', '23505', '23503', 'P0001'].includes(code) || status === 400 || status === 406) {
              console.warn(`Removing permanently failing sync item ${id} to unblock queue`)
              if (id) await removeSyncQueueItem(id)
            }
          } else if (id) {
            await removeSyncQueueItem(id)
          }
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error)
        }
      }

      const now = new Date().toISOString()
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now)
      set({ lastSyncTime: now })

      await get().updatePendingCount()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      set({ isSyncing: false })
    }
  },

  initialize: () => {
    get().updatePendingCount()

    window.addEventListener('online', () => {
      get().setOnline(true)
    })

    window.addEventListener('offline', () => {
      get().setOnline(false)
    })

    if (get().isOnline) {
      get().syncData()
    }
  }
}))