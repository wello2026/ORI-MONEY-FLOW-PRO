import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './Router'
import { useThemeStore } from '@/stores/themeStore'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'

export default function App() {
  const initializeTheme = useThemeStore((state) => state.initializeTheme)
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const initializeSync = useSyncStore((state) => state.initialize)

  useEffect(() => {
    initializeTheme()
    checkAuth()
    initializeSync()
  }, [initializeTheme, checkAuth, initializeSync])

  return <RouterProvider router={router} />
}