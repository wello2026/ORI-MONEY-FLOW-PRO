import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Search, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAccountingStore } from '@/stores/journalEntryStore'
import type { JournalEntryLine } from '@/types'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface AccountOption {
  id: string
  account_number: string
  account_name: string
  account_name_ar: string
  type: string
  currency_code: string
  current_balance: number
}

export default function JournalEntryFormPage() {
  const { createJournalEntry, searchAccounts, isLoading, successMessage, error } = useAccountingStore()
  const navigate = useNavigate()

  const [description, setDescription] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { account_id: '', debit: 0, credit: 0, currency_code: 'LYD' },
    { account_id: '', debit: 0, credit: 0, currency_code: 'LYD' }
  ])
  const [accountSearch, setAccountSearch] = useState('')
  const [accountResults, setAccountResults] = useState<AccountOption[]>([])
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null)
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null)

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001

  useEffect(() => {
    if (accountSearch.length >= 2) {
      const timeout = setTimeout(async () => {
        const results = await searchAccounts(accountSearch)
        setAccountResults(results)
      }, 300)
      return () => clearTimeout(timeout)
    } else {
      setAccountResults([])
    }
  }, [accountSearch, searchAccounts])

  const addLine = () => {
    setLines([...lines, { account_id: '', debit: 0, credit: 0, currency_code: 'LYD' }])
  }

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index))
    }
  }

  const updateLine = (index: number, field: keyof JournalEntryLine, value: any) => {
    const newLines = [...lines]
    const line = newLines[index]

    // When setting debit, clear credit and vice versa
    if (field === 'debit') {
      newLines[index] = { ...line, debit: value || 0, credit: 0 }
    } else if (field === 'credit') {
      newLines[index] = { ...line, credit: value || 0, debit: 0 }
    } else {
      newLines[index] = { ...line, [field]: value }
    }

    setLines(newLines)
  }

  const selectAccount = (account: AccountOption, lineIndex: number) => {
    const newLines = [...lines]
    newLines[lineIndex] = {
      ...newLines[lineIndex],
      account_id: account.id,
      account_name: account.account_name_ar || account.account_name,
      currency_code: account.currency_code || 'LYD'
    }
    setLines(newLines)
    setActiveLineIndex(null)
    setAccountSearch('')
    setAccountResults([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isBalanced) {
      setResult({ success: false, message: 'القيود غير متوازنة!' })
      return
    }

    const validLines = lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0))
    if (validLines.length < 2) {
      setResult({ success: false, message: 'يجب إدخال سطرين على الأقل' })
      return
    }

    setResult(null)
    const res = await createJournalEntry({
      description,
      reference_number: referenceNumber || undefined,
      entry_date: entryDate,
      lines: validLines
    })

    setResult(res)
    if (res.success) {
      setTimeout(() => navigate('/journal'), 1500)
    }
  }

  return (
    <div className="page-container pb-24 animate-fade-in">
      <button
        onClick={() => navigate('/journal')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-bold">العودة للسجل المحاسبي</span>
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">قيد محاسبي جديد</h1>
        <p className="text-muted-foreground text-sm mt-1">إنشاء قيد مزدوج متوازن</p>
      </div>

      {/* Result Banner */}
      {result && (
        <div className={cn(
          'mb-6 p-4 rounded-xl border flex items-center gap-3',
          result.success
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
            : 'bg-red-500/10 border-red-500/30 text-red-600'
        )}>
          {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-bold">{result.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Fields */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-foreground mb-1.5 block">
                وصف القيد <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="input-field"
                placeholder="مثال: صرف رواتب شهر يناير"
                required
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">تاريخ القيد</label>
              <input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-foreground mb-1.5 block">رقم المرجع</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                className="input-field"
                placeholder="رقم مرجعي..."
              />
            </div>
          </div>
        </div>

        {/* Journal Lines */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <div className="grid grid-cols-12 gap-3 text-xs font-bold text-muted-foreground">
              <div className="col-span-5">الحساب</div>
              <div className="col-span-2 text-left">الوصف</div>
              <div className="col-span-2 text-left">مدين</div>
              <div className="col-span-2 text-left">دائن</div>
              <div className="col-span-1"></div>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {lines.map((line, index) => (
              <div key={index} className="p-4">
                <div className="grid grid-cols-12 gap-3 items-start">
                  {/* Account Selection */}
                  <div className="col-span-5 relative">
                    {activeLineIndex === index ? (
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            value={accountSearch}
                            onChange={e => setAccountSearch(e.target.value)}
                            onFocus={() => setActiveLineIndex(index)}
                            placeholder="ابحث عن حساب..."
                            className="input-field pr-10"
                            autoFocus
                          />
                        </div>
                        {accountResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                            {accountResults.map(acc => (
                              <button
                                key={acc.id}
                                type="button"
                                onClick={() => selectAccount(acc, index)}
                                className="w-full text-right px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                              >
                                <div className="font-bold text-sm">{acc.account_name_ar || acc.account_name}</div>
                                <div className="text-xs text-muted-foreground">{acc.account_number} • {acc.type}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveLineIndex(index)}
                        className={cn(
                          'w-full text-right px-3 py-2 rounded-xl border text-sm transition-colors',
                          line.account_id
                            ? 'bg-primary/5 border-primary/30 text-foreground'
                            : 'bg-muted/20 border-border text-muted-foreground hover:border-primary/30'
                        )}
                      >
                        {line.account_name || 'اختر حساب...'}
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={line.line_description || ''}
                      onChange={e => updateLine(index, 'line_description', e.target.value)}
                      className="input-field text-sm"
                      placeholder="وصف..."
                    />
                  </div>

                  {/* Debit */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={line.debit || ''}
                      onChange={e => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                      className={cn(
                        'input-field text-sm text-left font-bold',
                        line.debit > 0 ? 'text-blue-600 bg-blue-500/5 border-blue-500/30' : ''
                      )}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Credit */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={line.credit || ''}
                      onChange={e => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                      className={cn(
                        'input-field text-sm text-left font-bold',
                        line.credit > 0 ? 'text-amber-600 bg-amber-500/5 border-amber-500/30' : ''
                      )}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Delete */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={lines.length <= 2}
                      className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border">
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-2 text-sm text-primary font-bold hover:text-primary/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة سطر
            </button>
          </div>
        </div>

        {/* Totals & Balance */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-8">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">إجمالي المدين</span>
                <span className={cn(
                  'text-2xl font-black',
                  Math.abs(totalDebit - totalCredit) < 0.001 ? 'text-blue-600' : 'text-muted-foreground'
                )}>
                  {formatCurrency(totalDebit, 'LYD')}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">إجمالي الدائن</span>
                <span className={cn(
                  'text-2xl font-black',
                  Math.abs(totalDebit - totalCredit) < 0.001 ? 'text-amber-600' : 'text-muted-foreground'
                )}>
                  {formatCurrency(totalCredit, 'LYD')}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">الفرق</span>
                <span className={cn(
                  'text-2xl font-black',
                  isBalanced ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {formatCurrency(Math.abs(totalDebit - totalCredit), 'LYD')}
                </span>
              </div>
            </div>

            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl',
              isBalanced ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
            )}>
              {isBalanced ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold text-sm">متوازن ✓</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-bold text-sm">غير متوازن</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/journal')}
            className="flex-1 btn-secondary py-4 rounded-xl"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={!isBalanced || !description.trim() || lines.length < 2 || isLoading}
            className="flex-1 btn-primary py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'جاري الحفظ...' : 'حفظ القيد'}
          </button>
        </div>
      </form>
    </div>
  )
}
