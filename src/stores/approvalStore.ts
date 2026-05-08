import { create } from 'zustand'
import type { Approval, ApprovalStatus, ApprovalEntityType } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { db } from '@/lib/db'
import { useAuthStore } from './authStore'

interface ApprovalState {
  approvals: Approval[]
  currentApproval: Approval | null
  isLoading: boolean
  error: string | null
  fetchApprovals: (filter?: { status?: ApprovalStatus; entity_type?: ApprovalEntityType }) => Promise<void>
  fetchApproval: (id: string) => Promise<void>
  approveRequest: (entityType: ApprovalEntityType, entityId: string, notes?: string) => Promise<void>
  rejectRequest: (entityType: ApprovalEntityType, entityId: string, notes?: string) => Promise<void>
  getPendingApprovals: () => Approval[]
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  approvals: [],
  currentApproval: null,
  isLoading: false,
  error: null,

  fetchApprovals: async (filter) => {
    set({ isLoading: true, error: null })
    try {
      if (isSupabaseConfigured()) {
        let query = supabase
          .from('approvals')
          .select('*, requester:profiles!requested_by(*), approver:profiles!approved_by(*)')
          .order('created_at', { ascending: false })

        if (filter?.status) {
          query = query.eq('status', filter.status)
        }
        if (filter?.entity_type) {
          query = query.eq('entity_type', filter.entity_type)
        }

        const { data, error } = await query

        if (error) throw error
        if (data) {
          set({ approvals: data as Approval[], isLoading: false })
        }
      } else {
        let localApprovals = await db.approvals?.toArray() || []
        
        if (filter?.status) {
          localApprovals = localApprovals.filter((a: Approval) => a.status === filter.status)
        }
        
        set({ approvals: localApprovals as Approval[], isLoading: false })
      }
    } catch (error) {
      set({ approvals: [], isLoading: false })
    }
  },

  fetchApproval: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('approvals')
          .select('*, requester:profiles!requested_by(*), approver:profiles!approved_by(*)')
          .eq('id', id)
          .single()

        if (error) throw error
        set({ currentApproval: data as Approval, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      set({ isLoading: false })
    }
  },

  approveRequest: async (entityType, entityId, notes) => {
    const user = useAuthStore.getState().user
    if (!user) return

    try {
      if (isSupabaseConfigured()) {
        const { data: existingApproval } = await supabase
          .from('approvals')
          .select('*')
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .eq('status', 'pending')
          .single()

        if (existingApproval) {
          const { error: updateError } = await supabase
            .from('approvals')
            .update({
              status: 'approved' as ApprovalStatus,
              approved_by: user.id,
              notes,
              decided_at: new Date().toISOString()
            })
            .eq('id', existingApproval.id)

          if (updateError) throw updateError
        }

        if (entityType === 'transaction') {
          await supabase
            .from('transactions')
            .update({ status: 'approved' as const, approved_by: user.id })
            .eq('id', entityId)
        }
      }

      set((state) => ({
        approvals: state.approvals.map((a) =>
          a.entity_type === entityType && a.entity_id === entityId
            ? { ...a, status: 'approved' as ApprovalStatus, approved_by: user.id, decided_at: new Date().toISOString() }
            : a
        )
      }))
    } catch (error) {
      console.error('Failed to approve:', error)
      set({ error: 'فشل في الموافقة' })
    }
  },

  rejectRequest: async (entityType, entityId, notes) => {
    const user = useAuthStore.getState().user
    if (!user) return

    try {
      if (isSupabaseConfigured()) {
        const { data: existingApproval } = await supabase
          .from('approvals')
          .select('*')
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .eq('status', 'pending')
          .single()

        if (existingApproval) {
          const { error: updateError } = await supabase
            .from('approvals')
            .update({
              status: 'rejected' as ApprovalStatus,
              approved_by: user.id,
              notes,
              decided_at: new Date().toISOString()
            })
            .eq('id', existingApproval.id)

          if (updateError) throw updateError
        }

        if (entityType === 'transaction') {
          await supabase
            .from('transactions')
            .update({ status: 'rejected' as const, approved_by: user.id })
            .eq('id', entityId)
        }
      }

      set((state) => ({
        approvals: state.approvals.map((a) =>
          a.entity_type === entityType && a.entity_id === entityId
            ? { ...a, status: 'rejected' as ApprovalStatus, approved_by: user.id, decided_at: new Date().toISOString() }
            : a
        )
      }))
    } catch (error) {
      console.error('Failed to reject:', error)
      set({ error: 'فشل في الرفض' })
    }
  },

  getPendingApprovals: () => {
    return get().approvals.filter((a) => a.status === 'pending')
  }
}))