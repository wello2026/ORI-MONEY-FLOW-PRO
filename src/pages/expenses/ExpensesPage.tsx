import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, AlertCircle, RefreshCw, Receipt, X, ChevronRight, Filter, CheckCircle, Clock, XCircle, Ban } from 'lucide-react'
import { useExpenseStore } from '@/stores/expenseStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { ExpenseFormModal } from '@/components/expenses/ExpenseFormModal'

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'rent', label: 'إيجار' },
  { value: 'utilities', label: 'مرافق' },
  { value: 'salaries', label: 'رواتب' },
  { value: 'supplies', label: 'مستلزمات' },
  { value: 'equipment', label: 'معدات' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'insurance', label: 'تأمين' },
  { value: 'marketing', label: 'تسويق' },
  { value: 'travel', label: 'سفر' },
  { value: 'training', label: 'تدريب' },
  { value: 'consulting', label: 'استشارات' },
  { value: 'legal', label: 'قانوني' },
  { value: 'licenses', label: 'تراخيص' },
  { value: 'software', label: 'برمجيات' },
  { value: 'fuel', label: 'وقود' },
  { value: 'communication', label: 'اتصالات' },
  { value: 'other', label: 'أخرى' }
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  draft: { label: 'مسودة', color: 'text-muted-foreground', icon: File, bg: 'bg-muted' },
  pending: { label: 'معلق', color: 'text-amber-500', icon: Clock, bg: 'bg-amber-500/10' },
  approved: { label: 'معتمد', color: 'text-emerald-500', icon: CheckCircle, bg: 'bg-emerald-500/10' },
  rejected: { label: 'مرفوض', color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10' },
  paid: { label: 'مدفوع', color: 'text-primary', icon: CheckCircle, bg: 'bg-primary/10' },
  cancelled: { label: 'ملغي', color: 'text-muted-foreground', icon: Ban, bg: 'bg-muted' }
}

const currencySymbols: Record<string, string> = { USD: '$', LYD: 'د.ل', TRY: '₺', CNY: '¥', EUR: '€', GBP: '£' }
function fmt(amount: number, currency = 'USD') {
  return `${currencySymbols[currency] || currency}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getCategoryLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label || cat
}

export default function ExpensesPage() {
  const navigate = useNavigate()
  const { expenses, summary, isLoading, error, fetchExpenses, fetchSummary, successMessage } = useExpenseStore()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  useEffect(() => {
    fetchExpenses()
    fetchSummary()
  }, [fetchExpenses, fetchSummary])

  const filtered = expenses.filter(e =>
    !search ||
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.expense_number.toLowerCase().includes(search.toLowerCase()) ||
    e.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.reference_number?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredByCat = filterCat ? filtered.filter(e => e.category === filterCat) : filtered
  const filteredAll = filterStatus ? filteredByCat.filter(e => e.status === filterStatus) : filteredByCat

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
          <h1 className="text-3xl font-bold text-foreground">المصروفات</h1>
          <p className="text-muted-foreground text-sm">سجل المصروفات والاعتمادات</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { fetchExpenses({ search, category: filterCat, status: filterStatus }); fetchSummary() }} disabled={isLoading}
            className="p-2 rounded-xl bg-card/60 border border-white/10 hover:bg-card/80 transition-colors">
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> مصروف جديد
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-card/60 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground font-bold mb-1">الإجمالي</p>
            <p className="text-xl font-black text-foreground">{fmt(summary.total_amount)}</p>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
            <p className="text-xs text-emerald-500/60 font-bold mb-1">معتمد</p>
            <p className="text-xl font-black text-emerald-500">{fmt(summary.approved_amount)}</p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-xs text-amber-500/60 font-bold mb-1">معلق</p>
            <p className="text-xl font-black text-amber-500">{fmt(summary.pending_amount)}</p>
          </div>
          <div className="bg-card/60 border border-white/5 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground font-bold mb-1">المرفوض</p>
            <p className="text-xl font-black text-red-500">{fmt(summary.rejected_amount)}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4 overflow-x-auto no-scrollbar">
        <button onClick={() => setFilterStatus('')} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors', !filterStatus ? 'bg-primary text-primary-foreground' : 'bg-card/60 border border-white/10 text-muted-foreground')}>الكل</button>
        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'draft' && k !== 'cancelled').map(([k, v]) => (
          <button key={k} onClick={() => setFilterStatus(k)} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors', filterStatus === k ? 'bg-primary text-primary-foreground' : 'bg-card/60 border border-white/10 text-muted-foreground')}>{v.label}</button>
        ))}
      </div>

      <div className="flex gap-3 mb-4 overflow-x-auto no-scrollbar">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 bg-card/60 border border-white/10 rounded-xl text-xs font-bold text-muted-foreground focus:outline-none">
          <option value="">كل الفئات</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="relative mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="بحث بالعنوان أو رقم المصروف..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-3 bg-card/60 border border-white/10 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
      </div>

      {filteredAll.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">لا توجد مصروفات</h3>
          <p className="text-sm text-muted-foreground mb-6">سجل مصروفاتك هنا</p>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm">
            <Plus className="w-4 h-4" /> مصروف جديد
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAll.map(e => {
            const s = STATUS_CONFIG[e.status] || STATUS_CONFIG.draft
            return (
              <div key={e.id} onClick={() => navigate(`/expenses/${e.id}`)}
                className="bg-card/60 backdrop-blur border border-white/5 rounded-2xl p-4 cursor-pointer hover:border-primary/30 hover:bg-card/80 transition-all active:scale-[0.99]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.bg)}>
                      <Receipt className={cn('w-5 h-5', s.color)} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{e.title}</h3>
                      <p className="text-[10px] text-muted-foreground font-mono">{e.expense_number} · {getCategoryLabel(e.category)}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-foreground">{fmt(e.amount, e.currency_code)}</p>
                    <div className={cn('flex items-center gap-1 mt-0.5', s.color)}>
                      <s.icon className="w-3 h-3" />
                      <span className="text-[10px] font-bold">{s.label}</span>
                    </div>
                  </div>
                </div>
                {e.project_name && (
                  <div className="text-[10px] text-muted-foreground bg-background/40 rounded-lg px-2 py-1 mb-2">
                    المشروع: {e.project_name}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{new Date(e.expense_date).toLocaleDateString('ar-LY')}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && <ExpenseFormModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchExpenses(); fetchSummary() }} />}
    </div>
  )
}