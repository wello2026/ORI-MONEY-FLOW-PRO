import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Building, Clock, X, DollarSign, Loader2 } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export default function ProjectsPage() {
  const { projects, isLoading, fetchProjects, createProject, fetchProjectFinancials } = useProjectStore()
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [profiles, setProfiles] = useState<any[]>([])
  const [projectFinancials, setProjectFinancials] = useState<Record<string, any>>({})
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    budget: 0,
    currency: 'LYD',
    description: '',
    manager_id: ''
  })

  useEffect(() => {
    fetchProjects()
    fetchProfiles()
  }, [fetchProjects])

  useEffect(() => {
    if (projects.length > 0) {
      projects.forEach(p => {
        fetchProjectFinancials(p.id).then(() => {
          const financials = useProjectStore.getState().financials
          if (financials) {
            setProjectFinancials(prev => ({ ...prev, [p.id]: financials }))
          }
        })
      })
    }
  }, [projects])

  async function fetchProfiles() {
    const { data } = await supabase.from('profiles').select('id, full_name').order('full_name')
    if (data) setProfiles(data)
  }

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin'

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await createProject({
      ...formData,
      status: 'active',
      created_by: user?.id || ''
    })
    if (result.success) {
      setIsModalOpen(false)
      setFormData({ name: '', code: '', budget: 0, currency: 'LYD', description: '', manager_id: '' })
    }
  }

  return (
    <div className="page-container pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter">إدارة المواقع</h1>
          <p className="text-muted-foreground font-bold">مراقبة مشاريع المقاولات الميدانية</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center justify-center gap-2 px-8 py-4 rounded-2xl shadow-gold font-black transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-6 h-6" />
            <span>مشروع جديد</span>
          </button>
        )}
      </div>

      <div className="relative mb-10">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
        <input
          type="text"
          placeholder="ابحث عن مشروع برقم الكود أو الاسم..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border-2 border-border focus:border-primary rounded-3xl py-5 pr-14 pl-6 outline-none transition-all shadow-lg font-bold"
        />
      </div>

      {isLoading && projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <p className="text-muted-foreground font-black animate-pulse">جاري تحميل قاعدة بيانات المواقع...</p>
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project) => {
            const fin = projectFinancials[project.id]
            const expenses = fin?.total_expenses ?? 0
            const revenues = fin?.total_revenues ?? 0
            const budgetPct = fin?.budget_utilization_pct ?? 0
            const netProfit = revenues - expenses
            const progress = Math.min(budgetPct, 100)

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="glass-card group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden cursor-pointer"
              >
                <div className="p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-700">
                      <Building className="w-8 h-8" />
                    </div>
                    <div className={cn(
                      "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest",
                      project.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted/20 text-muted-foreground'
                    )}>
                      {project.status === 'active' ? 'موقع نشط' : 'مكتمل'}
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-foreground mb-2 group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm font-bold text-muted-foreground mb-6 uppercase tracking-widest">{project.code}</p>
                  
                  <div className="space-y-6 pt-6 border-t border-border/30">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">الميزانية المرصودة</p>
                        <p className="text-xl font-black text-foreground">
                          {formatCurrency(project.budget || 0, project.currency)}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-error uppercase mb-1">المصروفات</p>
                        <p className="text-xl font-black text-error">
                          {formatCurrency(expenses, project.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="w-full h-3 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full shadow-gold transition-all duration-700',
                          budgetPct > 90 ? 'bg-error' : budgetPct > 70 ? 'bg-amber-500' : 'bg-primary'
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground font-bold">{expenses.toFixed(0)} / {project.budget?.toLocaleString()}</span>
                      <span className={cn('font-black', netProfit >= 0 ? 'text-success' : 'text-error')}>
                        {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit, project.currency)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-card/50 backdrop-blur-sm px-8 py-4 flex items-center justify-between border-t border-border/20">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[10px] font-black text-muted-foreground">تم التحديث مؤخراً</span>
                  </div>
                  <button className="text-primary font-black text-xs hover:underline">التفاصيل</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center py-32 px-10 text-center rounded-[3rem]">
          <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-8 border border-primary/10">
            <Building className="w-12 h-12 text-primary/20" />
          </div>
          <h3 className="text-3xl font-black text-foreground mb-4">لا يوجد مواقع بناء</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-10 font-bold leading-relaxed">ابدأ بإضافة مشاريعك الأولى لمتابعة صرف الميزانيات والعهـد من المواقع مباشرة.</p>
          {isAdmin && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary px-10 py-5 rounded-2xl shadow-gold font-black"
            >
              أضف مشروعك الأول
            </button>
          )}
        </div>
      )}

      {/* Add Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-card border-2 border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black text-foreground">مشروع إنشائي جديد</h2>
                  <p className="text-muted-foreground font-bold">أدخل تفاصيل موقع العمل والميزانية</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center hover:bg-error/10 hover:text-error transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-muted-foreground mr-2">اسم المشروع</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-muted/30 border-2 border-border focus:border-primary rounded-2xl py-4 px-6 outline-none font-bold"
                      placeholder="مثال: برج الذهب"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-muted-foreground mr-2">كود المشروع</label>
                    <input 
                      required
                      value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value})}
                      className="w-full bg-muted/30 border-2 border-border focus:border-primary rounded-2xl py-4 px-6 outline-none font-bold"
                      placeholder="مثال: PJ-2026-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-muted-foreground mr-2">الميزانية التقديرية</label>
                    <div className="relative">
                      <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input 
                        required
                        type="number"
                        value={formData.budget}
                        onChange={e => setFormData({...formData, budget: Number(e.target.value)})}
                        className="w-full bg-muted/30 border-2 border-border focus:border-primary rounded-2xl py-4 px-14 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-muted-foreground mr-2">العملة</label>
                    <select 
                      value={formData.currency}
                      onChange={e => setFormData({...formData, currency: e.target.value})}
                      className="w-full bg-muted/30 border-2 border-border focus:border-primary rounded-2xl py-4 px-6 outline-none font-bold appearance-none"
                    >
                      <option value="LYD">دينار ليبي (LYD)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground mr-2">المهندس المسؤول (Manager)</label>
                  <select 
                    value={formData.manager_id}
                    onChange={e => setFormData({...formData, manager_id: e.target.value})}
                    className="w-full bg-muted/30 border-2 border-border focus:border-primary rounded-2xl py-4 px-6 outline-none font-bold appearance-none"
                  >
                    <option value="">-- اختر المهندس --</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground mr-2">وصف المشروع / الموقع</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-muted/30 border-2 border-border focus:border-primary rounded-2xl py-4 px-6 outline-none font-bold min-h-[120px]"
                    placeholder="تفاصيل موقع العمل..."
                  />
                </div>

                <div className="pt-6">
                  <button type="submit" disabled={isLoading} className="w-full btn-primary py-5 rounded-2xl font-black text-lg shadow-gold flex items-center justify-center gap-3">
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Building className="w-6 h-6" />}
                    <span>تأكيد تسجيل المشروع</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
