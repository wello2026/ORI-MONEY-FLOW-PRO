import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { BottomNav } from './BottomNav'
import { OfflineIndicator } from './OfflineIndicator'
import { useNotificationStore } from '@/stores/notificationStore'
import { ToastNotifications } from '../ui/ToastNotifications'
import { useEffect } from 'react'

export default function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isOnline = useSyncStore((state) => state.isOnline)

  const subscribe = useNotificationStore((state) => state.subscribeToNotifications)
  const unsubscribe = useNotificationStore((state) => state.unsubscribeFromNotifications)

  useEffect(() => {
    if (isAuthenticated) {
      subscribe()
    }
    return () => unsubscribe()
  }, [isAuthenticated, subscribe, unsubscribe])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <ToastNotifications />
      {!isOnline && <OfflineIndicator />}
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}