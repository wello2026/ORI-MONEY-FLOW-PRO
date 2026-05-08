import { useEffect, useState } from 'react'
import { FileText, Download, TrendingUp, Wallet, Calendar, ArrowRight } from 'lucide-react'
import { useTransactionStore } from '@/stores/transactionStore'
import { useAccountStore } from '@/stores/accountStore'
import { useTransferStore } from '@/stores/transferStore'
import { formatCurrency, formatDate } from '@/lib/format'
import { exportTransactionsToCSV, exportAccountsToCSV, exportTransfersToCSV, printReport, generateDailyReport } from '@/lib/export'

type ReportType = 'daily' | 'accounts' | 'cashflow' | 'transactions' | 'transfers' | 'trial_balance' | 'general_ledger'

export default function ReportsPage() {
  const transactions = useTransactionStore((state) => state.transactions)
  const accounts = useAccountStore((state) => state.accounts)
  const transfers = useTransferStore((state) => state.transfers)
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  const fetchTransfers = useTransferStore((state) => state.fetchTransfers)

  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchTransactions()
    fetchAccounts()
    fetchTransfers()
  }, [fetchTransactions, fetchAccounts, fetchTransfers])

  // فلترة المعاملات حسب التاريخ
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.created_at)
    tDate.setHours(0, 0, 0, 0)
    
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      if (tDate < fromDate) return false
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(0, 0, 0, 0)
      if (tDate > toDate) return false
    }
    return true
  })

  // فلترة التحويلات حسب التاريخ
  const filteredTransfers = transfers.filter(t => {
    const tDate = new Date(t.created_at)
    tDate.setHours(0, 0, 0, 0)
    
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      if (tDate < fromDate) return false
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(0, 0, 0, 0)
      if (tDate > toDate) return false
    }
    return true
  })

  const totalIncome = filteredTransactions
    .filter(t => ['deposit', 'income'].includes(t.type) && t.status === 'approved')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = filteredTransactions
    .filter(t => ['withdrawal', 'expense', 'salary'].includes(t.type) && t.status === 'approved')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: 'إيداع',
      withdrawal: 'سحب',
      expense: 'مصروف',
      income: 'دخل',
      salary: 'راتب'
    }
    return labels[type] || type
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'معلق',
      approved: 'موافق',
      rejected: 'مرفوض'
    }
    return labels[status] || status
  }

  const handleExportTransactions = () => {
    exportTransactionsToCSV(filteredTransactions)
  }

  const handleExportAccounts = () => {
    exportAccountsToCSV(accounts)
  }

  const handleExportTransfers = () => {
    exportTransfersToCSV(filteredTransfers)
  }

  const handlePrintDaily = () => {
    const content = generateDailyReport(filteredTransactions)
    printReport('تقرير اليومية', content)
  }

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'daily':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">تقرير اليومية</h3>
              <div className="flex gap-2">
                <button onClick={handlePrintDaily} className="btn-primary flex items-center gap-2">
                  <FileText className="w-4 h-4" /> طباعة
                </button>
                <button onClick={handleExportTransactions} className="btn-secondary flex items-center gap-2">
                  <Download className="w-4 h-4" /> تصدير CSV
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                <p className="text-sm opacity-80">الدخل</p>
                <p className="text-xl font-bold">{formatCurrency(totalIncome)}</p>
              </div>
              <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                <p className="text-sm opacity-80">المصروفات</p>
                <p className="text-xl font-bold">{formatCurrency(totalExpense)}</p>
              </div>
              <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                <p className="text-sm opacity-80">الصافي</p>
                <p className="text-xl font-bold">{formatCurrency(totalIncome - totalExpense)}</p>
              </div>
            </div>

            <div className="card-elevated overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-right">المرجع</th>
                    <th className="p-3 text-right">النوع</th>
                    <th className="p-3 text-right">المبلغ</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="p-3 text-right">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.slice(0, 20).map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="p-3">{t.reference}</td>
                      <td className="p-3">{getTypeLabel(t.type)}</td>
                      <td className={`p-3 font-bold ${['deposit', 'income'].includes(t.type) ? 'text-success' : 'text-error'}`}>
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          t.status === 'approved' ? 'bg-success/10 text-success' :
                          t.status === 'pending' ? 'bg-warning/10 text-warning' :
                          'bg-error/10 text-error'
                        }`}>
                          {getStatusLabel(t.status)}
                        </span>
                      </td>
                      <td className="p-3">{formatDate(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )

      case 'accounts':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">تقرير الحسابات</h3>
              <button onClick={handleExportAccounts} className="btn-secondary flex items-center gap-2">
                <Download className="w-4 h-4" /> تصدير CSV
              </button>
            </div>

            <div className="kpi-card mb-4">
              <p className="text-sm opacity-80">إجمالي أرصدة الحسابات</p>
              <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
            </div>

            <div className="card-elevated overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-right">الكود</th>
                    <th className="p-3 text-right">الاسم</th>
                    <th className="p-3 text-right">النوع</th>
                    <th className="p-3 text-right">الرصيد</th>
                    <th className="p-3 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-3">{a.code}</td>
                      <td className="p-3 font-medium">{a.name}</td>
                      <td className="p-3">{a.type}</td>
                      <td className="p-3 font-bold">{formatCurrency(a.balance)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          a.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                          {a.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )

      case 'transfers':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">تقرير التحويلات</h3>
              <button onClick={handleExportTransfers} className="btn-secondary flex items-center gap-2">
                <Download className="w-4 h-4" /> تصدير CSV
              </button>
            </div>

            <div className="card-elevated overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-right">المرجع</th>
                    <th className="p-3 text-right">من</th>
                    <th className="p-3 text-right">إلى</th>
                    <th className="p-3 text-right">المبلغ</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="p-3 text-right">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        لا توجد تحويلات في هذه الفترة
                      </td>
                    </tr>
                  ) : (
                    filteredTransfers.map((t) => {
                      const source = accounts.find(a => a.id === t.source_account_id)
                      const dest = accounts.find(a => a.id === t.destination_account_id)
                      return (
                        <tr key={t.id} className="border-t border-border">
                          <td className="p-3">{t.reference}</td>
                          <td className="p-3 font-medium text-error">
                            <div className="flex flex-col">
                              <span>{source?.name || '-'}</span>
                              <span className="text-[10px] opacity-50">{source?.code}</span>
                            </div>
                          </td>
                          <td className="p-3 font-medium text-success">
                            <div className="flex flex-col">
                              <span>{dest?.name || '-'}</span>
                              <span className="text-[10px] opacity-50">{dest?.code}</span>
                            </div>
                          </td>
                          <td className="p-3 font-bold">{formatCurrency(t.amount)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              t.status === 'approved' ? 'bg-success/10 text-success' :
                              t.status === 'pending' ? 'bg-warning/10 text-warning' :
                              'bg-error/10 text-error'
                            }`}>
                              {getStatusLabel(t.status)}
                            </span>
                          </td>
                          <td className="p-3 text-xs">{formatDate(t.created_at)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )

      case 'cashflow':
        const byType = transactions
          .filter(t => t.status === 'approved')
          .reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + t.amount
            return acc
          }, {} as Record<string, number>)

        return (
          <div className="space-y-4">
            <h3 className="font-semibold">تقرير التدفق النقدي</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(byType).map(([type, amount]) => (
                <div key={type} className="card-elevated p-3">
                  <p className="text-sm text-muted-foreground">{getTypeLabel(type)}</p>
                  <p className="text-lg font-bold">{formatCurrency(amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )

      case 'trial_balance':
        const debitAccounts = accounts.filter(a => ['cashbox', 'bank', 'expense', 'employee'].includes(a.type))
        const creditAccounts = accounts.filter(a => ['income', 'temporary'].includes(a.type))
        
        const totalDebits = debitAccounts.reduce((sum, a) => sum + a.balance, 0)
        const totalCredits = creditAccounts.reduce((sum, a) => sum + a.balance, 0)

        return (
          <div className="space-y-4">
            <h3 className="font-semibold">ميزان المراجعة (Trial Balance)</h3>
            <div className="card-elevated overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-right">رقم الحساب</th>
                    <th className="p-3 text-right">اسم الحساب</th>
                    <th className="p-3 text-left">مدين (Debit)</th>
                    <th className="p-3 text-left">دائن (Credit)</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => {
                    const isDebit = ['cashbox', 'bank', 'expense', 'employee'].includes(a.type)
                    return (
                      <tr key={a.id} className="border-t border-border">
                        <td className="p-3">{a.code}</td>
                        <td className="p-3">{a.name}</td>
                        <td className="p-3 text-left font-medium text-info">{isDebit && a.balance !== 0 ? formatCurrency(a.balance) : '-'}</td>
                        <td className="p-3 text-left font-medium text-warning">{!isDebit && a.balance !== 0 ? formatCurrency(a.balance) : '-'}</td>
                      </tr>
                    )
                  })}
                  <tr className="border-t-2 border-border bg-muted/50 font-bold">
                    <td className="p-3" colSpan={2}>الإجمالي</td>
                    <td className="p-3 text-left text-info">{formatCurrency(totalDebits)}</td>
                    <td className="p-3 text-left text-warning">{formatCurrency(totalCredits)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )

      case 'general_ledger':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">دفتر الأستاذ العام (General Ledger)</h3>
            <div className="space-y-6">
              {accounts.map(account => {
                const accTxs = transactions.filter(t => t.account_id === account.id || (t as any).offset_account_id === account.id)
                if (accTxs.length === 0) return null
                
                return (
                  <div key={account.id} className="card-elevated overflow-hidden">
                    <div className="bg-muted p-3 border-b border-border flex justify-between items-center">
                      <span className="font-bold">{account.name} ({account.code})</span>
                      <span className="text-sm">الرصيد الحالي: {formatCurrency(account.balance)}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="p-3 text-right text-xs">التاريخ</th>
                          <th className="p-3 text-right text-xs">المرجع</th>
                          <th className="p-3 text-right text-xs">النوع</th>
                          <th className="p-3 text-left text-xs">مدين</th>
                          <th className="p-3 text-left text-xs">دائن</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accTxs.map(t => {
                          const isPrimary = t.account_id === account.id
                          const isDeposit = ['deposit', 'income'].includes(t.type)
                          // Simplified GL logic
                          const debitAmount = (isPrimary && isDeposit) || (!isPrimary && !isDeposit) ? t.amount : 0
                          const creditAmount = (isPrimary && !isDeposit) || (!isPrimary && isDeposit) ? t.amount : 0
                          
                          return (
                            <tr key={t.id} className="border-t border-border">
                              <td className="p-3">{formatDate(t.created_at)}</td>
                              <td className="p-3">{t.reference}</td>
                              <td className="p-3">{getTypeLabel(t.type)}</td>
                              <td className="p-3 text-left text-info">{debitAmount ? formatCurrency(debitAmount) : '-'}</td>
                              <td className="p-3 text-left text-warning">{creditAmount ? formatCurrency(creditAmount) : '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">التقارير</h1>
        <p className="page-subtitle">استخرج واطبع التقارير المالية</p>
      </div>

      {/* فلاتر التاريخ */}
      <div className="card-elevated p-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">من:</span>
            <input 
              type="date" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">إلى:</span>
            <input 
              type="date" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field text-sm"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button 
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-sm text-error"
            >
              مسح
            </button>
          )}
        </div>
      </div>

      {/* ملخص */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <p className="text-sm opacity-80">الدخل</p>
          <p className="text-xl font-bold">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
          <p className="text-sm opacity-80">المصروفات</p>
          <p className="text-xl font-bold">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="kpi-card">
          <p className="text-sm opacity-80">الأرصدة</p>
          <p className="text-xl font-bold">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
          <p className="text-sm opacity-80">صافي</p>
          <p className="text-xl font-bold">{formatCurrency(totalIncome - totalExpense)}</p>
        </div>
      </div>

      {/* قائمة التقارير */}
      {!selectedReport ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button 
            onClick={() => setSelectedReport('daily')}
            className="card-elevated p-4 text-right hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">تقرير اليومية</h3>
            <p className="text-sm text-muted-foreground">ملخص المعاملات</p>
          </button>

          <button 
            onClick={() => setSelectedReport('accounts')}
            className="card-elevated p-4 text-right hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-3">
              <Wallet className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-semibold mb-1">تقرير الحسابات</h3>
            <p className="text-sm text-muted-foreground">جميع الحسابات والأرصدة</p>
          </button>

          <button 
            onClick={() => setSelectedReport('transfers')}
            className="card-elevated p-4 text-right hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
              <ArrowRight className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold mb-1">تقرير التحويلات</h3>
            <p className="text-sm text-muted-foreground">سجل التحويلات</p>
          </button>

          <button 
            onClick={() => setSelectedReport('cashflow')}
            className="card-elevated p-4 text-right hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-info" />
            </div>
            <h3 className="font-semibold mb-1">تقرير التدفق</h3>
            <p className="text-sm text-muted-foreground">الدخل والمصروفات</p>
          </button>

          <button 
            onClick={() => setSelectedReport('trial_balance')}
            className="card-elevated p-4 text-right hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">ميزان المراجعة</h3>
            <p className="text-sm text-muted-foreground">أرصدة مدينة ودائنة</p>
          </button>

          <button 
            onClick={() => setSelectedReport('general_ledger')}
            className="card-elevated p-4 text-right hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-3">
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