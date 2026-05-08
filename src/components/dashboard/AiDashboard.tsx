import { useMemo } from 'react'
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useTransactionStore } from '@/stores/transactionStore'
import { formatCurrency } from '@/lib/format'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { WhatIfSimulator } from './WhatIfSimulator'

export function AiDashboard() {
  const transactions = useTransactionStore((state) => state.transactions)

  // محاكاة استنتاجات الذكاء الاصطناعي بناءً على البيانات
  const { insights, forecastData, anomalies } = useMemo(() => {
    const approvedTxs = transactions.filter(t => t.status === 'approved')
    
    // 1. حساب المصروفات والدخل
    const totalIncome = approvedTxs.filter(t => ['deposit', 'income'].includes(t.type)).reduce((s, t) => s + t.amount, 0)
    const totalExpense = approvedTxs.filter(t => ['withdrawal', 'expense', 'salary'].includes(t.type)).reduce((s, t) => s + t.amount, 0)
    
    // 2. توليد توقعات (Forecast) وهمية ذكية تعتمد على المتوسط
    const baseValue = totalIncome > 0 ? totalIncome : 50000
    const forecastData = [
      { month: 'الشهر الحالي', actual: baseValue, forecast: baseValue },
      { month: 'الشهر القادم', forecast: baseValue * 1.05 },
      { month: 'بعد شهرين', forecast: baseValue * 1.12 },
      { month: 'بعد 3 أشهر', forecast: baseValue * 1.18 },
    ]

    // 3. تحليل التشوهات والتحذيرات (Anomalies)
    const anomalies = []
    if (totalExpense > totalIncome * 0.8) {
      anomalies.push('معدل الحرق المالي مرتفع جداً: المصروفات تتجاوز 80% من الدخل.')
    }
    
    // اكتشاف مصاريف كبيرة مفاجئة (أكبر من 30% من إجمالي المصاريف)
    const largeExpenses = approvedTxs.filter(t => ['withdrawal', 'expense'].includes(t.type) && t.amount > totalExpense * 0.3)
    if (largeExpenses.length > 0) {
      anomalies.push(`تم رصد ${largeExpenses.length} مصروفات ضخمة وغير معتادة هذا الشهر.`)
    }

    // 4. استنتاجات وتوصيات
    const insights = []
    if (totalIncome > totalExpense) {
      insights.push('الأداء المالي صحي. يوصى باستثمار الفائض النقدي في ودائع قصيرة الأجل.')
    } else {
      insights.push('يوجد عجز نقدي محتمل. يوصى بمراجعة بند الرواتب والمصروفات التشغيلية.')
    }

    return { insights, forecastData, anomalies, totalIncome, totalExpense }
  }, [transactions])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20 flex items-start gap-4">
        <div className="p-3 bg-primary/20 rounded-xl">
          <Brain className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-primary mb-2">المساعد المالي الذكي (AI)</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            يقوم نظام الذكاء الاصطناعي بتحليل نمط التدفقات النقدية الخاصة بك، واكتشاف التشوهات المالية، وتقديم توقعات للأشهر الثلاثة القادمة لمساعدتك على اتخاذ قرارات دقيقة.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-info" />
            <h3 className="font-semibold text-lg">التنبؤ بالتدفق النقدي (3 أشهر)</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value || 0))}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} fill="none" />
                <Area type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" fill="url(#colorForecast)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-elevated p-5 border-l-4 border-l-warning">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-lg">الرؤى والاستنتاجات</h3>
            </div>
            <ul className="space-y-3">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <ArrowUpRight className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
              {insights.length === 0 && <p className="text-sm text-muted-foreground">لا توجد استنتاجات كافية بعد.</p>}
            </ul>
          </div>

          <div className="card-elevated p-5 border-l-4 border-l-error">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-error" />
              <h3 className="font-semibold text-lg">التحذيرات والتشوهات</h3>
            </div>
            <ul className="space-y-3">
              {anomalies.map((anomaly, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-error/90">
                  <ArrowDownRight className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{anomaly}</span>
                </li>
              ))}
              {anomalies.length === 0 && (
                <p className="text-sm text-success flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> الوضع المالي مستقر ولا توجد تحذيرات.
                </p>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* محاكي القرارات (What-If) */}
      <WhatIfSimulator />
    </div>
  )
}
