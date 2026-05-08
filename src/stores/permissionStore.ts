import { useMemo } from 'react'
import { useAuthStore } from './authStore'
import type { Permission } from '@/types'
import { DEFAULT_ROLES } from '@/types'

export const usePermissions = () => {
  const user = useAuthStore((state) => state.user)
  
  const permissions = useMemo(() => {
    if (!user) return []
    
    // استخدام الصلاحيات الافتراضية بناءً على الدور
    const rolePermissions = DEFAULT_ROLES[user.role as keyof typeof DEFAULT_ROLES]
    return rolePermissions || []
  }, [user?.role])

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false
    return permissions.includes(permission) || permissions.includes('all' as Permission)
  }

  const canDo = (permission: Permission): boolean => hasPermission(permission)

  // اختصارات للعمليات الشائعة
  const canCreateTransaction = hasPermission('transactions_create')
  const canApproveTransaction = hasPermission('transactions_approve')
  const canCreateTransfer = hasPermission('transfers_create')
  const canApproveTransfer = hasPermission('transfers_approve')
  const canCreateAccount = hasPermission('accounts_create')
  const canEditAccount = hasPermission('accounts_edit')
  const canDeleteAccount = hasPermission('accounts_delete')
  const canManageUsers = hasPermission('users_create') || hasPermission('users_edit') || hasPermission('users_delete')
  const canManageRoles = hasPermission('roles_manage')
  const canViewReports = hasPermission('reports_view')
  const canExportReports = hasPermission('reports_export')
  const canViewSettings = hasPermission('settings_view')
  const canEditSettings = hasPermission('settings_edit')
  const canViewAudit = hasPermission('audit_view')

  return {
    permissions,
    hasPermission,
    canDo,
    // اختصارات
    canCreateTransaction,
    canApproveTransaction,
    canCreateTransfer,
    canApproveTransfer,
    canCreateAccount,
    canEditAccount,
    canDeleteAccount,
    canManageUsers,
    canManageRoles,
    canViewReports,
    canExportReports,
    canViewSettings,
    canEditSettings,
    canViewAudit,
    // معلومات المستخدم
    userRole: user?.role,
    isAdmin: user?.role === 'super_admin' || user?.role === 'admin',
    isSuperAdmin: user?.role === 'super_admin'
  }
}

// مثال على الاستخدام:
// const { canCreateTransaction, canApproveTransfer, canManageUsers } = usePermissions()
// if (!canCreateTransaction) return <AccessDenied />