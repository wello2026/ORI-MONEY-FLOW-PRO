import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ROUTES } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import { Suspense, lazy } from 'react'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const AccountsPage = lazy(() => import('@/pages/accounts/AccountsPage'))
const AccountDetailPage = lazy(() => import('@/pages/accounts/AccountDetailPage'))
const AccountFormPage = lazy(() => import('@/pages/accounts/AccountFormPage'))
const EmployeesPage = lazy(() => import('@/pages/employees/EmployeesPage'))
const EmployeeDetailPage = lazy(() => import('@/pages/employees/EmployeeDetailPage'))
const EmployeeFormPage = lazy(() => import('@/pages/employees/EmployeeFormPage'))
const TransactionsPage = lazy(() => import('@/pages/transactions/TransactionsPage'))
const TransactionDetailPage = lazy(() => import('@/pages/transactions/TransactionDetailPage'))
const TransactionFormPage = lazy(() => import('@/pages/transactions/TransactionFormPage'))
const TransfersPage = lazy(() => import('@/pages/transfers/TransfersPage'))
const TransferFormPage = lazy(() => import('@/pages/transfers/TransferFormPage'))
const TransferDetailPage = lazy(() => import('@/pages/transfers/TransferDetailPage'))
const ApprovalsPage = lazy(() => import('@/pages/approvals/ApprovalsPage'))
const ApprovalDetailPage = lazy(() => import('@/pages/approvals/ApprovalDetailPage'))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'))
const AuditPage = lazy(() => import('@/pages/audit/AuditPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'))
const SystemTestPage = lazy(() => import('@/pages/test/SystemTestPage'))
const UsersPage = lazy(() => import('@/pages/users/UsersPage'))
const RolesPage = lazy(() => import('@/pages/users/RolesPage'))

import { AuthGuard } from '@/components/auth/AuthGuard'
import AppLayout from '@/components/layout/AppLayout'

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  )
}

function RootRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return <Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />
}

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <LoginPage />
      </Suspense>
    )
  },
  {
    path: '/',
    element: <RootRoute />
  },
  {
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: ROUTES.DASHBOARD,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.ACCOUNTS,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AccountsPage />
          </Suspense>
        )
      },
      {
        path: '/accounts/:id',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AccountDetailPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.ACCOUNT_NEW,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AccountFormPage />
          </Suspense>
        )
      },
      {
        path: '/accounts/:id/edit',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AccountFormPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.EMPLOYEES,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <EmployeesPage />
          </Suspense>
        )
      },
      {
        path: '/employees/:id',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <EmployeeDetailPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.EMPLOYEE_NEW,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <EmployeeFormPage />
          </Suspense>
        )
      },
      {
        path: '/employees/:id/edit',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <EmployeeFormPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.TRANSACTIONS,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TransactionsPage />
          </Suspense>
        )
      },
      {
        path: '/transactions/:id',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TransactionDetailPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.TRANSACTION_NEW,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TransactionFormPage />
          </Suspense>
        )
      },
      {
        path: '/transactions/:id/edit',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TransactionFormPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.TRANSFERS,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TransfersPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.TRANSFER_NEW,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TransferFormPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.TRANSFER_DETAIL,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TransferDetailPage />
          </Suspense>
        )
      },
      {
        path: '/transfers/:id/edit',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <TransferFormPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.APPROVALS,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ApprovalsPage />
          </Suspense>
        )
      },
      {
        path: '/approvals/:id',
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ApprovalDetailPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.REPORTS,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ReportsPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.AUDIT,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <AuditPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.TEST,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SystemTestPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.USERS,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <UsersPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.ROLES,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <RolesPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.SETTINGS,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <SettingsPage />
          </Suspense>
        )
      },
      {
        path: ROUTES.NOTIFICATIONS,
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <NotificationsPage />
          </Suspense>
        )
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.DASHBOARD} replace />
  }
])