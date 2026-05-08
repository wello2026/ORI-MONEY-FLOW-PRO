import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { useTransactionStore } from '@/stores/transactionStore'
import { useAccountStore } from '@/stores/accountStore'
import { TRANSACTION_TYPES } from '@/lib/constants'
import { OcrScanner } from '@/components/transactions/OcrScanner'

const transactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'expense', 'income', 'salary', 'custody', 'adjustment', 'settlement']),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  account_id: z.string().min(1, 'اختر الحساب'),
  offset_account_id: z.string().optional(),
  description: z.string().optional()
})

type TransactionFormData = z.infer<typeof transactionSchema>

export default function TransactionFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  
  const currentTransaction = useTransactionStore((state) => state.currentTransaction)
  const fetchTransaction = useTransactionStore((state) => state.fetchTransaction)
  const createTransaction = useTransactionStore((state) => state.createTransaction)
  const updateTransaction = useTransactionStore((state) => state.updateTransaction)
  const isLoading = useTransactionStore((state) => state.isLoading)
  const error = useTransactionStore((state) => state.error)
  const successMessage = useTransactionStore((state) => state.successMessage)
  const clearMessages = useTransactionStore((state) => state.clearMessages)
  
  const [localError, setLocalError] = useState<string | null>(null)
  const [localSuccess, setLocalSuccess] = useState<string | null>(null)
  
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  const activeAccounts = accounts.filter(a => a.status === 'active')

  useEffect(() => {
    fetchAccounts()
    if (isEdit && id) {
      fetchTransaction(id)
    }
  }, [id, isEdit, fetchAccounts, fetchTransaction])

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { amount: 0 }
  })

  useEffect(() => {
    if (isEdit && currentTransaction) {
      reset({
        type: currentTransaction.type,
        amount: currentTransaction.amount,
        account_id: currentTransaction.account_id,
        offset_account_id: currentTransaction.offset_account_id || '',
        description: currentTransaction.description || ''
      })
    }
  }, [isEdit, currentTransaction, reset])

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
        navigate('/transactions')
      }, 1500)
    }
  }, [successMessage, clearMessages, navigate])

  const handleOcrScanComplete = (data: { amount: number; description: string; type: string }) => {
    setValue('amount', data.amount, { shouldValidate: true })
    setValue('description', data.description, { shouldValidate: true })
    if (['deposit', 'withdrawal', 'expense', 'income', 'salary', 'custody', 'adjustment', 'settlement'].includes(data.type)) {
      setValue('type', data.type as any, { shouldValidate: true })
    }
  }

  const onSubmit = async (data: TransactionFormData) => {
    setLocalError(null)
    setLocalSuccess(null)
    
    let result
    if (isEdit && id) {
      result = await updateTransaction(id, data)
    } else {
      result = await createTransaction({
        ...data,
        status: 'pending'
      })
    }
    
    if (result.success) {
      setLocalSuccess(isEdit ? 'تم تحديث المعاملة بنجاح' : 'تم إنشاء المعاملة بنجاح')
    } else {
      setLocalError(result.error || 'حدث خطأ في العملية')
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
        <h1 className="text-xl font-bold">{isEdit ? 'تعديل معاملة' : 'معاملة جديدة'}</h1>
      </div>

      {activeAccounts.length === 0 ? (
        <div className="card-elevated p-6 text-center">
          <p className="text-muted-foreground mb-4">لا توجد حسابات نشطة</p>
          <button onClick={() => navigate('/accounts/new')} className="btn-primary">
            إنشاء حساب جديد
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <OcrScanner onScanComplete={handleOcrScanComplete} />
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="card-elevated p-4">
            <h3 className="font-semibold mb-4">نوع المعاملة</h3>
            <div className="grid grid-cols-2 gap-2">
              {TRANSACTION_TYPES.map((type) => (
                <label
                  key={type.value}
                  className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50"
                >
                  <input
                    type="radio"
                    value={type.value}
                    {...register('type')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card-elevated p-4">
            <h3 className="font-semibold mb-4">الحساب والمبلغ</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">الحساب الأساسي (الصندوق/البنك)</label>
                  <select {...register('account_id')} className="input-field">
                    <option value="">اختر...</option>
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.code})
                      </option>
                    ))}
                  </select>
                  {errors.account_id && (
                    <p className="mt-1 text-sm text-destructive">{errors.account_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">الحساب المقابل (إيراد/مصروف)</label>
                  <select {...register('offset_account_id')} className="input-field">
                    <option value="">لا يوجد (اختياري)</option>
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">المبلغ</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  className="input-field"
                  placeholder="0.00"
                  dir="ltr"
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="card-elevated p-4">
            <label className="block text-sm font-medium mb-2">ملاحظات (اختياري)</label>
            <textarea
              {...register('description')}
              className="input-field min-h-[100px]"
              placeholder="ملاحظات حول المعاملة..."
            />
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
                <Save className="w-5 h-5" />
                حفظ المعاملة
              </>
            )}
          </button>
        </form>
        </div>
      )}
    </div>
  )
}