import { create } from 'zustand'
import type { ProductCostCard, ProductCostComponent, ProductCostSummary } from '@/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { v4 as uuidv4 } from 'uuid'

interface ProductCostCardDetail extends ProductCostCard {
  component_id: string | null
  component_type: string | null
  component_name: string | null
  component_name_ar: string | null
  quantity: number | null
  unit_cost: number | null
  total_component_cost: number | null
  supplier_name: string | null
  reference_number: string | null
}

interface ProductState {
  products: ProductCostSummary[]
  currentProduct: ProductCostCard | null
  components: ProductCostComponent[]
  isLoading: boolean
  error: string | null
  successMessage: string | null

  fetchProducts: () => Promise<void>
  fetchProduct: (id: string) => Promise<void>
  createProduct: (data: Omit<ProductCostCard, 'id' | 'created_at' | 'updated_at' | 'last_updated' | 'created_by' | 'company_id' | 'total_cost'>) => Promise<{ success: boolean; error?: string; product_id?: string }>
  updateProduct: (id: string, updates: Partial<ProductCostCard>) => Promise<{ success: boolean; error?: string }>
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>

  fetchComponents: (cardId: string) => Promise<void>
  addComponent: (data: {
    cost_card_id: string
    component_type: string
    component_name: string
    component_name_ar?: string
    quantity?: number
    unit_cost?: number
    supplier_id?: string
    reference_number?: string
    notes?: string
  }) => Promise<{ success: boolean; error?: string }>
  removeComponent: (componentId: string) => Promise<{ success: boolean; error?: string }>

  updateComponent: (id: string, updates: Partial<ProductCostComponent>) => Promise<{ success: boolean; error?: string }>

  clearMessages: () => void
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  currentProduct: null,
  components: [],
  isLoading: false,
  error: null,
  successMessage: null,

  clearMessages: () => set({ error: null, successMessage: null }),

  fetchProducts: async () => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.rpc('get_product_cost_cards')
      if (error) throw error
      set({ products: data || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchProduct: async (id: string) => {
    if (!isSupabaseConfigured()) return
    set({ isLoading: true, error: null })
    try {
      const { data: card, error } = await supabase
        .from('product_cost_cards')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error

      const { data: comps } = await supabase
        .from('product_cost_components')
        .select('*')
        .eq('cost_card_id', id)
        .order('component_type')

      set({ currentProduct: card, components: comps || [], isLoading: false })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  createProduct: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    const user = useAuthStore.getState().user
    const currentCompany = useAuthStore.getState().currentCompany
    if (!currentCompany) return { success: false, error: 'لا توجد شركة محددة' }
    set({ isLoading: true, error: null })

    try {
      const id = uuidv4()
      const { error } = await supabase.from('product_cost_cards').insert({
        id,
        company_id: currentCompany.id,
        card_code: data.card_code || `CC-${Date.now()}`,
        product_name: data.product_name,
        product_name_ar: data.product_name_ar,
        product_category: data.product_category,
        unit_of_measure: data.unit_of_measure || 'unit',
        description: data.description,
        material_cost: data.material_cost || 0,
        labor_cost: data.labor_cost || 0,
        accessory_cost: data.accessory_cost || 0,
        overhead_cost: data.overhead_cost || 0,
        total_cost: data.material_cost + data.labor_cost + data.accessory_cost + data.overhead_cost,
        selling_price: data.selling_price || 0,
        target_margin_pct: data.target_margin_pct || 20,
        currency_code: data.currency_code || currentCompany.default_currency || 'USD',
        is_active: true,
        created_by: user?.id
      })
      if (error) {
        if (error.code === '23505') return { success: false, error: 'كود البطاقة مستخدم من قبل' }
        throw error
      }
      set({ isLoading: false, successMessage: 'تم إنشاء بطاقة التكلفة بنجاح' })
      return { success: true, product_id: id }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  updateProduct: async (id, updates) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('product_cost_cards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      // Recalculate total
      const { data: comps } = await supabase.from('product_cost_components').select('quantity, unit_cost').eq('cost_card_id', id)
      if (comps) {
        const total = comps.reduce((sum, c) => sum + (Number(c.quantity) * Number(c.unit_cost)), 0)
        await supabase.from('product_cost_cards').update({ total_cost: total, updated_at: new Date().toISOString() }).eq('id', id)
      }
      set({ isLoading: false, successMessage: 'تم تحديث البطاقة بنجاح' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  deleteProduct: async (id) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.from('product_cost_cards').update({ is_active: false }).eq('id', id)
      if (error) throw error
      set({ isLoading: false, successMessage: 'تم حذف البطاقة' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  fetchComponents: async (cardId) => {
    if (!isSupabaseConfigured()) return
    try {
      const { data, error } = await supabase
        .from('product_cost_components')
        .select('*')
        .eq('cost_card_id', cardId)
        .order('component_type')
      if (error) throw error
      set({ components: data || [] })
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  addComponent: async (data) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    const user = useAuthStore.getState().user
    const currentCompany = useAuthStore.getState().currentCompany
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.from('product_cost_components').insert({
        id: uuidv4(),
        company_id: currentCompany?.id,
        cost_card_id: data.cost_card_id,
        component_type: data.component_type,
        component_name: data.component_name,
        component_name_ar: data.component_name_ar,
        quantity: data.quantity || 1,
        unit_cost: data.unit_cost || 0,
        supplier_id: data.supplier_id || null,
        reference_number: data.reference_number || null,
        notes: data.notes || null,
        created_by: user?.id
      })
      if (error) throw error
      await get().fetchComponents(data.cost_card_id)
      await get().fetchProduct(data.cost_card_id)
      set({ isLoading: false, successMessage: 'تم إضافة المكون بنجاح' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  removeComponent: async (componentId) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.from('product_cost_components').delete().eq('id', componentId)
      if (error) throw error
      set((state) => ({ components: state.components.filter(c => c.id !== componentId), isLoading: false, successMessage: 'تم حذف المكون' }))
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  },

  updateComponent: async (id, updates) => {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase غير مُعد' }
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.from('product_cost_components').update(updates).eq('id', id)
      if (error) throw error
      set({ isLoading: false, successMessage: 'تم تحديث المكون بنجاح' })
      return { success: true }
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
      return { success: false, error: err.message }
    }
  }
}))