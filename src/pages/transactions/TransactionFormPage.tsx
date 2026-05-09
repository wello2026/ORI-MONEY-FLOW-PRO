import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Save, AlertCircle, CheckCircle, Camera, X } from 'lucide-react'
import { useTransactionStore } from '@/stores/transactionStore'
import { useAccountStore } from '@/stores/accountStore'
import { useProjectStore } from '@/stores/projectStore'
import { TRANSACTION_TYPES } from '@/lib/constants'
import { OcrScanner } from '@/components/transactions/OcrScanner'

const transactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'expense', 'income', 'salary', 'custody', 'adjustment', 'settlement']),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  account_id: z.string().min(1, 'اختر الحساب'),
  offset_account_id: z.string().optional(),
  project_id: z.string().optional(),
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
  const [attachments, setAttachments] = useState<string[]>([])
  
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  const activeAccounts = accounts.filter(a => a.status === 'active')

  const projects = useProjectStore((state) => state.projects)
  const fetchProjects = useProjectStore((state) => state.fetchProjects)

  useEffect(() => {
    fetchAccounts()
    fetchProjects()
    if (isEdit && id) {
      fetchTransaction(id)
    }
  }, [id, isEdit, fetchAccounts, fetchTransaction, fetchProjects])

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
        project_id: currentTransaction.project_id || '',
        description: currentTransaction.description || ''
      })
      if (currentTransaction.attachments) {
        setAttachments(currentTransaction.attachments as string[])
      }
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mocking file upload for now, in a real app this would upload to Supabase Storage
    const file = e.target.files?.[0]
    if (file) {
      const fakeUrl = URL.createObjectURL(file)
      setAttachments(prev => [...prev, fakeUrl])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: TransactionFormData) => {
    setLocalError(null)
    setLocalSuccess(null)
    
    let result
    const transactionData = {
      ...data,
      attachments: attachments,
      status: 'pending' as any
    }

    if (isEdit && id) {
      result = await updateTransaction(id, transactionData)
    } else {
      result = await createTransaction(transactionData as any)
    }
    
    if (result.success) {
      setLocalSuccess(isEdit ? 'تم تحديث المعاملة بنجاح' : 'تم إنشاء المعاملة بنجاح')
    } else {
      setLocalError(result.error || 'حدث خطأ في العملية')
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TRANSACTION_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all"
                  >
                    <input
                      type="radio"
                      value={type.value}
                      {...register('type')}
                      className="hidden"
                    />
                    <span className="text-sm font-bold">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="card-elevated p-4">
              <h3 className="font-semibold mb-4">الموقع والمشروع</h3>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">اختر المشروع الميداني</label>
                <select {...register('project_id')} className="input-field">
                  <option value="">عام / غير محدد</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card-elevated p-4">
              <h3 className="font-semibold mb-4">الحساب والمبلغ</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-muted-foreground">الحساب الأساسي (خزينة المهندس)</label>
                    <select {...register('account_id')} className="input-field">
                      <option value="">اختر الحساب...</option>
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
                    <label className="block text-sm font-medium mb-2 text-muted-foreground">الحساب المقابل (اختياري)</label>
                    <select {...register('offset_account_id')} className="input-field">
                      <option value="">لا يوجد</option>
                      {activeAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">المبلغ المدفوع</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('amount', { valueAsNumber: true })}
                    className="input-field text-xl font-black"
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
              <h3 className="font-semibold mb-4">المرفقات (صورة الفاتورة)</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {attachments.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                    <img src={url} alt="attachment" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute top-1 right-1 p-1 bg-error/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground mt-1">تصوير</span>
                </label>
              </div>
            </div>

            <div className="card-elevated p-4">
              <label className="block text-sm font-medium mb-2 text-muted-foreground">التفاصيل / البيان</label>
              <textarea
                {...register('description')}
                className="input-field min-h-[100px]"
                placeholder="بيان الفاتورة أو المصروف..."
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 rounded-2xl shadow-gold font-black"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  حفظ العملية الميدانية
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}