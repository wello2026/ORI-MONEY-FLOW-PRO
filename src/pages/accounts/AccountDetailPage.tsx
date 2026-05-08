import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Edit, Trash2, Wallet, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react'
import { useAccountStore } from '@/stores/accountStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { formatCurrency, formatDateTime, formatAccountType } from '@/lib/format'

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentAccount = useAccountStore((state) => state.currentAccount)
  const fetchAccount = useAccountStore((state) => state.fetchAccount)
  const deleteAccount = useAccountStore((state) => state.deleteAccount)
  const isLoading = useAccountStore((state) => state.isLoading)
  const error = useAccountStore((state) => state.error)
  const successMessage = useAccountStore((state) => state.successMessage)
  const clearMessages = useAccountStore((state) => state.clearMessages)
  
  const transactions = useTransactionStore((state) => state.transactions)
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [localSuccess, setLocalSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchAccount(id)
      fetchTransactions({ account_id: id })
    }
  }, [id, fetchAccount, fetchTransactions])

  useEffect(() => {
    if (error) {
      setLocalError(error)
      clearMessages()
    }
  }, [error, clearMessages])

  useEffect(() => {
    if (successMessage) {
      setLocalSuccess(successMessage)
      clearMessages()
      setTimeout(() => {
        navigate('/accounts')
      }, 1500)
    }
  }, [successMessage, clearMessages, navigate])

  const handleDelete = async () => {
    if (!id) return
    
    setLocalError(null)
    setLocalSuccess(null)
    
    const result = await deleteAccount(id)
    
    if (result.success) {
      setLocalSuccess('تم حذف الحساب بنجاح')
    } else {
      setLocalError(result.error || 'حدث خطأ في الحذف')
      setShowDeleteConfirm(false)
    }
  }

  if (!currentAccount) {
    return (
      <div className="page-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  const accountTransactions = transactions.filter((t) => t.account_id === id)

  return (
    <div className="page-container">
      {localError && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">خطأ</p>
            <p className="text-sm text-destructive/80">{localError}</p>
          </div>
          <button 
            onClick={() => setLocalError(null)}
            className="mr-auto text-destructive hover:bg-destructive/20 p-1 rounded"
          >
            ×
          </button>
        </div>
      )}

      {localSuccess && (
        <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-success">نجاح</p>
            <p className="text-sm text-success/80">{localSuccess}</p>
          </div>
          <button 
            onClick={() => setLocalSuccess(null)}
            className="mr-auto text-success hover:bg-success/20 p-1 rounded"
          >
            ×
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-destructive">تأكيد الحذف</p>
              <p className="text-sm text-destructive/80 mb-3">
                هل أنت متأكد من حذف حساب "{currentAccount.name}"؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-sm"
                >
                  {isLoading ? 'جاري الحذف...' : 'نعم، حذف'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">تفاصيل الحساب</h1>
      </div>

      <div className="kpi-card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{currentAccount.name}</h2>
              <p className="opacity-80">{currentAccount.code}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate(`/accounts/${id}/edit`)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="text-left">
          <p className="text-sm opacity-80">الرصيد الحالي</p>
          <p className="text-4xl font-bold">{formatCurrency(currentAccount.balance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground mb-1">النوع</p>
          <p className="font-semibold">{formatAccountType(currentAccount.type)}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground mb-1">الحالة</p>
          <p className="font-semibold">{currentAccount.status === 'active' ? 'نشط' : currentAccount.status}</p>
        </div>
      </div>

      <div className="card-elevated">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">المعاملات</h3>
          <span className="text-sm text-muted-foreground">{accountTransactions.length} معاملة</span>
        </div>
        <div className="divide-y divide-border-light">
          {accountTransactions.slice(0, 10).map((tx) => (
            <Link
              key={tx.id}
              to={`/transactions/${tx.id}`}
              className="flex items-center justify-between p-4 hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  ['deposit', 'income'].includes(tx.type) ? 'bg-success/10' : 'bg-error/10'
                }`}>
                  {['deposit', 'income'].includes(tx.type) ? (
                    <TrendingUp className="w-5 h-5 text-success" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-error" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{tx.type}</p>
                  <p className="text-sm text-muted-foreground">{tx.reference}</p>
                </div>
              </div>
              <div className="text-left">
                <p className={`font-semibold ${
                  ['deposit', 'income'].includes(tx.type) ? 'amount-positive' : 'amount-negative'
                }`}>
                  {formatCurrency(tx.amount)}
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</p>
              </div>
            </Link>
          ))}
          {accountTransactions.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <p>لا توجد معاملات</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}