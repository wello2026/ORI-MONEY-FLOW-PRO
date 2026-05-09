import { useState, useEffect } from 'react'
import { Plus, Search, Building, MapPin, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (err) {
      console.error('Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">إدارة المشاريع</h1>
          <p className="text-muted-foreground text-sm">مراقبة مواقع العمل والميزانيات</p>
        </div>
        <button 
          onClick={() => alert('قريباً: إضافة مشروع جديد')}
          className="btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-2xl shadow-gold"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مشروع</span>
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="ابحث عن مشروع أو موقع..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border-2 border-border focus:border-primary rounded-2xl py-4 pr-12 pl-4 outline-none transition-all shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">جاري تحميل المشاريع...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div 
              key={project.id}
              className="glass-card group hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 overflow-hidden cursor-pointer"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    <Building className="w-6 h-6" />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    project.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted-foreground'
                  }`}>
                    {project.status === 'active' ? 'نشط' : 'مكتمل'}
                  </div>
                </div>

                <h3 className="text-lg font-black text-foreground mb-1 group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-4">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{project.location || 'غير محدد'}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">الميزانية</p>
                    <p className="text-sm font-black text-foreground">
                      {project.budget?.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">LYD</span>
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">المصاريف</p>
                    <p className="text-sm font-black text-error">
                      0 <span className="text-[10px] font-normal text-muted-foreground">LYD</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">تحديث منذ يومين</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
            <Building className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-xl font-black text-foreground mb-2">لا يوجد مشاريع حالياً</h3>
          <p className="text-muted-foreground max-w-xs mx-auto mb-8">ابدأ بإضافة أول مشروع لمتابعة العمليات الميدانية.</p>
          <button 
            onClick={() => alert('قريباً: إضافة مشروع جديد')}
            className="btn-primary px-8 py-3 rounded-xl shadow-gold"
          >
            أضف مشروعك الأول
          </button>
        </div>
      )}
    </div>
  )
}
