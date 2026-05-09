import { useEffect, useState } from 'react'
import { FileText, Download, TrendingUp, Wallet, Calendar, ArrowRight, Building2, User, ChevronLeft, Printer, Share2 } from 'lucide-react'
import { useTransactionStore } from '@/stores/transactionStore'
import { useAccountStore } from '@/stores/accountStore'
import { useTransferStore } from '@/stores/transferStore'
import { useProjectStore } from '@/stores/projectStore'
import { formatCurrency, formatDate } from '@/lib/format'
import { exportTransactionsToCSV, exportAccountsToCSV, exportTransfersToCSV, printReport, generateDailyReport } from '@/lib/export'
import { cn } from '@/lib/utils'

type ReportType = 'daily' | 'accounts' | 'cashflow' | 'transactions' | 'transfers' | 'trial_balance' | 'projects'

export default function ReportsPage() {
  const transactions = useTransactionStore((state) => state.transactions)
  const accounts = useAccountStore((state) => state.accounts)
  const transfers = useTransferStore((state) => state.transfers)
  const projects = useProjectStore((state) => state.projects)
  
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  const fetchTransfers = useTransferStore((state) => state.fetchTransfers)
  const fetchProjects = useProjectStore((state) => state.fetchProjects)

  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchTransactions()
    fetchAccounts()
    fetchTransfers()
    fetchProjects()
  }, [fetchTransactions, fetchAccounts, fetchTransfers, fetchProjects])

  // Filter Data
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.created_at)
    tDate.setHours(0, 0, 0, 0)
    if (dateFrom && tDate < new Date(dateFrom)) return false
    if (dateTo && tDate > new Date(dateTo)) return false
    return true
  })

  // Multi-Currency Totals
  const totals = {
    LYD: {
      income: filteredTransactions.filter(t => ['deposit', 'income'].includes(t.type) && t.status === 'approved' && accounts.find(a => a.id === t.account_id)?.currency === 'LYD').reduce((s, t) => s + t.amount, 0),
      expense: filteredTransactions.filter(t => ['withdrawal', 'expense', 'salary'].includes(t.type) && t.status === 'approved' && accounts.find(a => a.id === t.account_id)?.currency === 'LYD').reduce((s, t) => s + t.amount, 0),
    },
    USD: {
      income: filteredTransactions.filter(t => ['deposit', 'income'].includes(t.type) && t.status === 'approved' && accounts.find(a => a.id === t.account_id)?.currency === 'USD').reduce((s, t) => s + t.amount, 0),
      expense: filteredTransactions.filter(t => ['withdrawal', 'expense', 'salary'].includes(t.type) && t.status === 'approved' && accounts.find(a => a.id === t.account_id)?.currency === 'USD').reduce((s, t) => s + t.amount, 0),
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="page-container pb-24 animate-fade-in print:p-0 print:bg-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter">المركز التحليلي</h1>
          <p className="text-muted-foreground font-bold">التقارير المالية والرقابة الميدانية للمشاريع</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePrint} className="btn-secondary px-6 py-3 rounded-2xl flex items-center gap-2 font-black shadow-sm">
            <Printer className="w-5 h-5" />
            <span>طباعة</span>
          </button>
          <button className="btn-primary px-6 py-3 rounded-2xl flex items-center gap-2 font-black shadow-gold">
            <Share2 className="w-5 h-5" />
            <span>مشاركة</span>
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="glass-card p-6 mb-8 border-r-4 border-r-primary print:hidden">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-black text-sm">الفترة من:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-card border-2 border-border rounded-xl px-4 py-2 outline-none focus:border-primary transition-all font-bold" />
          </div>
          <div className="flex items-center gap-3">
            <span className="font-black text-sm">إلى:</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-card border-2 border-border rounded-xl px-4 py-2 outline-none focus:border-primary transition-all font-bold" />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-error font-black text-sm hover:underline">إلغاء الفلترة</button>
          )}
        </div>
      </div>

      {/* Currency Totals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="glass-card p-8 relative overflow-hidden border-b-4 border-primary">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet className="w-24 h-24" /></div>
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">إجمالي الحركة (دينار ليبي)</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-black text-foreground">{formatCurrency(totals.LYD.income - totals.LYD.expense, 'LYD')}</p>
              <p className="text-xs font-bold text-muted-foreground mt-1">الصافي المتاح حالياً</p>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-success">+{formatCurrency(totals.LYD.income, 'LYD')}</p>
              <p className="text-xs font-bold text-error">-{formatCurrency(totals.LYD.expense, 'LYD')}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-8 relative overflow-hidden border-b-4 border-info">
          <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-24 h-24" /></div>
          <p className="text-[10px] font-black text-info uppercase tracking-widest mb-2">إجمالي الحركة (دولار أمريكي)</p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-black text-foreground">{formatCurrency(totals.USD.income - totals.USD.expense, 'USD')}</p>
              <p className="text-xs font-bold text-muted-foreground mt-1">الصافي المتاح حالياً</p>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-success">+{formatCurrency(totals.USD.income, 'USD')}</p>
              <p className="text-xs font-bold text-error">-{formatCurrency(totals.USD.expense, 'USD')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Selection or Content */}
      {!selectedReport ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReportButton 
            id="daily" title="تقرير اليومية" desc="سجل الحركات المالية التفصيلي" icon={<FileText />} color="primary" 
            onClick={() => setSelectedReport('daily')} 
          />
          <ReportButton 
            id="projects" title="تحليل المشاريع" desc="مصاريف كل موقع بناء على حدة" icon={<Building2 />} color="success" 
            onClick={() => setSelectedReport('projects')} 
          />
          <ReportButton 
            id="accounts" title="أرصدة الخزائن" desc="كشف أرصدة المهندسين والعهـد" icon={<Wallet />} color="warning" 
            onClick={() => setSelectedReport('accounts')} 
          />
          <ReportButton 
            id="transfers" title="سجل التحويلات" desc="مراقبة حركة الأموال بين الحسابات" icon={<Share2 />} color="info" 
            onClick={() => setSelectedReport('transfers')} 
          />
          <ReportButton 
            id="cashflow" title="التدفق النقدي" desc="تحليل السيولة الداخلة والخارجة" icon={<TrendingUp />} color="error" 
            onClick={() => setSelectedReport('cashflow')} 
          />
          <ReportButton 
            id="trial_balance" title="ميزان المراجعة" desc="التقرير المحاسبي الختامي" icon={<FileText />} color="secondary" 
            onClick={() => setSelectedReport('trial_balance')} 
          />
        </div>
      ) : (
        <div className="space-y-6">
          <button onClick={() => setSelectedReport(null)} className="flex items-center gap-2 text-primary font-black text-sm hover:translate-x-1 transition-transform mb-6 print:hidden">
            <ChevronLeft className="w-5 h-5 rotate-180" />
            <span>العودة لقائمة التقارير</span>
          </button>
          
          <div className="glass-card p-8 min-h-[600px] border-t-8 border-t-primary shadow-2xl relative overflow-hidden bg-white/50 backdrop-blur-xl">
             {renderReport(selectedReport, { filteredTransactions, accounts, transfers, projects, totals })}
          </div>
        </div>
      )}
    </div>
  )
}

function ReportButton({ title, desc, icon, color, onClick }: any) {
  const colors: any = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
    error: 'bg-error/10 text-error',
    secondary: 'bg-secondary/10 text-secondary'
  }

  return (
    <button onClick={onClick} className="glass-card p-8 group hover:scale-[1.02] transition-all duration-300 text-right relative overflow-hidden border-2 border-transparent hover:border-primary/20">
      <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-6", colors[color])}>
        {icon}
      </div>
      <h3 className="text-xl font-black text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground font-bold">{desc}</p>
    </button>
  )
}

function renderReport(type: ReportType, data: any) {
  const { filteredTransactions, accounts, transfers, projects } = data

  switch (type) {
    case 'daily':
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-6 border-border/50">
             <h2 className="text-2xl font-black">تقرير اليومية التفصيلي</h2>
             <div className="text-left">
               <p className="text-[10px] font-black text-muted-foreground uppercase">تاريخ التقرير</p>
               <p className="font-bold">{formatDate(new Date().toISOString())}</p>
             </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-4 text-right font-black">المرجع</th>
                <th className="p-4 text-right font-black">البيان</th>
                <th className="p-4 text-right font-black">الحساب</th>
                <th className="p-4 text-right font-black">المبلغ</th>
                <th className="p-4 text-right font-black">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredTransactions.map((t: any) => (
                <tr key={t.id} className="hover:bg-primary/5 transition-colors">
                  <td className="p-4 font-bold">{t.reference}</td>
                  <td className="p-4 font-bold text-muted-foreground">{t.description || t.type}</td>
                  <td className="p-4 font-bold">{accounts.find((a: any) => a.id === t.account_id)?.name}</td>
                  <td className={cn("p-4 font-black", ['deposit', 'income'].includes(t.type) ? "text-success" : "text-error")}>
                    {formatCurrency(t.amount, accounts.find((a: any) => a.id === t.account_id)?.currency)}
                  </td>
                  <td className="p-4">
                     <span className={cn("px-3 py-1 rounded-full text-[10px] font-black", t.status === 'approved' ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                       {t.status === 'approved' ? 'معتمد' : 'معلق'}
                     </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'projects':
      return (
        <div className="space-y-8">
           <div className="flex items-center justify-between border-b pb-6 border-border/50">
             <h2 className="text-2xl font-black">تحليل مصاريف المواقع</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projects.map((p: any) => {
               const pTxs = filteredTransactions.filter((t: any) => (t as any).project_id === p.id && t.status === 'approved')
               const totalSpent = pTxs.filter((t: any) => ['expense', 'withdrawal', 'salary'].includes(t.type)).reduce((s: any, t: any) => s + t.amount, 0)
               return (
                 <div key={p.id} className="p-6 rounded-3xl bg-card border-2 border-border/50 hover:border-primary/30 transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-lg font-black text-foreground">{p.name}</h4>
                        <p className="text-xs text-muted-foreground font-bold">{p.code}</p>
                      </div>
                      <div className="bg-primary/10 text-primary p-3 rounded-2xl"><Building2 className="w-6 h-6" /></div>
                    </div>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                         <span className="text-sm font-bold text-muted-foreground">إجمالي المصاريف الميدانية</span>
                         <span className="text-xl font-black text-error">{formatCurrency(totalSpent)}</span>
                       </div>
                       <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: '45%' }} />
                       </div>
                       <p className="text-[10px] font-black text-muted-foreground uppercase text-center">{pTxs.length} عملية صرف معتمدة</p>
                    </div>
                 </div>
               )
            })}
          </div>
        </div>
      )
    case 'accounts':
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-black border-b pb-6 border-border/50">كشف عُهد المهندسين</h2>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-4 text-right font-black">المهندس / الحساب</th>
                <th className="p-4 text-right font-black">الكود</th>
                <th className="p-4 text-right font-black">الرصيد المتاح</th>
                <th className="p-4 text-right font-black">العملة</th>
                <th className="p-4 text-right font-black">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {accounts.filter((a: any) => a.type === 'cashbox' || a.type === 'employee').map((a: any) => (
                <tr key={a.id}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary"><User className="w-5 h-5" /></div>
                      <span className="font-black">{a.name}</span>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-muted-foreground">{a.code}</td>
                  <td className="p-4 font-black text-lg">{formatCurrency(a.balance, a.currency)}</td>
                  <td className="p-4 font-bold">{a.currency}</td>
                  <td className="p-4">
                     <span className={cn("px-3 py-1 rounded-full text-[10px] font-black", a.status === 'active' ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground")}>
                       {a.status === 'active' ? 'نشط' : 'متوقف'}
                     </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return <div className="p-20 text-center font-black opacity-20 text-4xl">قيد التطوير...</div>
  }
}
s-center justify-center mb-3">
              <Wallet className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold mb-1">دفتر الأستاذ</h3>
            <p className="text-sm text-muted-foreground">حركات الحسابات</p>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button 
            onClick={() => setSelectedReport(null)}
            className="flex items-center gap-2 text-primary hover:underline mb-4"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للقائمة
          </button>
          {renderReportContent()}
        </div>
      )}
    </div>
  )
}