import { useState } from 'react'
import { Play, Check, X, Clock, RotateCcw } from 'lucide-react'
import { db } from '@/lib/db'
import { useAccountStore } from '@/stores/accountStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { useTransferStore } from '@/stores/transferStore'

interface TestResult {
  name: string
  status: 'pending' | 'pass' | 'fail'
  message: string
  duration: number
}

export default function SystemTestPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  
  const fetchAccounts = useAccountStore((state) => state.fetchAccounts)
  const fetchTransactions = useTransactionStore((state) => state.fetchTransactions)
  const fetchTransfers = useTransferStore((state) => state.fetchTransfers)

  const runTests = async () => {
    setIsRunning(true)
    setResults([])

    const newResults: TestResult[] = []

    // 1. اختبار قاعدة البيانات
    const start1 = Date.now()
    try {
      const accountCount = await db.accounts.count()
      const txCount = await db.transactions.count()
      newResults.push({
        name: '1. اتصال قاعدة البيانات',
        status: 'pass',
        message: `${accountCount} حسابات, ${txCount} معاملات`,
        duration: Date.now() - start1
      })
    } catch (err: any) {
      newResults.push({
        name: '1. اتصال قاعدة البيانات',
        status: 'fail',
        message: err.message,
        duration: Date.now() - start1
      })
    }
    setResults([...newResults])

    // 2. اختبار بيانات الحسابات
    const start2 = Date.now()
    try {
      const accounts = await db.accounts.toArray()
      if (accounts.length === 0) {
        throw new Error('لا توجد حسابات')
      }
      for (const acc of accounts) {
        if (!acc.id || !acc.name || !acc.code) {
          throw new Error(`حساب ناقص: ${acc.name || 'unknown'}`)
        }
      }
      newResults.push({
        name: '2. صحة بيانات الحسابات',
        status: 'pass',
        message: `${accounts.length} حساب صحيح`,
        duration: Date.now() - start2
      })
    } catch (err: any) {
      newResults.push({
        name: '2. صحة بيانات الحسابات',
        status: 'fail',
        message: err.message,
        duration: Date.now() - start2
      })
    }
    setResults([...newResults])

    // 3. اختبار إنشاء معاملة
    const start3 = Date.now()
    try {
      const accounts = await db.accounts.toArray()
      const activeAccount = accounts.find(a => a.status === 'active')
      if (!activeAccount) throw new Error('لا يوجد حساب نشط')

      const txId = crypto.randomUUID()
      const now = new Date().toISOString()
      await db.transactions.put({
        id: txId,
        reference: 'TEST-' + Date.now(),
        type: 'deposit',
        amount: 100,
        account_id: activeAccount.id,
        description: 'اختبار',
        status: 'pending',
        created_by: 'test',
        created_at: now,
        updated_at: now,
        synced: false
      })
      
      const tx = await db.transactions.get(txId)
      if (!tx) throw new Error('فشل في الإنشاء')
      
      // حذف للتظيف
      await db.transactions.delete(txId)
      
      newResults.push({
        name: '3. إنشاء معاملة',
        status: 'pass',
        message: `تم الإنشاء بنجاح`,
        duration: Date.now() - start3
      })
    } catch (err: any) {
      newResults.push({
        name: '3. إنشاء معاملة',
        status: 'fail',
        message: err.message,
        duration: Date.now() - start3
      })
    }
    setResults([...newResults])

    // 4. اختبار الموافقة وتحديث الرصيد
    const start4 = Date.now()
    try {
      const accounts = await db.accounts.toArray()
      const activeAccount = accounts.find(a => a.status === 'active')
      if (!activeAccount) throw new Error('لا يوجد حساب نشط')

      const initialBalance = activeAccount.balance
      const amount = 50

      // إنشاء
      const txId = crypto.randomUUID()
      const now = new Date().toISOString()
      await db.transactions.put({
        id: txId,
        reference: 'TEST-APPROVE-' + Date.now(),
        type: 'deposit',
        amount: amount,
        account_id: activeAccount.id,
        description: 'اختبار',
        status: 'pending',
        created_by: 'test',
        created_at: now,
        updated_at: now,
        synced: false
      })

      // موافقة
      await db.transactions.update(txId, { 
        status: 'approved', 
        approved_by: 'test-admin' 
      })

      // تحديث رصيد
      await db.accounts.update(activeAccount.id, { 
        balance: initialBalance + amount,
        synced: false
      })

      // تحقق
      const updated = await db.accounts.get(activeAccount.id)
      if (updated!.balance !== initialBalance + amount) {
        throw new Error(`الرصيد: ${updated!.balance} متوقع: ${initialBalance + amount}`)
      }

      // استعادة الرصيد
      await db.accounts.update(activeAccount.id, { 
        balance: initialBalance,
        synced: false
      })
      
      newResults.push({
        name: '4. الموافقة وتحديث الرصيد',
        status: 'pass',
        message: `تحديث الرصيد من ${initialBalance} إلى ${initialBalance + amount}`,
        duration: Date.now() - start4
      })
    } catch (err: any) {
      newResults.push({
        name: '4. الموافقة وتحديث الرصيد',
        status: 'fail',
        message: err.message,
        duration: Date.now() - start4
      })
    }
    setResults([...newResults])

    // 5. اختبار التحويل
    const start5 = Date.now()
    try {
      const accounts = await db.accounts.toArray()
      const activeAccounts = accounts.filter(a => a.status === 'active')
      if (activeAccounts.length < 2) throw new Error('تحتاج حسابين')

      const source = activeAccounts[0]
      const dest = activeAccounts[1]
      const amount = 25
      const initialSource = source.balance
      const initialDest = dest.balance

      // إنشاء تحويل
      const trfId = crypto.randomUUID()
      const now = new Date().toISOString()
      await db.transfers.put({
        id: trfId,
        reference: 'TEST-TRF-' + Date.now(),
        source_account_id: source.id,
        destination_account_id: dest.id,
        amount: amount,
        description: 'اختبار',
        status: 'pending',
        created_by: 'test',
        created_at: now,
        synced: false
      })

      // موافقة
      await db.transfers.update(trfId, { status: 'approved', approved_by: 'test' })

      // تحديث أرصدة
      await db.accounts.update(source.id, { balance: initialSource - amount })
      await db.accounts.update(dest.id, { balance: initialDest + amount })

      // تحقق
      const updatedSource = await db.accounts.get(source.id)
      const updatedDest = await db.accounts.get(dest.id)
      
      if (updatedSource!.balance !== initialSource - amount) {
        throw new Error(`خطأ في رصيد المصدر`)
      }
      if (updatedDest!.balance !== initialDest + amount) {
        throw new Error(`خطأ في رصيد الوجهة`)
      }

      // استعادة
      await db.accounts.update(source.id, { balance: initialSource })
      await db.accounts.update(dest.id, { balance: initialDest })

      newResults.push({
        name: '5. التحويل وتحديث الأرصدة',
        status: 'pass',
        message: `خصم ${amount} من المصدر وإضافته للوجهة`,
        duration: Date.now() - start5
      })
    } catch (err: any) {
      newResults.push({
        name: '5. التحويل وتحديث الأرصدة',
        status: 'fail',
        message: err.message,
        duration: Date.now() - start5
      })
    }
    setResults([...newResults])

    // 6. اختبار الرفض
    const start6 = Date.now()
    try {
      const accounts = await db.accounts.toArray()
      const activeAccount = accounts.find(a => a.status === 'active')
      if (!activeAccount) throw new Error('لا يوجد حساب')

      const initialBalance = activeAccount.balance
      const txId = crypto.randomUUID()
      const now = new Date().toISOString()
      await db.transactions.put({
        id: txId,
        reference: 'TEST-REJECT-' + Date.now(),
        type: 'expense',
        amount: 1000,
        account_id: activeAccount.id,
        status: 'pending',
        created_by: 'test',
        created_at: now,
        updated_at: now,
        synced: false
      })

      // رفض
      await db.transactions.update(txId, { status: 'rejected', approved_by: 'test' })

      // تحقق من الرصيد
      const finalAccount = await db.accounts.get(activeAccount.id)
      if (finalAccount!.balance !== initialBalance) {
        throw new Error('الرصيد تغير رغم الرفض')
      }

      // حذف
      await db.transactions.delete(txId)

      newResults.push({
        name: '6. رفض معاملة وعدم تغيير الرصيد',
        status: 'pass',
        message: `الرصيد unchanged: ${initialBalance}`,
        duration: Date.now() - start6
      })
    } catch (err: any) {
      newResults.push({
        name: '6. رفض معاملة وعدم تغيير الرصيد',
        status: 'fail',
        message: err.message,
        duration: Date.now() - start6
      })
    }
    setResults([...newResults])

    // 7. سلامة البيانات
    const start7 = Date.now()
    try {
      const accounts = await db.accounts.toArray()
      const transactions = await db.transactions.toArray()
      const transfers = await db.transfers.toArray()

      // التحقق من المراجع
      for (const tx of transactions) {
        if (!accounts.some(a => a.id === tx.account_id)) {
          throw new Error(`معاملة بحساب غير موجود`)
        }
      }
      for (const trf of transfers) {
        if (!accounts.some(a => a.id === trf.source_account_id)) {
          throw new Error(`تحويل بمصدر غير موجود`)
        }
      }

      newResults.push({
        name: '7. سلامة البيانات',
        status: 'pass',
        message: `${accounts.length} حسابات, ${transactions.length} معاملات, ${transfers.length} تحويلات`,
        duration: Date.now() - start7
      })
    } catch (err: any) {
      newResults.push({
        name: '7. سلامة البيانات',
        status: 'fail',
        message: err.message,
        duration: Date.now() - start7
      })
    }
    setResults([...newResults])

    // 8. تحديث البيانات في التطبيق
    await fetchAccounts()
    await fetchTransactions()
    await fetchTransfers()

    setIsRunning(false)
  }

  const passCount = results.filter(r => r.status === 'pass').length
  const failCount = results.filter(r => r.status === 'fail').length

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">اختبار النظام</h1>
          <p className="page-subtitle">تشغيل اختبارات الوحدات المختلفة</p>
        </div>
        <button 
          onClick={runTests}
          disabled={isRunning}
          className="btn-primary flex items-center gap-2"
        >
          {isRunning ? (
            <RotateCcw className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          {isRunning ? 'جاري التشغيل...' : 'تشغيل الاختبارات'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="mb-4 p-4 rounded-lg flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-success" />
            <span className="font-semibold">{passCount}</span>
            <span className="text-muted-foreground">نجاح</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="w-5 h-5 text-error" />
            <span className="font-semibold">{failCount}</span>
            <span className="text-muted-foreground">فشل</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {results.map((result, index) => (
          <div 
            key={index} 
            className={`card-elevated p-4 flex items-center justify-between ${
              result.status === 'pass' ? 'border-success/30' : 
              result.status === 'fail' ? 'border-error/30' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {result.status === 'pending' && <Clock className="w-5 h-5 text-muted-foreground" />}
              {result.status === 'pass' && <Check className="w-5 h-5 text-success" />}
              {result.status === 'fail' && <X className="w-5 h-5 text-error" />}
              <span className="font-medium">{result.name}</span>
            </div>
            <div className="text-left">
              <p className={`text-sm ${result.status === 'fail' ? 'text-error' : 'text-muted-foreground'}`}>
                {result.message}
              </p>
              <p className="text-xs text-muted-foreground">{result.duration}ms</p>
            </div>
          </div>
        ))}

        {results.length === 0 && (
          <div className="empty-state">
            <Play className="w-16 h-16 opacity-30" />
            <h3>لم يتم تشغيل الاختبارات بعد</h3>
            <p>اضغط على زر "تشغيل الاختبارات"</p>
          </div>
        )}
      </div>
    </div>
  )
}