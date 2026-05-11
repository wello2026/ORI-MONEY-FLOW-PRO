import { useState } from 'react'
import { X, Receipt } from 'lucide-react'
import { useExpenseStore } from '@/stores/expenseStore'
import { useAuthStore } from '@/stores/authStore'
import { useProjectStore } from '@/stores/projectStore'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIES = [
  { value: 'rent', label: 'إيجار' },
  { value: 'utilities', label: 'مرافق' },
  { value: 'salaries', label: 'رواتب' },
  { value: 'supplies', label: 'مستلزمات' },
  { value: 'equipment', label: 'معدات' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'insurance', label: 'تأمين' },
  { value: 'marketing', label: 'تسويق' },
  { value: 'travel', label: 'سفر' },
  { value: 'training', label: 'تدريب' },
  { value: 'consulting', label: 'استشارات' },
  { value: 'legal', label: 'قانوني' },
  { value: 'licenses', label: 'تراخيص' },
  { value: 'software', label: 'برمجيات' },
  { value: 'fuel', label: 'وقود' },
  { value: 'communication', label: 'اتصالات' },
  { value: 'other', label: 'أخرى' }
]

const CURRENCIES = ['USD', 'LYD', 'TRY', 'CNY', 'EUR', 'GBP']
const PAYMENT_METHODS = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank', label: 'بنك' },
  { value: 'transfer', label: 'تحويل' },
  { value: 'cheque', label: 'شيك' },
  { value: 'card', label: 'بطاقة' }
]

export function ExpenseFormModal({ onClose, onSuccess }: Props) {
  const { createExpense, isLoading, error, clearMessages } = useExpenseStore()
  const currentCompany = useAuthStore((s) => s.currentCompany)
  const { projects } = useProjectStore()

  const [form, setForm] = useState({
    title: '',
    category: 'supplies',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    currency_code: currentCompany?.default_currency || 'USD',
    exchange_rate: '1',
    project_id: '',
    vendor_name: '',
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    requires_approval: true
  })
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    clearMessages()
    if (!form.title.trim()) { setFieldError('عنوان المصروف مطلوب'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { setFieldError('المبلغ يجب أن يكون أكبر من صفر'); return }

    const r = await createExpense({
      title: form.title,
      category: form.category,
      amount: parseFloat(form.amount),
      expense_date: form.expense_date,
      description: form.description || undefined,
      currency_code: form.currency_code,
      exchange_rate: parseFloat(form.exchange_rate) || 1,
      project_id: form.project_id || undefined,
      vendor_name: form.vendor_name || undefined,
      payment_method: form.payment_method,
      reference_number: form.reference_number || undefined,
      notes: form.notes || undefined,
      requires_approval: form.requires_approval
    })
    if (r.success) onSuccess()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-card/90 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center"><Receipt className="w-5 h-5 text-orange-500" /></div>
            <h2 className="text-base font-black">مصروف جديد</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-background/40"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        {(error || fieldError) && <div className="mx-5 mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl"><p className="text-sm text-destructive font-bold">{fieldError || error}</p></div>}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">عنوان المصروف *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="فواتير كهرباء شهرية" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">الفئة *</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">المبلغ *</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">العملة</label>
              <select value={form.currency_code} onChange={e => setForm({ ...form, currency_code: e.target.value })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">التاريخ</label>
              <input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">الوصف</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="تفاصيل إضافية..." className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm resize-none focus:outline-none focus:border-primary/40" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">طريقة الدفع</label>
              <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40">
                {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">المشروع</label>
              <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40">
                <option value="">—</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">اسم المورد</label>
              <input value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} placeholder="شركة الكهرباء" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">رقم المرجع</label>
              <input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder="INV-001" className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="requires_approval" checked={form.requires_approval} onChange={e => setForm({ ...form, requires_approval: e.target.checked })} className="w-4 h-4 rounded accent-primary" />
            <label htmlFor="requires_approval" className="text-xs font-bold text-muted-foreground">يتطلب اعتماد</label>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 text-center">
            <p className="text-sm font-black text-orange-500">{form.currency_code} {(parseFloat(form.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-background/60 border border-white/10 rounded-xl text-sm font-bold hover:bg-background/80">إلغاء</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50">{isLoading ? 'جارٍ...' : 'تسجيل المصروف'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}