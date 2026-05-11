import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './Router'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { OfflineBanner } from '@/components/ui/OfflineBanner'

export default function App() {
  const initializeTheme = useThemeStore((state) => state.initializeTheme)
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const initializeSync = useSyncStore((state) => state.initialize)
  const isOnline = useSyncStore((state) => state.isOnline)
  const pendingCount = useSyncStore((state) => state.pendingCount)

  useEffect(() => {
    initializeTheme()
    checkAuth()
    initializeSync()
  }, [initializeTheme, checkAuth, initializeSync])

  return (
    <ErrorBoundary>
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}