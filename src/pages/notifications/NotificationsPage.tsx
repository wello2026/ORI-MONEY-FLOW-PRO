import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, FileText, ClipboardList, Settings, LogOut, ChevronLeft } from 'lucide-react'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/format'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const notifications = useNotificationStore((state) => state.notifications)
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN)
  }

  const moreItems = [
    { icon: FileText, label: 'التقارير', path: ROUTES.REPORTS },
    { icon: ClipboardList, label: 'سجل التدقيق', path: ROUTES.AUDIT },
    { icon: Settings, label: 'الإعدادات', path: ROUTES.SETTINGS },
    { icon: LogOut, label: 'تسجيل الخروج', action: handleLogout, danger: true },
  ]

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">المزيد</h1>
          <p className="page-subtitle">الإشعارات وخيارات أخرى</p>
        </div>
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="card-elevated mb-6">
        {moreItems.map((item, index) => (
          <button
            key={index}
            onClick={() => item.path ? navigate(item.path) : item.action?.()}
            className={`w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border-light last:border-b-0 ${
              item.danger ? 'text-error' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className={`w-5 h-5 ${item.danger ? 'text-error' : 'text-muted-foreground'}`} />
              <span>{item.label}</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180" />
          </button>
        ))}
      </div>

      <div className="card-elevated">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h3 className="font-semibold">الإشعارات</h3>
            {unreadCount > 0 && (
              <span className="bg-error text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-primary hover:underline"
            >
              تحديد الكل كمقروء
            </button>
          )}
        </div>

        <div className="divide-y divide-border-light">
          {notifications.slice(0, 10).map((notification) => (
            <div
              key={notification.id}
              className={`p-4 hover:bg-muted/50 cursor-pointer ${
                !notification.is_read ? 'bg-muted/30' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{notification.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>لا توجد إشعارات</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}