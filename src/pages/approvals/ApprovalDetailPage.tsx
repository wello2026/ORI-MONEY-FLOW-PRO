import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useTransactionStore } from '@/stores/transactionStore'
import { useTransferStore } from '@/stores/transferStore'
import { useAuthStore } from '@/stores/authStore'
import { useAccountStore } from '@/stores/accountStore'
import { formatCurrency, formatDateTime } from '@/lib/format'

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const currentTransaction = useTransactionStore((state) => state.currentTransaction)
  const fetchTransaction = useTransactionStore((state) => state.fetchTransaction)
  const approveTransaction = useTransactionStore((state) => state.approveTransaction)
  const rejectTransaction = useTransactionStore((state) => state.rejectTransaction)
  const error = useTransactionStore((state) => state.error)
  
  const transfers = useTransferStore((state) => state.transfers)
  const currentTransfer = transfers.find(t => t.id === id)
  const approveTransfer = useTransferStore((state) => state.approveTransfer)
  const rejectTransfer = useTransferStore((state) => state.rejectTransfer)
  const accounts = useAccountStore((state) => state.accounts)

  const [localError, setLocalError] = useState<string | null>(null)
  const [localSuccess, setLocalSuccess] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null)

  const isTransaction = currentTransaction !== null
  const isTransfer = currentTransfer !== null
  const item = currentTransaction || currentTransfer
  const isPending = item?.status === 'pending'

  const canApprove = user?.role === 'super_admin' || user?.role === 'admin'

  useEffect(() => {
    if (id) {
      fetchTransaction(id)
    }
  }, [id, fetchTransaction])

  useEffect(() => {
    if (error) {
      setLocalError(error)
    }
  }, [error])

  const handleApprove = async () => {
    setLocalError(null)
    setLocalSuccess(null)
    setActionLoading('approve')

    let result
    if (isTransaction && id) {
      result = await approveTransaction(id)
    } else if (isTransfer && id) {
      result = await approveTransfer(id)
    } else {
      result = { success: false, error: 'عنصر غير معروف' }
    }

    setActionLoading(null)

    if (result.success) {
      setLocalSuccess('تمت الموافقة بنجاح')
      setTimeout(() => navigate('/approvals'), 1500)
    } else {
      setLocalError(result.error || 'حدث خطأ في الموافقة')
    }
  }

  const handleReject = async () => {
    setLocalError(null)
    setLocalSuccess(null)
    setActionLoading('reject')

    let result
    if (isTransaction && id) {
      result = await rejectTransaction(id)
    } else if (isTransfer && id) {
      result = await rejectTransfer(id)
    } else {
      result = { success: false, error: 'عنصر غير معروف' }
    }

    setActionLoading(null)

    if (result.success) {
      setLocalSuccess('تم الرفض بنجاح')
      setTimeout(() => navigate('/approvals'), 1500)
    } else {
      setLocalError(result.error || 'حدث خطأ في الرفض')
    }
  }

  if (!item) {
    return (
      <div className="page-container">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">تفاصيل الموافقة</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  const isIncome = isTransaction && ['deposit', 'income'].includes(currentTransaction?.type || '')

  return (
    <div className="page-container">
      {localError && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">خطأ</p>
            <p className="text-sm text-destructive/80">{localError}</p>
          </div>
          <button onClick={() => setLocalError(null)} className="text-destructive hover:bg-destructive/20 p-1 rounded">×</button>
        </div>
      )}

      {localSuccess && (
        <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-success">نجاح</p>
            <p className="text-sm text-success/80">{localSuccess}</p>
          </div>
          <button onClick={() => setLocalSuccess(null)} className="text-success hover:bg-success/20 p-1 rounded">×</button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">تفاصيل الموافقة</h1>
        <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
          isPending ? 'bg-warning/20 text-warning' :
          item.status === 'approved' ? 'bg-success/20 text-success' :
          'bg-destructive/20 text-destructive'
        }`}>
          {isPending ? 'معلق' : item.status === 'approved' ? 'موافق عليه' : 'مرفوض'}
        </span>
      </div>

      <div className="kpi-card mb-6">
        <p className="text-sm opacity-80 mb-1">
          {isTransaction ? 'المبلغ' : 'المبلغ المحول'}
        </p>
        <p className={`text-4xl font-bold mb-2 ${isTransfer ? '' : isIncome ? 'text-success' : 'text-error'}`}>
          {formatCurrency(item.amount)}
        </p>
        <p className="opacity-80">{(item as any).reference}</p>
      </div>

      <div className="card-elevated p-4 space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-muted-foreground">النوع</span>
          <span className="font-medium">
            {isTransaction 
              ? (currentTransaction?.type === 'deposit' ? 'إيداع' :
                 currentTransaction?.type === 'withdrawal' ? 'سحب' :
                 currentTransaction?.type === 'expense' ? 'مصروف' :
                 currentTransaction?.type === 'income' ? 'دخل' :
                 currentTransaction?.type) 
              : 'تحويل'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">التاريخ</span>
          <span>{formatDateTime(item.created_at)}</span>
        </div>
        {(item as any).description && (
          <div className="pt-3 border-t">
            <span className="text-muted-foreground block mb-1">الوصف</span>
            <p>{(item as any).description}</p>
          </div>
        )}
        {isTransfer && currentTransfer && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">من حساب</span>
              <span className="font-medium">
                {accounts.find(a => a.id === currentTransfer.source_account_id)?.name || currentTransfer.source_account_id?.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">إلى حساب</span>
              <span className="font-medium">
                {accounts.find(a => a.id === currentTransfer.destination_account_id)?.name || currentTransfer.destination_account_id?.slice(0, 8)}
              </span>
            </div>
          </>
        )}
      </div>

      {canApprove && isPending && (
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={handleApprove}
            disabled={actionLoading !== null}
            className="btn-primary bg-success flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {actionLoading === 'approve' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            موافقة
          </button>
          <button 
            onClick={handleReject}
            disabled={actionLoading !== null}
            className="btn-primary bg-error flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {actionLoading === 'reject' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <X className="w-5 h-5" />
            )}
            رفض
          </button>
        </div>
      )}

      {!canApprove && isPending && (
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-center">
          <p className="text-warning">لا تملك صلاحية الموافقة على هذه المعاملة</p>
        </div>
      )}
    </div>
  )
}