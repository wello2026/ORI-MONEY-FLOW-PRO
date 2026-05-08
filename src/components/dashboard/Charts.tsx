import { TrendingUp, TrendingDown, Wallet, Users, FileCheck, Activity, PiggyBank, CreditCard } from 'lucide-react'
import { useAccountStore } from '@/stores/accountStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { formatCurrency } from '@/lib/format'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

const formatTooltip = (value: unknown) => {
  if (typeof value === 'number') return formatCurrency(value)
  return String(value)
}

export function DashboardCharts() {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
  const activeAccounts = accounts.filter((a) => a.status === 'active').length
  const pendingCount = transactions.filter((t) => t.status === 'pending').length
  const completedCount = transactions.filter((t) => t.status === 'approved').length

  const incomeTotal = transactions
    .filter((t) => ['deposit', 'income'].includes(t.type) && t.status === 'approved')
    .reduce((sum, t) => sum + t.amount, 0)

  const expenseTotal = transactions
    .filter((t) => ['withdrawal', 'expense', 'salary'].includes(t.type) && t.status === 'approved')
    .reduce((sum, t) => sum + t.amount, 0)

  const cashflowData = [
    { name: 'دخل', value: incomeTotal, color: '#10b981' },
    { name: 'مصروف', value: expenseTotal, color: '#ef4444' }
  ]

  const accountTypeData = accounts.reduce((acc, account) => {
    const existing = acc.find((item) => item.name === account.type)
    if (existing) {
      existing.balance += account.balance
    } else {
      acc.push({ name: account.type, balance: account.balance })
    }
    return acc
  }, [] as { name: string; balance: number }[])

  const recentActivityData = transactions.slice(0, 7).reverse().map((t) => ({
    name: t.reference.slice(-4),
    amount: t.amount,
    type: t.type
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="kpi-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80">إجمالي الرصيد</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80">إجمالي الدخل</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(incomeTotal)}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80">إجمالي المصروفات</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(expenseTotal)}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80">صافي التدفق</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(incomeTotal - expenseTotal)}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="card-elevated p-3 text-center">
          <PiggyBank className="w-6 h-6 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{activeAccounts}</p>
          <p className="text-xs text-muted-foreground">حسابات نشطة</p>
        </div>
        <div className="card-elevated p-3 text-center">
          <FileCheck className="w-6 h-6 mx-auto mb-1 text-warning" />
          <p className="text-lg font-bold">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">في الانتظار</p>
        </div>
        <div className="card-elevated p-3 text-center">
          <CreditCard className="w-6 h-6 mx-auto mb-1 text-success" />
          <p className="text-lg font-bold">{completedCount}</p>
          <p className="text-xs text-muted-foreground">مكتملة</p>
        </div>
        <div className="card-elevated p-3 text-center">
          <Users className="w-6 h-6 mx-auto mb-1 text-info" />
          <p className="text-lg font-bold">{transactions.length}</p>
          <p className="text-xs text-muted-foreground">إجمالي المعاملات</p>
        </div>
      </div>

      {cashflowData[0].value > 0 || cashflowData[1].value > 0 ? (
        <div className="card-elevated p-4">
          <h3 className="font-semibold mb-4">تحليل التدفق النقدي</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cashflowData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {cashflowData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={formatTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {accountTypeData.length > 0 && (
        <div className="card-elevated p-4">
          <h3 className="font-semibold mb-4">توزيع الحسابات</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={formatTooltip} />
                <Bar dataKey="balance" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {recentActivityData.length > 0 && (
        <div className="card-elevated p-4">
          <h3 className="font-semibold mb-4">النشاط الأخير</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recentActivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={formatTooltip} />
                <Area type="monotone" dataKey="amount" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}