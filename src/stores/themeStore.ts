import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeMode } from '@/types'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
  initializeTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: {
        mode: 'light',
        system: false
      },

      setMode: (mode) => {
        set({ mode })
        applyTheme(mode.mode)
      },

      toggleTheme: () => {
        const currentMode = get().mode
        const newMode = currentMode.mode === 'light' ? 'dark' : 'light'
        set({ mode: { ...currentMode, mode: newMode } })
        applyTheme(newMode)
      },

      initializeTheme: () => {
        const savedMode = get().mode
        if (savedMode.system) {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          applyTheme(prefersDark ? 'dark' : 'light')
        } else {
          applyTheme(savedMode.mode)
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (get().mode.system) {
            applyTheme(e.matches ? 'dark' : 'light')
          }
        })
      }
    }),
    {
      name: 'theme-storage'
    }
  )
)

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement

  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  root.setAttribute('data-theme', theme)
}

export const useDarkMode = (): boolean => {
  return useThemeStore((state) => state.mode.mode === 'dark')
}