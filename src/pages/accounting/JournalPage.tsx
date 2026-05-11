import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, FileText, Search, Calendar, RefreshCw, Filter,
  ChevronDown, ChevronLeft, Eye
} from 'lucide-react'
import { useAccountingStore } from '@/stores/journalEntryStore'
import type { JournalEntry } from '@/stores/journalEntryStore'
import { formatCurrency, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const sourceTypeLabels: Record<string, string> = {
  manual: 'يدوي',
  auto_treasury: 'خزينة',
  auto_payment: 'دفع',
  auto_expense: 'مصروف',
  transaction: 'معاملة',
  transfer: 'تحويل'
}

const statusConfig = {
  draft: { label: 'مسودة', color: 'text-gray-500', bg: 'bg-gray-500/10' },
  posted: { label: 'مرحل', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  cancelled: { label: 'ملغي', color: 'text-red-500', bg: 'bg-red-500/10' }
}

export default function JournalPage() {
  const { journalEntries, isLoading, fetchJournalEntries, successMessage } = useAccountingStore()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchJournalEntries()
  }, [fetchJournalEntries])

  const filteredEntries = journalEntries.filter(e => {
    const matchSearch = !searchTerm ||
      e.entry_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchSource = filterSource === 'all' || e.source_type === filterSource
    const matchStatus = filterStatus === 'all' || e.status === filterStatus
    return matchSearch && matchSource && matchStatus
  })

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) newExpanded.delete(id)
    else newExpanded.add(id)
    setExpandedIds(newExpanded)
  }

  const totalDebit = journalEntries.reduce((sum, e) =>
    sum + (e.lines?.reduce((s, l) => s + (l.debit || 0), 0) || 0), 0)
  const totalCredit = journalEntries.reduce((sum, e) =>
    sum + (e.lines?.reduce((s, l) => s + (l.credit || 0), 0) || 0), 0)

  return (
    <div className="page-container pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">السجل المحاسبي</h1>
          <p className="text-muted-foreground text-sm">القيود المحاسبية المزدوجة</p>
        </div>
        <button
          onClick={() => navigate('/journal/new')}
          className="btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-xl"
        >
          <Plus className="w-5 h-5" />
          <span>قيد جديد</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="رقم القيد أو الوصف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input-field pr-10"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="input-field pr-10"
            placeholder="من تاريخ"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="input-field pr-10"
            placeholder="إلى تاريخ"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="input-field flex-1"
          >
            <option value="all">كل المصادر</option>
            <option value="manual">يدوي</option>
            <option value="auto_treasury">خزينة</option>
            <option value="auto_payment">دفع</option>
            <option value="auto_expense">مصروف</option>
          </select>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border mb-6">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-xs text-muted-foreground">إجمالي القيود</span>
            <div className="font-bold text-foreground">{journalEntries.length}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <span className="text-xs text-muted-foreground">إجمالي المدين</span>
            <div className="font-bold text-blue-600">{formatCurrency(totalDebit, 'LYD')}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <span className="text-xs text-muted-foreground">إجمالي الدائن</span>
            <div className="font-bold text-amber-600">{formatCurrency(totalCredit, 'LYD')}</div>
          </div>
        </div>
        <button
          onClick={() => fetchJournalEntries()}
          disabled={isLoading}
          className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Entries */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-bold">لا توجد قيود</p>
            <p className="text-sm mt-1">قم بإنشاء قيد جديد للبدء</p>
          </div>
        ) : (
          filteredEntries.map(entry => (
            <JournalEntryRow
              key={entry.id}
              entry={entry}
              isExpanded={expandedIds.has(entry.id)}
              onToggle={() => toggleExpand(entry.id)}
              onView={() => navigate(`/journal/${entry.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function JournalEntryRow({
  entry, isExpanded, onToggle, onView
}: {
  entry: JournalEntry
  isExpanded: boolean
  onToggle: () => void
  onView: () => void
}) {
  const lines = entry.lines || []
  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0)
  const status = statusConfig[entry.status as keyof typeof statusConfig] || statusConfig.draft
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            isBalanced ? 'bg-emerald-500' : 'bg-red-500'
          )} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-foreground">{entry.entry_number || '—'}</span>
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', status.bg, status.color)}>
                {status.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {sourceTypeLabels[entry.source_type || 'manual'] || 'يدوي'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-0.5 truncate">
              {entry.description || 'بدون وصف'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-left hidden sm:block">
            <div className="text-xs text-muted-foreground">{entry.entry_date}</div>
            <div className="text-xs text-muted-foreground">{formatRelativeTime(entry.created_at)}</div>
          </div>
          <div className="text-left">
            <div className="font-bold text-blue-600">{formatCurrency(totalDebit, 'LYD')}</div>
            <div className="font-bold text-amber-600">{formatCurrency(totalCredit, 'LYD')}</div>
          </div>
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border p-4 bg-muted/10">
          {/* Lines Header */}
          <div className="grid grid-cols-4 gap-2 mb-3 text-xs font-bold text-muted-foreground">
            <div>الحساب</div>
            <div className="text-left">الوصف</div>
            <div className="text-left">مدين</div>
            <div className="text-left">دائن</div>
          </div>

          {/* Lines */}
          <div className="space-y-1">
            {lines.map((line, idx) => (
              <div key={line.id || idx} className="grid grid-cols-4 gap-2 py-2 text-sm border-b border-border/50 last:border-0">
                <div className="font-medium text-foreground truncate">
                  {line.account_name || line.account_id}
                </div>
                <div className="text-muted-foreground truncate text-left">
                  {line.line_description || '—'}
                </div>
                <div className="text-left text-blue-600 font-bold">
                  {line.debit > 0 ? formatCurrency(line.debit, line.currency_code || 'LYD') : '—'}
                </div>
                <div className="text-left text-amber-600 font-bold">
                  {line.credit > 0 ? formatCurrency(line.credit, line.currency_code || 'LYD') : '—'}
                </div>
              </div>
            ))}
          </div>

          {/* Totals + Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex gap-4">
              <div>
                <span className="text-xs text-muted-foreground">المجموع</span>
                <div className="flex gap-4">
                  <span className="font-black text-blue-600">{formatCurrency(totalDebit, 'LYD')}</span>
                  <span className="font-black text-amber-600">{formatCurrency(totalCredit, 'LYD')}</span>
                </div>
              </div>
              {!isBalanced && (
                <div className="text-xs text-red-500 font-bold self-center">
                  ⚠ غير متوازن!
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onView() }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
            >
              <Eye className="w-4 h-4" />
              عرض
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
