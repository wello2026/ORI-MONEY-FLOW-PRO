import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowRight, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { useAccountStore } from '@/stores/accountStore'
import { ACCOUNT_TYPES, ACCOUNT_STATUS } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'

interface AccountFormData {
  code: string
  name: string
  type: 'cashbox' | 'bank' | 'expense' | 'income' | 'employee' | 'temporary'
  balance: number
  currency: string
  status: 'active' | 'inactive' | 'archived'
  notes?: string
}

export default function AccountFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const createAccount = useAccountStore((state) => state.createAccount)
  const updateAccount = useAccountStore((state) => state.updateAccount)
  const currentAccount = useAccountStore((state) => state.currentAccount)
  const fetchAccount = useAccountStore((state) => state.fetchAccount)
  const isLoading = useAccountStore((state) => state.isLoading)
  const error = useAccountStore((state) => state.error)
  const successMessage = useAccountStore((state) => state.successMessage)
  const clearMessages = useAccountStore((state) => state.clearMessages)
  
  const [localError, setLocalError] = useState<string | null>(null)
  const [localSuccess, setLocalSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<AccountFormData>({
    defaultValues: {
      code: '',
      name: '',
      type: 'cashbox',
      balance: 0,
      currency: 'LYD',
      status: 'active',
      notes: ''
    }
  })

  useEffect(() => {
    if (id) {
      fetchAccount(id)
    }
  }, [id, fetchAccount])

  useEffect(() => {
    if (currentAccount && isEdit) {
      reset({
        code: currentAccount.code,
        name: currentAccount.name,
        type: currentAccount.type,
        balance: currentAccount.balance,
        currency: currentAccount.currency,
        status: currentAccount.status,
        notes: currentAccount.notes || ''
      })
    }
  }, [currentAccount, isEdit, reset])

  useEffect(() => {
    if (error) {
      setLocalError(error)
      setLocalSuccess(null)
      clearMessages()
    }
  }, [error, clearMessages])

  useEffect(() => {
    if (successMessage) {
      setLocalSuccess(successMessage)
      setLocalError(null)
      clearMessages()
    }
  }, [successMessage, clearMessages])

  const onSubmit = async (data: AccountFormData) => {
    setLocalError(null)
    setLocalSuccess(null)

    let result
    if (isEdit && id) {
      result = await updateAccount(id, {
        code: data.code,
        name: data.name,
        type: data.type,
        balance: data.balance || 0,
        currency: data.currency || 'LYD',
        status: data.status,
        notes: data.notes
      })
    } else {
      result = await createAccount({
        code: data.code,
        name: data.name,
        type: data.type,
        balance: data.balance || 0,
        currency: data.currency || 'LYD',
        status: data.status,
        notes: data.notes,
        created_by: user?.id || ''
      })
    }

    if (result.success) {
      setLocalSuccess(isEdit ? 'تم تحديث الحساب بنجاح' : 'تم إنشاء الحساب بنجاح')
      setTimeout(() => {
        navigate('/accounts')
      }, 1500)
    } else {
      setLocalError(result.error || 'حدث خطأ غير معروف')
    }
  }

  return (
    <div className="page-container">
      {localError && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
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
          <div>
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
        <h1 className="text-xl font-bold">
          {isEdit ? 'تعديل حساب' : 'إضافة حساب جديد'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="card-elevated p-4">
          <h3 className="font-semibold mb-4">معلومات الحساب</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">كود الحساب</label>
              <input
                {...register('code', { required: 'كود الحساب مطلوب' })}
                className="input-field"
                placeholder="أدخل كود الحساب"
              />
              {errors.code && (
                <p className="mt-1 text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">اسم الحساب</label>
              <input
                {...register('name', { required: 'اسم الحساب مطلوب' })}
                className="input-field"
                placeholder="أدخل اسم الحساب"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">نوع الحساب</label>
              <select {...register('type')} className="input-field">
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">الرصيد الابتدائي</label>
              <input
                type="number"
                step="0.001"
                {...register('balance', { valueAsNumber: true })}
                className="input-field"
                placeholder="0"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">الحالة</label>
              <select {...register('status')} className="input-field">
                {ACCOUNT_STATUS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">ملاحظات</label>
              <textarea
                {...register('notes')}
                className="input-field min-h-[100px]"
                placeholder="ملاحظات اختيارية..."
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
            <Save className="w-5 h-5" />
          )}
          {isEdit ? 'حفظ التغييرات' : 'إنشاء حساب'}
        </button>
      </form>
    </div>
  )
}