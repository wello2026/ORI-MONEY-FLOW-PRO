import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, AlertCircle, RefreshCw, ChevronRight, Package, TrendingUp, TrendingDown } from 'lucide-react'
import { useProductStore } from '@/stores/productStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { ProductCostSummary } from '@/types'
import { ProductFormModal } from '@/components/products/ProductFormModal'
import { ComponentFormModal } from '@/components/products/ComponentFormModal'

const currencySymbols: Record<string, string> = { USD: '$', LYD: 'د.ل', TRY: '₺', CNY: '¥', EUR: '€', GBP: '£' }
function fmt(amount: number, currency = 'USD') {
  return `${currencySymbols[currency] || currency}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ProductCard({ p, onClick }: { p: ProductCostSummary; onClick: () => void }) {
  const margin = p.actual_margin_pct || 0
  const isGoodMargin = margin >= p.target_margin_pct

  return (
    <div onClick={onClick}
      className="bg-card/60 backdrop-blur border border-white/5 rounded-2xl p-5 cursor-pointer hover:border-primary/30 hover:bg-card/80 transition-all active:scale-[0.98]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm">{p.product_name_ar || p.product_name}</h3>
            <p className="text-[10px] text-muted-foreground font-mono">{p.card_code}</p>
          </div>
        </div>
        <div className={cn('flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg', isGoodMargin ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>
          {isGoodMargin ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {margin.toFixed(1)}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-background/40 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground font-bold mb-0.5">تكلفة الإنتاج</p>
          <p className="text-sm font-black text-foreground">{fmt(p.total_cost, p.currency_code)}</p>
        </div>
        <div className="bg-background/40 rounded-lg p-2">
          <p className="text-[10px] text-muted-foreground font-bold mb-0.5">سعر البيع</p>
          <p className="text-sm font-black text-primary">{fmt(p.selling_price, p.currency_code)}</p>
        </div>
      </div>

      {p.product_category && (
        <div className="text-[10px] text-muted-foreground bg-background/20 rounded-lg px-2 py-1 mb-3">
          {p.product_category} · {p.component_count} مكونات
        </div>
      )}

      <div className="flex justify-end">
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const navigate = useNavigate()
  const { products, isLoading, error, fetchProducts, successMessage } = useProductStore()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showComponent, setShowComponent] = useState<string | null>(null)

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const filtered = products.filter(p =>
    (p.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.product_name_ar || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.card_code || '').toLowerCase().includes(search.toLowerCase())
  )

  const avgMargin = products.length > 0
    ? products.reduce((sum, p) => sum + (p.actual_margin_pct || 0), 0) / products.length
    : 0

  return (
    <div className="page-container pb-24 animate-fade-in">
      {error && <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="text-sm text-destructive font-bold">{error}</div>
      </div>}
      {successMessage && <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <p className="text-sm text-emerald-600 font-bold">{successMessage}</p>
      </div>}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">بطاقات التكلفة</h1>
          <p className="text-muted-foreground text-sm">تكاليف الإنتاج والهوامش</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchProducts()} disabled={isLoading}
            className="p-2 rounded-xl bg-card/60 border border-white/10 hover:bg-card/80 transition-colors">
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> بطاقة جديدة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-4">
          <p className="text-xs text-purple-500/60 font-bold mb-1">عدد البطاقات</p>
          <p className="text-xl font-black text-purple-500">{products.length}</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <p className="text-xs text-primary/60 font-bold mb-1">متوسط الهامش</p>
          <p className={cn('text-xl font-black', avgMargin >= 0 ? 'text-primary' : 'text-red-500')}>{avgMargin.toFixed(1)}%</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="بحث بالكود أو الاسم..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-3 bg-card/60 border border-white/10 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
      </div>

      {filtered.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">لا توجد بطاقات</h3>
          <p className="text-sm text-muted-foreground mb-6">أنشئ بطاقة تكلفة للمنتجات المصنعة</p>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm">
            <Plus className="w-4 h-4" /> بطاقة جديدة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProductCard key={p.id} p={p} onClick={() => navigate(`/products/${p.id}`)} />
          ))}
        </div>
      )}

      {showCreate && <ProductFormModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchProducts() }} />}
    </div>
  )
}