import { useEffect, useState } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function ToastNotifications() {
  const [activeToasts, setActiveToasts] = useState<any[]>([])
  const notifications = useNotificationStore((state) => state.notifications)
  const navigate = useNavigate()

  // سنقوم بمراقبة التنبيهات الجديدة غير المقروءة التي وصلت في آخر 5 ثواني
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0]
      const isNew = new Date().getTime() - new Date(latest.created_at).getTime() < 5000
      
      if (isNew && !latest.is_read) {
        const toastId = latest.id
        // منع التكرار
        if (!activeToasts.find(t => t.id === toastId)) {
          setActiveToasts(prev => [...prev, latest])
          
          // إزالة التنبيه بعد 5 ثواني
          setTimeout(() => {
            setActiveToasts(prev => prev.filter(t => t.id !== toastId))
          }, 5000)
        }
      }
    }
  }, [notifications])

  const removeToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id))
  }

  const handleToastClick = (toast: any) => {
    removeToast(toast.id)
    navigate('/notifications')
  }

  if (activeToasts.length === 0) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {activeToasts.map((toast) => (
        <div 
          key={toast.id}
          onClick={() => handleToastClick(toast)}
          className="bg-card border border-border shadow-2xl rounded-xl p-4 flex items-start gap-3 animate-slide-in-right pointer-events-auto cursor-pointer active:scale-95 transition-transform"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            toast.type === 'approval' ? 'bg-primary/10 text-primary' :
            toast.type === 'alert' ? 'bg-error/10 text-error' :
            'bg-success/10 text-success'
          }`}>
            {toast.type === 'approval' ? <Bell className="w-5 h-5" /> :
             toast.type === 'alert' ? <AlertCircle className="w-5 h-5" /> :
             <CheckCircle className="w-5 h-5" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{toast.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{toast.body}</p>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation()
              removeToast(toast.id)
            }}
            className="p-1 hover:bg-muted rounded-md text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
