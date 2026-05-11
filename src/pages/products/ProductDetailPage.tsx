import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Package, RefreshCw, ChevronLeft, Edit3, Trash2, Plus, X, TrendingUp, TrendingDown } from 'lucide-react'
import { useProductStore } from '@/stores/productStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { ProductFormModal } from '@/components/products/ProductFormModal'
import { ComponentFormModal } from '@/components/products/ComponentFormModal'

const typeLabels: Record<string, string> = {
  material: 'مواد', labor: 'عمالة', accessory: 'ملحقات', overhead: 'نسبة تحميل', other: 'أخرى'
}
const typeColors: Record<string, string> = {
  material: 'text-blue-500', labor: 'text-orange-500', accessory: 'text-purple-500', overhead: 'text-cyan-500', other: 'text-muted-foreground'
}
const typeBg: Record<string, string> = {
  material: 'bg-blue-500/10', labor: 'bg-orange-500/10', accessory: 'bg-purple-500/10', overhead: 'bg-cyan-500/10', other: 'bg-muted'
}

function fmt(amount: number, currency = 'USD') {
  const sym: Record<string, string> = { USD: '$', LYD: 'د.ل', TRY: '₺', CNY: '¥', EUR: '€', GBP: '£' }
  return `${sym[currency] || currency}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProduct, components, isLoading, error, fetchProduct, deleteProduct, successMessage } = useProductStore()
  const [showEdit, setShowEdit] = useState(false)
  const [showAddComp, setShowAddComp] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => { if (id) fetchProduct(id) }, [id, fetchProduct])

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('حذف بطاقة التكلفة؟')) return
    const r = await deleteProduct(id)
    if (r.success) navigate('/products')
  }

  if (isLoading && !currentProduct) return <div className="page-container flex items-center justify-center min-h-[60vh]"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>
  if (!currentProduct) return <div className="page-container flex flex-col items-center justify-center min-h-[60vh]"><Package className="w-16 h-16 text-muted-foreground mb-4" /><h3 className="text-lg font-bold">البطاقة غير موجودة</h3><button onClick={() => navigate('/products')} className="mt-4 text-primary text-sm">العودة</button></div>

  const p = currentProduct
  const totalCompCost = components.reduce((s, c) => s + Number(c.quantity) * Number(c.unit_cost), 0)
  const actualMargin = p.total_cost > 0 ? ((p.selling_price - p.total_cost) / p.total_cost * 100) : 0
  const isGoodMargin = actualMargin >= p.target_margin_pct
  const byType = components.reduce((acc, c) => {
    acc[c.component_type] = (acc[c.component_type] || 0) + Number(c.quantity) * Number(c.unit_cost)
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="page-container pb-24 animate-fade-in">
      {error && <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl"><p className="text-sm text-destructive font-bold">{error}</p></div>}
      {successMessage && <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"><p className="text-sm text-emerald-600 font-bold">{successMessage}</p></div>}

      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/products')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><ChevronLeft className="w-5 h-5" /><span className="text-sm font-bold">بطاقات التكلفة</span></button>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)} className="p-2 rounded-xl bg-card/60 border border-white/10 hover:bg-card/80"><Edit3 className="w-4 h-4 text-muted-foreground" /></button>
          <button onClick={handleDelete} className="p-2 rounded-xl bg-card/60 border border-white/10 hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
        </div>
      </div>

      <div className="bg-card/60 border border-white/5 rounded-3xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center"><Package className="w-7 h-7 text-purple-500" /></div>
          <div>
            <h1 className="text-2xl font-black">{p.product_name_ar || p.product_name}</h1>
            <p className="text-muted-foreground font-mono text-sm">{p.card_code} · {p.product_category || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-background/40 rounded-xl p-3 text-center"><p className="text-[10px] text-muted-foreground font-bold mb-1">السعر المعياري</p><p className="text-sm font-black">{fmt(p.total_cost, p.currency_code)}</p></div>
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 text-center"><p className="text-[10px] text-purple-500/60 font-bold mb-1">سعر البيع</p><p className="text-sm font-black text-purple-500">{fmt(p.selling_price, p.currency_code)}</p></div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center"><p className="text-[10px] text-emerald-500/60 font-bold mb-1">هامش مستهدف</p><p className="text-sm font-black text-emerald-500">{p.target_margin_pct}%</p></div>
          <div className={cn('rounded-xl p-3 text-center', isGoodMargin ? 'bg-primary/5 border border-primary/20' : 'bg-red-500/5 border border-red-500/20')}><p className="text-[10px] text-muted-foreground font-bold mb-1">هامش فعلي</p><p className={cn('text-sm font-black', isGoodMargin ? 'text-primary' : 'text-red-500')}>{actualMargin.toFixed(1)}%</p></div>
        </div>

        {Object.keys(byType).length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.entries(byType).map(([type, cost]) => (
              <div key={type} className={cn('rounded-lg p-2 text-center', typeBg[type] || typeBg.other)}>
                <p className="text-[10px] font-bold mb-0.5" style={{ color: 'currentColor' }}>{typeLabels[type] || type}</p>
                <p className={cn('text-sm font-black', typeColors[type] || typeColors.other)}>{fmt(cost, p.currency_code)}</p>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowAddComp(true)} className="w-full py-3 bg-purple-500/5 border border-purple-500/20 rounded-xl text-sm font-bold text-purple-500 hover:bg-purple-500/10 transition-colors">
          <Plus className="w-4 h-4 inline mr-1" /> إضافة مكون
        </button>
      </div>

      <div className="bg-card/60 border border-white/5 rounded-3xl p-5">
        <h2 className="text-lg font-bold text-foreground mb-4">المكونات ({components.length})</h2>
        {components.length === 0 ? <div className="py-8 text-center"><p className="text-sm text-muted-foreground">لا توجد مكونات</p></div> : (
          <div className="space-y-2">
            {components.map(c => (
              <div key={c.id} className="bg-background/40 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-background/60" onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)}>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', typeBg[c.component_type] || typeBg.other)}>
                    <Package className={cn('w-4 h-4', typeColors[c.component_type] || typeColors.other)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{c.component_name_ar || c.component_name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.quantity} × {fmt(c.unit_cost, c.currency_code)}</p>
                  </div>
                  <p className={cn('text-sm font-black', typeColors[c.component_type] || typeColors.other)}>{fmt(Number(c.quantity) * Number(c.unit_cost), c.currency_code)}</p>
                </div>
                {expandedRow === c.id && (
                  <div className="px-4 pb-3 border-t border-white/5 pt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">النوع: </span><span className="font-bold">{typeLabels[c.component_type] || c.component_type}</span></div>
                    <div><span className="text-muted-foreground">المرجع: </span><span className="font-mono font-bold">{c.reference_number || '—'}</span></div>
                  </div>
                )}
              </div>
            ))}
            <div className="border-t border-white/5 pt-3 mt-3 flex justify-between px-3">
              <span className="text-sm font-black">الإجمالي</span>
              <span className="text-sm font-black text-primary">{fmt(totalCompCost, p.currency_code)}</span>
            </div>
          </div>
        )}
      </div>

      {showEdit && id && <ProductFormModal product={p} onClose={() => setShowEdit(false)} onSuccess={() => { setShowEdit(false); fetchProduct(id) }} />}
      {showAddComp && id && <ComponentFormModal costCardId={id} currency={p.currency_code} onClose={() => setShowAddComp(false)} onSuccess={() => { setShowAddComp(false); fetchProduct(id) }} />}
    </div>
  )
}