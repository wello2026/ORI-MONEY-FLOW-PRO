import { useState } from 'react'
import { X } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import type { RevenueType } from '@/types'

interface Props {
  projectId: string
  currency: string
  onClose: () => void
  onSuccess: () => void
}

const REVENUE_TYPES: { value: RevenueType; label: string }[] = [
  { value: 'contract_value', label: 'قيمة العقد' },
  { value: 'change_order', label: 'أمر تغيير' },
  { value: 'milestone_payment', label: 'دفعة مرحلة' },
  { value: 'advance_received', label: 'سلفة مستلمة' },
  { value: 'final_payment', label: 'الدفعة النهائية' },
  { value: 'penalty', label: 'عقوبة' },
  { value: 'other', label: 'أخرى' }
]

export function RevenueFormModal({ projectId, currency, onClose, onSuccess }: Props) {
  const { addProjectRevenue, isLoading, error, clearMessages } = useProjectStore()
  const [revenue_type, setRevenueType] = useState<RevenueType>('milestone_payment')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [revenue_date, setRevenueDate] = useState(new Date().toISOString().split('T')[0])
  const [invoice_number, setInvoiceNumber] = useState('')
  const [reference_number, setReference] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    clearMessages()
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) { setFieldError('المبلغ يجب أن يكون أكبر من صفر'); return }
    const result = await addProjectRevenue({
      project_id: projectId, revenue_type, amount: num,
      description: description || undefined, revenue_date,
      invoice_number: invoice_number || undefined,
      reference_number: reference_number || undefined,
      currency_code: currency
    })
    if (result.success) onSuccess()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl">
        <div className="bg-card/90 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-black text-foreground">إضافة إيراد للمشروع</h2>
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
            <label className="block text-xs font-bold text-muted-foreground mb-1">نوع الإيراد *</label>
            <select value={revenue_type} onChange={e => setRevenueType(e.target.value as RevenueType)}
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors">
              {REVENUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">المبلغ *</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">تاريخ الإيراد</label>
              <input type="date" value={revenue_date} onChange={e => setRevenueDate(e.target.value)}
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">رقم الفاتورة</label>
              <input value={invoice_number} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-..."
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">رقم المرجع</label>
              <input value={reference_number} onChange={e => setReference(e.target.value)} placeholder="REF-..."
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">الوصف</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="تفاصيل الإيراد..."
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-background/60 border border-white/10 rounded-xl text-sm font-bold hover:bg-background/80 transition-colors">إلغاء</button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50">
              {isLoading ? 'جارٍ التسجيل...' : 'إضافة الإيراد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}