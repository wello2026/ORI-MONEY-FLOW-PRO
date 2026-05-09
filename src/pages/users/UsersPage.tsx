import { useState, useEffect } from 'react'
import { Plus, Search, User, Shield, Mail, Phone, Calendar, MoreVertical, Edit2, Trash2, Key } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ROLES } from '@/lib/constants'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      // In a real app, you'd fetch from a profiles table linked to auth.users
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

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">إدارة المستخدمين</h1>
          <p className="text-muted-foreground text-sm">إضافة المهندسين وتحديد الصلاحيات</p>
        </div>
        <button 
          onClick={() => alert('قريباً: إضافة مستخدم جديد عبر Edge Function')}
          className="btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-2xl shadow-gold"
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
          className="w-full bg-card border-2 border-border focus:border-primary rounded-2xl py-4 pr-12 pl-4 outline-none transition-all shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <div 
              key={u.id}
              className="glass-card p-6 hover:scale-[1.02] transition-all duration-300 relative group overflow-hidden"
            >
              {/* Background Accent */}
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
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span>{ROLES.find(r => r.value === u.role)?.label || 'موظف'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="truncate">{u.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span>{u.phone || 'غير مسجل'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span>انضم {new Date(u.created_at).toLocaleDateString('ar-LY')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                <button className="flex-1 btn-secondary py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary/10 hover:text-primary transition-all">
                  <Edit2 className="w-3.5 h-3.5" />
                  تعديل
                </button>
                <button className="btn-secondary p-2.5 rounded-xl hover:text-error transition-all">
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
    </div>
  )
}