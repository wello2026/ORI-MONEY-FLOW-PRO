import { useState } from 'react'
import { X, CreditCard } from 'lucide-react'
import { useSupplierStore } from '@/stores/supplierStore'

interface Props {
  supplierId: string
  invoiceId?: string
  currency: string
  onClose: () => void
  onSuccess: () => void
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'cash', label: 'نقدي' },
  { value: 'check', label: 'شيك' },
  { value: 'credit_card', label: 'بطاقة ائتمان' },
  { value: 'other', label: 'أخرى' }
]

export function PaymentFormModal({ supplierId, invoiceId, currency, onClose, onSuccess }: Props) {
  const { payInvoice, isLoading, error, clearMessages } = useSupplierStore()
  const [amount, setAmount] = useState('')
  const [payment_date, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [payment_method, setPaymentMethod] = useState('bank_transfer')
  const [reference_number, setReferenceNumber] = useState('')
  const [description, setDescription] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    clearMessages()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setFieldError('المبلغ يجب أن يكون أكبر من صفر')
      return
    }
    const result = await payInvoice({
      invoice_id: invoiceId || '',
      amount: numAmount,
      payment_date,
      payment_method,
      reference_number: reference_number || undefined,
      description: description || undefined
    })
    if (result.success) onSuccess()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl">
        <div className="bg-card/90 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">سداد فاتورة</h2>
              <p className="text-xs text-muted-foreground">{currency}</p>
            </div>
          </div>
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
            <label className="block text-xs font-bold text-muted-foreground mb-1">المبلغ *</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors text-lg font-black" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">تاريخ السداد</label>
              <input type="date" value={payment_date} onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">طريقة الدفع</label>
              <select value={payment_method} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors">
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">رقم المرجع</label>
            <input value={reference_number} onChange={e => setReferenceNumber(e.target.value)} placeholder="رقم الحوالة..."
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">ملاحظات</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="ملاحظات..."
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-background/60 border border-white/10 rounded-xl text-sm font-bold hover:bg-background/80 transition-colors">إلغاء</button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50">
              {isLoading ? 'جارٍ السداد...' : 'سداد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
