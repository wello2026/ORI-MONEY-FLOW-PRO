import { create } from 'zustand'
import type { Project } from '@/types'
import { supabase } from '@/lib/supabase'

interface ProjectState {
  projects: Project[]
  isLoading: boolean
  error: string | null
  fetchProjects: () => Promise<void>
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ projects: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createProject: async (projectData) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (error) throw error
      set((state) => ({ 
        projects: [data, ...state.projects],
        isLoading: false 
      }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  }
}))
