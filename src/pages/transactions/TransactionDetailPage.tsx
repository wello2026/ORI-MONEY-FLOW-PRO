import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, TrendingUp, TrendingDown, Check, X, Clock, Loader2, Trash2, Edit2 } from 'lucide-react'
import { useTransactionStore } from '@/stores/transactionStore'
import { useAccountStore } from '@/stores/accountStore'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { BiometricAuthModal } from '@/components/ui/BiometricAuthModal'

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isBiometricOpen, setIsBiometricOpen] = useState(false)
  
  const currentTransaction = useTransactionStore((state) => state.currentTransaction)
  const fetchTransaction = useTransactionStore((state) => state.fetchTransaction)
  const approveTransaction = useTransactionStore((state) => state.approveTransaction)
  const rejectTransaction = useTransactionStore((state) => state.rejectTransaction)
  const deleteTransaction = useTransactionStore((state) => state.deleteTransaction)
  const isLoading = useTransactionStore((state) => state.isLoading)
  
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)

  useEffect(() => {
    if (id) {
      fetchTransaction(id)
      fetchAccounts()
    }
  }, [id, fetchTransaction, fetchAccounts])

  const account = accounts.find(a => a.id === currentTransaction?.account_id)

  const handleApprove = async () => {
    if (!id) return
    setIsProcessing(true)
    try {
      await approveTransaction(id)
      await fetchTransaction(id)
      await fetchAccounts()
    } catch (e) {
      console.error('handleApprove: Error', e)
    }
    setIsProcessing(false)
  }

  const handleApproveClick = () => {
    if (currentTransaction && currentTransaction.amount > 10000) {
      setIsBiometricOpen(true)
    } else {
      handleApprove()
    }
  }

  const handleReject = async () => {
    if (!id) return
    console.log('handleReject: Starting...')
    setIsProcessing(true)
    try {
      await rejectTransaction(id)
      await fetchTransaction(id)
      console.log('handleReject: Done')
    } catch (e) {
      console.error('handleReject: Error', e)
    }
    setIsProcessing(false)
  }

  const handleDelete = async () => {
    if (!id) return
    if (confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
      await deleteTransaction(id)
      navigate('/transactions')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="status-badge status-pending"><Clock className="w-3 h-3" /> معلق</span>
      case 'approved': return <span className="status-badge status-approved"><Check className="w-3 h-3" /> موافق</span>
      case 'rejected': return <span className="status-badge status-rejected"><X className="w-3 h-3" /> مرفوض</span>
      case 'completed': return <span className="status-badge status-completed">مكتمل</span>
      default: return <span className="text-muted-foreground">{status}</span>
    }
  }

  if (isLoading || !currentTransaction) {
    return (
      <div className="page-container flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isPositive = ['deposit', 'income'].includes(currentTransaction.type)

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">تفاصيل المعاملة</h1>
        </div>
        
        {/* أزرار التعديل والحذف */}
        {currentTransaction.status === 'pending' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(`/transactions/${id}/edit`)}
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

      <div className={`kpi-card mb-6 ${isPositive ? '' : 'bg-gradient-to-br from-red-600 to-red-800'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
            {isPositive ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
          </div>
          <div>
            <p className="text-sm opacity-80">{currentTransaction.type}</p>
            <p className="text-xl font-bold">{currentTransaction.reference}</p>
          </div>
        </div>
        <div className="text-left">
          <p className="text-4xl font-bold">
            {isPositive ? '+' : '-'}{formatCurrency(currentTransaction.amount)}
          </p>
        </div>
      </div>

      <div className="card-elevated p-4 space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">الحالة</span>
          {getStatusBadge(currentTransaction.status)}
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">التاريخ</span>
          <span>{formatDateTime(currentTransaction.created_at)}</span>
        </div>
        {account && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">الحساب</span>
            <span>{account.name} ({account.code})</span>
          </div>
        )}
        {currentTransaction.description && (
          <div className="pt-3 border-t">
            <span className="text-muted-foreground block mb-1">الوصف</span>
            <p>{currentTransaction.description}</p>
          </div>
        )}
      </div>

      {/* أزرار الموافقة والرفض للمعاملات المعلقة */}
      {currentTransaction.status === 'pending' && (
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
            onClick={handleApproveClick}
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

      <BiometricAuthModal 
        isOpen={isBiometricOpen}
        onClose={() => setIsBiometricOpen(false)}
        onSuccess={handleApprove}
        amount={currentTransaction?.amount}
      />
    </div>
  )
}