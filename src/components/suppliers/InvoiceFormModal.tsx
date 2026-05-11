import { useState } from 'react'
import { X, FileText } from 'lucide-react'
import { useSupplierStore } from '@/stores/supplierStore'

interface Props {
  supplierId: string
  supplierName: string
  currency: string
  onClose: () => void
  onSuccess: () => void
}

export function InvoiceFormModal({ supplierId, supplierName, currency, onClose, onSuccess }: Props) {
  const { createInvoice, isLoading, error, clearMessages } = useSupplierStore()
  const [invoice_number, setInvoiceNumber] = useState('')
  const [invoice_date, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [due_date, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [subtotal, setSubtotal] = useState('')
  const [tax_amount, setTaxAmount] = useState('')
  const [discount_amount, setDiscountAmount] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const totalAmount = (parseFloat(subtotal) || 0) + (parseFloat(tax_amount) || 0) - (parseFloat(discount_amount) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    clearMessages()
    if (!invoice_number.trim()) { setFieldError('رقم الفاتورة مطلوب'); return }
    if (!due_date) { setFieldError('تاريخ الاستحقاق مطلوب'); return }
    const sub = parseFloat(subtotal)
    if (isNaN(sub) || sub <= 0) { setFieldError('المبلغ الفرعي يجب أن يكون أكبر من صفر'); return }

    const result = await createInvoice({
      supplier_id: supplierId,
      invoice_number,
      invoice_date,
      due_date,
      description: description || undefined,
      subtotal: sub,
      tax_amount: parseFloat(tax_amount) || 0,
      discount_amount: parseFloat(discount_amount) || 0,
      total_amount: totalAmount,
      currency_code: currency
    })
    if (result.success) onSuccess()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card/90 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">فاتورة جديدة</h2>
              <p className="text-xs text-muted-foreground">{supplierName}</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">رقم الفاتورة *</label>
              <input value={invoice_number} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-001"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">العملة</label>
              <input value={currency} disabled
                className="w-full px-3 py-2 bg-background/20 border border-white/10 rounded-xl text-sm text-muted-foreground" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">تاريخ الفاتورة</label>
              <input type="date" value={invoice_date} onChange={e => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">تاريخ الاستحقاق *</label>
              <input type="date" value={due_date} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">المبلغ الفرعي *</label>
            <input type="number" step="0.01" min="0" value={subtotal} onChange={e => setSubtotal(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">الضريبة</label>
              <input type="number" step="0.01" min="0" value={tax_amount} onChange={e => setTaxAmount(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">الخصم</label>
              <input type="number" step="0.01" min="0" value={discount_amount} onChange={e => setDiscountAmount(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground font-bold mb-1">الإجمالي ({currency})</p>
            <p className="text-2xl font-black text-primary">{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">الوصف</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="وصف الفاتورة..."
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-background/60 border border-white/10 rounded-xl text-sm font-bold hover:bg-background/80 transition-colors">إلغاء</button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50">
              {isLoading ? 'جارٍ الإنشاء...' : 'إنشاء الفاتورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
