import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Clock, ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import { useTransactionStore } from '@/stores/transactionStore'
import { useTransferStore } from '@/stores/transferStore'
import { formatCurrency, formatRelativeTime } from '@/lib/format'

interface PendingItem {
  id: string
  type: 'transaction' | 'transfer'
  reference: string
  amount: number
  created_at: string
  status: string
}

export default function ApprovalsPage() {
  const transactions = useTransactionStore((state) => state.transactions)
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions)
  const isLoadingTransactions = useTransactionStore((state) => state.isLoading)
  const errorTransactions = useTransactionStore((state) => state.error)

  const transfers = useTransferStore((state) => state.transfers)
  const fetchTransfers = useTransferStore((state) => state.fetchTransfers)
  const isLoadingTransfers = useTransferStore((state) => state.isLoading)
  const errorTransfers = useTransferStore((state) => state.error)

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetchTransactions()
    fetchTransfers()
  }, [fetchTransactions, fetchTransfers, refreshKey])

  const handleRefresh = () => {
    setRefreshKey(k => k + 1)
  }

  const pendingTransactions = transactions.filter(t => t.status === 'pending')
  const pendingTransfers = transfers.filter(t => t.status === 'pending')

  const allPending: PendingItem[] = [
    ...pendingTransactions.map(t => ({
      id: t.id,
      type: 'transaction' as const,
      reference: t.reference,
      amount: t.amount,
      created_at: t.created_at,
      status: t.status
    })),
    ...pendingTransfers.map(t => ({
      id: t.id,
      type: 'transfer' as const,
      reference: t.reference,
      amount: t.amount,
      created_at: t.created_at,
      status: t.status
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const isLoading = isLoadingTransactions || isLoadingTransfers

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">الموافقات</h1>
          <p className="page-subtitle">المعاملات والتحويلات المعلقة</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 hover:bg-muted rounded-lg"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {(errorTransactions || errorTransfers) && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
          <span className="text-destructive">خطأ في تحميل البيانات</span>
        </div>
      )}

      <div className="kpi-card mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">في الانتظار</p>
          <p className="text-3xl font-bold">{allPending.length}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            معاملات: {pendingTransactions.length}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-info rounded-full"></div>
            تحويلات: {pendingTransfers.length}
          </span>
        </div>
        <Clock className="w-12 h-12 opacity-50" />
      </div>

      {isLoading && allPending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allPending.map((item) => (
            <Link
              key={item.id}
              to={`/approvals/${item.id}`}
              className="card-elevated p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  item.type === 'transaction' ? 'bg-warning/10' : 'bg-info/10'
                }`}>
                  <Clock className={`w-6 h-6 ${item.type === 'transaction' ? 'text-warning' : 'text-info'}`} />
                </div>
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    {item.type === 'transaction' ? 'معاملة' : 'تحويل'}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.reference}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <p className="font-bold text-lg">{formatCurrency(item.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at)}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          ))}

          {allPending.length === 0 && !isLoading && (
            <div className="empty-state">
              <CheckCircle className="w-16 h-16 opacity-30" />
              <h3>لا توجد موافقات معلقة</h3>
              <p>جميع المعاملات والتحويلات تمت الموافقة عليها</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}