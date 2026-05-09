import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Wallet, RefreshCw, Brain, LayoutDashboard, Building, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useAccountStore } from '@/stores/accountStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { ROUTES } from '@/lib/constants'
import { formatCurrency, formatRelativeTime } from '@/lib/format'
import { DashboardCharts } from '@/components/dashboard/Charts'
import { AiDashboard } from '@/components/dashboard/AiDashboard'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  
  const transactions = useTransactionStore((state) => state.transactions)
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions)
  
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

  const recentTransactions = transactions.slice(0, 5)

  return (
    <div className="space-y-8 pb-24 animate-fade-in">
      {/* Golden Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">الرئيسية الذهبية</h1>
          <p className="text-muted-foreground text-sm">أهلاً بك في لوحة تحكم ORI الاحترافية</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-12 h-12 rounded-2xl bg-card border-2 border-border flex items-center justify-center hover:border-primary transition-all shadow-sm"
        >
          <RefreshCw className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="إجمالي الرصيد" 
          value={accounts.reduce((sum, a) => sum + a.balance, 0)} 
          trend="+12%" 
          icon={<Wallet className="w-6 h-6" />}
          color="primary"
        />
        <KpiCard 
          title="المشاريع النشطة" 
          value={stats.projects} 
          unit="موقع"
          trend="+2" 
          icon={<Building className="w-6 h-6" />}
          color="success"
        />
        <KpiCard 
          title="المصاريف (الشهر)" 
          value={12450} 
          trend="-5%" 
          icon={<TrendingDown className="w-6 h-6" />}
          color="error"
        />
        <KpiCard 
          title="الفريق الميداني" 
          value={stats.users} 
          unit="عضو"
          trend="نشط" 
          icon={<Users className="w-6 h-6" />}
          color="info"
        />
      </div>

      <div className="flex bg-muted/50 p-1 rounded-2xl w-full max-w-sm border-2 border-border/50">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'overview' ? 'bg-card shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          النظرة العامة
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'ai' ? 'bg-primary text-white shadow-gold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Brain className="w-4 h-4" />
          الذكاء الاصطناعي
        </button>
      </div>

      {activeTab === 'ai' ? (
        <AiDashboard />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-6">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                تحليل السيولة والمصاريف
              </h3>
              <DashboardCharts />
            </div>

            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
                <h3 className="font-black">أحدث المعاملات الميدانية</h3>
                <Link to={ROUTES.TRANSACTIONS} className="text-xs font-bold text-primary hover:underline">عرض السجل</Link>
              </div>
              <div className="divide-y divide-border/30">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        ['deposit', 'income'].includes(tx.type) ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {['deposit', 'income'].includes(tx.type) ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-black text-foreground group-hover:text-primary transition-colors">{tx.type}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{tx.reference}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className={`font-black ${
                        ['deposit', 'income'].includes(tx.type) ? 'text-success' : 'text-error'
                      }`}>
                        {['deposit', 'income'].includes(tx.type) ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-bold">{formatRelativeTime(tx.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass-card">
              <div className="p-6 border-b border-border/50 bg-muted/20">
                <h3 className="font-black">عُهد المهندسين</h3>
              </div>
              <div className="p-4 space-y-4">
                {accounts.slice(0, 5).map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 rounded-2xl border-2 border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black">{account.name}</p>
                        <p className="text-[10px] text-muted-foreground">{account.code}</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-foreground">{formatCurrency(account.balance)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/10 rounded-3xl p-6 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl group-hover:scale-125 transition-all duration-700" />
              <h4 className="text-lg font-black text-primary mb-2 relative z-10">تحتاج للمساعدة؟</h4>
              <p className="text-xs text-primary/70 mb-4 relative z-10">تواصل مع الدعم الفني لضبط إعدادات شجرة الحسابات.</p>
              <button className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-gold relative z-10">
                تواصل الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ title, value, unit = 'LYD', trend, icon, color }: any) {
  const colorMap: any = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    error: 'text-error bg-error/10',
    info: 'text-info bg-info/10'
  }

  return (
    <div className="glass-card p-6 relative overflow-hidden group hover:scale-[1.05] transition-all duration-500">
      <div className={`absolute top-0 right-0 w-1 h-full bg-${color}`} />
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="text-left">
          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${colorMap[color]}`}>
            {trend}
          </span>
        </div>
      </div>
      <p className="text-xs font-bold text-muted-foreground mb-1">{title}</p>
      <h3 className="text-2xl font-black text-foreground">
        {typeof value === 'number' ? value.toLocaleString() : value} 
        <span className="text-xs font-normal text-muted-foreground mr-1">{unit}</span>
      </h3>
    </div>
  )
}