import { useState } from 'react'
import { FileText, TrendingUp, TrendingDown, Scale, Printer, Download, Calendar, RefreshCw } from 'lucide-react'
import { useAccountingStore } from '@/stores/journalEntryStore'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

type ReportType = 'trial_balance' | 'general_journal' | 'income_statement' | 'balance_sheet'

export default function AccountingReportsPage() {
  const {
    trialBalance, generalJournal, incomeStatement, balanceSheet,
    fetchTrialBalance, fetchGeneralJournal, fetchIncomeStatement, fetchBalanceSheet,
    isLoading
  } = useAccountingStore()

  const [activeReport, setActiveReport] = useState<ReportType>('trial_balance')
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])

  const loadReport = async () => {
    switch (activeReport) {
      case 'trial_balance':
        await fetchTrialBalance(dateFrom, dateTo)
        break
      case 'general_journal':
        await fetchGeneralJournal(dateFrom, dateTo)
        break
      case 'income_statement':
        await fetchIncomeStatement(dateFrom, dateTo)
        break
      case 'balance_sheet':
        await fetchBalanceSheet(asOfDate)
        break
    }
  }

  const reportTabs = [
    { id: 'trial_balance' as ReportType, label: 'ميزان المراجعة', icon: Scale },
    { id: 'general_journal' as ReportType, label: 'اليومية', icon: FileText },
    { id: 'income_statement' as ReportType, label: 'قائمة الدخل', icon: TrendingUp },
    { id: 'balance_sheet' as ReportType, label: 'الميزانية', icon: TrendingDown },
  ]

  return (
    <div className="page-container pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">التقارير المحاسبية</h1>
          <p className="text-muted-foreground text-sm">تقارير المحاسبة المزدوجة</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-xl"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all',
              activeReport === tab.id
                ? 'bg-primary text-white shadow-lg'
                : 'bg-card border border-border text-foreground hover:border-primary/30'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Filters */}
      {activeReport !== 'balance_sheet' ? (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">من:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="input-field w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">إلى:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="input-field w-auto"
            />
          </div>
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            عرض التقرير
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">كما في:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="input-field w-auto"
            />
          </div>
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            عرض الميزانية
          </button>
        </div>
      )}

      {/* Report Content */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {activeReport === 'trial_balance' && <TrialBalanceReport data={trialBalance} />}
        {activeReport === 'general_journal' && <GeneralJournalReport data={generalJournal} />}
        {activeReport === 'income_statement' && <IncomeStatementReport data={incomeStatement} />}
        {activeReport === 'balance_sheet' && <BalanceSheetReport data={balanceSheet} />}
      </div>
    </div>
  )
}

function TrialBalanceReport({ data }: { data: any[] }) {
  const totalDebit = data?.reduce((s: number, r: any) => s + (r.debit_amount || 0), 0) || 0
  const totalCredit = data?.reduce((s: number, r: any) => s + (r.credit_amount || 0), 0) || 0
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001

  return (
    <div>
      <div className="p-4 border-b border-border bg-muted/20">
        <h3 className="font-bold text-lg">ميزان المراجعة</h3>
        <p className="text-xs text-muted-foreground">Trial Balance</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-right p-3 font-bold">الكود</th>
              <th className="text-right p-3 font-bold">اسم الحساب</th>
              <th className="text-left p-3 font-bold">العملة</th>
              <th className="text-left p-3 font-bold">مدين</th>
              <th className="text-left p-3 font-bold">دائن</th>
            </tr>
          </thead>
          <tbody>
            {data?.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">لا توجد بيانات</td>
              </tr>
            ) : (
              data?.map((row: any, idx: number) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3 font-mono text-sm">{row.account_number}</td>
                  <td className="p-3 font-bold text-foreground">{row.account_name_ar || row.account_name}</td>
                  <td className="p-3 text-sm text-muted-foreground">{row.currency_code}</td>
                  <td className="p-3 text-left font-bold text-blue-600">
                    {row.debit_amount > 0 ? formatCurrency(row.debit_amount, row.currency_code) : '—'}
                  </td>
                  <td className="p-3 text-left font-bold text-amber-600">
                    {row.credit_amount > 0 ? formatCurrency(row.credit_amount, row.currency_code) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 font-black">
              <td colSpan={3} className="p-3 text-sm">الإجمالي</td>
              <td className="p-3 text-left text-blue-600">{formatCurrency(totalDebit, 'LYD')}</td>
              <td className="p-3 text-left text-amber-600">{formatCurrency(totalCredit, 'LYD')}</td>
            </tr>
            {!isBalanced && (
              <tr>
                <td colSpan={5} className="p-3 text-center text-red-500 font-bold">
                  ⚠ الميزان غير متوازن! الفرق: {formatCurrency(Math.abs(totalDebit - totalCredit), 'LYD')}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function GeneralJournalReport({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">لا توجد بيانات</div>
  }

  // Group by entry
  const groupedEntries = data.reduce((acc: Record<string, any[]>, row: any) => {
    if (!acc[row.entry_id]) acc[row.entry_id] = []
    acc[row.entry_id].push(row)
    return acc
  }, {})

  return (
    <div>
      <div className="p-4 border-b border-border bg-muted/20">
        <h3 className="font-bold text-lg">اليومية المحاسبية</h3>
        <p className="text-xs text-muted-foreground">General Journal</p>
      </div>
      <div className="divide-y divide-border">
        {Object.entries(groupedEntries).map(([entryId, lines]: [string, any[]]) => (
          <div key={entryId} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-bold text-foreground">{lines[0].entry_number}</span>
                <span className="text-xs text-muted-foreground mx-2">•</span>
                <span className="text-sm text-muted-foreground">{lines[0].entry_date}</span>
              </div>
              <span className="text-sm text-muted-foreground">{lines[0].description}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs font-bold text-muted-foreground mb-2">
              <div>الحساب</div>
              <div className="text-left col-span-2">الوصف</div>
              <div className="text-left">مدين</div>
              <div className="text-left">دائن</div>
            </div>
            {lines.map((line: any, idx: number) => (
              <div key={idx} className="grid grid-cols-4 gap-2 py-1.5 text-sm border-b border-border/30 last:border-0">
                <div className="font-medium">{line.account_name_ar || line.account_name}</div>
                <div className="text-muted-foreground col-span-2">{line.description || '—'}</div>
                <div className="text-left text-blue-600 font-bold">
                  {line.debit > 0 ? formatCurrency(line.debit, line.currency_code) : '—'}
                </div>
                <div className="text-left text-amber-600 font-bold">
                  {line.credit > 0 ? formatCurrency(line.credit, line.currency_code) : '—'}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function IncomeStatementReport({ data }: { data: any[] }) {
  const revenues = data?.filter((r: any) => r.category === 'الإيرادات') || []
  const expenses = data?.filter((r: any) => r.category === 'المصروفات') || []

  const totalRevenue = revenues.reduce((s: number, r: any) => s + (r.net_amount || 0), 0)
  const totalExpense = expenses.reduce((s: number, r: any) => s + Math.abs(r.net_amount || 0), 0)
  const netIncome = totalRevenue - totalExpense

  return (
    <div>
      <div className="p-4 border-b border-border bg-muted/20">
        <h3 className="font-bold text-lg">قائمة الدخل</h3>
        <p className="text-xs text-muted-foreground">Income Statement</p>
      </div>
      <div className="p-6 space-y-6">
        {/* Revenues */}
        <div>
          <h4 className="font-bold text-emerald-600 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> الإيرادات
          </h4>
          {revenues.length === 0 ? (
            <div className="text-sm text-muted-foreground">لا توجد إيرادات</div>
          ) : (
            <div className="space-y-2">
              {revenues.map((row: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="font-medium">{row.account_name_ar || row.account_name}</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(row.net_amount, row.currency_code)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 font-black">
                <span>إجمالي الإيرادات</span>
                <span className="text-emerald-600">{formatCurrency(totalRevenue, 'LYD')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Expenses */}
        <div>
          <h4 className="font-bold text-red-500 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" /> المصروفات
          </h4>
          {expenses.length === 0 ? (
            <div className="text-sm text-muted-foreground">لا توجد مصروفات</div>
          ) : (
            <div className="space-y-2">
              {expenses.map((row: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="font-medium">{row.account_name_ar || row.account_name}</span>
                  <span className="font-bold text-red-500">{formatCurrency(Math.abs(row.net_amount), row.currency_code)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 font-black">
                <span>إجمالي المصروفات</span>
                <span className="text-red-500">{formatCurrency(totalExpense, 'LYD')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Net Income */}
        <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/20">
          <span className="font-black text-foreground">صافي الربح/الخسارة</span>
          <span className={cn(
            'text-2xl font-black',
            netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'
          )}>
            {netIncome >= 0 ? '+' : ''}{formatCurrency(netIncome, 'LYD')}
          </span>
        </div>
      </div>
    </div>
  )
}

function BalanceSheetReport({ data }: { data: any[] }) {
  const assets = data?.filter((r: any) => r.category === 'الأصول') || []
  const liabilities = data?.filter((r: any) => r.category === 'الخصوم') || []
  const equity = data?.filter((r: any) => r.category === 'حقوق الملكية') || []

  const totalAssets = assets.reduce((s: number, r: any) => s + Math.abs(r.balance || 0), 0)
  const totalLiabilities = liabilities.reduce((s: number, r: any) => s + Math.abs(r.balance || 0), 0)
  const totalEquity = equity.reduce((s: number, r: any) => s + Math.abs(r.balance || 0), 0)

  return (
    <div>
      <div className="p-4 border-b border-border bg-muted/20">
        <h3 className="font-bold text-lg">الميزانية العمومية</h3>
        <p className="text-xs text-muted-foreground">Balance Sheet</p>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Assets */}
        <div>
          <h4 className="font-bold text-blue-600 mb-3">الأصول</h4>
          <div className="space-y-2">
            {assets.map((row: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm">{row.account_name_ar || row.account_name}</span>
                <span className="font-bold text-sm">{formatCurrency(Math.abs(row.balance), row.currency_code)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 font-black text-blue-600">
              <span>إجمالي الأصول</span>
              <span>{formatCurrency(totalAssets, 'LYD')}</span>
            </div>
          </div>
        </div>

        {/* Liabilities + Equity */}
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-red-500 mb-3">الخصوم</h4>
            <div className="space-y-2">
              {liabilities.map((row: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-sm">{row.account_name_ar || row.account_name}</span>
                  <span className="font-bold text-sm">{formatCurrency(Math.abs(row.balance), row.currency_code)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 font-black text-red-500">
                <span>إجمالي الخصوم</span>
                <span>{formatCurrency(totalLiabilities, 'LYD')}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-emerald-600 mb-3">حقوق الملكية</h4>
            <div className="space-y-2">
              {equity.map((row: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-sm">{row.account_name_ar || row.account_name}</span>
                  <span className="font-bold text-sm">{formatCurrency(Math.abs(row.balance), row.currency_code)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 font-black text-emerald-600">
                <span>إجمالي حقوق الملكية</span>
                <span>{formatCurrency(totalEquity, 'LYD')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Check */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
          <span className="font-bold">توازن الميزانية</span>
          <span className={cn(
            'font-black',
            Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.001
              ? 'text-emerald-600'
              : 'text-red-500'
          )}>
            {Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.001
              ? '✓ متوازن'
              : `✗ غير متوازن (الفرق: ${formatCurrency(Math.abs(totalAssets - (totalLiabilities + totalEquity)), 'LYD')})`}
          </span>
        </div>
      </div>
    </div>
  )
}
