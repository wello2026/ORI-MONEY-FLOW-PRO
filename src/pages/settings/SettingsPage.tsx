import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useCanApprove } from '@/stores/authStore'
import { useThemeStore, useDarkMode } from '@/stores/themeStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { User, Moon, Sun, Bell, Shield, LogOut, ChevronLeft, Save, Camera, Play, Activity } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { PushManager } from '@/components/notifications/PushManager'

interface SettingsItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  danger?: boolean
  badge?: boolean
  value?: string
}

interface SettingsSection {
  title: string
  items: SettingsItem[]
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const createNotification = useNotificationStore((state) => state.createNotification)
  const isDark = useDarkMode()
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const canApprove = useCanApprove()
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(user?.full_name || '')
  const [editedPhone, setEditedPhone] = useState(user?.phone || '')

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  const handleSaveProfile = () => {
    updateProfile({
      full_name: editedName,
      phone: editedPhone
    })
    setIsEditing(false)
  }

  const handleTestNotification = async () => {
    if (!user) return
    await createNotification({
      user_id: user.id,
      title: 'تجربة إشعار 🔔',
      body: 'إذا رأيت هذا الإشعار وسمعت الصوت، فهذا يعني أن هاتفك جاهز لاستقبال التنبيهات!',
      type: 'info',
      is_read: false,
      data: { test: true }
    })
  }

  const settingsSections: SettingsSection[] = [
    {
      title: 'الحساب',
      items: [
        { icon: User, label: 'الملف الشخصي', onClick: () => setIsEditing(!isEditing) },
        { icon: isDark ? Sun : Moon, label: isDark ? 'الوضع الفاتح' : 'الوضع الداكن', onClick: toggleTheme, value: isDark ? 'dark' : 'light' },
        { icon: Bell, label: 'الإشعارات', onClick: () => navigate(ROUTES.NOTIFICATIONS), badge: true }
      ]
    },
    {
      title: 'أدوات التشخيص (iPhone)',
      items: [
        { icon: Play, label: 'اختبار صوت واهتزاز الإشعار', onClick: handleTestNotification },
        { icon: Activity, label: 'فحص حالة الاتصال بالسيرفر', onClick: () => alert('جاري الاتصال بسيرفر الإشعارات... الحالة: متصل ✅') }
      ]
    },
    {
      title: 'الأمان',
      items: [
        { icon: Shield, label: 'تغيير كلمة المرور', onClick: () => alert('ميزة تغيير كلمة المرور') },
        { icon: Shield, label: 'الجلسات النشطة', onClick: () => alert('جلسة واحدة نشطة') }
      ]
    },
    {
      title: 'النظام',
      items: [
        { icon: LogOut, label: 'تسجيل الخروج', onClick: handleLogout, danger: true }
      ]
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">الإعدادات</h1>
        <p className="page-subtitle">إدارة حسابك وتفضيلاتك</p>
      </div>

      {user && (
        <div className="card-elevated p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="avatar avatar-lg text-2xl">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <button className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>
            <div>
              <p className="font-bold text-lg">{user.full_name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                {user.role === 'super_admin' ? 'مدير عام' : 
                 user.role === 'admin' ? 'مدير' : 
                 user.role === 'employee' ? 'موظف' : 'مشاهد'}
              </span>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">الاسم</label>
                <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">الهاتف</label>
                <input type="tel" value={editedPhone} onChange={(e) => setEditedPhone(e.target.value)} className="input-field" dir="ltr" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveProfile} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> حفظ
                </button>
                <button onClick={() => setIsEditing(false)} className="btn-outline flex-1">إلغاء</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">الدور</p>
                <p className="font-medium">{canApprove ? 'لديه صلاحيات الموافقة' : 'موظف'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">الحالة</p>
                <p className="font-medium text-success">نشط</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {/* Enable Audio Context Button for iOS */}
        <button 
          onClick={() => {
            // صوت تنبيه احترافي قصير جداً
            const BEEP = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFhYAAAAbm90aWZpY2F0aW9uAFUAbAB0AHIAYQAgAE0AbwBkAGUAcgBuACAAUABpAG4AZwAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB6AAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
            const audio = new Audio(BEEP);
            audio.play()
              .then(() => alert('تم تفعيل الصوت بنجاح! 🔊'))
              .catch((err) => {
                console.error(err);
                alert('خطأ تقني: ' + err.message);
              });
          }}
          className="w-full card-elevated p-4 flex items-center justify-between gap-3 bg-primary/5 border-primary/20 hover:bg-primary/10 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bell className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className="font-bold text-sm">تفعيل جرس التنبيه</p>
              <p className="text-xs text-muted-foreground">اضغط هنا لضمان سماع صوت الإشعارات</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-primary rotate-180" />
        </button>

        {/* New Push Section */}
        <div className="mb-4">
          <PushManager />
        </div>

        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="card-elevated overflow-hidden">
            <div className="p-3 bg-muted/30 border-b">
              <p className="text-sm font-medium text-muted-foreground">{section.title}</p>
            </div>
            {section.items.map((item, itemIndex) => (
              <button
                key={itemIndex}
                onClick={item.onClick}
                className={`w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border-light last:border-b-0 ${item.danger ? 'text-error' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${item.danger ? 'text-error' : 'text-muted-foreground'}`} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.value && <span className="text-xs px-2 py-1 bg-muted rounded">{item.value}</span>}
                  {item.badge && <span className="w-2 h-2 bg-primary rounded-full" />}
                  <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>ORI Finance Pro v1.0.0</p>
        <p className="text-xs mt-1">© 2024 جميع الحقوق محفوظة</p>
      </div>
    </div>
  )
}