import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { VAPID_PUBLIC_KEY } from '@/lib/constants'

export function PushManager() {
  const user = useAuthStore((state) => state.user)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [_permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
      checkSubscription()
    } else {
      setLoading(false)
    }
  }, [])

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator)) return
    
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    setIsSubscribed(!!subscription)
    setLoading(false)
  }

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const subscribeUser = async () => {
    setLoading(true)
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Workers are not supported');
      }

      const permission = await Notification.requestPermission()
      setPermission(permission)
      
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Force unregister and re-register to ensure latest SW
      const registrations = await navigator.serviceWorker.getRegistrations();
      for(let reg of registrations) {
        await reg.unregister();
      }
      
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      // Save to database
      if (user) {
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: subscription.toJSON(),
            device_info: {
              userAgent: navigator.userAgent,
              platform: navigator.platform
            }
          }, { onConflict: 'user_id' })

        if (error) throw error
      }

      setIsSubscribed(true)
      alert('تم تفعيل إشعارات الخلفية بنجاح! ✅')
    } catch (err: any) {
      console.error('Push error:', err)
      alert(`عذراً، فشل التفعيل: ${err.message}\n\nتأكد من فتح التطبيق من الشاشة الرئيسية (PWA).`)
    } finally {
      setLoading(false)
    }
  }

  const unsubscribeUser = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
        }
      }
      setIsSubscribed(false)
    } catch (err) {
      console.error('Failed to unsubscribe:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!('Notification' in window)) return null

  return (
    <div className="card-elevated p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSubscribed ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
          {isSubscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-bold text-sm">إشعارات الخلفية</p>
          <p className="text-xs text-muted-foreground">
            {isSubscribed ? 'مفعلة - ستصلك التنبيهات والتطبيق مغلق' : 'معطلة - لن تصلك تنبيهات في الخلفية'}
          </p>
        </div>
      </div>

      <button
        onClick={isSubscribed ? unsubscribeUser : subscribeUser}
        disabled={loading}
        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          isSubscribed 
            ? 'bg-muted text-foreground hover:bg-muted/80' 
            : 'bg-primary text-white hover:bg-primary/90'
        }`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSubscribed ? 'تعطيل' : 'تفعيل')}
      </button>
    </div>
  )
}
