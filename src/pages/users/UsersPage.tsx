import { useState, useEffect } from 'react'
import { Users, Plus, Search, Edit, Trash2, Check, X, Loader2, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { usePermissions } from '@/stores/permissionStore'
import { AccessGuard } from '@/components/auth/AccessGuard'
import type { User, UserRole } from '@/types'

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'مدير عام',
  admin: 'مدير',
  employee: 'موظف',
  viewer: 'مشاهد'
}

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  employee: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-700'
}

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user)
  const { canManageUsers } = usePermissions()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'employee' as UserRole,
    phone: '',
    is_active: true,
    password: ''
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
    setIsLoading(false)
  }

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        is_active: user.is_active,
        password: ''
      })
    } else {
      setEditingUser(null)
      setFormData({
        full_name: '',
        email: '',
        role: 'employee',
        phone: '',
        is_active: true,
        password: ''
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (editingUser) {
        // Update existing user
        const updates = {
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone || null,
          is_active: formData.is_active
        }

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', editingUser.id)

        if (error) throw error
      } else {
        // Create new user
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: crypto.randomUUID(),
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            phone: formData.phone || null,
            is_active: formData.is_active,
            created_at: new Date().toISOString()
          })

        if (error) throw error
      }

      await fetchUsers()
      setShowModal(false)
    } catch (err: any) {
      console.error('Failed to save user:', err)
      alert('فشل في حفظ المستخدم: ' + err.message)
    }
    setIsSaving(false)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error
      await fetchUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
      alert('فشل في حذف المستخدم')
    }
  }

  const toggleUserStatus = async (user: User) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id)

      if (error) throw error
      await fetchUsers()
    } catch (err) {
      console.error('Failed to toggle user status:', err)
    }
  }

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AccessGuard permission="users_view" fallback={
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-muted-foreground">لا تملك صلاحية الوصول</h2>
          <p className="text-sm text-muted-foreground mt-2">يرجى التواصل مع المدير للحصول على الصلاحية</p>
        </div>
      </div>
    }>
      <div className="page-container">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">إدارة المستخدمين</h1>
            <p className="page-subtitle">إضافة وتعديل وحذف المستخدمين</p>
          </div>
          {canManageUsers && (
            <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              مستخدم جديد
            </button>
          )}
        </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="بحث..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pr-10"
        />
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div key={user.id} className="card-elevated p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {user.full_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{user.full_name}</p>
                    {user.id === currentUser?.id && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">أنت</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm ${ROLE_COLORS[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>

                <button
                  onClick={() => toggleUserStatus(user)}
                  className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                    user.is_active 
                      ? 'bg-success/10 text-success' 
                      : 'bg-error/10 text-error'
                  }`}
                >
                  {user.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {user.is_active ? 'نشط' : 'غير نشط'}
                </button>

                {canManageUsers && user.id !== currentUser?.id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(user)}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 hover:bg-error/10 text-error rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="empty-state">
              <Users className="w-16 h-16 opacity-30" />
              <h3>لا توجد مستخدمين</h3>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card-elevated w-full max-w-md p-6 m-4">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? 'تعديل مستخدم' : 'مستخدم جديد'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">الاسم</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input-field"
                  placeholder="الاسم الكامل"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="email@example.com"
                  disabled={!!editingUser}
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-2">كلمة المرور</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                    placeholder="كلمة المرور"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">الدور</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="input-field"
                >
                  <option value="super_admin">مدير عام</option>
                  <option value="admin">مدير</option>
                  <option value="employee">موظف</option>
                  <option value="viewer">مشاهد</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder="رقم الهاتف"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active">مستخدم نشط</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.full_name || (!editingUser && !formData.password)}
                className="flex-1 btn-primary"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AccessGuard>
  )
}