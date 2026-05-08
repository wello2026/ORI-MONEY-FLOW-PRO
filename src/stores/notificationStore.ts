import { create } from 'zustand'
import type { Notification } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { db } from '@/lib/db'
import { useAuthStore } from './authStore'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  createNotification: (data: Omit<Notification, 'id' | 'created_at'>) => Promise<void>
  getUnreadNotifications: () => Notification[]
  subscribeToNotifications: () => void
  unsubscribeFromNotifications: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
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

          set({
            notifications,
            unreadCount: unread,
            isLoading: false
          })

          const localNotes = notifications.map((n) => ({
            ...n,
            synced: true
          }))
          await db.notifications.bulkPut(localNotes)
        }
      } else {
        const localNotes = await db.notifications
          .where('user_id')
          .equals(user.id)
          .reverse()
          .sortBy('created_at')

        const unread = localNotes.filter((n) => !n.is_read).length

        set({
          notifications: localNotes as Notification[],
          unreadCount: unread,
          isLoading: false
        })
      }
    } catch (error) {
      const localNotes = await db.notifications.toArray()
      const unread = localNotes.filter((n) => !n.is_read).length

      set({
        notifications: localNotes as Notification[],
        unreadCount: unread,
        isLoading: false
      })
    }
  },

  markAsRead: async (id: string) => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      }

      await db.notifications.update(id, { is_read: true })

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
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
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
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
          unreadCount: notification && !notification.is_read
            ? state.unreadCount - 1
            : state.unreadCount
        }
      })
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  },

  createNotification: async (data) => {
    const newNotification = {
      ...data,
      created_at: new Date().toISOString()
    }

    try {
      if (isSupabaseConfigured()) {
        const { data: created } = await supabase
          .from('notifications')
          .insert(newNotification)
          .select()
          .single()

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

    // التنظيف المسبق لأي اشتراك قديم
    get().unsubscribeFromNotifications()

    const channel = supabase
      .channel(`public:notifications:user_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNote = payload.new as Notification
          console.log('New real-time notification:', newNote)
          
          // تحديث الحالة
          set((state) => ({
            notifications: [newNote, ...state.notifications],
            unreadCount: state.unreadCount + 1
          }))

          // حفظ في Dexie
          db.notifications.put({ ...newNote, synced: true })
          
          // تشغيل صوت أو اهتزاز إذا أمكن
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100])
          }
        }
      )
      .subscribe()

    // تخزين القناة في مكان ما ليتمكن الـ store من الوصول إليها للإلغاء
    ;(window as any)._notificationChannel = channel
  },

  unsubscribeFromNotifications: () => {
    if ((window as any)._notificationChannel) {
      supabase.removeChannel((window as any)._notificationChannel)
      delete (window as any)._notificationChannel
    }
  }
}))