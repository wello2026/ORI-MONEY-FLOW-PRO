import { useEffect, useState, useCallback, useRef } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// صوت تنبيه (Ping) واضح وقصير
const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

export function ToastNotifications() {
  const [activeToasts, setActiveToasts] = useState<any[]>([])
  const notifications = useNotificationStore((state) => state.notifications)
  const navigate = useNavigate()
  const shownNotificationIds = useRef<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // تهيئة الصوت مسبقاً لتجاوز قيود iOS
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND)
    audioRef.current.load()
  }, [])

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(e => console.log('Audio play failed:', e))
    }
  }, [])

  const triggerVibration = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }
  }, [])

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0]
      
      // التحقق مما إذا كان الإشعار جديداً ولم يتم عرضه مسبقاً
      // سنعتبر الإشعار جديداً إذا وصل في آخر 30 ثانية ولم يتم عرضه في هذه الجلسة
      const now = new Date().getTime()
      const created = new Date(latest.created_at).getTime()
      const isRecentlyCreated = now - created < 30000 
      
      if (isRecentlyCreated && !latest.is_read && !shownNotificationIds.current.has(latest.id)) {
        shownNotificationIds.current.add(latest.id)
        setActiveToasts(prev => [...prev, latest])
        playNotificationSound()
        triggerVibration()
        
        // إخفاء التنبيه تلقائياً بعد 8 ثواني
        setTimeout(() => {
          setActiveToasts(prev => prev.filter(t => t.id !== latest.id))
        }, 8000)
      }
    }
  }, [notifications, playNotificationSound, triggerVibration])

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
          className="glass-card p-4 flex items-start gap-4 animate-slide-in-right pointer-events-auto cursor-pointer active:scale-95 transition-all duration-200 border-r-4 shadow-2xl"
          style={{ 
            borderRightColor: 
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
             <CheckCircle className="w-6 h-6" />}
          </div>
          
          <div className="flex-1 min-w-0" dir="rtl">
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
