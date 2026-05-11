import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Wallet, Search, AlertCircle, Building2, RefreshCw,
  ArrowDownLeft, ArrowUpRight, Shuffle, TrendingUp, Banknote
} from 'lucide-react'
import { useTreasuryStore } from '@/stores/treasuryStore'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Treasury, TreasuryType } from '@/types'

const treasuryTypeLabels: Record<TreasuryType, { label: string; labelAr: string }> = {
  cashbox: { label: 'Cashbox', labelAr: 'صندوق' },
  bank: { label: 'Bank Account', labelAr: 'حساب بنكي' },
  reserve: { label: 'Reserve', labelAr: 'احتياطي' },
  petty_cash: { label: 'Petty Cash', labelAr: 'صندوق مصغر' },
  escrow: { label: 'Escrow', labelAr: 'ضمان' }
}

const currencyIcons: Record<string, string> = {
  LYD: 'د.ل',
  USD: '$',
  TRY: '₺',
  CNY: '¥',
  EUR: '€',
  GBP: '£'
}

export default function TreasuriesPage() {
  const { treasuries, isLoading, error, fetchTreasuries, successMessage } = useTreasuryStore()
  const currentCompany = useAuthStore((s) => s.currentCompany)
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCurrency, setFilterCurrency] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'currency' | 'type'>('overview')

  useEffect(() => {
    fetchTreasuries()
  }, [fetchTreasuries])

  const filteredTreasuries = treasuries.filter(t => {
    const matchSearch = t.treasury_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.treasury_code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCurrency = filterCurrency === 'all' || t.currency_code === filterCurrency
    const matchType = filterType === 'all' || t.treasury_type === filterType
    return matchSearch && matchCurrency && matchType
  })

  // Group by currency
  const byCurrency = treasuries.reduce((acc, t) => {
    if (!acc[t.currency_code]) acc[t.currency_code] = []
    acc[t.currency_code].push(t)
    return acc
  }, {} as Record<string, Treasury[]>)

  // Group by type
  const byType = treasuries.reduce((acc, t) => {
    if (!acc[t.treasury_type]) acc[t.treasury_type] = []
    acc[t.treasury_type].push(t)
    return acc
  }, {} as Record<string, Treasury[]>)

  const currencies = [...new Set(treasuries.map(t => t.currency_code))]

  const handleTreasuryClick = (treasury: Treasury) => {
    navigate(`/treasuries/${treasury.id}`)
  }

  return (
    <div className="page-container pb-24 animate-fade-in">
      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm text-destructive font-bold">{error}</div>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
          <div className="text-sm text-emerald-600 font-bold">{successMessage}</div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الخزائن</h1>
          <p className="text-muted-foreground text-sm">
            {currentCompany?.company_name_ar || currentCompany?.company_name || 'إدارة السيولة'} — {currencies.length} عملة
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTreasuries()}
            disabled={isLoading}
            className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center hover:border-primary transition-all"
          >
            <RefreshCw className={cn('w-5 h-5 text-primary', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={() => navigate('/treasuries/transfer')}
            className="btn-secondary flex items-center justify-center gap-2 px-5 py-3 rounded-xl"
          >
            <Shuffle className="w-5 h-5" />
            <span>تحويل عملات</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-xl"
          >
            <Plus className="w-5 h-5" />
            <span>خزينة جديدة</span>
          </button>
        </div>
      </div>

      {/* Currency Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {currencies.map(cur => {
          const total = byCurrency[cur]?.reduce((sum, t) => sum + t.current_balance, 0) || 0
          const count = byCurrency[cur]?.length || 0
          return (
            <button
              key={cur}
              onClick={() => setFilterCurrency(filterCurrency === cur ? 'all' : cur)}
              className={cn(
                'p-4 rounded-xl border text-right transition-all',
                filterCurrency === cur
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-card border-border hover:border-primary/30'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-black text-primary">{currencyIcons[cur] || cur}</span>
                <span className="text-xs text-muted-foreground">{count} خزينة</span>
              </div>
              <div className="text-sm font-bold text-foreground">
                {formatCurrency(total, cur)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{cur}</div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الكود..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input-field pr-10"
          />
        </div>
        <select
          value={filterCurrency}
          onChange={e => setFilterCurrency(e.target.value)}
          className="input-field w-auto md:w-40"
        >
          <option value="all">كل العملات</option>
          {currencies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="input-field w-auto md:w-40"
        >
          <option value="all">كل الأنواع</option>
          {Object.entries(treasuryTypeLabels).map(([key, val]) => (
            <option key={key} value={key}>{val.labelAr}</option>
          ))}
        </select>
      </div>

      {/* Treasuries List */}
      <div className="space-y-3">
        {filteredTreasuries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-bold">لا توجد خزائن</p>
            <p className="text-sm mt-1">قم بإنشاء خزينة جديدة للبدء</p>
          </div>
        ) : (
          filteredTreasuries.map(treasury => (
            <TreasuryCard
              key={treasury.id}
              treasury={treasury}
              onClick={() => handleTreasuryClick(treasury)}
            />
          ))
        )}
      </div>

      {/* Create Treasury Modal */}
      {showCreateModal && (
        <CreateTreasuryModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  )
}

function TreasuryCard({ treasury, onClick }: { treasury: Treasury; onClick: () => void }) {
  const typeInfo = treasuryTypeLabels[treasury.treasury_type] || treasuryTypeLabels.cashbox

  const typeIcons: Record<TreasuryType, React.ReactNode> = {
    cashbox: <Wallet className="w-5 h-5" />,
    bank: <Building2 className="w-5 h-5" />,
    reserve: <Banknote className="w-5 h-5" />,
    petty_cash: <Wallet className="w-5 h-5" />,
    escrow: <Building2 className="w-5 h-5" />
  }

  const isPositive = treasury.current_balance >= 0
  const balanceColor = treasury.alert_threshold && treasury.current_balance < treasury.alert_threshold
    ? 'text-amber-500'
    : isPositive ? 'text-foreground' : 'text-red-500'

  return (
    <button
      onClick={onClick}
      className="w-full text-right p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            treasury.treasury_type === 'bank' ? 'bg-blue-500/10 text-blue-600' :
            treasury.treasury_type === 'reserve' ? 'bg-emerald-500/10 text-emerald-600' :
            'bg-primary/10 text-primary'
          )}>
            {typeIcons[treasury.treasury_type]}
          </div>
          <div className="text-right">
            <div className="font-bold text-foreground">
              {treasury.treasury_name_ar || treasury.treasury_name}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {treasury.treasury_code} • {typeInfo.labelAr}
              {treasury.country && ` • ${treasury.country}`}
            </div>
          </div>
        </div>

        <div className="text-left flex-shrink-0">
          <div className={cn('text-xl font-black', balanceColor)}>
            {formatCurrency(treasury.current_balance, treasury.currency_code)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {treasury.currency_code}
          </div>
        </div>
      </div>

      {/* Balance bar */}
      <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            treasury.treasury_type === 'bank' ? 'bg-blue-500' :
            treasury.treasury_type === 'reserve' ? 'bg-emerald-500' :
            'bg-primary'
          )}
          style={{
            width: treasury.max_balance
              ? `${Math.min(100, (treasury.current_balance / treasury.max_balance) * 100)}%`
              : '100%'
          }}
        />
      </div>
    </button>
  )
}

function CreateTreasuryModal({ onClose }: { onClose: () => void }) {
  const { createTreasury, isLoading } = useTreasuryStore()
  const currentCompany = useAuthStore((s) => s.currentCompany)
  const [formData, setFormData] = useState({
    treasury_name: '',
    treasury_name_ar: '',
    treasury_type: 'cashbox' as TreasuryType,
    currency_code: currentCompany?.default_currency || 'LYD',
    country: currentCompany?.country || 'LY',
    opening_balance: 0,
    treasury_code: '',
    bank_name: '',
    account_number: '',
    iban: '',
    notes: '',
    allow_overdraft: false,
    alert_threshold: 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.treasury_name.trim()) return

    const result = await createTreasury(formData)
    if (result.success) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">خزينة جديدة</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-bold text-foreground mb-1.5 block">
                اسم الخزينة (عربي) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.treasury_name_ar}
                onChange={e => setFormData({ ...formData, treasury_name_ar: e.target.value })}
                className="input-field"
                placeholder="مثال: الصندوق الرئيسي"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-bold text-foreground mb-1.5 block">اسم الخزينة (إنجليزي)</label>
              <input
                type="text"
                value={formData.treasury_name}
                onChange={e => setFormData({ ...formData, treasury_name: e.target.value })}
                className="input-field"
                placeholder="Main Cashbox"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">الكود</label>
              <input
                type="text"
                value={formData.treasury_code}
                onChange={e => setFormData({ ...formData, treasury_code: e.target.value })}
                className="input-field"
                placeholder="TR-001"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">النوع</label>
              <select
                value={formData.treasury_type}
                onChange={e => setFormData({ ...formData, treasury_type: e.target.value as TreasuryType })}
                className="input-field"
              >
                {Object.entries(treasuryTypeLabels).map(([key, val]) => (
                  <option key={key} value={key}>{val.labelAr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">العملة</label>
              <select
                value={formData.currency_code}
                onChange={e => setFormData({ ...formData, currency_code: e.target.value })}
                className="input-field"
              >
                <option value="LYD">LYD - دينار ليبي</option>
                <option value="USD">USD - دولار</option>
                <option value="TRY">TRY - ليرة تركية</option>
                <option value="CNY">CNY - يوان صيني</option>
                <option value="EUR">EUR - يورو</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">الرصيد الافتتاحي</label>
              <input
                type="number"
                step="0.001"
                value={formData.opening_balance}
                onChange={e => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">حد التنبيه</label>
              <input
                type="number"
                step="0.001"
                value={formData.alert_threshold}
                onChange={e => setFormData({ ...formData, alert_threshold: parseFloat(e.target.value) || 0 })}
                className="input-field"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">البلد</label>
              <input
                type="text"
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="input-field"
                placeholder="LY"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-bold text-foreground mb-1.5 block">ملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="input-field min-h-[80px]"
                placeholder="ملاحظات إضافية..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="overdraft"
              checked={formData.allow_overdraft}
              onChange={e => setFormData({ ...formData, allow_overdraft: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="overdraft" className="text-sm text-foreground">السماح بالسحب超越了 الرصيد</label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary py-3 rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.treasury_name_ar.trim()}
              className="flex-1 btn-primary py-3 rounded-xl disabled:opacity-50"
            >
              {isLoading ? 'جاري الإنشاء...' : 'إنشاء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
