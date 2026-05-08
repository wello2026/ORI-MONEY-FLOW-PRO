import { useState, useEffect } from 'react'
import { Shield, Check, Save, Loader2, Trash2, Lock } from 'lucide-react'
import type { UserRole, Permission } from '@/types'
import { PERMISSIONS_LIST, DEFAULT_ROLES } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { AccessGuard } from '@/components/auth/AccessGuard'

interface RoleConfig {
  role: UserRole
  label: string
  description: string
  color: string
}

const ROLE_CONFIGS: RoleConfig[] = [
  { role: 'super_admin', label: 'المدير العام', description: 'له جميع الصلاحيات دون قيود', color: 'purple' },
  { role: 'admin', label: 'المدير', description: 'يمتلك صلاحيات إدارية كاملة', color: 'blue' },
  { role: 'employee', label: 'الموظف', description: 'يُمكنه إجراء عمليات محددة', color: 'green' },
  { role: 'viewer', label: 'المشاهد', description: 'مشاهد فقط دون إمكانية إجراء', color: 'gray' }
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'الحسابات': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'المعاملات': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'التحويلات': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'المستخدمين': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'الموظفين': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  'الموافقات': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  'التقارير': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'الإعدادات': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  'السجل': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'الأدوار': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
}

export default function RolesPage() {
  const currentUser = useAuthStore((state) => state.user)
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, Permission[]>>({} as Record<UserRole, Permission[]>)
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const canEdit = currentUser?.role === 'super_admin'

  const handleTogglePermission = (permission: Permission) => {
    if (!canEdit || !selectedRole) return
    
    setRolePermissions(prev => {
      const current = prev[selectedRole] || []
      const hasPermission = current.includes(permission)
      
      let newPermissions: Permission[]
      if (hasPermission) {
        newPermissions = current.filter(p => p !== permission)
      } else {
        newPermissions = [...current, permission]
      }
      
      return { ...prev, [selectedRole]: newPermissions }
    })
    setSaved(false)
  }

  const handleSave = async () => {
    if (!canEdit) return
    setIsSaving(true)
    
    try {
      // حفظ الأدوار في الإعدادات (يمكن تطويرها لتخزين في جدول منفصل)
      localStorage.setItem('role_permissions', JSON.stringify(rolePermissions))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save roles:', err)
    }
    
    setIsSaving(false)
  }

  const handleReset = () => {
    if (confirm('هل أنت متأكد من إعادة تعيين الصلاحيات الافتراضية؟')) {
      setRolePermissions(DEFAULT_ROLES as any)
      localStorage.removeItem('role_permissions')
      setSaved(true)
    }
  }

  // تحميل الصلاحيات المحفوظة
  useEffect(() => {
    const saved = localStorage.getItem('role_permissions')
    if (saved) {
      try {
        setRolePermissions(JSON.parse(saved))
      } catch (e) {}
    }
  }, [])

  // تجميع الصلاحيات حسب الفئة
  const permissionsByCategory = PERMISSIONS_LIST.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = []
    acc[perm.category].push(perm)
    return acc
  }, {} as Record<string, typeof PERMISSIONS_LIST>)

  const selectedConfig = ROLE_CONFIGS.find(r => r.role === selectedRole)

  return (
    <AccessGuard permission="roles_manage" fallback={
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-muted-foreground">لا تملك صلاحية الوصول</h2>
          <p className="text-sm text-muted-foreground mt-2">هذه الصفحة تحتاج صلاحية إدارة الأدوار</p>
        </div>
      </div>
    }>
      <div className="page-container">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">الأدوار والصلاحيات</h1>
            <p className="page-subtitle">تحديد صلاحيات كل دور في النظام</p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                إعادة تعيين
              </button>
              <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ التغييرات
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-success" />
          <span className="text-success">تم حفظ الصلاحيات بنجاح</span>
        </div>
      )}

      {/* قائمة الأدوار */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {ROLE_CONFIGS.map((config) => (
          <button
            key={config.role}
            onClick={() => setSelectedRole(config.role)}
            className={`card-elevated p-4 text-right border-2 transition-all ${
              selectedRole === config.role 
                ? `border-${config.color}-500 bg-${config.color}-50` 
                : 'border-transparent hover:border-muted'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg bg-${config.color}-100 flex items-center justify-center mb-2`}>
              <Shield className={`w-5 h-5 text-${config.color}-600`} />
            </div>
            <h3 className="font-semibold">{config.label}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{config.description}</p>
            <div className="mt-2 text-xs text-muted-foreground">
              {(rolePermissions[config.role] || []).length} صلاحية
            </div>
          </button>
        ))}
      </div>

      {/* تفاصيل الصلاحيات */}
      {selectedRole && selectedConfig && (
        <div className="card-elevated overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 text-${selectedConfig.color}-600`} />
              <div>
                <h3 className="font-bold">{selectedConfig.label}</h3>
                <p className="text-sm text-muted-foreground">{selectedConfig.description}</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            {Object.entries(permissionsByCategory).map(([category, perms]) => {
              const catColors = CATEGORY_COLORS[category] || CATEGORY_COLORS['الحسابات']
              
              return (
                <div key={category} className="mb-6 last:mb-0">
                  <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${catColors.border}`}>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${catColors.bg} ${catColors.text}`}>
                      {category}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {perms.map((perm) => {
                      const isSelected = (rolePermissions[selectedRole] || []).includes(perm.key)
                      
                      return (
                        <label
                          key={perm.key}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            canEdit 
                              ? 'hover:bg-muted' 
                              : 'cursor-not-allowed opacity-75'
                          } ${
                            isSelected 
                              ? 'bg-success/10 border border-success/20' 
                              : 'bg-muted/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTogglePermission(perm.key)}
                            disabled={!canEdit}
                            className="w-4 h-4 rounded border-gray-300 text-success focus:ring-success"
                          />
                          <span className="text-sm">{perm.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {!canEdit && (
            <div className="p-4 bg-warning/10 border-t border-warning/20 text-center">
              <p className="text-sm text-warning">
                只有 المدير العام يمكنه تعديل الصلاحيات
              </p>
            </div>
          )}
        </div>
      )}

      {!selectedRole && (
        <div className="card-elevated p-8 text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground opacity-30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">اختر دوراً للعرض</h3>
          <p className="text-muted-foreground">انقر على أحد الأدوار أعلاه لعرض وتعديل صلاحياته</p>
        </div>
      )}
    </div>
    </AccessGuard>
  )
}