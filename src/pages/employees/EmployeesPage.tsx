import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Users, Search, UserCheck, UserX } from 'lucide-react'
import { useEmployeeStore } from '@/stores/employeeStore'
import { ROUTES } from '@/lib/constants'
import { formatRole } from '@/lib/format'

export default function EmployeesPage() {
  const employees = useEmployeeStore((state) => state.employees)
  const fetchEmployees = useEmployeeStore((state) => state.fetchEmployees)
  const isLoading = useEmployeeStore((state) => state.isLoading)
  const navigate = useNavigate()

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const activeEmployees = employees.filter((e) => e.is_active)
  const inactiveEmployees = employees.filter((e) => !e.is_active)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">الموظفين</h1>
        <p className="page-subtitle">إدارة فريق العمل والصلاحيات</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card-elevated p-4 text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{employees.length}</p>
          <p className="text-sm text-muted-foreground">الإجمالي</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <UserCheck className="w-8 h-8 mx-auto mb-2 text-success" />
          <p className="text-2xl font-bold">{activeEmployees.length}</p>
          <p className="text-sm text-muted-foreground">نشط</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <UserX className="w-8 h-8 mx-auto mb-2 text-error" />
          <p className="text-2xl font-bold">{inactiveEmployees.length}</p>
          <p className="text-sm text-muted-foreground">غير نشط</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="بحث..." className="input-field pr-9" />
        </div>
      </div>

      <div className="space-y-3">
        {employees.map((employee) => (
          <Link
            key={employee.id}
            to={`/employees/${employee.id}`}
            className="card-elevated p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="avatar">
                {employee.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-semibold">{employee.full_name}</p>
                <p className="text-sm text-muted-foreground">{employee.email}</p>
              </div>
            </div>
            <div className="text-left">
              <span className={`text-xs px-2 py-1 rounded-full ${
                employee.role === 'super_admin' ? 'bg-primary/10 text-primary' :
                employee.role === 'admin' ? 'bg-warning/10 text-warning' :
                'bg-muted text-muted-foreground'
              }`}>
                {formatRole(employee.role)}
              </span>
              <span className={`block text-xs mt-1 ${employee.is_active ? 'text-success' : 'text-error'}`}>
                {employee.is_active ? 'نشط' : 'غير نشط'}
              </span>
            </div>
          </Link>
        ))}

        {employees.length === 0 && !isLoading && (
          <div className="empty-state">
            <Users className="w-16 h-16 opacity-30" />
            <h3>لا توجد موظفين</h3>
            <p>أضف موظفك الأول</p>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(ROUTES.EMPLOYEE_NEW)}
        className="floating-action-btn"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}