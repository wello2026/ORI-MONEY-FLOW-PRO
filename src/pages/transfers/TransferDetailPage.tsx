import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Shuffle, Check, X, Clock, Loader2, Trash2, Edit2 } from 'lucide-react'
import { useTransferStore } from '@/stores/transferStore'
import { useAccountStore } from '@/stores/accountStore'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/format'
import { ROUTES } from '@/lib/constants'

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(false)
  
  const transfer = useTransferStore((state) => state.currentTransfer)
  const fetchTransfer = useTransferStore((state) => state.fetchTransfer)
  const approveTransfer = useTransferStore((state) => state.approveTransfer)
  const rejectTransfer = useTransferStore((state) => state.rejectTransfer)
  const deleteTransfer = useTransferStore((state) => state.deleteTransfer)
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  const isLoading = useTransferStore((state) => state.isLoading)

  useEffect(() => {
    if (id) {
      fetchTransfer(id)
      fetchAccounts()
    }
  }, [id, fetchTransfer, fetchAccounts])

  const sourceAccount = accounts.find(a => a.id === transfer?.source_account_id)
  const destAccount = accounts.find(a => a.id === transfer?.destination_account_id)

  const handleApprove = async () => {
    if (!id) return
    console.log('handleApprove: Starting...')
    setIsProcessing(true)
    try {
      await approveTransfer(id)
      await fetchTransfer(id)
    } catch (e) {
      console.error('handleApprove: Error', e)
    }
    setIsProcessing(false)
  }

  const handleReject = async () => {
    if (!id) return
    console.log('handleReject: Starting...')
    setIsProcessing(true)
    try {
      await rejectTransfer(id)
      await fetchTransfer(id)
      console.log('handleReject: Done')
    } catch (e) {
      console.error('handleReject: Error', e)
    }
    setIsProcessing(false)
  }

  const handleDelete = async () => {
    if (!id) return
    if (confirm('هل أنت متأكد من حذف هذا التحويل؟')) {
      await deleteTransfer(id)
      navigate(ROUTES.TRANSFERS)
    }
  }

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

  if (isLoading || !transfer) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(ROUTES.TRANSFERS)} className="p-2 hover:bg-muted rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">تفاصيل التحويل</h1>
        </div>
        
        {/* أزرار التعديل والحذف للتحويلات المعلقة */}
        {transfer.status === 'pending' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(`/transfers/${id}/edit`)} 
              className="p-2 text-primary hover:bg-primary/10 rounded-lg"
              title="تعديل"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button 
              onClick={handleDelete} 
              className="p-2 text-error hover:bg-error/10 rounded-lg"
              title="حذف"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="card-elevated p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shuffle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">{transfer.reference}</p>
              <p className="text-sm text-muted-foreground">{formatRelativeTime(transfer.created_at)}</p>
            </div>
          </div>
          {getStatusBadge(transfer.status)}
        </div>

        <div className="kpi-card mb-6">
          <p className="text-sm opacity-80">المبلغ</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(transfer.amount)}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">من الحساب</p>
              <p className="font-medium">{sourceAccount?.name || 'غير معروف'}</p>
              <p className="text-xs text-muted-foreground">{sourceAccount?.code}</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">الرصيد</p>
              <p className="font-semibold">{formatCurrency(sourceAccount?.balance || 0)}</p>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">إلى الحساب</p>
              <p className="font-medium">{destAccount?.name || 'غير معروف'}</p>
              <p className="text-xs text-muted-foreground">{destAccount?.code}</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">الرصيد</p>
              <p className="font-semibold">{formatCurrency(destAccount?.balance || 0)}</p>
            </div>
          </div>
        </div>

        {transfer.description && (
          <div className="p-4 bg-muted/30 rounded-lg mb-6">
            <p className="text-sm text-muted-foreground mb-1">الملاحظات</p>
            <p className="text-sm">{transfer.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">تاريخ الإنشاء</p>
            <p className="font-medium">{formatDate(transfer.created_at)}</p>
          </div>
        </div>
      </div>

      {/* أزرار الموافقة والرفض للتحويلات المعلقة */}
      {transfer.status === 'pending' && (
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 btn-danger flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <X className="w-5 h-5" />
                رفض
              </>
            )}
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                موافقة وتنفيذ
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}