import { NavLink } from 'react-router-dom'
import { Home, Wallet, Repeat, Shuffle, CheckCircle, Users, Shield, Settings, FileText, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES, NAV_ITEMS } from '@/lib/constants'
import { useNotificationStore } from '@/stores/notificationStore'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
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
    <nav className="bottom-nav">
      {NAV_ITEMS.slice(0, 10).map((item) => {
        const Icon = iconMap[item.icon] || Home
        const isActive = location.pathname === item.path

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn('nav-item', isActive && 'active')}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.path === ROUTES.APPROVALS && unreadCount > 0 && (
                <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
            <span className="text-xs">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}