import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ArrowRight, Save, Mail, Phone, User, Shield } from 'lucide-react'
import { useEmployeeStore } from '@/stores/employeeStore'
import { ROLES } from '@/lib/constants'

interface EmployeeFormData {
  full_name: string
  email: string
  phone: string
  role: 'super_admin' | 'admin' | 'employee' | 'viewer'
  password?: string
}

export default function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const createEmployee = useEmployeeStore((state) => state.createEmployee)
  const updateEmployee = useEmployeeStore((state) => state.updateEmployee)
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee)
  const fetchEmployee = useEmployeeStore((state) => state.fetchEmployee)
  const isLoading = useEmployeeStore((state) => state.isLoading)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<EmployeeFormData>({
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      role: 'employee'
    }
  })

  useEffect(() => {
    if (id) {
      fetchEmployee(id)
    }
  }, [id, fetchEmployee])

  useEffect(() => {
    if (currentEmployee && isEdit) {
      reset({
        full_name: currentEmployee.full_name,
        email: currentEmployee.email,
        phone: currentEmployee.phone || '',
        role: currentEmployee.role
      })
    }
  }, [currentEmployee, isEdit, reset])

  const onSubmit = (data: EmployeeFormData) => {
    if (isEdit && id) {
      updateEmployee(id, data)
    } else {
      createEmployee({
        ...data,
        is_active: true
      } as any)
    }
    navigate('/employees')
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">
          {isEdit ? 'تعديل موظف' : 'إضافة موظف جديد'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="card-elevated p-4">
          <h3 className="font-semibold mb-4">معلومات الموظف</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  {...register('full_name', { required: 'الاسم مطلوب' })}
                  className="input-field pr-10"
                  placeholder="أدخل الاسم الكامل"
                />
              </div>
              {errors.full_name && (
                <p className="mt-1 text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  {...register('email', { 
                    required: 'البريد الإلكتروني مطلوب',
                    pattern: { value: /^\S+@\S+$/i, message: 'بريد إلكتروني غير صالح' }
                  })}
                  className="input-field pr-10"
                  placeholder="أدخل البريد الإلكتروني"
                  dir="ltr"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {!isEdit && (
              <div>
                <label className="block text-sm font-medium mb-2">كلمة المرور المؤقتة</label>
                <input
                  type="password"
                  {...register('password', {
                    required: 'كلمة المرور مطلوبة',
                    minLength: { value: 6, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }
                  })}
                  className="input-field"
                  placeholder="6 أحرف على الأقل"
                  dir="ltr"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  {...register('phone')}
                  className="input-field pr-10"
                  placeholder="أدخل رقم الهاتف"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">الدور</label>
              <div className="relative">
                <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <select {...register('role')} className="input-field pr-10">
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
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
          {isEdit ? 'حفظ التغييرات' : 'إضافة موظف'}
        </button>
      </form>
    </div>
  )
}
