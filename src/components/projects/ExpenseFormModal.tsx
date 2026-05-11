import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import type { ExpenseCategory } from '@/types'

interface Props {
  projectId: string
  currency: string
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'materials', label: 'مواد' },
  { value: 'labor', label: 'عمالة' },
  { value: 'equipment', label: 'معدات' },
  { value: 'transportation', label: 'نقل' },
  { value: 'subcontractor', label: 'مقاول' },
  { value: 'permits', label: 'تصاريح' },
  { value: 'utilities', label: 'مرافق' },
  { value: 'insurance', label: 'تأمين' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'consulting', label: 'استشارات' },
  { value: 'other', label: 'أخرى' }
]

export function ExpenseFormModal({ projectId, currency, onClose, onSuccess }: Props) {
  const { addProjectExpense, isLoading, error, clearMessages } = useProjectStore()
  const [expense_category, setCategory] = useState<ExpenseCategory>('materials')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [expense_date, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [reference_number, setReference] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    clearMessages()
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) { setFieldError('المبلغ يجب أن يكون أكبر من صفر'); return }
    const result = await addProjectExpense({ project_id: projectId, expense_category, amount: num, description: description || undefined, expense_date, reference_number: reference_number || undefined, currency_code: currency })
    if (result.success) onSuccess()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl">
        <div className="bg-card/90 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-black text-foreground">إضافة مصروف للمشروع</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-background/40 transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        {(error || fieldError) && (
          <div className="mx-5 mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <p className="text-sm text-destructive font-bold">{fieldError || error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">التصنيف *</label>
            <select value={expense_category} onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">المبلغ *</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">تاريخ المصروف</label>
              <input type="date" value={expense_date} onChange={e => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">الوصف</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="تفاصيل المصروف..."
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">رقم المرجع</label>
            <input value={reference_number} onChange={e => setReference(e.target.value)} placeholder="رقم الفاتورة أو المرجع..."
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-background/60 border border-white/10 rounded-xl text-sm font-bold hover:bg-background/80 transition-colors">إلغاء</button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
              {isLoading ? 'جارٍ التسجيل...' : 'إضافة المصروف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}