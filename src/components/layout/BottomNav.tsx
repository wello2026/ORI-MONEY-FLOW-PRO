import { NavLink } from 'react-router-dom'
import { Home, Wallet, Repeat, Shuffle, CheckCircle, Users, Shield, Settings, FileText, History, Building } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES, NAV_ITEMS } from '@/lib/constants'
import { useNotificationStore } from '@/stores/notificationStore'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  building: Building,
  wallet: Wallet,
  repeat: Repeat,
  shuffle: Shuffle,
  'check-circle': CheckCircle,
  users: Users,
  shield: Shield,
  settings: Settings,
  'file-text': FileText,
  history: History
}

export function BottomNav() {
  const unreadCount = useNotificationStore((state) => state.unreadCount)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-md border-t border-border z-40 safe-area-bottom">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-4 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon] || Home
          const isActive = location.pathname === item.path

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center min-w-[72px] py-2 px-1 rounded-xl transition-all duration-200 shrink-0',
                isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5 mb-1', isActive && 'scale-110')} />
                {item.path === ROUTES.APPROVALS && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-error text-[10px] text-white rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}