import { useState } from 'react'
import { X, Package } from 'lucide-react'
import { useProductStore } from '@/stores/productStore'
import type { ComponentType } from '@/types'

interface Props {
  costCardId: string
  currency: string
  onClose: () => void
  onSuccess: () => void
}

const COMP_TYPES: { value: ComponentType; label: string }[] = [
  { value: 'material', label: 'مواد' }, { value: 'labor', label: 'عمالة' },
  { value: 'accessory', label: 'ملحقات' }, { value: 'overhead', label: 'نسبة تحميل' },
  { value: 'other', label: 'أخرى' }
]

export function ComponentFormModal({ costCardId, currency, onClose, onSuccess }: Props) {
  const { addComponent, isLoading, error, clearMessages } = useProductStore()
  const [component_type, setType] = useState<ComponentType>('material')
  const [component_name, setName] = useState('')
  const [component_name_ar, setNameAr] = useState('')
  const [quantity, setQty] = useState('1')
  const [unit_cost, setCost] = useState('')
  const [reference_number, setRef] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    clearMessages()
    if (!component_name.trim()) { setFieldError('اسم المكون مطلوب'); return }
    const q = parseFloat(quantity) || 1
    const u = parseFloat(unit_cost) || 0
    const r = await addComponent({ cost_card_id: costCardId, component_type, component_name, component_name_ar: component_name_ar || undefined, quantity: q, unit_cost: u, reference_number: reference_number || undefined })
    if (r.success) onSuccess()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl">
        <div className="bg-card/90 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center"><Package className="w-5 h-5 text-purple-500" /></div>
            <h2 className="text-base font-black">إضافة مكون</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-background/40"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        {(error || fieldError) && <div className="mx-5 mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl"><p className="text-sm text-destructive font-bold">{fieldError || error}</p></div>}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">نوع المكون *</label>
            <select value={component_type} onChange={e => setType(e.target.value as ComponentType)} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40">
              {COMP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">الكمية *</label><input type="number" step="0.01" min="0" value={quantity} onChange={e => setQty(e.target.value)} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">تكلفة الوحدة *</label><input type="number" step="0.01" min="0" value={unit_cost} onChange={e => setCost(e.target.value)} placeholder="0.00" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">اسم المكون (EN) *</label>
            <input value={component_name} onChange={e => setName(e.target.value)} placeholder="Steel Sheet 2mm" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">اسم المكون (AR)</label>
            <input value={component_name_ar} onChange={e => setNameAr(e.target.value)} placeholder="صفائح حديد 2 مم" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">رقم المرجع</label>
            <input value={reference_number} onChange={e => setRef(e.target.value)} placeholder="REF-001" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" />
          </div>
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-center">
            <p className="text-sm font-black text-purple-500">الإجمالي: {((parseFloat(quantity) || 0) * (parseFloat(unit_cost) || 0)).toFixed(2)} {currency}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-background/60 border border-white/10 rounded-xl text-sm font-bold hover:bg-background/80">إلغاء</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 disabled:opacity-50">{isLoading ? 'جارٍ...' : 'إضافة المكون'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
