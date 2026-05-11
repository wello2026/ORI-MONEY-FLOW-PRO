import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shuffle, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import { useTreasuryStore } from '@/stores/treasuryStore'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Treasury } from '@/types'

export default function CurrencyTransferPage() {
  const { treasuries, isLoading, fetchTreasuries, createCurrencyTransfer, successMessage, error } = useTreasuryStore()
  const navigate = useNavigate()
  const currentCompany = useAuthStore((s) => s.currentCompany)

  const [sourceId, setSourceId] = useState('')
  const [destId, setDestId] = useState('')
  const [amount, setAmount] = useState('')
  const [exchangeRate, setExchangeRate] = useState('1')
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null)

  useEffect(() => {
    fetchTreasuries()
  }, [fetchTreasuries])

  const source = treasuries.find(t => t.id === sourceId)
  const dest = treasuries.find(t => t.id === destId)

  // Auto-calculate exchange rate when source/dest change
  useEffect(() => {
    if (source && dest && source.currency_code !== dest.currency_code) {
      // Default rates for demo — in production, fetch from currency_rates table
      const defaultRates: Record<string, Record<string, number>> = {
        USD: { LYD: 50, TRY: 32, CNY: 7.2 },
        LYD: { USD: 0.02, TRY: 0.64 },
        TRY: { USD: 0.031, LYD: 1.56 },
        CNY: { USD: 0.14 }
      }
      const rate = defaultRates[source.currency_code]?.[dest.currency_code]
      if (rate) setExchangeRate(rate.toString())
    } else {
      setExchangeRate('1')
    }
  }, [sourceId, destId])

  const destAmount = parseFloat(amount || '0') * parseFloat(exchangeRate || '1')
  const destCurrency = dest?.currency_code || ''

  const canSubmit = sourceId && destId && amount && parseFloat(amount) > 0 && sourceId !== destId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setResult(null)

    const res = await createCurrencyTransfer({
      source_treasury_id: sourceId,
      destination_treasury_id: destId,
      source_amount: parseFloat(amount),
      exchange_rate: parseFloat(exchangeRate),
      description: description || undefined,
      reference: reference || undefined
    })

    setSubmitting(false)
    setResult(res)

    if (res.success) {
      setTimeout(() => {
        navigate('/treasuries')
      }, 1500)
    }
  }

  return (
    <div className="page-container pb-24 animate-fade-in">
      <button
        onClick={() => navigate('/treasuries')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-bold">العودة للخزائن</span>
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">تحويل عملات</h1>
        <p className="text-muted-foreground text-sm mt-1">تحويل بين خزائن بعملات مختلفة</p>
      </div>

      {/* Result Banner */}
      {result && (
        <div className={cn(
          'mb-6 p-4 rounded-xl border flex items-center gap-3',
          result.success
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
            : 'bg-red-500/10 border-red-500/30 text-red-600'
        )}>
          {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-bold">{result.message}</span>
        </div>
      )}

      {/* Transfer Preview */}
      {source && dest && (
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">المصدر</div>
              <div className="font-black text-foreground">{source.treasury_name_ar || source.treasury_name}</div>
              <div className="text-sm text-muted-foreground">{source.currency_code}</div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shuffle className="w-6 h-6 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground font-bold">
                {source.currency_code} → {dest.currency_code}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">الوجهة</div>
              <div className="font-black text-foreground">{dest.treasury_name_ar || dest.treasury_name}</div>
              <div className="text-sm text-muted-foreground">{dest.currency_code}</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source & Destination */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">
              الخزينة المصدر <span className="text-red-500">*</span>
            </label>
            <select
              value={sourceId}
              onChange={e => { setSourceId(e.target.value); setResult(null) }}
              className="input-field"
              required
            >
              <option value="">اختر الخزينة...</option>
              {treasuries.filter(t => t.is_active).map(t => (
                <option key={t.id} value={t.id}>
                  {t.treasury_name_ar || t.treasury_name} ({t.currency_code}) — {formatCurrency(t.current_balance, t.currency_code)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">
              الخزينة الوجهة <span className="text-red-500">*</span>
            </label>
            <select
              value={destId}
              onChange={e => { setDestId(e.target.value); setResult(null) }}
              className="input-field"
              required
            >
              <option value="">اختر الخزينة...</option>
              {treasuries.filter(t => t.is_active && t.id !== sourceId).map(t => (
                <option key={t.id} value={t.id}>
                  {t.treasury_name_ar || t.treasury_name} ({t.currency_code}) — {formatCurrency(t.current_balance, t.currency_code)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount & Rate */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">
              المبلغ <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={amount}
              onChange={e => { setAmount(e.target.value); setResult(null) }}
              className="input-field"
              placeholder="0.00"
              required
            />
            {source && (
              <div className="text-xs text-muted-foreground mt-1">
                الرصيد: {formatCurrency(source.current_balance, source.currency_code)}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">
              سعر الصرف
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={exchangeRate}
              onChange={e => setExchangeRate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">
              المبلغ المستلم
            </label>
            <div className="h-[50px] bg-muted/20 rounded-xl flex items-center justify-center border border-border">
              <span className="text-xl font-black text-foreground">
                {formatCurrency(destAmount, destCurrency)}
              </span>
            </div>
          </div>
        </div>

        {/* Description & Reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">المرجع</label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="input-field"
              placeholder="رقم المرجع..."
            />
          </div>
          <div>
            <label className="text-sm font-bold text-foreground mb-1.5 block">الوصف</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input-field"
              placeholder="وصف التحويل..."
            />
          </div>
        </div>

        {/* Balance Warning */}
        {source && amount && parseFloat(amount) > source.current_balance && !source.allow_overdraft && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="text-sm text-red-600 font-bold">
              رصيد غير كافٍ! الرصيد المتاح: {formatCurrency(source.current_balance, source.currency_code)}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/treasuries')}
            className="flex-1 btn-secondary py-4 rounded-xl"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="flex-1 btn-primary py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'جاري الإنشاء...' : 'إنشاء التحويل'}
          </button>
        </div>
      </form>
    </div>
  )
}
