import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, RefreshCw, ChevronLeft, Receipt, CheckCircle, XCircle, Trash2, Ban, Clock } from 'lucide-react'
import { useExpenseStore } from '@/stores/expenseStore'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'مسودة', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-muted' },
  pending: { label: 'معلق', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  approved: { label: 'معتمد', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  rejected: { label: 'مرفوض', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  paid: { label: 'مدفوع', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  cancelled: { label: 'ملغي', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-muted' }
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'إيجار', utilities: 'مرافق', salaries: 'رواتب', supplies: 'مستلزمات',
  equipment: 'معدات', maintenance: 'صيانة', insurance: 'تأمين', marketing: 'تسويق',
  travel: 'سفر', training: 'تدريب', consulting: 'استشارات', legal: 'قانوني',
  licenses: 'تراخيص', software: 'برمجيات', fuel: 'وقود', communication: 'اتصالات', other: 'أخرى'
}

const currencySymbols: Record<string, string> = { USD: '$', LYD: 'د.ل', TRY: '₺', CNY: '¥', EUR: '€', GBP: '£' }
function fmt(amount: number, currency = 'USD') {
  return `${currencySymbols[currency] || currency}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentExpense, isLoading, error, fetchExpense, approveExpense, markPaid, deleteExpense, successMessage } = useExpenseStore()
  const [showReject, setShowReject] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => { if (id) fetchExpense(id) }, [id, fetchExpense])

  const handleApprove = async () => {
    if (!id) return
    await approveExpense(id)
  }

  const handleReject = async () => {
    if (!id) return
    await approveExpense(id, rejectReason)
    setShowReject(false)
    setRejectReason('')
  }

  const handleMarkPaid = async () => {
    if (!id) return
    await markPaid(id)
  }

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('إلغاء هذا المصروف؟')) return
    const r = await deleteExpense(id)
    if (r.success) navigate('/expenses')
  }

  if (isLoading && !currentExpense) return <div className="page-container flex items-center justify-center min-h-[60vh]"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>
  if (!currentExpense) return <div className="page-container flex flex-col items-center justify-center min-h-[60vh]"><Receipt className="w-16 h-16 text-muted-foreground mb-4" /><h3 className="text-lg font-bold">المصروف غير موجود</h3><button onClick={() => navigate('/expenses')} className="mt-4 text-primary text-sm">العودة</button></div>

  const e = currentExpense
  const s = STATUS_CONFIG[e.status] || STATUS_CONFIG.draft

  return (
    <div className="page-container pb-24 animate-fade-in">
      {error && <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl"><p className="text-sm text-destructive font-bold">{error}</p></div>}
      {successMessage && <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl"><p className="text-sm text-emerald-600 font-bold">{successMessage}</p></div>}

      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/expenses')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><ChevronLeft className="w-5 h-5" /><span className="text-sm font-bold">المصروفات</span></button>
        <div className="flex gap-2">
          <button onClick={handleDelete} className="p-2 rounded-xl bg-card/60 border border-white/10 hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
        </div>
      </div>

      <div className={cn('rounded-3xl p-6 mb-6', s.bg, 'border', s.border)}>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-background/40 flex items-center justify-center"><Receipt className={cn('w-7 h-7', s.color)} /></div>
          <div>
            <h1 className="text-2xl font-black">{e.title}</h1>
            <p className="text-muted-foreground font-mono text-sm">{e.expense_number} · {CATEGORY_LABELS[e.category] || e.category}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-background/40 rounded-xl p-3 text-center"><p className="text-[10px] text-muted-foreground font-bold mb-1">المبلغ</p><p className="text-sm font-black">{fmt(e.amount, e.currency_code)}</p></div>
          <div className="bg-background/40 rounded-xl p-3 text-center"><p className="text-[10px] text-muted-foreground font-bold mb-1">التاريخ</p><p className="text-sm font-black">{new Date(e.expense_date).toLocaleDateString('ar-LY')}</p></div>
          <div className="bg-background/40 rounded-xl p-3 text-center"><p className="text-[10px] text-muted-foreground font-bold mb-1">طريقة الدفع</p><p className="text-sm font-black">{e.payment_method}</p></div>
          <div className={cn('rounded-xl p-3 text-center', s.bg)}><p className="text-[10px] text-muted-foreground font-bold mb-1">الحالة</p><p className={cn('text-sm font-black', s.color)}>{s.label}</p></div>
        </div>

        {e.description && (
          <div className="bg-background/40 rounded-xl p-3 mb-4">
            <p className="text-[10px] text-muted-foreground font-bold mb-1">الوصف</p>
            <p className="text-sm text-foreground">{e.description}</p>
          </div>
        )}

        {e.rejection_reason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-[10px] text-red-500/60 font-bold mb-1">سبب الرفض</p>
            <p className="text-sm text-red-500 font-bold">{e.rejection_reason}</p>
          </div>
        )}

        {e.project_id && (
          <div className="bg-background/40 rounded-xl p-3 mb-4">
            <p className="text-[10px] text-muted-foreground font-bold mb-1">المشروع</p>
            <p className="text-sm font-black">{e.project_name || '—'}</p>
          </div>
        )}

        {e.vendor_name && (
          <div className="bg-background/40 rounded-xl p-3 mb-4">
            <p className="text-[10px] text-muted-foreground font-bold mb-1">المورد</p>
            <p className="text-sm font-black">{e.vendor_name}</p>
          </div>
        )}

        {e.reference_number && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background/40 rounded-xl p-2"><span className="text-muted-foreground">المرجع: </span><span className="font-bold font-mono">{e.reference_number}</span></div>
            <div className="bg-background/40 rounded-xl p-2"><span className="text-muted-foreground">المُسجل: </span><span className="font-bold">{e.recorded_by_name || '—'}</span></div>
          </div>
        )}

        {e.is_recurring && (
          <div className="mt-4 flex items-center gap-2 text-xs text-orange-500 font-bold">
            <RefreshCw className="w-3 h-3" /> متكرر
          </div>
        )}
      </div>

      {e.status === 'pending' && (
        <div className="bg-card/60 border border-white/5 rounded-3xl p-5 mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4">إجراءات الاعتماد</h2>
          <div className="flex gap-3">
            <button onClick={handleApprove} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> اعتماد
            </button>
            <button onClick={() => setShowReject(true)} className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" /> رفض
            </button>
          </div>
          {showReject && (
            <div className="mt-4">
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="سبب الرفض..." className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm mb-3 resize-none" rows={3} />
              <button onClick={handleReject} disabled={!rejectReason.trim()} className="w-full py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">تأكيد الرفض</button>
            </div>
          )}
        </div>
      )}

      {e.status === 'approved' && (
        <button onClick={handleMarkPaid} className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" /> تسجيل الدفع
        </button>
      )}
    </div>
  )
}