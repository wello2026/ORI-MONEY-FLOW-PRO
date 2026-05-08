import { useState, useMemo } from 'react'
import { Calculator, Play, RotateCcw } from 'lucide-react'
import { useAccountStore } from '@/stores/accountStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { formatCurrency } from '@/lib/format'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function WhatIfSimulator() {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)

  const [investment, setInvestment] = useState<number>(10000)
  const [monthlyReturn, setMonthlyReturn] = useState<number>(2000)
  const [isSimulated, setIsSimulated] = useState(false)

  const { baselineData, simulatedData, recommendation } = useMemo(() => {
    // 1. Calculate current state
    const currentBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
    
    const approvedTxs = transactions.filter(t => t.status === 'approved')
    const totalIncome = approvedTxs.filter(t => ['deposit', 'income'].includes(t.type)).reduce((s, t) => s + t.amount, 0)
    const totalExpense = approvedTxs.filter(t => ['withdrawal', 'expense', 'salary'].includes(t.type)).reduce((s, t) => s + t.amount, 0)
    
    // Average monthly net (simplified as total net for the simulation base)
    const avgMonthlyNet = (totalIncome - totalExpense) > 0 ? (totalIncome - totalExpense) : 5000

    const months = ['الشهر 1', 'الشهر 2', 'الشهر 3', 'الشهر 4', 'الشهر 5', 'الشهر 6']
    
    const baseline = []
    const simulated = []
    
    let baseRunning = currentBalance
    let simRunning = currentBalance - investment

    for (let i = 0; i < 6; i++) {
      baseRunning += avgMonthlyNet
      baseline.push({ month: months[i], 'الوضع الحالي': baseRunning })

      simRunning += avgMonthlyNet + monthlyReturn
      simulated.push({ month: months[i], 'الوضع الحالي': baseRunning, 'بعد القرار': simRunning })
    }

    // Recommendation Logic
    const breakEvenMonth = Math.ceil(investment / monthlyReturn)
    let rec = ''
    if (breakEvenMonth <= 6) {
      rec = `قرار ممتاز! ستسترد قيمة استثمارك (${formatCurrency(investment)}) خلال ${breakEvenMonth} أشهر، وسيرتفع صافي التدفق بشكل ملحوظ.`
    } else {
      rec = `قرار عالي المخاطر. استرداد الاستثمار سيستغرق أكثر من 6 أشهر. تأكد من توفر سيولة نقدية تكفي لتغطية المصروفات التشغيلية.`
    }

    return { 
      baselineData: baseline, 
      simulatedData: simulated,
      recommendation: rec
    }
  }, [accounts, transactions, investment, monthlyReturn])

  return (
    <div className="card-elevated p-6 mt-6 border border-info/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-info/10 rounded-lg">
          <Calculator className="w-6 h-6 text-info" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-info">محاكي القرارات (What-If)</h2>
          <p className="text-sm text-muted-foreground">اختبر تأثير قراراتك المالية قبل اتخاذها (شراء أصول، استثمارات جديدة).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 lg:col-span-1">
          <div>
            <label className="block text-sm font-medium mb-2">قيمة الاستثمار / المصروف المبدئي</label>
            <input 
              type="number" 
              value={investment}
              onChange={(e) => setInvestment(Number(e.target.value))}
              className="input-field"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">العائد الشهري المتوقع</label>
            <input 
              type="number" 
              value={monthlyReturn}
              onChange={(e) => setMonthlyReturn(Number(e.target.value))}
              className="input-field"
              dir="ltr"
            />
          </div>
          
          <div className="pt-2 flex gap-2">
            <button 
              onClick={() => setIsSimulated(true)}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" /> محاكاة
            </button>
            <button 
              onClick={() => setIsSimulated(false)}
              className="btn-secondary px-3"
              title="إعادة ضبط"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {isSimulated && (
            <div className={`p-4 rounded-lg mt-4 text-sm font-medium leading-relaxed ${
              recommendation.includes('ممتاز') ? 'bg-success/10 text-success/90 border border-success/20' : 'bg-warning/10 text-warning-foreground border border-warning/20'
            }`}>
              {recommendation}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={isSimulated ? simulatedData : baselineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend verticalAlign="top" height={36} />
              <Line 
                type="monotone" 
                dataKey="الوضع الحالي" 
                stroke="#64748b" 
                strokeWidth={3} 
                dot={{ r: 4 }} 
                activeDot={{ r: 6 }} 
              />
              {isSimulated && (
                <Line 
                  type="monotone" 
                  dataKey="بعد القرار" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4 }} 
                  activeDot={{ r: 8 }} 
                  animationDuration={1500}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
