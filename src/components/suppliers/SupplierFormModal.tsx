import { useState } from 'react'
import { X } from 'lucide-react'
import { useSupplierStore } from '@/stores/supplierStore'
import { cn } from '@/lib/utils'
import type { Supplier } from '@/types'

interface Props {
  supplier?: Supplier
  onClose: () => void
  onSuccess: () => void
}

const COUNTRIES = ['تركيا', 'الصين', 'ألمانيا', 'إيطاليا', 'إسبانيا', 'فرنسا', 'هولندا', 'بريطانيا', 'أمريكا', 'الإمارات', 'مصر', 'ليبيا']
const CURRENCIES = ['USD', 'LYD', 'TRY', 'CNY', 'EUR', 'GBP']

export function SupplierFormModal({ supplier, onClose, onSuccess }: Props) {
  const { createSupplier, updateSupplier, isLoading, error, clearMessages } = useSupplierStore()

  const [form, setForm] = useState({
    supplier_code: supplier?.supplier_code || '',
    supplier_name: supplier?.supplier_name || '',
    supplier_name_ar: supplier?.supplier_name_ar || '',
    country: supplier?.country || '',
    currency_code: supplier?.currency_code || 'USD',
    contact_person: supplier?.contact_person || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    tax_number: supplier?.tax_number || '',
    bank_name: supplier?.bank_name || '',
    bank_account_number: supplier?.bank_account_number || '',
    bank_iban: supplier?.bank_iban || '',
    bank_swift: supplier?.bank_swift || '',
    payment_terms: supplier?.payment_terms || 30,
    credit_limit: supplier?.credit_limit || 0,
    notes: supplier?.notes || ''
  })
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    clearMessages()
    if (!form.supplier_name.trim()) { setFieldError('اسم المورد مطلوب'); return }
    if (!form.supplier_code.trim()) { setFieldError('كود المورد مطلوب'); return }
    if (supplier) {
      const result = await updateSupplier(supplier.id, form)
      if (result.success) onSuccess()
    } else {
      const result = await createSupplier(form as any)
      if (result.success) onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card/90 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-black text-foreground">{supplier ? 'تعديل المورد' : 'مورد جديد'}</h2>
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
              <label className="block text-xs font-bold text-muted-foreground mb-1">كود المورد *</label>
              <input value={form.supplier_code} onChange={e => setForm({ ...form, supplier_code: e.target.value })} placeholder="S-001"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">العملة</label>
              <select value={form.currency_code} onChange={e => setForm({ ...form, currency_code: e.target.value })}
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">اسم المورد (EN) *</label>
            <input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} placeholder="ABC Trading Co."
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">اسم المورد (AR)</label>
            <input value={form.supplier_name_ar} onChange={e => setForm({ ...form, supplier_name_ar: e.target.value })} placeholder="شركة التجارة أ.ب.ج"
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">الدولة</label>
              <select value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors">
                <option value="">اختر</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">آجال الدفع (يوم)</label>
              <input type="number" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">شخص الاتصال</label>
              <input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} placeholder="أحمد"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">الهاتف</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+90 555..."
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@example.com"
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">العنوان</label>
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان الكامل"
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">اسم البنك</label>
              <input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="Garanti Bank"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">رقم الحساب</label>
              <input value={form.bank_account_number} onChange={e => setForm({ ...form, bank_account_number: e.target.value })} placeholder="123456789"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">IBAN</label>
              <input value={form.bank_iban} onChange={e => setForm({ ...form, bank_iban: e.target.value })} placeholder="TR12..."
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">SWIFT</label>
              <input value={form.bank_swift} onChange={e => setForm({ ...form, bank_swift: e.target.value })} placeholder="GBKBTRIS"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">الرقم الضريبي</label>
            <input value={form.tax_number} onChange={e => setForm({ ...form, tax_number: e.target.value })} placeholder="123456789"
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="ملاحظات..."
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40 transition-colors resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-background/60 border border-white/10 rounded-xl text-sm font-bold hover:bg-background/80 transition-colors">إلغاء</button>
            <button type="submit" disabled={isLoading}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isLoading ? 'جارٍ الحفظ...' : supplier ? 'تحديث' : 'إنشاء المورد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
