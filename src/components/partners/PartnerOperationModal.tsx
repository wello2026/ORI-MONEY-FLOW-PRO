import { useState } from 'react'
import { X, ArrowUpRight, Package, UserCog, CheckCircle } from 'lucide-react'
import { usePartnerStore } from '@/stores/partnerStore'
import { useTreasuryStore } from '@/stores/treasuryStore'
import { useAuthStore } from '@/stores/authStore'
import type { JournalEntryLine } from '@/types'

interface Props {
  partnerId: string
  operationType: 'advance' | 'material' | 'labor' | 'settle'
  partnerName: string
  currency: string
  onClose: () => void
  onSuccess: () => void
}

const CURRENCIES = ['USD', 'LYD', 'TRY', 'CNY', 'EUR', 'GBP']

export function PartnerOperationModal({ partnerId, operationType, partnerName, currency, onClose, onSuccess }: Props) {
  const { recordAdvance, recordExpense, settlePartner, isLoading, error, clearMessages } = usePartnerStore()
  const { treasuries } = useTreasuryStore()
  const currentCompany = useAuthStore((s) => s.currentCompany)

  const [amount, setAmount] = useState('')
  const [currency_code, setCurrencyCode] = useState(currency)
  const [description, setDescription] = useState('')
  const [reference_number, setReferenceNumber] = useState('')
  const [project_id, setProjectId] = useState('')
  const [direction, setDirection] = useState<'we_pay' | 'partner_pays'>('we_pay')
  const [fieldError, setFieldError] = useState<string | null>(null)

  const titles = {
    advance: { title: 'إرسال سلفة للشريك', icon: ArrowUpRight, color: 'text-blue-500', bg: 'bg-blue-500' },
    material: { title: 'تسجيل شراء مواد', icon: Package, color: 'text-amber-500', bg: 'bg-amber-500' },
    labor: { title: 'تسجيل تكاليف عمالة', icon: UserCog, color: 'text-orange-500', bg: 'bg-orange-500' },
    settle: { title: 'تسوية مع الشريك', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500' }
  }

  const title = titles[operationType]
  const Icon = title.icon

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    clearMessages()

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setFieldError('المبلغ يجب أن يكون أكبر من صفر')
      return
    }

    if (operationType === 'advance') {
      const result = await recordAdvance({
        partner_id: partnerId,
        amount: numAmount,
        currency_code,
        description: description || undefined,
        reference_number: reference_number || undefined,
        project_id: project_id || undefined
      })
      if (result.success) onSuccess()
    } else if (operationType === 'material') {
      const result = await recordExpense({
        partner_id: partnerId,
        entry_type: 'material_purchase',
        amount: numAmount,
        currency_code,
        description: description || undefined,
        reference_number: reference_number || undefined,
        project_id: project_id || undefined
      })
      if (result.success) onSuccess()
    } else if (operationType === 'labor') {
      const result = await recordExpense({
        partner_id: partnerId,
        entry_type: 'labor_cost',
        amount: numAmount,
        currency_code,
        description: description || undefined,
        reference_number: reference_number || undefined,
        project_id: project_id || undefined
      })
      if (result.success) onSuccess()
    } else if (operationType === 'settle') {
      const result = await settlePartner({
        partner_id: partnerId,
        settlement_amount: numAmount,
        direction,
        currency_code,
        description: description || undefined,
        reference_number: reference_number || undefined
      })
      if (result.success) onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="bg-card/90 backdrop-blur border-b border-white/5 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${title.bg}/10`}>
              <Icon className={`w-5 h-5 ${title.color}`} />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">{title.title}</h2>
              <p className="text-xs text-muted-foreground">{partnerName}</p>
            </div>
          </div>
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
          {/* Amount */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-muted-foreground mb-1">المبلغ *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                  focus:outline-none focus:border-primary/40 transition-colors text-lg font-black"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">العملة</label>
              <select
                value={currency_code}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                  focus:outline-none focus:border-primary/40 transition-colors"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Direction for settlement */}
          {operationType === 'settle' && (
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2">اتجاه التسوية</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection('we_pay')}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    direction === 'we_pay'
                      ? 'bg-red-500/10 border-red-500/40 text-red-500'
                      : 'bg-background/40 border-white/10 text-muted-foreground hover:border-white/20'
                  }`}
                >
                  نحن نسدد للشريك
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('partner_pays')}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    direction === 'partner_pays'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                      : 'bg-background/40 border-white/10 text-muted-foreground hover:border-white/20'
                  }`}
                >
                  الشريك يسدد لنا
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">الوصف / الملاحظات</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={operationType === 'advance' ? 'غرض السلفة...' : 'تفاصيل العملية...'}
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                focus:outline-none focus:border-primary/40 transition-colors resize-none"
            />
          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">رقم المرجع</label>
            <input
              type="text"
              value={reference_number}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="رقم الفاتورة أو المرجع..."
              className="w-full px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm
                focus:outline-none focus:border-primary/40 transition-colors"
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
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50
                ${operationType === 'advance' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                  operationType === 'material' ? 'bg-amber-500 text-white hover:bg-amber-600' :
                  operationType === 'labor' ? 'bg-orange-500 text-white hover:bg-orange-600' :
                  'bg-emerald-500 text-white hover:bg-emerald-600'}`}
            >
              {isLoading ? 'جارٍ المعالجة...' : title.title.split(' ').slice(0, 2).join(' ')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
