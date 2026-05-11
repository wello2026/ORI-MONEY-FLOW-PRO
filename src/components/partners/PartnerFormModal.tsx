import { useState } from 'react'
import { X } from 'lucide-react'
import { usePartnerStore } from '@/stores/partnerStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { FinancialPartner } from '@/types'

interface Props {
  partner?: FinancialPartner
  onClose: () => void
  onSuccess: () => void
}

const COUNTRIES = ['تركيا', 'الصين', 'ألمانيا', 'إيطاليا', 'إسبانيا', 'فرنسا', 'هولندا', 'بريطانيا', 'أمريكا', 'الإمارات', 'مصر', 'ليبيا']

const CURRENCIES = ['USD', 'LYD', 'TRY', 'CNY', 'EUR', 'GBP']

export function PartnerFormModal({ partner, onClose, onSuccess }: Props) {
  const { createPartner, updatePartner, isLoading, error, clearMessages } = usePartnerStore()
  const currentCompany = useAuthStore((s) => s.currentCompany)

  const [form, setForm] = useState({
    partner_code: partner?.partner_code || '',
    partner_name: partner?.partner_name || '',
    partner_name_ar: partner?.partner_name_ar || '',
    country: partner?.country || '',
    currency_code: partner?.currency_code || 'USD',
    contact_person: partner?.contact_person || '',
    phone: partner?.phone || '',
    email: partner?.email || '',
    address: partner?.address || '',
    bank_name: partner?.bank_name || '',
    bank_account_number: partner?.bank_account_number || '',
    bank_iban: partner?.bank_iban || '',
    bank_swift: partner?.bank_swift || '',
    tax_number: partner?.tax_number || '',
    notes: partner?.notes || ''
  })

  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    clearMessages()

    if (!form.partner_name.trim()) {
      setFieldError('اسم الشريك مطلوب')
      return
    }
    if (!form.partner_code.trim()) {
      setFieldError('كود الشريك مطلوب')
      return
    }

    if (partner) {
      const result = await updatePartner(partner.id, form)
      if (result.success) onSuccess()
    } else {
      const result = await createPartner(form as any)
      if (result.success) onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card/90 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-black text-foreground">
            {partner ? 'تعديل الشريك' : 'شريك مالي جديد'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-background/40 transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Error */}
        {(error || fieldError) && (
          <div className="mx-5 mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <p className="text-sm text-destructive font-bold">{fieldError || error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground">المعلومات الأساسية</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">كود الشريك *</label>
                <input
                  type="text"
                  value={form.partner_code}
                  onChange={(e) => setForm({ ...form, partner_code: e.target.value })}
                  placeholder="P-001"
                  className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                    focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">العملة</label>
                <select
                  value={form.currency_code}
                  onChange={(e) => setForm({ ...form, currency_code: e.target.value })}
                  className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                    focus:outline-none focus:border-primary/40 transition-colors"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">اسم الشريك (EN) *</label>
              <input
                type="text"
                value={form.partner_name}
                onChange={(e) => setForm({ ...form, partner_name: e.target.value })}
                placeholder="ABC Manufacturing Co."
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                  focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">اسم الشريك (AR)</label>
              <input
                type="text"
                value={form.partner_name_ar}
                onChange={(e) => setForm({ ...form, partner_name_ar: e.target.value })}
                placeholder="شركة التصنيع أ.ب.ج"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                  focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">الدولة</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                    focus:outline-none focus:border-primary/40 transition-colors"
                >
                  <option value="">اختر الدولة</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">شخص الاتصال</label>
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  placeholder="أحمد محمد"
                  className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                    focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground">معلومات التواصل</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">الهاتف</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+90 555 123 4567"
                  className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                    focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="info@example.com"
                  className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                    focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">العنوان</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="العنوان الكامل"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                  focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
          </div>

          {/* Bank Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground">المعلومات البنكية</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">اسم البنك</label>
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="Garanti Bank"
                  className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                    focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">رقم الحساب</label>
                <input
                  type="text"
                  value={form.bank_account_number}
                  onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                    focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">IBAN</label>
                <input
                  type="text"
                  value={form.bank_iban}
                  onChange={(e) => setForm({ ...form, bank_iban: e.target.value })}
                  placeholder="TR12 3456 7890 1234 5678 9012 3456"
                  className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                    focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1">SWIFT</label>
                <input
                  type="text"
                  value={form.bank_swift}
                  onChange={(e) => setForm({ ...form, bank_swift: e.target.value })}
                  placeholder="GBKBTRIS"
                  className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                    focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">الرقم الضريبي</label>
              <input
                type="text"
                value={form.tax_number}
                onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                placeholder="123456789"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                  focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="ملاحظات إضافية..."
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                focus:outline-none focus:border-primary/40 transition-colors resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-background/60 border border-white/10 rounded-xl text-sm font-bold
                hover:bg-background/80 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold
                hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'جارٍ الحفظ...' : partner ? 'تحديث الشريك' : 'إنشاء الشريك'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
