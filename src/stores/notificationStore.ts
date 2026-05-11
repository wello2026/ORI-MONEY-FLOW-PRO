import { create } from 'zustand'
import type { Notification, NotificationPreference, AlertLog } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { db } from '@/lib/db'
import { useAuthStore } from './authStore'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  alertLogs: AlertLog[]
  preferences: NotificationPreference | null
  isLoading: boolean
  error: string | null
  fetchNotifications: () => Promise<void>
  fetchAlertLogs: (severity?: string) => Promise<void>
  fetchPreferences: () => Promise<void>
  updatePreferences: (prefs: Partial<NotificationPreference>) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  markAlertRead: (id: string) => Promise<void>
  dismissAlert: (id: string, action?: string) => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  createNotification: (data: Omit<Notification, 'id' | 'created_at'>) => Promise<void>
  getUnreadNotifications: () => Notification[]
  subscribeToNotifications: () => void
  unsubscribeFromNotifications: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  alertLogs: [],
  preferences: null,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    set({ isLoading: true, error: null })
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error

        if (data) {
          const notifications = data as Notification[]
          const unread = notifications.filter((n) => !n.is_read).length

          set({ notifications, unreadCount: unread, isLoading: false })

          const localNotes = notifications.map((n) => ({ ...n, synced: true }))
          await db.notifications.bulkPut(localNotes)
        }
      } else {
        const localNotes = await db.notifications.where('user_id').equals(user.id).reverse().sortBy('created_at')
        const unread = localNotes.filter((n) => !n.is_read).length
        set({ notifications: localNotes as Notification[], unreadCount: unread, isLoading: false })
      }
    } catch (error) {
      const localNotes = await db.notifications.toArray()
      const unread = localNotes.filter((n) => !n.is_read).length
      set({ notifications: localNotes as Notification[], unreadCount: unread, isLoading: false })
    }
  },

  fetchAlertLogs: async (severity) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.rpc('get_alert_logs', {
        p_limit: 30,
        p_offset: 0,
        p_severity: severity || null,
        p_is_read: null
      })
      if (error) throw error
      set({ alertLogs: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchPreferences: async () => {
    if (!isSupabaseConfigured()) return
    try {
      const { data, error } = await supabase.rpc('get_notification_preferences')
      if (error) throw error
      set({ preferences: data || null })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  updatePreferences: async (prefs) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.rpc('upsert_notification_preferences', {
        p_push_approval: prefs.push_approval ?? true,
        p_push_transaction: prefs.push_transaction ?? true,
        p_push_alert: prefs.push_alert ?? true,
        p_push_info: prefs.push_info ?? true,
        p_push_summary: prefs.push_summary ?? false,
        p_treasury_low_balance_alert: prefs.treasury_low_balance_alert ?? true,
        p_treasury_low_balance_threshold: prefs.treasury_low_balance_threshold ?? 1000,
        p_partner_outstanding_alert: prefs.partner_outstanding_alert ?? true,
        p_partner_outstanding_threshold: prefs.partner_outstanding_threshold ?? 5000,
        p_supplier_overdue_alert: prefs.supplier_overdue_alert ?? true,
        p_supplier_overdue_days: prefs.supplier_overdue_days ?? 7,
        p_project_budget_alert: prefs.project_budget_alert ?? true,
        p_project_budget_threshold_pct: prefs.project_budget_threshold_pct ?? 80,
        p_expense_approval_alert: prefs.expense_approval_alert ?? true
      })
      if (error) throw error
      await get().fetchPreferences()
      set({ isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  markAsRead: async (id: string) => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      }
      await db.notifications.update(id, { is_read: true })

      set((state) => ({
        notifications: state.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  },

  markAllAsRead: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    try {
      if (isSupabaseConfigured()) {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
      }
      await db.notifications.where('user_id').equals(user.id).modify({ is_read: true })

      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0
      }))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  },

  markAlertRead: async (id: string) => {
    if (!isSupabaseConfigured()) return
    try {
      await supabase.rpc('mark_alert_read', { p_alert_id: id })
      set((state) => ({
        alertLogs: state.alertLogs.map((a) => a.id === id ? { ...a, is_read: true } : a)
      }))
    } catch (err: any) {
      console.error('Failed to mark alert read:', err)
    }
  },

  dismissAlert: async (id: string, action?: string) => {
    if (!isSupabaseConfigured()) return
    try {
      await supabase.rpc('dismiss_alert', { p_alert_id: id, p_action_taken: action || null })
      set((state) => ({
        alertLogs: state.alertLogs.filter((a) => a.id !== id)
      }))
    } catch (err: any) {
      console.error('Failed to dismiss alert:', err)
    }
  },

  deleteNotification: async (id: string) => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.from('notifications').delete().eq('id', id)
      }
      await db.notifications.delete(id)

      set((state) => {
        const notification = state.notifications.find((n) => n.id === id)
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: notification && !notification.is_read ? state.unreadCount - 1 : state.unreadCount
        }
      })
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  },

  createNotification: async (data) => {
    const newNotification = { ...data, created_at: new Date().toISOString() }

    try {
      if (isSupabaseConfigured()) {
        const { data: created } = await supabase.from('notifications').insert(newNotification).select().single()
        if (created) {
          const notification = created as Notification
          set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: state.unreadCount + 1
          }))
        }
      }
    } catch (error) {
      console.error('Failed to create notification:', error)
    }
  },

  getUnreadNotifications: () => {
    return get().notifications.filter((n) => !n.is_read)
  },

  subscribeToNotifications: () => {
    const user = useAuthStore.getState().user
    if (!user || !isSupabaseConfigured()) return

    get().unsubscribeFromNotifications()

    const channel = supabase
      .channel(`public:notifications:user_id=eq.${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNote = payload.new as Notification
        set((state) => ({
          notifications: [newNote, ...state.notifications],
          unreadCount: state.unreadCount + 1
        }))
        db.notifications.put({ ...newNote, synced: true })
        if ('vibrate' in navigator) { navigator.vibrate([100, 50, 100]) }
      })
      .subscribe()

    ;(window as any)._notificationChannel = channel
  },

  unsubscribeFromNotifications: () => {
    if ((window as any)._notificationChannel) {
      supabase.removeChannel((window as any)._notificationChannel)
      delete (window as any)._notificationChannel
    }
  }
}))