import { useState, useEffect } from 'react'
import { Plus, Search, User, Shield, Mail, Phone, Calendar, Edit2, Trash2, Key, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ROLES } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'

export default function UsersPage() {
  const currentCompany = useAuthStore((state) => state.currentCompany)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'employee',
    password: ''
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const authClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      )

      const { error } = await authClient.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
            company_role: formData.role === 'admin' ? 'admin' : 'viewer',
            company_id: currentCompany?.id
          }
        }
      })

      if (error) throw error
      
      setIsModalOpen(false)
      setFormData({ full_name: '', email: '', phone: '', role: 'employee', password: '' })
      fetchUsers()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground">إدارة المستخدمين</h1>
          <p className="text-muted-foreground text-sm font-bold">إضافة المهندسين وتحديد الصلاحيات الميدانية</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 px-8 py-4 rounded-2xl shadow-gold font-black"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مستخدم</span>
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="ابحث عن مهندس بالاسم أو الإيميل..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border-2 border-border focus:border-primary rounded-2xl py-4 pr-12 pl-4 outline-none transition-all shadow-sm font-bold"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-black">جاري تحميل الطاقم...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <div 
              key={u.id}
              className="glass-card p-6 hover:scale-[1.02] transition-all duration-300 relative group overflow-hidden border-2 border-transparent hover:border-primary/20"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-primary shadow-inner border border-white/10 relative overflow-hidden">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-success border-2 border-card rounded-full" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">{u.full_name || 'مستخدم جديد'}</h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-black uppercase">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span>{ROLES.find(r => r.value === u.role)?.label || 'موظف'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-bold">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="truncate">{u.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-bold">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span>{u.phone || 'غير مسجل'}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-black uppercase">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>انضم {new Date(u.created_at).toLocaleDateString('ar-LY')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                <button className="flex-1 btn-secondary py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-primary/10 hover:text-primary transition-all">
                  <Edit2 className="w-3.5 h-3.5" />
                  تعديل
                </button>
                <button className="btn-secondary p-2.5 rounded-xl hover:text-primary transition-all">
                  <Key className="w-4 h-4" />
                </button>
                <button className="btn-secondary p-2.5 rounded-xl hover:text-error transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md p-8 shadow-2xl border-2 border-primary/20 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-foreground">إضافة عضو جديد</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-muted-foreground">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full bg-muted/50 border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold"
                  placeholder="اسم المهندس أو الموظف"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-muted-foreground">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-muted/50 border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold"
                  placeholder="name@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-muted-foreground">كلمة المرور المؤقتة</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-muted/50 border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold"
                  placeholder="6 أحرف على الأقل"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-black text-muted-foreground">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-muted/50 border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-muted-foreground">الصلاحية</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-muted/50 border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 btn-primary py-4 rounded-xl font-black shadow-gold">
                  حفظ المستخدم
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary py-4 rounded-xl font-black">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
