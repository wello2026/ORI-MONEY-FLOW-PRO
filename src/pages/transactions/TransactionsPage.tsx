import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Repeat, Search, Filter, TrendingUp, TrendingDown, ChevronRight, ChevronLeft } from 'lucide-react'
import { useTransactionStore } from '@/stores/transactionStore'
import { useAccountStore } from '@/stores/accountStore'
import { ROUTES } from '@/lib/constants'
import { formatCurrency } from '@/lib/format'

export default function TransactionsPage() {
  const transactions = useTransactionStore((state) => state.transactions)
  const pagination = useTransactionStore((state) => state.pagination)
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions)
  const isLoading = useTransactionStore((state) => state.isLoading)
  const accounts = useAccountStore((state) => state.accounts)
  const navigate = useNavigate()

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleNextPage = () => {
    if (pagination.page * pagination.limit < pagination.total) {
      fetchTransactions({ page: pagination.page + 1, limit: pagination.limit })
    }
  }

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchTransactions({ page: pagination.page - 1, limit: pagination.limit })
    }
  }

  return (
    <div className="page-container pb-24">
      <div className="page-header">
        <h1 className="page-title">المعاملات</h1>
        <p className="page-subtitle">سجل جميع المعاملات المالية</p>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="بحث..." className="input-field pr-9" />
        </div>
        <button className="p-3 rounded-lg border border-input hover:bg-muted">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {transactions.map((tx) => (
          <Link
            key={tx.id}
            to={`/transactions/${tx.id}`}
            className="card-elevated p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                ['deposit', 'income'].includes(tx.type) ? 'bg-success/10' : 'bg-error/10'
              }`}>
                {['deposit', 'income'].includes(tx.type) ? (
                  <TrendingUp className="w-6 h-6 text-success" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-error" />
                )}
              </div>
              <div>
                <p className="font-semibold">{tx.type}</p>
                <p className="text-sm text-muted-foreground">
                  {tx.reference} • {tx.account_id ? accounts.find(a => a.id === tx.account_id)?.name : '-'}
                </p>
              </div>
            </div>
            <div className="text-left">
              <p className={`font-bold text-lg ${
                ['deposit', 'income'].includes(tx.type) ? 'amount-positive' : 'amount-negative'
              }`}>
                {['deposit', 'income'].includes(tx.type) ? '+' : '-'}
                {formatCurrency(tx.amount)}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                tx.status === 'pending' ? 'bg-warning/10 text-warning' :
                tx.status === 'approved' ? 'bg-success/10 text-success' :
                tx.status === 'rejected' ? 'bg-error/10 text-error' :
                'bg-primary/10 text-primary'
              }`}>
                {tx.status === 'pending' ? 'معلق' :
                 tx.status === 'approved' ? 'موافق' :
                 tx.status === 'rejected' ? 'مرفوض' : 'مكتمل'}
              </span>
            </div>
          </Link>
        ))}
        {transactions.length === 0 && !isLoading && (
          <div className="empty-state">
            <Repeat className="w-16 h-16 opacity-30" />
            <h3>لا توجد معاملات</h3>
            <p>أضف معاملتك الأولى</p>
          </div>
        )}
      </div>

      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between mt-6 p-4 bg-card rounded-xl border border-border">
          <button 
            onClick={handlePrevPage}
            disabled={pagination.page === 1}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            السابق
          </button>
          <span className="text-sm text-muted-foreground font-medium">
            صفحة {pagination.page} من {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button 
            onClick={handleNextPage}
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            التالي
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      <button onClick={() => navigate(ROUTES.TRANSACTION_NEW)} className="floating-action-btn">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}