import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, AlertCircle, Users, TrendingUp, TrendingDown,
  RefreshCw, ChevronRight, Globe, Phone, Mail, Building2
} from 'lucide-react'
import { usePartnerStore } from '@/stores/partnerStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { FinancialPartner, PartnerSummary } from '@/types'
import { PartnerFormModal } from '@/components/partners/PartnerFormModal'

const entryTypeLabels: Record<string, string> = {
  advance_sent: 'سلفة مرسلة',
  advance_received: 'سلفة مستلمة',
  material_purchase: 'شراء مواد',
  labor_cost: 'تكاليف عمالة',
  reimbursement: 'سداد',
  settlement: 'تسوية',
  adjustment: 'تعديل',
  return: 'مرتجع',
  other: 'أخرى'
}

const currencySymbols: Record<string, string> = {
  USD: '$', LYD: 'د.ل', TRY: '₺', CNY: '¥', EUR: '€', GBP: '£'
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbol = currencySymbols[currency] || currency
  const absAmount = Math.abs(amount)
  return `${symbol}${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function PartnerCard({ partner, onClick }: { partner: PartnerSummary; onClick: () => void }) {
  const isOwed = partner.balance >= 0

  return (
    <div
      onClick={onClick}
      className="bg-card/60 backdrop-blur border border-white/5 rounded-2xl p-5 cursor-pointer
        hover:border-primary/30 hover:bg-card/80 transition-all duration-300 active:scale-[0.98]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{partner.partner_name_ar || partner.partner_name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{partner.partner_code}</p>
          </div>
        </div>
        <div className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black',
          isOwed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
        )}>
          {isOwed ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isOwed ? 'له' : 'عليه'}
        </div>
      </div>

      {/* Balance */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-1">الرصيد الحالي</p>
        <p className={cn(
          'text-2xl font-black',
          isOwed ? 'text-emerald-500' : 'text-red-500'
        )}>
          {formatCurrency(partner.balance, partner.currency_code)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-background/40 rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground font-bold mb-1">السلف</p>
          <p className="text-sm font-black text-emerald-500">
            {formatCurrency(partner.total_advances, partner.currency_code)}
          </p>
        </div>
        <div className="bg-background/40 rounded-xl p-3">
          <p className="text-[10px] text-muted-foreground font-bold mb-1">المصروفات</p>
          <p className="text-sm font-black text-red-500">
            {formatCurrency(partner.total_expenses, partner.currency_code)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {partner.country && (
            <>
              <Globe className="w-3 h-3" />
              <span>{partner.country}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{partner.total_entries || 0} عملية</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
}

export default function PartnersPage() {
  const navigate = useNavigate()
  const { summary, isLoading, error, fetchSummary, successMessage, clearMessages } = usePartnerStore()
  const currentCompany = useAuthStore((s) => s.currentCompany)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterCountry, setFilterCountry] = useState<string>('all')

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const filteredPartners = summary.filter(p => {
    const matchSearch = (p.partner_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.partner_name_ar || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.partner_code || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchCountry = filterCountry === 'all' || p.country === filterCountry
    return matchSearch && matchCountry
  })

  const countries = [...new Set(summary.map(p => p.country).filter(Boolean))]

  const totalOwed = filteredPartners.filter(p => p.balance >= 0).reduce((sum, p) => sum + Number(p.balance), 0)
  const totalOwing = filteredPartners.filter(p => p.balance < 0).reduce((sum, p) => sum + Math.abs(Number(p.balance)), 0)

  return (
    <div className="page-container pb-24 animate-fade-in">
      {/* Banners */}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الشركاء الماليين</h1>
          <p className="text-muted-foreground text-sm">
            {currentCompany?.company_name_ar || currentCompany?.company_name || 'إدارة الشركاء'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSummary()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-card/60 border border-white/10 hover:bg-card/80 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>شريك جديد</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-xs text-emerald-500/60 font-bold mb-1">إجمالي له</p>
          <p className="text-xl font-black text-emerald-500">
            {formatCurrency(totalOwed, 'USD')}
          </p>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
          <p className="text-xs text-red-500/60 font-bold mb-1">إجمالي عليه</p>
          <p className="text-xl font-black text-red-500">
            {formatCurrency(totalOwing, 'USD')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الكود..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-3 bg-card/60 border border-white/10 rounded-xl text-sm
              placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="px-4 py-3 bg-card/60 border border-white/10 rounded-xl text-sm
            focus:outline-none focus:border-primary/40 transition-colors"
        >
          <option value="all">كل الدول</option>
          {countries.map(c => (
            <option key={c} value={c!}>{c}</option>
          ))}
        </select>
      </div>

      {/* Partners Grid */}
      {filteredPartners.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">لا يوجد شركاء</h3>
          <p className="text-sm text-muted-foreground mb-6">ابدأ بإضافة أول شريك مالي</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة شريك
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map(partner => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onClick={() => navigate(`/partners/${partner.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <PartnerFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchSummary()
          }}
        />
      )}
    </div>
  )
}
