import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowRight, Shuffle, AlertCircle, CheckCircle } from 'lucide-react'
import { useAccountStore } from '@/stores/accountStore'
import { useTransferStore } from '@/stores/transferStore'
import { formatCurrency } from '@/lib/format'

interface TransferFormData {
  source_account_id: string
  destination_account_id: string
  amount: number
  exchange_rate: number
  description: string
}

export default function TransferFormPage() {
  const navigate = useNavigate()
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  const activeAccounts = accounts.filter(a => a.status === 'active')
  const createTransfer = useTransferStore((state) => state.createTransfer)
  const isLoading = useTransferStore((state) => state.isLoading)
  const error = useTransferStore((state) => state.error)
  const successMessage = useTransferStore((state) => state.successMessage)
  const clearMessages = useTransferStore((state) => state.clearMessages)

  const [localError, setLocalError] = useState<string | null>(null)
  const [localSuccess, setLocalSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    if (error) {
      setLocalError(error)
      clearMessages()
    }
  }, [error, clearMessages])

  useEffect(() => {
    if (successMessage) {
      setLocalSuccess(successMessage)
      clearMessages()
      setTimeout(() => {
        navigate('/transfers')
      }, 1500)
    }
  }, [successMessage, clearMessages, navigate])

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    watch,
    setValue
  } = useForm<TransferFormData>({
    defaultValues: {
      amount: 0,
      exchange_rate: 1,
      description: ''
    }
  })

  const sourceId = watch('source_account_id')
  const destId = watch('destination_account_id')
  const amount = watch('amount')
  const rate = watch('exchange_rate')
  
  const sourceAccount = activeAccounts.find(a => a.id === sourceId)
  const destAccount = activeAccounts.find(a => a.id === destId)

  const isDifferentCurrency = sourceAccount && destAccount && sourceAccount.currency !== destAccount.currency
  const convertedAmount = amount * rate

  useEffect(() => {
    if (!isDifferentCurrency) {
      setValue('exchange_rate', 1)
    }
  }, [isDifferentCurrency, setValue])

  const onSubmit = async (data: TransferFormData) => {
    setLocalError(null)
    setLocalSuccess(null)

    if (data.source_account_id === data.destination_account_id) {
      setLocalError('لا يمكن التحويل إلى نفس الحساب!')
      return
    }

    if (data.amount <= 0) {
      setLocalError('المبلغ يجب أن يكون أكبر من صفر')
      return
    }
    
    const result = await createTransfer({
      source_account_id: data.source_account_id,
      destination_account_id: data.destination_account_id,
      amount: data.amount,
      exchange_rate: data.exchange_rate,
      description: data.description
    } as any)
    
    if (result.success) {
      setLocalSuccess('تم إنشاء التحويل بنجاح')
    } else {
      setLocalError(result.error || 'حدث خطأ في إنشاء التحويل')
    }
  }

  return (
    <div className="page-container pb-24">
      {localError && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">خطأ</p>
            <p className="text-sm text-destructive/80">{localError}</p>
          </div>
          <button 
            onClick={() => setLocalError(null)}
            className="mr-auto text-destructive hover:bg-destructive/20 p-1 rounded"
          >
            ×
          </button>
        </div>
      )}

      {localSuccess && (
        <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-success">نجاح</p>
            <p className="text-sm text-success/80">{localSuccess}</p>
          </div>
          <button 
            onClick={() => setLocalSuccess(null)}
            className="mr-auto text-success hover:bg-success/20 p-1 rounded"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">التحويل الاحترافي</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {/* Source Account */}
          <div className="glass-card p-6 border-t-4 border-t-primary">
            <h3 className="font-black mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">01</span>
              من الحساب (المصدر)
            </h3>
            <select {...register('source_account_id', { required: 'اختر الحساب' })} className="input-field mb-4">
              <option value="">اختر الحساب المصدر...</option>
              {activeAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
            {sourceAccount && (
              <div className="p-4 bg-muted/30 rounded-2xl">
                <p className="text-[10px] text-muted-foreground font-bold uppercase">الرصيد المتاح</p>
                <p className="text-lg font-black text-foreground">{formatCurrency(sourceAccount.balance, sourceAccount.currency)}</p>
              </div>
            )}
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-gold">
              <Shuffle className="w-6 h-6" />
            </div>
          </div>

          {/* Destination Account */}
          <div className="glass-card p-6 border-t-4 border-t-success">
            <h3 className="font-black mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success text-xs">02</span>
              إلى الحساب (الوجهة)
            </h3>
            <select {...register('destination_account_id', { required: 'اختر الحساب' })} className="input-field mb-4">
              <option value="">اختر الحساب الوجهة...</option>
              {activeAccounts
                .filter(a => a.id !== sourceId)
                .map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
            </select>
            {destAccount && (
              <div className="p-4 bg-muted/30 rounded-2xl">
                <p className="text-[10px] text-muted-foreground font-bold uppercase">الرصيد الحالي</p>
                <p className="text-lg font-black text-foreground">{formatCurrency(destAccount.balance, destAccount.currency)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-black mb-6">المبلغ وتفاصيل الصرف</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black mb-2 text-muted-foreground">المبلغ المراد تحويله</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  className="input-field text-2xl font-black h-16"
                  placeholder="0.00"
                  dir="ltr"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">{sourceAccount?.currency || ''}</span>
              </div>
            </div>

            {isDifferentCurrency && (
              <div className="animate-slide-up">
                <label className="block text-sm font-black mb-2 text-primary">معامل التحويل (Exchange Rate)</label>
                <input
                  type="number"
                  step="0.000001"
                  {...register('exchange_rate', { valueAsNumber: true })}
                  className="input-field text-xl font-black border-primary/50 h-16 bg-primary/5"
                  dir="ltr"
                />
                <p className="text-[10px] text-primary mt-1 font-bold">1 {sourceAccount.currency} = {rate} {destAccount.currency}</p>
              </div>
            )}
          </div>

          {isDifferentCurrency && (
            <div className="mt-8 p-6 bg-secondary rounded-3xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
              <p className="text-xs text-muted-foreground font-bold mb-1">المبلغ الذي سيصل للوجهة</p>
              <p className="text-3xl font-black text-white">
                {formatCurrency(convertedAmount, destAccount.currency)}
              </p>
            </div>
          )}

          <div className="mt-6">
            <label className="block text-sm font-black mb-2 text-muted-foreground">البيان / ملاحظات التحويل</label>
            <textarea
              {...register('description')}
              className="input-field min-h-[100px]"
              placeholder="مثلاً: تحويل عهدة للمهندس..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-5 rounded-3xl shadow-gold text-lg font-black flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Shuffle className="w-6 h-6" />
              تأكيد عملية التحويل الذهبي
            </>
          )}
        </button>
      </form>
    </div>
  )
}