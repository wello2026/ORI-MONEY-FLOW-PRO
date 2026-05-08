import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Wallet, FileCheck, RefreshCw, Brain, LayoutDashboard } from 'lucide-react'
import { useAccountStore } from '@/stores/accountStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { ROUTES } from '@/lib/constants'
import { formatCurrency, formatRelativeTime } from '@/lib/format'
import { DashboardCharts } from '@/components/dashboard/Charts'
import { AiDashboard } from '@/components/dashboard/AiDashboard'

export default function DashboardPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  
  const transactions = useTransactionStore((state) => state.transactions)
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions)
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'ai'>('overview')

  useEffect(() => {
    fetchAccounts()
    fetchTransactions()
  }, [fetchAccounts, fetchTransactions])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchAccounts(), fetchTransactions()])
    setIsRefreshing(false)
  }

  const recentTransactions = transactions.slice(0, 5)

  return (
    <div className="page-container pb-24">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="page-subtitle">نظرة شاملة وذكية على أداء حساباتك</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex bg-muted/50 p-1 rounded-xl w-full max-w-sm mb-6 border border-border">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'overview' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          النظرة العامة
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'ai' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Brain className="w-4 h-4" />
          الذكاء الاصطناعي
        </button>
      </div>

      {activeTab === 'ai' ? (
        <AiDashboard />
      ) : (
        <>
          <DashboardCharts />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="card-elevated">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">أحدث الحسابات</h2>
                <Link to={ROUTES.ACCOUNTS} className="text-sm text-primary">عرض الكل</Link>
              </div>
              <div className="divide-y divide-border-light">
                {accounts.slice(0, 3).map((account) => (
                  <Link
                    key={account.id}
                    to={`/accounts/${account.id}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-muted-foreground">{account.code}</p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatCurrency(account.balance)}</p>
                  </Link>
                ))}
                {accounts.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground">
                    <Wallet className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا توجد حسابات</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card-elevated">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">أحدث المعاملات</h2>
                <Link to={ROUTES.TRANSACTIONS} className="text-sm text-primary">عرض الكل</Link>
              </div>
              <div className="divide-y divide-border-light">
                {recentTransactions.slice(0, 3).map((tx) => (
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
                        {['deposit', 'income'].includes(tx.type) ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(tx.created_at)}</p>
                    </div>
                  </Link>
                ))}
                {recentTransactions.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground">
                    <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا توجد معاملات</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}