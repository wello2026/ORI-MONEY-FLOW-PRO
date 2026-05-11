import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, AlertCircle, RefreshCw, ChevronRight,
  Truck, TrendingUp, AlertTriangle, Clock
} from 'lucide-react'
import { useSupplierStore } from '@/stores/supplierStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { SupplierSummary } from '@/types'
import { SupplierFormModal } from '@/components/suppliers/SupplierFormModal'

const currencySymbols: Record<string, string> = {
  USD: '$', LYD: 'د.ل', TRY: '₺', CNY: '¥', EUR: '€', GBP: '£'
}
function formatCurrency(amount: number, currency: string = 'USD'): string {
  const sym = currencySymbols[currency] || currency
  return `${sym}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function SupplierCard({ supplier, onClick }: { supplier: SupplierSummary; onClick: () => void }) {
  const statusColor = supplier.overdue_amount > 0 ? 'text-red-500' : 'text-amber-500'

  return (
    <div
      onClick={onClick}
      className="bg-card/60 backdrop-blur border border-white/5 rounded-2xl p-5 cursor-pointer
        hover:border-primary/30 hover:bg-card/80 transition-all duration-300 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{supplier.supplier_name_ar || supplier.supplier_name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{supplier.supplier_code}</p>
          </div>
        </div>
        {supplier.overdue_amount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black bg-red-500/10 text-red-500">
            <AlertTriangle className="w-3 h-3" />
            متأخر
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-1">المبلغ المستحق</p>
        <p className="text-2xl font-black text-amber-500">{formatCurrency(supplier.total_due, supplier.currency_code)}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-background/40 rounded-xl p-2 text-center">
          <p className="text-[10px] text-muted-foreground font-bold mb-0.5">إجمالي</p>
          <p className="text-xs font-black">{formatCurrency(supplier.total_invoiced, supplier.currency_code)}</p>
        </div>
        <div className="bg-background/40 rounded-xl p-2 text-center">
          <p className="text-[10px] text-muted-foreground font-bold mb-0.5">المدفوع</p>
          <p className="text-xs font-black text-emerald-500">{formatCurrency(supplier.total_paid, supplier.currency_code)}</p>
        </div>
        <div className="bg-background/40 rounded-xl p-2 text-center">
          <p className="text-[10px] text-muted-foreground font-bold mb-0.5">الفواتير</p>
          <p className="text-xs font-black">{supplier.invoices_count}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>آجال {supplier.payment_terms} يوم</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{supplier.country || '—'}</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
}

export default function SuppliersPage() {
  const navigate = useNavigate()
  const { summary, isLoading, error, fetchSummary, successMessage, clearMessages } = useSupplierStore()
  const currentCompany = useAuthStore((s) => s.currentCompany)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => { fetchSummary() }, [fetchSummary])

  const filtered = summary.filter(s => {
    const match = (s.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.supplier_name_ar || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.supplier_code || '').toLowerCase().includes(searchTerm.toLowerCase())
    return match
  })

  const totalDue = filtered.reduce((sum, s) => sum + Number(s.total_due), 0)
  const totalOverdue = filtered.reduce((sum, s) => sum + Number(s.overdue_amount), 0)

  return (
    <div className="page-container pb-24 animate-fade-in">
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm text-destructive font-bold">{error}</div>
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <p className="text-sm text-emerald-600 font-bold">{successMessage}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الموردين</h1>
          <p className="text-muted-foreground text-sm">
            {currentCompany?.company_name_ar || currentCompany?.company_name || 'إدارة الموردين'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchSummary()} disabled={isLoading}
            className="p-2 rounded-xl bg-card/60 border border-white/10 hover:bg-card/80 transition-colors">
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> مورد جديد
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
          <p className="text-xs text-amber-500/60 font-bold mb-1">إجمالي المستحق</p>
          <p className="text-xl font-black text-amber-500">{formatCurrency(totalDue, 'USD')}</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
          <p className="text-xs text-red-500/60 font-bold mb-1">المتأخر</p>
          <p className="text-xl font-black text-red-500">{formatCurrency(totalOverdue, 'USD')}</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="بحث بالكود أو الاسم..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-10 pl-4 py-3 bg-card/60 border border-white/10 rounded-xl text-sm
            placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
      </div>

      {filtered.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">لا يوجد موردين</h3>
          <p className="text-sm text-muted-foreground mb-6">ابدأ بإضافة أول مورد</p>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm">
            <Plus className="w-4 h-4" /> إضافة مورد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <SupplierCard key={s.id} supplier={s} onClick={() => navigate(`/suppliers/${s.id}`)} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <SupplierFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); fetchSummary() }}
        />
      )}
    </div>
  )
}