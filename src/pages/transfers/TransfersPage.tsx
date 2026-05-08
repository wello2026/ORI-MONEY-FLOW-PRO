import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Shuffle, ArrowRight, Clock, Check, X } from 'lucide-react'
import { useTransferStore } from '@/stores/transferStore'
import { ROUTES } from '@/lib/constants'
import { formatCurrency, formatRelativeTime } from '@/lib/format'

export default function TransfersPage() {
  const transfers = useTransferStore((state) => state.transfers)
  const fetchTransfers = useTransferStore((state) => state.fetchTransfers)
  const isLoading = useTransferStore((state) => state.isLoading)
  const navigate = useNavigate()

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  const pendingCount = transfers.filter(t => t.status === 'pending').length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge status-pending"><Clock className="w-3 h-3" /> معلق</span>
      case 'approved':
        return <span className="status-badge status-approved"><Check className="w-3 h-3" /> موافق</span>
      case 'rejected':
        return <span className="status-badge status-rejected"><X className="w-3 h-3" /> مرفوض</span>
      case 'completed':
        return <span className="status-badge status-completed">مكتمل</span>
      default:
        return <span className="text-muted-foreground">{status}</span>
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">التحويلات</h1>
        <p className="page-subtitle">تحويل الأموال بين الحسابات</p>
      </div>

      {pendingCount > 0 && (
        <div className="kpi-card mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6" />
            <div>
              <p className="text-sm opacity-80">في الانتظار</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {transfers.map((transfer) => (
          <div 
            key={transfer.id} 
            className="card-elevated p-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(`/transfers/${transfer.id}`)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shuffle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{transfer.reference}</p>
                  <p className="text-sm text-muted-foreground">{formatRelativeTime(transfer.created_at)}</p>
                </div>
              </div>
              {getStatusBadge(transfer.status)}
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg mb-3">
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground">من</p>
                <p className="font-medium text-sm">{transfer.source_account_id?.slice(0, 8)}...</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground">إلى</p>
                <p className="font-medium text-sm">{transfer.destination_account_id?.slice(0, 8)}...</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-primary">{formatCurrency(transfer.amount)}</p>
              {transfer.description && (
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">{transfer.description}</p>
              )}
            </div>
          </div>
        ))}

        {transfers.length === 0 && !isLoading && (
          <div className="empty-state">
            <Shuffle className="w-16 h-16 opacity-30" />
            <h3>لا توجد تحويلات</h3>
            <p>أضف تحويلك الأول</p>
          </div>
        )}
      </div>

      <button onClick={() => navigate(ROUTES.TRANSFER_NEW)} className="floating-action-btn">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}