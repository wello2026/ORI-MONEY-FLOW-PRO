import { useEffect, useState, useCallback } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// صوت تنبيه قصير (Base64)
const NOTIFICATION_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFhYAAAAbm90aWZpY2F0aW9uAFUAbAB0AHIAYQAgAE0AbwBkAGUAcgBuACAAUABpAG4AZwAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB6AAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

export function ToastNotifications() {
  const [activeToasts, setActiveToasts] = useState<any[]>([])
  const notifications = useNotificationStore((state) => state.notifications)
  const navigate = useNavigate()

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio(NOTIFICATION_SOUND)
      audio.volume = 0.5
      audio.play().catch(e => console.log('Audio play failed:', e))
    } catch (err) {
      console.log('Audio init failed:', err)
    }
  }, [])

  const triggerVibration = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100])
    }
  }, [])

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0]
      const now = new Date().getTime()
      const created = new Date(latest.created_at).getTime()
      const isNew = now - created < 3000 // أقل من 3 ثواني
      
      if (isNew && !latest.is_read) {
        const toastId = latest.id
        if (!activeToasts.find(t => t.id === toastId)) {
          setActiveToasts(prev => [...prev, latest])
          playNotificationSound()
          triggerVibration()
          
          setTimeout(() => {
            setActiveToasts(prev => prev.filter(t => t.id !== toastId))
          }, 6000)
        }
      }
    }
  }, [notifications, activeToasts, playNotificationSound, triggerVibration])

  const removeToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id))
  }

  const handleToastClick = (toast: any) => {
    removeToast(toast.id)
    navigate('/notifications')
  }

  if (activeToasts.length === 0) return null

  return (
    <div className="fixed top-safe left-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none mt-4">
      {activeToasts.map((toast) => (
        <div 
          key={toast.id}
          onClick={() => handleToastClick(toast)}
          className="glass-card p-4 flex items-start gap-4 animate-slide-in-right pointer-events-auto cursor-pointer active:scale-95 transition-all duration-200 border-l-4 shadow-2xl"
          style={{ 
            borderLeftColor: 
              toast.type === 'approval' ? 'var(--color-primary)' : 
              toast.type === 'alert' ? 'var(--color-error)' : 
              'var(--color-success)' 
          }}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
            toast.type === 'approval' ? 'bg-primary/10 text-primary' :
            toast.type === 'alert' ? 'bg-error/10 text-error' :
            'bg-success/10 text-success'
          }`}>
            {toast.type === 'approval' ? <Bell className="w-6 h-6 animate-bounce-in" /> :
             toast.type === 'alert' ? <AlertCircle className="w-6 h-6" /> :
             toast.type === 'info' ? <Info className="w-6 h-6" /> :
             <CheckCircle className="w-6 h-6" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-black text-foreground truncate">{toast.title}</p>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap opacity-60">الآن</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{toast.body}</p>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation()
              removeToast(toast.id)
            }}
            className="p-1.5 hover:bg-muted/50 rounded-lg text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
