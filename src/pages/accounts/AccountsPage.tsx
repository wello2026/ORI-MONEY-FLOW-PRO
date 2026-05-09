import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Wallet, Search, AlertCircle, Loader2, ChevronRight, ChevronDown, Building2, User } from 'lucide-react'
import { useAccountStore } from '@/stores/accountStore'
import { ROUTES } from '@/lib/constants'
import { formatCurrency, formatAccountType } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Account } from '@/types'

export default function AccountsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  const isLoading = useAccountStore((state) => state.isLoading)
  const error = useAccountStore((state) => state.error)
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  // Build Hierarchy
  const buildHierarchy = (items: Account[]) => {
    const map = new Map<string, Account & { children: Account[] }>()
    items.forEach(item => map.set(item.id, { ...item, children: [] }))
    const roots: any[] = []
    map.forEach(item => {
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id)!.children.push(item)
      } else {
        roots.push(item)
      }
    })
    return roots
  }

  const hierarchicalAccounts = buildHierarchy(accounts.filter(acc =>
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.code.toLowerCase().includes(searchTerm.toLowerCase())
  ))

  const totalBalanceLYD = accounts.filter(a => a.currency === 'LYD').reduce((sum, acc) => sum + acc.balance, 0)

  return (
    <div className="page-container pb-24 animate-fade-in">
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-destructive font-bold">خطأ في جلب الحسابات: {error}</div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground">شجرة الحسابات</h1>
          <p className="text-muted-foreground text-sm">الهيكل المالي المتكامل للمؤسسة</p>
        </div>
        <button 
          onClick={() => navigate(ROUTES.ACCOUNT_NEW)}
          className="btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-2xl shadow-gold"
        >
          <Plus className="w-5 h-5" />
          <span>حساب جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-6 border-r-4 border-r-primary">
          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">إجمالي السيولة (LYD)</p>
          <p className="text-2xl font-black text-foreground">{formatCurrency(totalBalanceLYD, 'LYD')}</p>
        </div>
        <div className="glass-card p-6 border-r-4 border-r-success">
          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">إجمالي الحسابات</p>
          <p className="text-2xl font-black text-foreground">{accounts.length} <span className="text-sm font-normal">حساب</span></p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="ابحث في شجرة الحسابات..."
          className="w-full bg-card border-2 border-border focus:border-primary rounded-2xl py-4 pr-12 pl-4 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading && accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-bold">جاري تحميل الشجرة المالية...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hierarchicalAccounts.map((account) => (
            <AccountRow 
              key={account.id} 
              account={account} 
              level={0} 
              expandedIds={expandedIds} 
              toggleExpand={toggleExpand} 
            />
          ))}

          {hierarchicalAccounts.length === 0 && !isLoading && (
            <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
              <Wallet className="w-16 h-16 opacity-10 mb-4" />
              <h3 className="text-xl font-black text-foreground opacity-50">لا يوجد حسابات مطابقة</h3>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AccountRow({ account, level, expandedIds, toggleExpand }: any) {
  const isExpanded = expandedIds.has(account.id)
  const hasChildren = account.children && account.children.length > 0
  const navigate = useNavigate()

  return (
    <div className="space-y-2">
      <div 
        onClick={() => navigate(`/accounts/${account.id}`)}
        className={cn(
          "glass-card group cursor-pointer transition-all duration-300 hover:border-primary/50",
          level > 0 && "mr-8 bg-muted/20"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              {hasChildren ? (
                <button 
                  onClick={(e) => toggleExpand(account.id, e)}
                  className="p-1 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                >
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
              ) : (
                <div className="w-7" />
              )}
            </div>

            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              account.type === 'cashbox' ? "bg-primary/10 text-primary" : "bg-secondary text-white"
            )}>
              {account.type === 'employee' ? <User className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
            </div>

            <div>
              <h3 className="font-black text-foreground group-hover:text-primary transition-colors">{account.name}</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {account.code} • {formatAccountType(account.type)}
              </p>
            </div>
          </div>

          <div className="text-left">
            <p className="text-lg font-black text-foreground">{formatCurrency(account.balance, account.currency)}</p>
            <div className={cn(
              "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold",
              account.status === 'active' ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground"
            )}>
              {account.status === 'active' ? 'نشط' : 'متوقف'}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="animate-slide-down space-y-2">
          {account.children.map((child: any) => (
            <AccountRow 
              key={child.id} 
              account={child} 
              level={level + 1} 
              expandedIds={expandedIds} 
              toggleExpand={toggleExpand} 
            />
          ))}
        </div>
      )}
    </div>
  )
}