import { useState, useEffect } from 'react'
import { ClipboardList, Search, User, FileText, Activity, TrendingUp, TrendingDown, Plus, Check, X, Lock } from 'lucide-react'
import { formatDateTime, formatRelativeTime } from '@/lib/format'
import { useTransactionStore } from '@/stores/transactionStore'
import { useTransferStore } from '@/stores/transferStore'
import { useAccountStore } from '@/stores/accountStore'
import { useAuthStore } from '@/stores/authStore'
import { AccessGuard } from '@/components/auth/AccessGuard'

interface AuditEntry {
  id: string
  action: string
  entity_type: 'transaction' | 'transfer' | 'account' | 'approval' | 'user' | 'auth'
  user_id: string
  user_name: string
  entity_id?: string
  entity_name?: string
  timestamp: string
  details?: string
  status?: 'success' | 'failed' | 'warning'
}

export default function AuditPage() {
  const currentUser = useAuthStore((state) => state.user)
  const transactions = useTransactionStore((state) => state.transactions)
  const transfers = useTransferStore((state) => state.transfers)
  const accounts = useAccountStore((state) => state.accounts)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [logs, setLogs] = useState<AuditEntry[]>([])

  useEffect(() => {
    generateAuditLogs()
  }, [transactions, transfers, accounts])

  const generateAuditLogs = () => {
    const allLogs: AuditEntry[] = []

    // جلب سجلات المعاملات
    transactions.forEach(tx => {
      allLogs.push({
        id: tx.id,
        action: tx.status === 'approved' ? 'موافقة على معاملة' : 
               tx.status === 'rejected' ? 'رفض معاملة' : 'إنشاء معاملة',
        entity_type: 'transaction',
        user_id: tx.created_by || 'unknown',
        user_name: tx.created_by === currentUser?.id ? currentUser.full_name : 'مستخدم',
        entity_id: tx.id,
        entity_name: tx.reference,
        timestamp: tx.created_at,
        details: `${tx.type} - ${tx.amount} د.ل`,
        status: tx.status === 'approved' ? 'success' : 
                tx.status === 'rejected' ? 'failed' : 'warning'
      })
    })

    // جلب سجلات التحويلات
    transfers.forEach(trf => {
      allLogs.push({
        id: trf.id,
        action: trf.status === 'approved' ? 'موافقة على تحويل' :
               trf.status === 'rejected' ? 'رفض تحويل' : 'إنشاء تحويل',
        entity_type: 'transfer',
        user_id: trf.created_by || 'unknown',
        user_name: trf.created_by === currentUser?.id ? currentUser.full_name : 'مستخدم',
        entity_id: trf.id,
        entity_name: trf.reference,
        timestamp: trf.created_at,
        details: `${trf.amount} د.ل`,
        status: trf.status === 'approved' ? 'success' :
                trf.status === 'rejected' ? 'failed' : 'warning'
      })
    })

    // جلب سجلات الحسابات
    accounts.forEach(acc => {
      allLogs.push({
        id: acc.id,
        action: 'حساب نشط',
        entity_type: 'account',
        user_id: acc.created_by || 'unknown',
        user_name: acc.created_by === currentUser?.id ? currentUser.full_name : 'مستخدم',
        entity_id: acc.id,
        entity_name: acc.name,
        timestamp: acc.created_at,
        details: `${acc.type} - الرصيد: ${acc.balance} د.ل`,
        status: 'success'
      })
    })

    // ترتيب حسب التاريخ
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    setLogs(allLogs)
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.includes(searchTerm) || 
      log.user_name.includes(searchTerm) ||
      log.details?.includes(searchTerm) ||
      log.entity_name?.includes(searchTerm)
    const matchesType = filterType === 'all' || log.entity_type === filterType
    return matchesSearch && matchesType
  })

  const getActionIcon = (action: string) => {
    if (action.includes('موافقة')) return <Check className="w-4 h-4 text-success" />
    if (action.includes('رفض') || action.includes('حذف')) return <X className="w-4 h-4 text-error" />
    if (action.includes('إنشاء') || action.includes('إضافة')) return <Plus className="w-4 h-4 text-info" />
    return <Activity className="w-4 h-4 text-muted-foreground" />
  }

  const getActionColor = (status?: string) => {
    if (status === 'success') return 'text-success'
    if (status === 'failed') return 'text-error'
    if (status === 'warning') return 'text-warning'
    return 'text-muted-foreground'
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <TrendingUp className="w-4 h-4" />
      case 'transfer': return <TrendingDown className="w-4 h-4" />
      case 'account': return <FileText className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const entityLabels: Record<string, string> = {
    transaction: 'معاملة',
    transfer: 'تحويل',
    account: 'حساب',
    approval: 'موافقة',
    user: 'مستخدم',
    auth: 'مصادقة'
  }

  // إحصائيات
  const totalActions = logs.length
  const todayActions = logs.filter(l => {
    const today = new Date().toDateString()
    return new Date(l.timestamp).toDateString() === today
  }).length
  const successActions = logs.filter(l => l.status === 'success').length

  return (
    <AccessGuard permission="audit_view" fallback={
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-muted-foreground">لا تملك صلاحية الوصول</h2>
          <p className="text-sm text-muted-foreground mt-2">يرجى التواصل مع المدير للحصول على الصلاحية</p>
        </div>
      </div>
    }>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">سجل التدقيق</h1>
          <p className="page-subtitle">تتبع جميع الأنشطة في النظام</p>
        </div>

        <div className="card-elevated p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-5 h-5 text-primary" />
            <span className="font-semibold">إحصائيات النشاط</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{totalActions}</p>
            <p className="text-xs text-muted-foreground">إجمالي الأحداث</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-success">{todayActions}</p>
            <p className="text-xs text-muted-foreground">اليوم</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-info">{successActions}</p>
            <p className="text-xs text-muted-foreground">ناجحة</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="بحث..."
            className="input-field pr-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="input-field w-auto"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">الكل</option>
          <option value="transaction">المعاملات</option>
          <option value="transfer">التحويلات</option>
          <option value="account">الحسابات</option>
          <option value="approval">الموافقات</option>
          <option value="auth">المصادقة</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <div key={log.id} className="card-elevated p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  {getActionIcon(log.action)}
                </div>
                <div>
                  <p className={`font-medium ${getActionColor(log.status)}`}>{log.action}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{getEntityIcon(log.entity_type)}</span>
                    <span>{entityLabels[log.entity_type]}</span>
                    {log.entity_name && <span>• {log.entity_name}</span>}
                  </div>
                </div>
              </div>
              <div className="text-left text-sm">
                <p className="text-muted-foreground">{formatRelativeTime(log.timestamp)}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(log.timestamp)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{log.user_name}</span>
              {log.details && (
                <>
                  <span className="mx-1">•</span>
                  <span>{log.details}</span>
                </>
              )}
            </div>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="empty-state">
            <ClipboardList className="w-16 h-16 opacity-30" />
            <h3>لا توجد سجلات</h3>
            <p className="text-sm">لم يتم تسجيل أي نشاط بعد</p>
          </div>
        )}
      </div>
    </div>
    </AccessGuard>
  )
}