import { NavLink, useLocation } from 'react-router-dom'
import { Home, Wallet, Repeat, Shuffle, CheckCircle, Users, Settings, FileText, Building2, UsersRound, Truck, Package, Receipt, ArrowRightLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'

const iconMap: Record<string, any> = {
  home: Home,
  treasury: Wallet,
  journal: FileText,
  building: Building2,
  'check-circle': CheckCircle,
  'file-text': FileText,
  settings: Settings,
  users: Users,
  partners: UsersRound,
  suppliers: Truck,
  products: Package,
  expenses: Receipt,
  transfers: ArrowRightLeft,
}

export function BottomNav() {
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  const navItems = [
    { path: ROUTES.DASHBOARD, label: 'الرئيسية', icon: 'home', roles: ['super_admin', 'admin', 'employee', 'viewer'] },
    { path: ROUTES.TREASURIES, label: 'الخزائن', icon: 'treasury', roles: ['super_admin', 'admin', 'treasury'] },
    { path: ROUTES.TRANSFERS, label: 'التحويلات', icon: 'transfers', roles: ['super_admin', 'admin', 'treasury'] },
    { path: ROUTES.JOURNAL, label: 'القيود', icon: 'journal', roles: ['super_admin', 'admin', 'accountant'] },
    { path: ROUTES.PARTNERS, label: 'الشركاء', icon: 'partners', roles: ['super_admin', 'admin', 'operations'] },
    { path: ROUTES.SUPPLIERS, label: 'الموردين', icon: 'suppliers', roles: ['super_admin', 'admin', 'accountant'] },
    { path: ROUTES.PRODUCTS, label: 'البطاقات', icon: 'products', roles: ['super_admin', 'admin', 'accountant', 'operations'] },
    { path: ROUTES.EXPENSES, label: 'المصروفات', icon: 'expenses', roles: ['super_admin', 'admin', 'accountant', 'operations', 'employee'] },
    { path: ROUTES.PROJECTS, label: 'المشاريع', icon: 'building', roles: ['super_admin', 'admin', 'employee'] },
    { path: ROUTES.APPROVALS, label: 'الموافقات', icon: 'check-circle', roles: ['super_admin', 'admin'] },
    { path: ROUTES.REPORTS, label: 'التقارير', icon: 'file-text', roles: ['super_admin', 'admin'] },
    { path: ROUTES.USERS, label: 'المستخدمين', icon: 'users', roles: ['super_admin', 'admin'] },
    { path: ROUTES.EMPLOYEES, label: 'الموظفين', icon: 'users', roles: ['super_admin', 'admin'] },
    { path: ROUTES.SETTINGS, label: 'الإعدادات', icon: 'settings', roles: ['super_admin', 'admin', 'employee', 'viewer'] },
  ].filter(item => item.roles.includes(user?.role || 'employee'))

  return (
    <nav className="fixed bottom-6 left-4 right-4 bg-card/40 backdrop-blur-2xl border border-white/10 z-50 rounded-3xl shadow-gold safe-area-bottom print:hidden">
      <div className="flex items-center justify-around px-2 py-3 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon] || Home
          const isActive = location.pathname === item.path

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center min-w-[50px] py-1 transition-all duration-300 relative',
                isActive ? 'text-primary' : 'text-muted-foreground opacity-50 hover:opacity-100'
              )}
            >
              <div className="relative mb-1">
                <Icon className={cn('w-6 h-6 transition-all duration-500', isActive && 'scale-125 -translate-y-1')} />
                {item.path === ROUTES.APPROVALS && unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-error text-[9px] text-white rounded-full flex items-center justify-center font-black border-2 border-card">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className={cn("text-[9px] font-black tracking-tighter transition-all duration-500", isActive ? "opacity-100" : "opacity-0 scale-75")}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-3 w-1 h-1 bg-primary rounded-full shadow-gold animate-pulse" />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}