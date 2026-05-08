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
    formState: { errors },
    watch
  } = useForm<TransferFormData>({
    defaultValues: {
      amount: 0,
      description: ''
    }
  })

  const sourceId = watch('source_account_id')
  const sourceAccount = activeAccounts.find(a => a.id === sourceId)

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
      description: data.description
    })
    
    if (result.success) {
      setLocalSuccess('تم إنشاء التحويل بنجاح')
    } else {
      setLocalError(result.error || 'حدث خطأ في إنشاء التحويل')
    }
  }

  return (
    <div className="page-container">
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
        <h1 className="text-xl font-bold">تحويل جديد</h1>
      </div>

      <div className="kpi-card mb-6 flex items-center gap-3">
        <Shuffle className="w-8 h-8 opacity-80" />
        <div>
          <p className="text-sm opacity-80">تحويل أموال</p>
          <p className="font-bold">بين الحسابات</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="card-elevated p-4">
          <h3 className="font-semibold mb-4">من الحساب</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">اختر الحساب المصدر</label>
              {activeAccounts.length === 0 ? (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-center">
                  <p className="text-sm text-warning">لا توجد حسابات نشطة. يرجى إنشاء حساب أولاً.</p>
                  <button 
                    type="button"
                    onClick={() => navigate('/accounts/new')}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    إنشاء حساب جديد
                  </button>
                </div>
              ) : (
                <select {...register('source_account_id', { required: 'اختر الحساب' })} className="input-field">
                  <option value="">اختر...</option>
                  {activeAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.code}) - الرصيد: {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
              )}
              {errors.source_account_id && (
                <p className="mt-1 text-sm text-destructive">{errors.source_account_id.message}</p>
              )}
            </div>

            {sourceAccount && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">الرصيد المتاح</p>
                <p className="font-bold text-lg">{formatCurrency(sourceAccount.balance)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card-elevated p-4">
          <h3 className="font-semibold mb-4">إلى الحساب</h3>
          
          <div>
            <label className="block text-sm font-medium mb-2">اختر الحساب الوجهة</label>
            {activeAccounts.length === 0 ? (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-center">
                <p className="text-sm text-warning">لا توجد حسابات نشطة</p>
              </div>
            ) : (
              <select {...register('destination_account_id', { required: 'اختر الحساب' })} className="input-field">
                <option value="">اختر...</option>
                {activeAccounts
                  .filter(a => a.id !== sourceId)
                  .map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.code})
                    </option>
                  ))}
              </select>
            )}
            {errors.destination_account_id && (
              <p className="mt-1 text-sm text-destructive">{errors.destination_account_id.message}</p>
            )}
          </div>
        </div>

        <div className="card-elevated p-4">
          <h3 className="font-semibold mb-4">المبلغ والتفاصيل</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">المبلغ</label>
              <input
                type="number"
                step="0.01"
                {...register('amount', { 
                  required: 'المبلغ مطلوب',
                  min: { value: 0.01, message: 'المبلغ يجب أن يكون أكبر من صفر' },
                  valueAsNumber: true
                })}
                className="input-field"
                placeholder="0.00"
                dir="ltr"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">ملاحظات (اختياري)</label>
              <textarea
                {...register('description')}
                className="input-field min-h-[80px]"
                placeholder="ملاحظات حول التحويل..."
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <Shuffle className="w-5 h-5" />
              تنفيذ التحويل
            </>
          )}
        </button>
      </form>
    </div>
  )
}