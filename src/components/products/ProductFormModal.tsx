import { useState } from 'react'
import { X } from 'lucide-react'
import { useProductStore } from '@/stores/productStore'
import { useAuthStore } from '@/stores/authStore'
import type { ProductCostCard } from '@/types'

interface Props {
  product?: ProductCostCard
  onClose: () => void
  onSuccess: () => void
}

const CURRENCIES = ['USD', 'LYD', 'TRY', 'CNY', 'EUR', 'GBP']
const CATEGORIES = ['معدات', 'مواد بناء', 'أغذية', 'ملابس', 'إلكترونيات', 'أثاث', 'أخرى']

export function ProductFormModal({ product, onClose, onSuccess }: Props) {
  const { createProduct, updateProduct, isLoading, error, clearMessages } = useProductStore()
  const currentCompany = useAuthStore((s) => s.currentCompany)

  const [form, setForm] = useState({
    card_code: product?.card_code || '',
    product_name: product?.product_name || '',
    product_name_ar: product?.product_name_ar || '',
    product_category: product?.product_category || '',
    unit_of_measure: product?.unit_of_measure || 'unit',
    currency_code: product?.currency_code || currentCompany?.default_currency || 'USD',
    material_cost: product?.material_cost || 0,
    labor_cost: product?.labor_cost || 0,
    accessory_cost: product?.accessory_cost || 0,
    overhead_cost: product?.overhead_cost || 0,
    selling_price: product?.selling_price || 0,
    target_margin_pct: product?.target_margin_pct || 20,
    description: product?.description || ''
  })
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    clearMessages()
    if (!form.product_name.trim()) { setFieldError('اسم المنتج مطلوب'); return }
    if (!form.card_code.trim()) { setFieldError('كود البطاقة مطلوب'); return }

    if (product) {
      const r = await updateProduct(product.id, form as any)
      if (r.success) onSuccess()
    } else {
      const r = await createProduct(form as any)
      if (r.success) onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card/90 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-black">{product ? 'تعديل بطاقة التكلفة' : 'بطاقة تكلفة جديدة'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-background/40"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        {(error || fieldError) && <div className="mx-5 mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl"><p className="text-sm text-destructive font-bold">{fieldError || error}</p></div>}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">كود البطاقة *</label><input value={form.card_code} onChange={e => setForm({ ...form, card_code: e.target.value })} placeholder="CC-001" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">العملة</label><select value={form.currency_code} onChange={e => setForm({ ...form, currency_code: e.target.value })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40">{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div><label className="block text-xs font-bold text-muted-foreground mb-1">اسم المنتج (EN) *</label><input value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} placeholder="Steel Door Type-A" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
          <div><label className="block text-xs font-bold text-muted-foreground mb-1">اسم المنتج (AR)</label><input value={form.product_name_ar} onChange={e => setForm({ ...form, product_name_ar: e.target.value })} placeholder="باب حديد نوع أ" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">الفئة</label><select value={form.product_category} onChange={e => setForm({ ...form, product_category: e.target.value })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40"><option value="">—</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">الوحدة</label><input value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })} placeholder="وحدة" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">تكلفة المواد</label><input type="number" step="0.01" value={form.material_cost} onChange={e => setForm({ ...form, material_cost: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">تكلفة العمالة</label><input type="number" step="0.01" value={form.labor_cost} onChange={e => setForm({ ...form, labor_cost: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">تكلفة الملحقات</label><input type="number" step="0.01" value={form.accessory_cost} onChange={e => setForm({ ...form, accessory_cost: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">النسبة المحملة</label><input type="number" step="0.01" value={form.overhead_cost} onChange={e => setForm({ ...form, overhead_cost: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">سعر البيع</label><input type="number" step="0.01" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
            <div><label className="block text-xs font-bold text-muted-foreground mb-1">هامش مستهدف %</label><input type="number" step="0.1" value={form.target_margin_pct} onChange={e => setForm({ ...form, target_margin_pct: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" /></div>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-bold mb-1">التكلفة الإجمالية</p>
            <p className="text-2xl font-black text-primary">{(form.material_cost + form.labor_cost + form.accessory_cost + form.overhead_cost).toFixed(2)} {form.currency_code}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-background/60 border border-white/10 rounded-xl text-sm font-bold hover:bg-background/80">إلغاء</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50">{isLoading ? 'جارٍ...' : product ? 'تحديث' : 'إنشاء'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
