import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Edit, Trash2, Mail, Phone, Shield, Calendar } from 'lucide-react'
import { useEmployeeStore } from '@/stores/employeeStore'
import { formatRole, formatDateTime } from '@/lib/format'

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentEmployee = useEmployeeStore((state) => state.currentEmployee)
  const fetchEmployee = useEmployeeStore((state) => state.fetchEmployee)
  const deleteEmployee = useEmployeeStore((state) => state.deleteEmployee)
  const toggleEmployeeStatus = useEmployeeStore((state) => state.toggleEmployeeStatus)

  useEffect(() => {
    if (id) fetchEmployee(id)
  }, [id, fetchEmployee])

  if (!currentEmployee) {
    return (
      <div className="page-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">تفاصيل الموظف</h1>
      </div>

      <div className="kpi-card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="avatar avatar-lg text-2xl">
              {currentEmployee.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{currentEmployee.full_name}</h2>
              <p className="opacity-80">{formatRole(currentEmployee.role)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate(`/employees/${id}/edit`)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
                  deleteEmployee(id!)
                  navigate('/employees')
                }
              }}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-error"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">البريد الإلكتروني</span>
          </div>
          <p className="font-medium" dir="ltr">{currentEmployee.email}</p>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center gap-3 mb-2">
            <Phone className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">رقم الهاتف</span>
          </div>
          <p className="font-medium" dir="ltr">{currentEmployee.phone || 'غير متوفر'}</p>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">الدور</span>
          </div>
          <p className="font-medium">{formatRole(currentEmployee.role)}</p>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">تاريخ الإنشاء</span>
          </div>
          <p className="font-medium">{formatDateTime(currentEmployee.created_at)}</p>
        </div>
      </div>

      <div className="card-elevated p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">حالة الحساب</p>
            <p className="text-sm text-muted-foreground">
              {currentEmployee.is_active ? 'الحساب نشط' : 'الحساب غير نشط'}
            </p>
          </div>
          <button
            onClick={() => toggleEmployeeStatus(id!)}
            className={`px-4 py-2 rounded-lg font-medium ${
              currentEmployee.is_active 
                ? 'bg-error/10 text-error hover:bg-error/20' 
                : 'bg-success/10 text-success hover:bg-success/20'
            }`}
          >
            {currentEmployee.is_active ? 'تعطيل' : 'تفعيل'}
          </button>
        </div>
      </div>
    </div>
  )
}