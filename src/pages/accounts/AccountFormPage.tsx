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
  parent_id?: string
  owner_id?: string // Link to profile
  status: 'active' | 'inactive' | 'archived'
  notes?: string
}

export default function AccountFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
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
  const [profiles, setProfiles] = useState<any[]>([])

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
    fetchAccounts()
    fetchProfiles()
    if (id) {
      fetchAccount(id)
    }
  }, [id, fetchAccount, fetchAccounts])

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('id, full_name').order('full_name')
    if (data) setProfiles(data)
  }

  useEffect(() => {
    if (currentAccount && isEdit) {
      reset({
        code: currentAccount.code,
        name: currentAccount.name,
        type: currentAccount.type,
        balance: currentAccount.balance,
        currency: currentAccount.currency,
        parent_id: currentAccount.parent_id || '',
        owner_id: currentAccount.owner_id || '',
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

    const accountData = {
      ...data,
      balance: data.balance || 0,
      currency: data.currency || 'LYD',
      parent_id: data.parent_id || null,
      owner_id: data.owner_id || null,
      created_by: user?.id || ''
    }

    let result
    if (isEdit && id) {
      result = await updateAccount(id, accountData as any)
    } else {
      result = await createAccount(accountData as any)
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
    <div className="page-container pb-24">
      {localError && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">خطأ</p>
            <p className="text-sm text-destructive/80">{localError}</p>
          </div>
        </div>
      )}

      {localSuccess && (
        <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-success">نجاح</p>
            <p className="text-sm text-success/80">{localSuccess}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-black text-foreground">
          {isEdit ? 'تعديل الحساب الاحترافي' : 'إضافة حساب جديد'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="glass-card p-6 space-y-6 border-t-4 border-t-primary">
          <h3 className="text-lg font-black flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" />
            بيانات الحساب الأساسية
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-muted-foreground">كود الحساب (رقم الشجرة)</label>
              <input
                {...register('code', { required: 'كود الحساب مطلوب' })}
                className="input-field font-mono font-bold"
                placeholder="مثلاً: 120101"
              />
              {errors.code && <p className="mt-1 text-[10px] text-destructive font-bold">{errors.code.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-muted-foreground">اسم الحساب</label>
              <input
                {...register('name', { required: 'اسم الحساب مطلوب' })}
                className="input-field font-bold"
                placeholder="مثلاً: صندوق مهندس طرابلس"
              />
              {errors.name && <p className="mt-1 text-[10px] text-destructive font-bold">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-muted-foreground">الحساب الأب (الشجرة)</label>
              <select {...register('parent_id')} className="input-field">
                <option value="">لا يوجد (حساب رئيسي)</option>
                {accounts.filter(a => a.id !== id).map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-muted-foreground">نوع الحساب</label>
              <select {...register('type')} className="input-field">
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-muted-foreground">صاحب العُهدة / المسؤول (Owner)</label>
              <select {...register('owner_id')} className="input-field">
                <option value="">-- اختر المسؤول --</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-6 border-t-4 border-t-success">
          <h3 className="text-lg font-black flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center bg-success/10 text-success rounded-full text-[10px]">💰</span>
            العملة والميزانية
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-muted-foreground">العملة الأساسية</label>
              <select {...register('currency')} className="input-field font-black">
                <option value="LYD">دينار ليبي (LYD)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
                <option value="EGP">جنيه مصري (EGP)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-muted-foreground">الرصيد الابتدائي</label>
              <input
                type="number"
                step="0.001"
                {...register('balance', { valueAsNumber: true })}
                className="input-field text-xl font-black"
                placeholder="0.00"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-muted-foreground">حالة الحساب</label>
              <select {...register('status')} className="input-field">
                {ACCOUNT_STATUS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-muted-foreground">بيان وملاحظات</label>
            <textarea
              {...register('notes')}
              className="input-field min-h-[100px]"
              placeholder="وصف إضافي للحساب..."
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
              <Save className="w-6 h-6" />
              {isEdit ? 'حفظ التعديلات الذهبية' : 'إنشاء الحساب الجديد'}
            </>
          )}
        </button>
      </form>
    </div>
  )
}