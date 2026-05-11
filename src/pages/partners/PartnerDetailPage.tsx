import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight, AlertCircle, Users, TrendingUp, TrendingDown,
  RefreshCw, ChevronLeft, Phone, Mail, Globe, Building2,
  Edit3, Trash2, Plus, ArrowUpRight, ArrowDownLeft,
  ArrowRightLeft, Package, UserCog, Receipt, CheckCircle
} from 'lucide-react'
import { usePartnerStore } from '@/stores/partnerStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { PartnerFormModal } from '@/components/partners/PartnerFormModal'
import { PartnerOperationModal } from '@/components/partners/PartnerOperationModal'

type PartnerEntryType = 'advance_sent' | 'advance_received' | 'material_purchase' | 'labor_cost' | 'reimbursement' | 'adjustment' | 'settlement' | 'return' | 'other'

const entryTypeConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  advance_sent: { label: 'سلفة مرسلة', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: ArrowUpRight },
  advance_received: { label: 'سلفة مستلمة', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: ArrowDownLeft },
  material_purchase: { label: 'شراء مواد', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: Package },
  labor_cost: { label: 'تكاليف عمالة', color: 'text-orange-500', bgColor: 'bg-orange-500/10', icon: UserCog },
  reimbursement: { label: 'سداد', color: 'text-purple-500', bgColor: 'bg-purple-500/10', icon: Receipt },
  settlement: { label: 'تسوية', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', icon: CheckCircle },
  adjustment: { label: 'تعديل', color: 'text-gray-500', bgColor: 'bg-gray-500/10', icon: Edit3 },
  return: { label: 'مرتجع', color: 'text-pink-500', bgColor: 'bg-pink-500/10', icon: ArrowRightLeft },
  other: { label: 'أخرى', color: 'text-muted-foreground', bgColor: 'bg-muted', icon: Receipt }
}

const currencySymbols: Record<string, string> = {
  USD: '$', LYD: 'د.ل', TRY: '₺', CNY: '¥', EUR: '€', GBP: '£'
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbol = currencySymbols[currency] || currency
  return `${symbol}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentPartner, balance, statement, isLoading, error, fetchPartner, fetchBalance, fetchStatement, successMessage, clearMessages, deletePartner } = usePartnerStore()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showOpModal, setShowOpModal] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchPartner(id)
      fetchBalance(id)
      fetchStatement(id)
    }
  }, [id, fetchPartner, fetchBalance, fetchStatement])

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('هل أنت متأكد من حذف هذا الشريك؟')) return
    const result = await deletePartner(id)
    if (result.success) {
      navigate('/partners')
    }
  }

  if (isLoading && !currentPartner) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentPartner) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-bold">الشريك غير موجود</h3>
        <button onClick={() => navigate('/partners')} className="mt-4 text-primary text-sm">العودة للشركاء</button>
      </div>
    )
  }

  const partnerBalance = balance?.net_balance ?? currentPartner.balance
  const isOwed = partnerBalance >= 0

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

      {/* Back + Actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/partners')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-bold">الشركاء</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 rounded-xl bg-card/60 border border-white/10 hover:bg-card/80 transition-colors"
          >
            <Edit3 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl bg-card/60 border border-white/10 hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>

      {/* Partner Header Card */}
      <div className="bg-card/60 backdrop-blur border border-white/5 rounded-3xl p-6 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground">{currentPartner.partner_name_ar || currentPartner.partner_name}</h1>
            <p className="text-muted-foreground font-mono text-sm">{currentPartner.partner_code}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {currentPartner.country && (
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />{currentPartner.country}
                </span>
              )}
              {currentPartner.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />{currentPartner.phone}
                </span>
              )}
              {currentPartner.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />{currentPartner.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className={cn(
          'rounded-2xl p-5 mb-6',
          isOwed ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-red-500/5 border border-red-500/20'
        )}>
          <div className="flex items-center gap-2 mb-2">
            {isOwed ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
            <span className="text-sm font-bold text-muted-foreground">
              {isOwed ? 'رصيد له (له علينا)' : 'رصيد عليه (نمين عليه)'}
            </span>
          </div>
          <p className={cn('text-4xl font-black', isOwed ? 'text-emerald-500' : 'text-red-500')}>
            {formatCurrency(partnerBalance, currentPartner.currency_code)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {currentPartner.currency_code}
          </p>
        </div>

        {/* Stats Grid */}
        {balance && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-center">
              <p className="text-[10px] text-blue-500/60 font-bold mb-1">إجمالي السلف</p>
              <p className="text-sm font-black text-blue-500">
                {formatCurrency(balance.total_advances, currentPartner.currency_code)}
              </p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
              <p className="text-[10px] text-amber-500/60 font-bold mb-1">إجمالي المصروفات</p>
              <p className="text-sm font-black text-amber-500">
                {formatCurrency(balance.total_expenses, currentPartner.currency_code)}
              </p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
              <p className="text-[10px] text-primary/60 font-bold mb-1">عدد العمليات</p>
              <p className="text-sm font-black text-primary">
                {statement.length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setShowOpModal('advance')}
          className="flex flex-col items-center gap-2 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl
            hover:bg-blue-500/10 transition-colors active:scale-95"
        >
          <ArrowUpRight className="w-6 h-6 text-blue-500" />
          <span className="text-xs font-bold text-blue-500">إرسال سلفة</span>
        </button>
        <button
          onClick={() => setShowOpModal('material')}
          className="flex flex-col items-center gap-2 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl
            hover:bg-amber-500/10 transition-colors active:scale-95"
        >
          <Package className="w-6 h-6 text-amber-500" />
          <span className="text-xs font-bold text-amber-500">شراء مواد</span>
        </button>
        <button
          onClick={() => setShowOpModal('labor')}
          className="flex flex-col items-center gap-2 p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl
            hover:bg-orange-500/10 transition-colors active:scale-95"
        >
          <UserCog className="w-6 h-6 text-orange-500" />
          <span className="text-xs font-bold text-orange-500">تكاليف عمالة</span>
        </button>
        <button
          onClick={() => setShowOpModal('settle')}
          className="flex flex-col items-center gap-2 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl
            hover:bg-emerald-500/10 transition-colors active:scale-95"
        >
          <CheckCircle className="w-6 h-6 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-500">تسوية</span>
        </button>
      </div>

      {/* Statement */}
      <div className="bg-card/60 backdrop-blur border border-white/5 rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">كشف حساب الشريك</h2>
          <button
            onClick={() => id && fetchStatement(id)}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-background/40 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        {statement.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">لا توجد عمليات مسجلة</p>
          </div>
        ) : (
          <div className="space-y-2">
            {statement.map((entry) => {
              const config = entryTypeConfig[entry.entry_type] || entryTypeConfig.other
              const Icon = config.icon
              const isDebit = ['advance_sent', 'advance_received'].includes(entry.entry_type)
              const isPositive = entry.balance_after >= 0

              return (
                <div
                  key={entry.id}
                  className="bg-background/40 rounded-xl overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-background/60 transition-colors"
                    onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.bgColor)}>
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{entry.description || config.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString('ar-SA')}
                        {entry.reference_number && ` · ${entry.reference_number}`}
                        {entry.project_name && ` · ${entry.project_name}`}
                      </p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className={cn('text-sm font-black', isDebit ? 'text-blue-500' : 'text-red-500')}>
                        {isDebit ? '+' : '-'}{formatCurrency(entry.amount, entry.currency_code)}
                      </p>
                      <p className={cn('text-[10px] font-bold', isPositive ? 'text-emerald-500' : 'text-red-500')}>
                        {formatCurrency(entry.balance_after, entry.currency_code)}
                      </p>
                    </div>
                  </div>

                  {expandedRow === entry.id && (
                    <div className="px-4 pb-3 border-t border-white/5 pt-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">رقم المرجع: </span>
                          <span className="font-mono font-bold">{entry.reference_number || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">نوع العملية: </span>
                          <span className="font-bold">{config.label}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">الرصيد بعد: </span>
                          <span className={cn('font-bold', isPositive ? 'text-emerald-500' : 'text-red-500')}>
                            {formatCurrency(entry.balance_after, entry.currency_code)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">المشروع: </span>
                          <span className="font-bold">{entry.project_name || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">سجل بواسطة: </span>
                          <span className="font-bold">{entry.recorded_by_name || '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <PartnerFormModal
          partner={currentPartner}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            if (id) {
              fetchPartner(id)
              fetchSummary()
            }
          }}
        />
      )}

      {/* Operation Modal */}
      {showOpModal && id && (
        <PartnerOperationModal
          partnerId={id}
          operationType={showOpModal as 'advance' | 'material' | 'labor' | 'settle'}
          partnerName={currentPartner.partner_name_ar || currentPartner.partner_name}
          currency={currentPartner.currency_code}
          onClose={() => setShowOpModal(null)}
          onSuccess={() => {
            setShowOpModal(null)
            fetchBalance(id)
            fetchStatement(id)
          }}
        />
      )}
    </div>
  )
}
