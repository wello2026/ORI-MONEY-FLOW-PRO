import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle, Building, RefreshCw, ChevronLeft, Plus,
  TrendingUp, TrendingDown, Package, Users, Wrench, Truck,
  ArrowRight, Clock
} from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { ExpenseFormModal } from '@/components/projects/ExpenseFormModal'
import { RevenueFormModal } from '@/components/projects/RevenueFormModal'

const categoryIcons: Record<string, any> = {
  materials: Package,
  labor: Users,
  equipment: Wrench,
  transportation: Truck,
  subcontractor: Users,
  permits: FileText,
  utilities: Zap,
  insurance: Shield,
  maintenance: Wrench,
  consulting: Users,
  other: FileText
}

const categoryLabels: Record<string, string> = {
  materials: 'مواد', labor: 'عمالة', equipment: 'معدات',
  transportation: 'نقل', subcontractor: 'مقاول', permits: 'تصاريح',
  utilities: 'مرافق', insurance: 'تأمين', maintenance: 'صيانة',
  consulting: 'استشارات', other: 'أخرى'
}

function FileText(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
}
function Zap(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
}
function Shield(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
}

const revenueTypeLabels: Record<string, string> = {
  contract_value: 'قيمة العقد', change_order: 'أمر تغيير',
  milestone_payment: 'دفعة مرحلة', advance_received: 'سلفة مستلمة',
  final_payment: 'الدفعة النهائية', penalty: 'عقوبة', other: 'أخرى'
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, financials, expenses, revenues, isLoading, error, fetchProject, fetchProjectFinancials, fetchProjectExpenses, fetchProjectRevenues, successMessage } = useProjectStore()
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showRevenueModal, setShowRevenueModal] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchProject(id)
      fetchProjectFinancials(id)
      fetchProjectExpenses(id)
      fetchProjectRevenues(id)
    }
  }, [id, fetchProject, fetchProjectFinancials, fetchProjectExpenses, fetchProjectRevenues])

  if (isLoading && !currentProject) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Building className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-bold">المشروع غير موجود</h3>
        <button onClick={() => navigate('/projects')} className="mt-4 text-primary text-sm">العودة للمشاريع</button>
      </div>
    )
  }

  const f = financials
  const budget = currentProject.budget || 0
  const totalExpenses = f?.total_expenses ?? 0
  const totalRevenues = f?.total_revenues ?? 0
  const netProfit = totalRevenues - totalExpenses
  const budgetPct = f?.budget_utilization_pct ?? 0
  const remaining = budget - totalExpenses
  const isOverBudget = remaining < 0

  const costCategories = [
    { key: 'materials', label: 'مواد', value: f?.materials_cost ?? 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { key: 'labor', label: 'عمالة', value: f?.labor_cost ?? 0, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { key: 'equipment', label: 'معدات', value: f?.equipment_cost ?? 0, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { key: 'transportation', label: 'نقل', value: f?.transportation_cost ?? 0, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { key: 'subcontractor', label: 'مقاول', value: f?.subcontractor_cost ?? 0, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { key: 'other', label: 'أخرى', value: f?.other_costs ?? 0, color: 'text-muted-foreground', bg: 'bg-muted' }
  ].filter(c => c.value > 0)

  return (
    <div className="page-container pb-24 animate-fade-in">
      {error && <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="text-sm text-destructive font-bold">{error}</div>
      </div>}
      {successMessage && <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <p className="text-sm text-emerald-600 font-bold">{successMessage}</p>
      </div>}

      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm font-bold">المشاريع</span>
        </button>
      </div>

      {/* Project Header */}
      <div className="bg-card/60 backdrop-blur border border-white/5 rounded-3xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">{currentProject.name}</h1>
            <p className="text-muted-foreground font-mono text-sm">{currentProject.code}</p>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="mb-5">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span>استخدام الميزانية</span>
            <span className={isOverBudget ? 'text-red-500' : 'text-muted-foreground'}>
              {budgetPct.toFixed(1)}% — {isOverBudget ? 'تجاوز' : remaining >= 0 ? 'متبقي' : 'استُهلك'}
            </span>
          </div>
          <div className="w-full h-4 bg-background/60 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-700', isOverBudget ? 'bg-red-500' : budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-primary')}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] mt-1">
            <span className="text-muted-foreground">{formatCurrency(totalExpenses, currentProject.currency)} مستهلك</span>
            <span className={cn(isOverBudget ? 'text-red-500 font-black' : 'text-emerald-500 font-black')}>
              {formatCurrency(Math.abs(remaining), currentProject.currency)} {isOverBudget ? 'تجاوز' : 'متبقي'}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-background/40 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-bold mb-1">الميزانية</p>
            <p className="text-sm font-black">{formatCurrency(budget, currentProject.currency)}</p>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
            <p className="text-[10px] text-red-500/60 font-bold mb-1">إجمالي المصروفات</p>
            <p className="text-sm font-black text-red-500">{formatCurrency(totalExpenses, currentProject.currency)}</p>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="text-[10px] text-emerald-500/60 font-bold mb-1">إجمالي الإيرادات</p>
            <p className="text-sm font-black text-emerald-500">{formatCurrency(totalRevenues, currentProject.currency)}</p>
          </div>
          <div className={cn('rounded-xl p-3 text-center', netProfit >= 0 ? 'bg-primary/5 border border-primary/20' : 'bg-red-500/5 border border-red-500/20')}>
            <p className="text-[10px] text-muted-foreground font-bold mb-1">صافي الربح/الخسارة</p>
            <p className={cn('text-sm font-black', netProfit >= 0 ? 'text-primary' : 'text-red-500')}>
              {formatCurrency(netProfit, currentProject.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => setShowExpenseModal(true)}
          className="flex items-center justify-center gap-2 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl hover:bg-red-500/10 transition-colors">
          <Plus className="w-5 h-5 text-red-500" />
          <span className="text-sm font-bold text-red-500">إضافة مصروف</span>
        </button>
        <button onClick={() => setShowRevenueModal(true)}
          className="flex items-center justify-center gap-2 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500/10 transition-colors">
          <Plus className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500">إضافة إيراد</span>
        </button>
      </div>

      {/* Cost Breakdown */}
      {costCategories.length > 0 && (
        <div className="bg-card/60 backdrop-blur border border-white/5 rounded-3xl p-5 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4">تفصيل المصروفات</h2>
          <div className="space-y-2">
            {costCategories.map(cat => {
              const Icon = categoryIcons[cat.key] || FileText
              const pct = budget > 0 ? (cat.value / budget * 100) : 0
              return (
                <div key={cat.key} className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cat.bg)}>
                    <Icon className={cn('w-4 h-4', cat.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold">{cat.label}</span>
                      <span className={cn('font-black', cat.color)}>{formatCurrency(cat.value, currentProject.currency)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-background/60 rounded-full overflow-hidden">
                      <div className={cn('h-full', cat.color.replace('text-', 'bg-'))} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expenses List */}
      <div className="bg-card/60 backdrop-blur border border-white/5 rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">المصروفات ({expenses.length})</h2>
          <button onClick={() => id && fetchProjectExpenses(id)} disabled={isLoading}
            className="p-2 rounded-lg hover:bg-background/40 transition-colors">
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>
        {expenses.length === 0 ? (
          <div className="py-8 text-center"><p className="text-sm text-muted-foreground">لا توجد مصروفات</p></div>
        ) : (
          <div className="space-y-2">
            {expenses.map(exp => {
              const Icon = categoryIcons[exp.expense_category] || FileText
              return (
                <div key={exp.id} className="bg-background/40 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-background/60 transition-colors"
                    onClick={() => setExpandedRow(expandedRow === exp.id ? null : exp.id)}>
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{exp.description || categoryLabels[exp.expense_category] || exp.expense_category}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(exp.expense_date).toLocaleDateString('ar-SA')} · {exp.reference_number || '—'}
                      </p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-black text-red-500">{formatCurrency(exp.amount, exp.currency_code)}</p>
                    </div>
                  </div>
                  {expandedRow === exp.id && (
                    <div className="px-4 pb-3 border-t border-white/5 pt-3 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">الفئة: </span><span className="font-bold">{categoryLabels[exp.expense_category] || exp.expense_category}</span></div>
                      <div><span className="text-muted-foreground">المرجع: </span><span className="font-mono font-bold">{exp.reference_number || '—'}</span></div>
                      <div><span className="text-muted-foreground">المورد: </span><span className="font-bold">{exp.vendor_id ? '—' : '—'}</span></div>
                      <div><span className="text-muted-foreground">الحالة: </span><span className="font-bold">{exp.status}</span></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showExpenseModal && id && (
        <ExpenseFormModal
          projectId={id}
          currency={currentProject.currency}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={() => { setShowExpenseModal(false); fetchProjectFinancials(id); fetchProjectExpenses(id) }}
        />
      )}
      {showRevenueModal && id && (
        <RevenueFormModal
          projectId={id}
          currency={currentProject.currency}
          onClose={() => setShowRevenueModal(false)}
          onSuccess={() => { setShowRevenueModal(false); fetchProjectFinancials(id); fetchProjectRevenues(id) }}
        />
      )}
    </div>
  )
}
