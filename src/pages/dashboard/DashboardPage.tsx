import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Wallet, RefreshCw, Brain, LayoutDashboard, Building, Users, ArrowUpRight, ArrowDownRight, Coins } from 'lucide-react'
import { useAccountStore } from '@/stores/accountStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'
import { formatCurrency, formatRelativeTime } from '@/lib/format'
import { DashboardCharts } from '@/components/dashboard/Charts'
import { AiDashboard } from '@/components/dashboard/AiDashboard'
import { CompanySwitcher } from '@/components/layout/CompanySwitcher'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  
  const transactions = useTransactionStore((state) => state.transactions)
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions)
  
  const user = useAuthStore((state) => state.user)
  const currentCompany = useAuthStore((state) => state.currentCompany)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'ai'>('overview')
  const [stats, setStats] = useState({ projects: 0, users: 0 })

  useEffect(() => {
    fetchAccounts()
    fetchTransactions()
    fetchGlobalStats()
  }, [fetchAccounts, fetchTransactions])

  async function fetchGlobalStats() {
    try {
      const [pRes, uRes] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
      ])
      setStats({
        projects: pRes.count || 0,
        users: uRes.count || 0
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchAccounts(), fetchTransactions(), fetchGlobalStats()])
    setIsRefreshing(false)
  }

  const totalLYD = accounts.filter(a => a.currency === 'LYD').reduce((sum, a) => sum + a.balance, 0)
  const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.balance, 0)
  const recentTransactions = transactions.slice(0, 5)

  return (
    <div className="space-y-8 pb-24 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">مرحباً {user?.full_name?.split(' ')[0] || 'بالمركز المالي'}</h1>
          <p className="text-muted-foreground text-sm">{currentCompany?.company_name_ar || currentCompany?.company_name || 'ORI Financial Operations'}</p>
        </div>
        <div className="flex items-center gap-3">
          <CompanySwitcher />
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-14 h-14 rounded-3xl bg-card border-2 border-border flex items-center justify-center hover:border-primary transition-all"
          >
            <RefreshCw className={`w-6 h-6 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="إجمالي السيولة (دينار)" 
          value={totalLYD} 
          unit="LYD"
          trend="+5.2%" 
          icon={<Wallet className="w-6 h-6" />}
          color="primary"
        />
        <KpiCard 
          title="إجمالي السيولة (دولار)" 
          value={totalUSD} 
          unit="USD"
          trend="+1.8%" 
          icon={<Coins className="w-6 h-6" />}
          color="info"
        />
        <KpiCard 
          title="مواقع البناء" 
          value={stats.projects} 
          unit="موقع"
          trend="نشط" 
          icon={<Building className="w-6 h-6" />}
          color="success"
        />
        <KpiCard 
          title="فريق العمل الميداني" 
          value={stats.users} 
          unit="مهندس/عامل"
          trend="متصل" 
          icon={<Users className="w-6 h-6" />}
          color="warning"
        />
      </div>

      <div className="flex bg-card p-1.5 rounded-3xl w-full max-w-sm border-2 border-border/50 shadow-inner">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-sm font-black transition-all ${
            activeTab === 'overview' ? 'bg-background shadow-gold text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          النظرة العامة
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-sm font-black transition-all ${
            activeTab === 'ai' ? 'bg-primary text-white shadow-gold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Brain className="w-5 h-5" />
          تحليل الذكاء
        </button>
      </div>

      {activeTab === 'ai' ? (
        <AiDashboard />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    المسار المالي للمشاريع
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">تتبع التدفقات النقدية والمصاريف الميدانية</p>
                </div>
              </div>
              <DashboardCharts />
            </div>

            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
                <h3 className="font-black text-lg">أحدث المعاملات (الميدان)</h3>
                <Link to={ROUTES.TRANSACTIONS} className="btn-secondary text-[10px] py-2 px-4 rounded-xl font-black">عرض الكل</Link>
              </div>
              <div className="divide-y divide-border/30">
                {recentTransactions.length > 0 ? recentTransactions.map((tx) => (
                  <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-primary/5 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        ['deposit', 'income'].includes(tx.type) ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {['deposit', 'income'].includes(tx.type) ? <ArrowUpRight className="w-7 h-7" /> : <ArrowDownRight className="w-7 h-7" />}
                      </div>
                      <div>
                        <p className="font-black text-foreground text-lg">{tx.type}</p>
                        <p className="text-xs text-muted-foreground font-bold">{tx.reference || tx.id.slice(0,8)} • {formatRelativeTime(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className={`text-xl font-black ${
                        ['deposit', 'income'].includes(tx.type) ? 'text-success' : 'text-error'
                      }`}>
                        {['deposit', 'income'].includes(tx.type) ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="p-10 text-center text-muted-foreground">لا توجد معاملات بعد</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass-card">
              <div className="p-6 border-b border-border/50 bg-muted/20">
                <h3 className="font-black text-lg">توزيع السيولة (العهـد)</h3>
              </div>
              <div className="p-4 space-y-4">
                {accounts.filter(a => a.type === 'cashbox' || a.type === 'employee').slice(0, 6).map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 rounded-2xl border-2 border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-primary shadow-sm">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-foreground">{account.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold tracking-tighter uppercase">{account.code} • {account.currency}</p>
                      </div>
                    </div>
                    <p className="text-lg font-black text-foreground">{formatCurrency(account.balance, account.currency)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card">
              <div className="p-6 border-b border-border/50 bg-muted/20">
                <h3 className="font-bold text-lg">ملخص سريع</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20">
                  <span className="text-sm text-muted-foreground">إجمالي المشاريع</span>
                  <span className="font-bold">{stats.projects}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20">
                  <span className="text-sm text-muted-foreground">إجمالي المستخدمين</span>
                  <span className="font-bold">{stats.users}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20">
                  <span className="text-sm text-muted-foreground">آخر تسجيل دخول</span>
                  <span className="font-bold text-xs">{user?.created_at ? formatRelativeTime(user.created_at) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ title, value, unit, trend, icon, color }: any) {
  const colorMap: any = {
    primary: 'text-primary bg-primary/10 border-primary',
    success: 'text-success bg-success/10 border-success',
    error: 'text-error bg-error/10 border-error',
    info: 'text-info bg-info/10 border-info',
    warning: 'text-warning bg-warning/10 border-warning'
  }

  return (
    <div className="glass-card p-8 relative overflow-hidden group hover:scale-[1.05] transition-all duration-500 border-b-4">
      <div className={`absolute bottom-0 left-0 h-1 w-full opacity-30 ${colorMap[color].split(' ')[1]}`} />
      <div className="flex items-start justify-between mb-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${colorMap[color].split(' ').slice(0,2).join(' ')}`}>
          {icon}
        </div>
        <div className="text-left">
          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${colorMap[color].split(' ').slice(0,2).join(' ')}`}>
            {trend}
          </span>
        </div>
      </div>
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-foreground">
        {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : value} 
        <span className="text-xs font-bold text-muted-foreground mr-2">{unit}</span>
      </h3>
    </div>
  )
}