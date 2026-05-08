import { usePermissions } from '@/stores/permissionStore'
import type { Permission } from '@/types'

interface AccessGuardProps {
  permission: Permission | Permission[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AccessGuard({ permission, children, fallback = null }: AccessGuardProps) {
  const { hasPermission } = usePermissions()

  // التحقق من صلاحية واحدة أو مجموعة
  const hasAccess = Array.isArray(permission)
    ? permission.some(p => hasPermission(p))
    : hasPermission(permission)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// مكون لإخفاء العنصر بدلاً من عرض رسالة
export function HideIfNoPermission({ permission, children }: { permission: Permission | Permission[], children: React.ReactNode }) {
  const { hasPermission } = usePermissions()
  
  const hasAccess = Array.isArray(permission)
    ? permission.some(p => hasPermission(p))
    : hasPermission(permission)

  if (!hasAccess) {
    return null
  }

  return <>{children}</>
}

// مكون للسماح فقط للإداريين
export function AdminOnly({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  const { isAdmin } = usePermissions()
  
  if (!isAdmin) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// مكون للسماح فقط للمدير العام
export function SuperAdminOnly({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  const { isSuperAdmin } = usePermissions()
  
  if (!isSuperAdmin) {
    return <>{fallback}</>
  }

  return <>{children}</>
}