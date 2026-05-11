import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle, Truck, RefreshCw, ChevronLeft, Phone, Mail, Globe,
  Edit3, Trash2, Plus, FileText, CreditCard, Clock, AlertTriangle,
  CheckCircle, ArrowUpRight
} from 'lucide-react'
import { useSupplierStore } from '@/stores/supplierStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { SupplierFormModal } from '@/components/suppliers/SupplierFormModal'
import { InvoiceFormModal } from '@/components/suppliers/InvoiceFormModal'
import { PaymentFormModal } from '@/components/suppliers/PaymentFormModal'

const currencySymbols: Record<string, string> = { USD: '$', LYD: 'د.ل', TRY: '₺', CNY: '¥', EUR: '€', GBP: '£' }
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return `${currencySymbols[currency] || currency}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const invoiceStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'معلق', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  partial: { label: 'جزئي', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  paid: { label: 'مدفوع', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  overdue: { label: 'متأخر', color: 'text-red-500', bg: 'bg-red-500/10' },
  cancelled: { label: 'ملغى', color: 'text-muted-foreground', bg: 'bg-muted' }
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentSupplier, invoices, isLoading, error, fetchSupplier, fetchInvoices, fetchStatement, statement, successMessage, clearMessages, deleteSupplier } = useSupplierStore()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchSupplier(id)
      fetchInvoices(id)
      fetchStatement(id)
    }
  }, [id, fetchSupplier, fetchInvoices, fetchStatement])

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return
    const result = await deleteSupplier(id)
    if (result.success) navigate('/suppliers')
  }

  if (isLoading && !currentSupplier) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentSupplier) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Truck className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-bold">المورد غير موجود</h3>
        <button onClick={() => navigate('/suppliers')} className="mt-4 text-primary text-sm">العودة للموردين</button>
      </div>
    )
  }

  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.total_amount), 0)
  const totalPaid = invoices.reduce((sum, i) => sum + Number(i.amount_paid), 0)
  const totalDue = invoices.reduce((sum, i) => sum + Number(i.amount_due), 0)

  return (
    <div className="page-container pb-24 animate-fade-in">
      {error && <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="text-sm text-destructive font-bold">{error}</div>
      </div>}
      {successMessage && <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <p className="text-sm text-emerald-600 font-bold">{successMessage}</p>
      </div>}

      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/suppliers')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" /><span className="text-sm font-bold">الموردين</span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEditModal(true)} className="p-2 rounded-xl bg-card/60 border border-white/10 hover:bg-card/80 transition-colors">
            <Edit3 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={handleDelete} className="p-2 rounded-xl bg-card/60 border border-white/10 hover:bg-destructive/10 hover:border-destructive/30 transition-colors">
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur border border-white/5 rounded-3xl p-6 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Truck className="w-8 h-8 text-amber-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground">{currentSupplier.supplier_name_ar || currentSupplier.supplier_name}</h1>
            <p className="text-muted-foreground font-mono text-sm">{currentSupplier.supplier_code}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {currentSupplier.country && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{currentSupplier.country}</span>}
              {currentSupplier.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{currentSupplier.phone}</span>}
              {currentSupplier.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{currentSupplier.email}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
            <p className="text-[10px] text-amber-500/60 font-bold mb-1">المستحق</p>
            <p className="text-sm font-black text-amber-500">{formatCurrency(totalDue, currentSupplier.currency_code)}</p>
          </div>
          <div className="bg-background/40 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-bold mb-1">إجمالي الفواتير</p>
            <p className="text-sm font-black">{formatCurrency(totalInvoiced, currentSupplier.currency_code)}</p>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="text-[10px] text-emerald-500/60 font-bold mb-1">المدفوع</p>
            <p className="text-sm font-black text-emerald-500">{formatCurrency(totalPaid, currentSupplier.currency_code)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>آجال الدفع: {currentSupplier.payment_terms} يوم</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => setShowInvoiceModal(true)}
          className="flex items-center justify-center gap-2 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl hover:bg-amber-500/10 transition-colors">
          <FileText className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-bold text-amber-500">فاتورة جديدة</span>
        </button>
        <button onClick={() => id && setShowPaymentModal('new')}
          className="flex items-center justify-center gap-2 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500/10 transition-colors">
          <CreditCard className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500">سداد</span>
        </button>
      </div>

      {/* Invoices */}
      <div className="bg-card/60 backdrop-blur border border-white/5 rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">الفواتير</h2>
          <button onClick={() => id && fetchInvoices(id)} disabled={isLoading}
            className="p-2 rounded-lg hover:bg-background/40 transition-colors">
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        {invoices.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">لا توجد فواتير</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map(invoice => {
              const status = invoiceStatusConfig[invoice.status] || invoiceStatusConfig.pending
              return (
                <div key={invoice.id} className="bg-background/40 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-background/60 transition-colors"
                    onClick={() => setExpandedRow(expandedRow === invoice.id ? null : invoice.id)}>
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', status.bg)}>
                      <FileText className={cn('w-4 h-4', status.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{invoice.invoice_number}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(invoice.invoice_date).toLocaleDateString('ar-SA')}
                        {invoice.description && ` · ${invoice.description}`}
                      </p>
                    </div>
                    <div className={cn('px-2 py-1 rounded-lg text-[10px] font-black', status.bg, status.color)}>
                      {status.label}
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-black text-amber-500">{formatCurrency(invoice.total_amount, invoice.currency_code)}</p>
                      <p className="text-[10px] font-bold text-muted-foreground">المستحق: {formatCurrency(invoice.amount_due, invoice.currency_code)}</p>
                    </div>
                  </div>

                  {expandedRow === invoice.id && (
                    <div className="px-4 pb-3 border-t border-white/5 pt-3">
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div><span className="text-muted-foreground">تاريخ الاستحقاق: </span><span className="font-bold">{new Date(invoice.due_date).toLocaleDateString('ar-SA')}</span></div>
                        <div><span className="text-muted-foreground">الضريبة: </span><span className="font-bold">{formatCurrency(invoice.tax_amount, invoice.currency_code)}</span></div>
                        <div><span className="text-muted-foreground">المدفوع: </span><span className="font-bold text-emerald-500">{formatCurrency(invoice.amount_paid, invoice.currency_code)}</span></div>
                        <div><span className="text-muted-foreground">المتبقي: </span><span className="font-bold text-amber-500">{formatCurrency(invoice.amount_due, invoice.currency_code)}</span></div>
                      </div>
                      {invoice.amount_due > 0 && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                        <button onClick={(e) => { e.stopPropagation(); setShowPaymentModal(invoice.id) }}
                          className="w-full py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm font-bold text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                          سداد {formatCurrency(invoice.amount_due, invoice.currency_code)}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showEditModal && <SupplierFormModal supplier={currentSupplier} onClose={() => setShowEditModal(false)} onSuccess={() => { setShowEditModal(false); if (id) fetchSupplier(id) }} />}
      {showInvoiceModal && id && <InvoiceFormModal supplierId={id} supplierName={currentSupplier.supplier_name_ar || currentSupplier.supplier_name} currency={currentSupplier.currency_code} onClose={() => setShowInvoiceModal(false)} onSuccess={() => { setShowInvoiceModal(false); fetchInvoices(id); fetchStatement(id) }} />}
      {showPaymentModal && id && <PaymentFormModal supplierId={id} invoiceId={showPaymentModal === 'new' ? undefined : showPaymentModal} currency={currentSupplier.currency_code} onClose={() => setShowPaymentModal(null)} onSuccess={() => { setShowPaymentModal(null); fetchInvoices(id); fetchStatement(id) }} />}
    </div>
  )
}