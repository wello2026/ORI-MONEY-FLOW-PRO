import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Shield, Settings, LogOut, ChevronLeft, CheckCircle, Trash2, X } from 'lucide-react'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

type Tab = 'notifications' | 'alerts' | 'preferences'

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  low: { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'منخفض' },
  medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'متوسط' },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'مرتفع' },
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'حرج' }
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  approval: { color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Shield },
  transaction: { color: 'text-primary', bg: 'bg-primary/10', icon: Bell },
  alert: { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle },
  info: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Bell },
  summary: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: Bell }
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'الآن'
  if (min < 60) return `منذ ${min} دقيقة`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `منذ ${hr} ساعة`
  const dy = Math.floor(hr / 24)
  return `منذ ${dy} يوم`
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const {
    notifications, unreadCount, alertLogs, preferences, isLoading,
    fetchNotifications, fetchAlertLogs, fetchPreferences, updatePreferences,
    markAllAsRead, markAlertRead, dismissAlert, deleteNotification
  } = useNotificationStore()
  const logout = useAuthStore((s) => s.logout)
  const [tab, setTab] = useState<Tab>('notifications')
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsForm, setPrefsForm] = useState({
    push_approval: true, push_transaction: true, push_alert: true, push_info: true,
    treasury_low_balance_alert: true, treasury_low_balance_threshold: 1000,
    partner_outstanding_alert: true, partner_outstanding_threshold: 5000,
    supplier_overdue_alert: true, supplier_overdue_days: 7,
    project_budget_alert: true, project_budget_threshold_pct: 80
  })

  useEffect(() => { fetchNotifications(); fetchAlertLogs(); fetchPreferences() }, [fetchNotifications, fetchAlertLogs, fetchPreferences])

  useEffect(() => {
    if (preferences) {
      setPrefsForm({
        push_approval: preferences.push_approval,
        push_transaction: preferences.push_transaction,
        push_alert: preferences.push_alert,
        push_info: preferences.push_info,
        treasury_low_balance_alert: preferences.treasury_low_balance_alert,
        treasury_low_balance_threshold: preferences.treasury_low_balance_threshold,
        partner_outstanding_alert: preferences.partner_outstanding_alert,
        partner_outstanding_threshold: preferences.partner_outstanding_threshold,
        supplier_overdue_alert: preferences.supplier_overdue_alert,
        supplier_overdue_days: preferences.supplier_overdue_days,
        project_budget_alert: preferences.project_budget_alert,
        project_budget_threshold_pct: preferences.project_budget_threshold_pct
      })
    }
  }, [preferences])

  const handleLogout = async () => { await logout(); navigate(ROUTES.LOGIN) }

  const handleSavePrefs = async () => {
    setSavingPrefs(true)
    await updatePreferences(prefsForm as any)
    setSavingPrefs(false)
  }

  const moreItems = [
    { icon: Bell, label: 'الإشعارات والتنبيهات', tab: 'notifications' as Tab },
    { icon: AlertTriangle, label: 'سجل التنبيهات', tab: 'alerts' as Tab },
    { icon: Settings, label: 'التفضيلات', tab: 'preferences' as Tab },
    { icon: LogOut, label: 'تسجيل الخروج', action: handleLogout, danger: true }
  ]

  const unReadAlerts = alertLogs.filter(a => !a.is_read).length

  return (
    <div className="page-container pb-24 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الإشعارات</h1>
          <p className="text-muted-foreground text-sm">الإشعارات والتنبيهات والرسائل</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-card/60 border border-white/10 rounded-2xl p-1">
        {[['notifications', 'الإشعارات', unreadCount], ['alerts', 'التنبيهات', unReadAlerts], ['preferences', 'التفضيلات', 0]].map(([t, label, count]) => (
          <button key={t} onClick={() => setTab(t as Tab)}
            className={cn('flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background/40')}>
            {label as string}
            {Number(count) > 0 && <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', tab === t ? 'bg-primary-foreground text-primary' : 'bg-destructive text-white')}>{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'notifications' && (
        <div className="space-y-3">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl border border-primary/20 transition-colors">
              تحديد الكل كمقروء ({unreadCount})
            </button>
          )}
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"><Bell className="w-8 h-8 text-primary" /></div>
              <h3 className="text-lg font-bold text-foreground mb-2">لا توجد إشعارات</h3>
              <p className="text-sm text-muted-foreground">ستظهر الإشعارات هنا عند حدوثها</p>
            </div>
          ) : (
            notifications.map(n => {
              const tc = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
              return (
                <div key={n.id} onClick={() => deleteNotification(n.id)}
                  className={cn('rounded-2xl p-4 cursor-pointer hover:border-primary/30 transition-all border border-white/5',
                    !n.is_read ? 'bg-primary/5 border-primary/20' : 'bg-card/60')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', tc.bg)}>
                      <tc.icon className={cn('w-5 h-5', tc.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground text-sm truncate">{n.title}</p>
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{fmtRelative(n.created_at)}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id) }} className="p-1 rounded-lg hover:bg-destructive/10 shrink-0"><X className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-3">
          {alertLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4"><AlertTriangle className="w-8 h-8 text-orange-500" /></div>
              <h3 className="text-lg font-bold text-foreground mb-2">لا توجد تنبيهات</h3>
              <p className="text-sm text-muted-foreground">كل شيء يعمل بشكل طبيعي</p>
            </div>
          ) : (
            alertLogs.map(a => {
              const sc = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.medium
              return (
                <div key={a.id} className={cn('rounded-2xl p-4 border border-white/5 bg-card/60')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', sc.bg)}>
                      <AlertTriangle className={cn('w-5 h-5', sc.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground text-sm">{a.title}</p>
                        <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-lg', sc.bg, sc.color)}>{sc.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{fmtRelative(a.triggered_at)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!a.is_read && <button onClick={() => markAlertRead(a.id)} className="p-1 rounded-lg hover:bg-emerald-500/10" title="تم القراءة"><CheckCircle className="w-4 h-4 text-emerald-500" /></button>}
                      <button onClick={() => dismissAlert(a.id)} className="p-1 rounded-lg hover:bg-destructive/10" title="تجاهل"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'preferences' && (
        <div className="bg-card/60 border border-white/5 rounded-3xl p-5 space-y-5">
          <h2 className="text-lg font-bold text-foreground">إعدادات الإشعارات</h2>

          <div>
            <h3 className="text-sm font-bold text-muted-foreground mb-3">الإشعارات الفورية</h3>
            <div className="space-y-3">
              {[
                { key: 'push_approval', label: 'طلبات الاعتماد', desc: 'إشعار عند وصول طلب اعتماد جديد' },
                { key: 'push_transaction', label: 'المعاملات', desc: 'إشعار عند إتمام معاملة جديدة' },
                { key: 'push_alert', label: 'التنبيهات', desc: 'تنبيهات أمنية ومالية مهمة' },
                { key: 'push_info', label: 'رسائل عامة', desc: 'رسائل ومعلومات عامة' }
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <input type="checkbox" checked={prefsForm[item.key as keyof typeof prefsForm] as boolean}
                    onChange={e => setPrefsForm({ ...prefsForm, [item.key]: e.target.checked })}
                    className="w-5 h-5 rounded accent-primary" />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <h3 className="text-sm font-bold text-muted-foreground mb-3">تنبيهات الميزانيات</h3>
            <div className="space-y-3">
              {[
                { key: 'treasury_low_balance_alert', label: 'انخفاض رصيد الخزينة', thresh: 'treasury_low_balance_threshold', unit: '' },
                { key: 'project_budget_alert', label: 'تجاوز ميزانية المشروع', thresh: 'project_budget_threshold_pct', unit: '%' }
              ].map(item => (
                <div key={item.key}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <input type="checkbox" checked={prefsForm[item.key as keyof typeof prefsForm] as boolean}
                      onChange={e => setPrefsForm({ ...prefsForm, [item.key]: e.target.checked })}
                      className="w-5 h-5 rounded accent-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={prefsForm[item.thresh as keyof typeof prefsForm] as number}
                      onChange={e => setPrefsForm({ ...prefsForm, [item.thresh]: parseFloat(e.target.value) || 0 })}
                      className="flex-1 px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" />
                    <span className="text-xs text-muted-foreground font-bold">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <h3 className="text-sm font-bold text-muted-foreground mb-3">تنبيهات الموردين والشركاء</h3>
            <div className="space-y-3">
              {[
                { key: 'partner_outstanding_alert', label: 'تقدم شركاء غير مستحق', thresh: 'partner_outstanding_threshold', unit: '' },
                { key: 'supplier_overdue_alert', label: 'فواتير موردين متأخرة', thresh: 'supplier_overdue_days', unit: 'يوم' }
              ].map(item => (
                <div key={item.key}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <input type="checkbox" checked={prefsForm[item.key as keyof typeof prefsForm] as boolean}
                      onChange={e => setPrefsForm({ ...prefsForm, [item.key]: e.target.checked })}
                      className="w-5 h-5 rounded accent-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" value={prefsForm[item.thresh as keyof typeof prefsForm] as number}
                      onChange={e => setPrefsForm({ ...prefsForm, [item.thresh]: parseFloat(e.target.value) || 0 })}
                      className="flex-1 px-3 py-2 bg-background/60 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/40" />
                    <span className="text-xs text-muted-foreground font-bold">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleSavePrefs} disabled={savingPrefs}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50">
            {savingPrefs ? 'جارٍ الحفظ...' : 'حفظ التفضيلات'}
          </button>
        </div>
      )}
    </div>
  )
}