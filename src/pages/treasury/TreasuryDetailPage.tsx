import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Plus, ArrowDownCircle, ArrowUpCircle,
  Shuffle, FileText, AlertTriangle, CheckCircle, XCircle, Clock
} from 'lucide-react'
import { useTreasuryStore } from '@/stores/treasuryStore'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TreasuryTransaction, TreasuryTransactionType } from '@/types'

const typeLabels: Record<TreasuryTransactionType, string> = {
  deposit: 'إيداع',
  withdrawal: 'سحب',
  transfer_in: 'تحويل وارد',
  transfer_out: 'تحويل صادر',
  exchange_in: 'صرف وارد',
  exchange_out: 'صرف صادر',
  adjustment: 'تعديل',
  reconciliation: 'تسوية'
}

const typeIcons: Record<TreasuryTransactionType, React.ReactNode> = {
  deposit: <ArrowDownCircle className="w-5 h-5" />,
  withdrawal: <ArrowUpCircle className="w-5 h-5" />,
  transfer_in: <Shuffle className="w-5 h-5" />,
  transfer_out: <Shuffle className="w-5 h-5" />,
  exchange_in: <ArrowDownCircle className="w-5 h-5" />,
  exchange_out: <ArrowUpCircle className="w-5 h-5" />,
  adjustment: <FileText className="w-5 h-5" />,
  reconciliation: <CheckCircle className="w-5 h-5" />
}

const statusConfig = {
  pending: { label: 'معلق', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
  approved: { label: 'موافق', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
  cancelled: { label: 'ملغي', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: XCircle }
}

export default function TreasuryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    currentTreasury, transactions, isLoading, error, fetchTreasury,
    fetchTransactions, approveTransaction, rejectTransaction,
    successMessage
  } = useTreasuryStore()
  const user = useAuthStore((s) => s.user)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    if (id) {
      fetchTreasury(id)
      fetchTransactions(id)
    }
  }, [id, fetchTreasury, fetchTransactions])

  const filteredTransactions = transactions.filter(tx => {
    const matchStatus = filterStatus === 'all' || tx.status === filterStatus
    const matchType = filterType === 'all' || tx.transaction_type === filterType
    return matchStatus && matchType
  })

  // Calculate totals
  const totalDeposits = transactions
    .filter(t => ['deposit', 'transfer_in', 'exchange_in'].includes(t.transaction_type) && t.status === 'approved')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalWithdrawals = transactions
    .filter(t => ['withdrawal', 'transfer_out', 'exchange_out'].includes(t.transaction_type) && t.status === 'approved')
    .reduce((sum, t) => sum + t.amount, 0)

  const pendingCount = transactions.filter(t => t.status === 'pending').length
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin'

  if (!currentTreasury && !isLoading) {
    return (
      <div className="page-container pb-24">
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>الخزينة غير موجودة</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container pb-24 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => navigate('/treasuries')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-bold">العودة للخزائن</span>
      </button>

      {/* Treasury Header */}
      {currentTreasury && (
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {currentTreasury.treasury_name_ar || currentTreasury.treasury_name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {currentTreasury.treasury_code} • {currentTreasury.treasury_type}
                {currentTreasury.country && ` • ${currentTreasury.country}`}
              </p>
            </div>
            <div className="text-left">
              <div className="text-3xl font-black text-foreground">
                {formatCurrency(currentTreasury.current_balance, currentTreasury.currency_code)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {currentTreasury.currency_code}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
            <div className="text-center p-3 rounded-xl bg-emerald-500/5">
              <div className="text-emerald-600 text-xs font-bold mb-1">إجمالي الإيداعات</div>
              <div className="font-black text-emerald-600">
                {formatCurrency(totalDeposits, currentTreasury.currency_code)}
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-red-500/5">
              <div className="text-red-600 text-xs font-bold mb-1">إجمالي السحوبات</div>
              <div className="font-black text-red-600">
                {formatCurrency(totalWithdrawals, currentTreasury.currency_code)}
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-500/5">
              <div className="text-amber-600 text-xs font-bold mb-1">معلق</div>
              <div className="font-black text-amber-600">{pendingCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">كل الحالات</option>
          <option value="pending">معلق</option>
          <option value="approved">موافق</option>
          <option value="rejected">مرفوض</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">كل الأنواع</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Transactions */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-bold">لا توجد معاملات</p>
          </div>
        ) : (
          filteredTransactions.map(tx => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              isAdmin={isAdmin}
              onApprove={() => approveTransaction(tx.id)}
              onReject={() => rejectTransaction(tx.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function TransactionRow({
  tx, isAdmin, onApprove, onReject
}: {
  tx: TreasuryTransaction
  isAdmin: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const [showActions, setShowActions] = useState(false)
  const isInflow = ['deposit', 'transfer_in', 'exchange_in'].includes(tx.transaction_type)
  const status = statusConfig[tx.status] || statusConfig.pending

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            isInflow ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
          )}>
            {typeIcons[tx.transaction_type]}
          </div>
          <div>
            <div className="font-bold text-foreground">{typeLabels[tx.transaction_type]}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {tx.reference_number && `${tx.reference_number} • `}
              {formatRelativeTime(tx.created_at)}
            </div>
            {tx.description && (
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tx.description}</div>
            )}
            {tx.destination_treasury_id && (
              <div className="text-xs text-muted-foreground mt-0.5">
                ← {tx.destination_amount !== undefined ? formatCurrency(tx.destination_amount, tx.destination_currency) : '—'}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left">
            <div className={cn('font-black text-lg', isInflow ? 'text-emerald-600' : 'text-red-600')}>
              {isInflow ? '+' : '-'}{formatCurrency(tx.amount, tx.currency_code)}
            </div>
            <div className={cn('text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1', status.bg, status.color)}>
              {status.label}
            </div>
          </div>

          {tx.status === 'pending' && isAdmin && (
            <button
              onClick={() => setShowActions(!showActions)}
              className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-xs text-muted-foreground hover:bg-muted"
            >
              ⋮
            </button>
          )}
        </div>
      </div>

      {showActions && tx.status === 'pending' && isAdmin && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
          <button
            onClick={() => { onApprove(); setShowActions(false) }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-sm hover:bg-emerald-500/20 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            موافقة
          </button>
          <button
            onClick={() => { onReject(); setShowActions(false) }}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/10 text-red-600 font-bold text-sm hover:bg-red-500/20 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            رفض
          </button>
        </div>
      )}
    </div>
  )
}
