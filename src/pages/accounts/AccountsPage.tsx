import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Wallet, Search, Filter, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import { useAccountStore } from '@/stores/accountStore'
import { ROUTES } from '@/lib/constants'
import { formatCurrency, formatAccountType } from '@/lib/format'

export default function AccountsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  const isLoading = useAccountStore((state) => state.isLoading)
  const error = useAccountStore((state) => state.error)
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const filteredAccounts = accounts.filter(acc =>
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)

  const handleRetry = () => {
    fetchAccounts()
  }

  return (
    <div className="page-container">
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">خطأ في جلب الحسابات</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
          <button 
            onClick={handleRetry}
            className="btn-secondary text-sm py-1 px-3 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
        </div>
      )}

      <div className="page-header">
        <h1 className="page-title">الحسابات</h1>
        <p className="page-subtitle">إدارة حساباتك وصناديقك</p>
      </div>

      <div className="kpi-card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">إجمالي الرصيد</p>
            <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
          </div>
          <Wallet className="w-12 h-12 opacity-50" />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث..."
            className="input-field pr-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="p-3 rounded-lg border border-input hover:bg-muted">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {isLoading && accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">جاري تحميل الحسابات...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAccounts.map((account) => (
            <Link
              key={account.id}
              to={`/accounts/${account.id}`}
              className="card-elevated p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {account.code} • {formatAccountType(account.type)}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">{formatCurrency(account.balance)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  account.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                }`}>
                  {account.status === 'active' ? 'نشط' : account.status}
                </span>
              </div>
            </Link>
          ))}

          {filteredAccounts.length === 0 && !isLoading && (
            <div className="empty-state">
              <Wallet className="w-16 h-16 opacity-30" />
              <h3>لا توجد حسابات</h3>
              <p>أضف حسابك الأول للبدء</p>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => navigate(ROUTES.ACCOUNT_NEW)}
        className="floating-action-btn"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}