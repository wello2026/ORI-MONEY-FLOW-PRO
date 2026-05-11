import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { ChevronDown, Building2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CompanySwitcher() {
  const { currentCompany, userCompanies, companyRole, switchCompany } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  if (!currentCompany || userCompanies.length === 0) return null

  const roleLabels: Record<string, string> = {
    owner: 'المالك',
    admin: 'مدير',
    accountant: 'محاسب',
    treasury: 'خزينة',
    operations: 'تشغيل',
    viewer: 'مشاهد'
  }

  const handleSwitch = async (companyId: string) => {
    if (companyId === currentCompany.id) {
      setIsOpen(false)
      return
    }
    setIsSwitching(true)
    await switchCompany(companyId)
    setIsSwitching(false)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl',
          'bg-primary/10 hover:bg-primary/20',
          'border border-primary/20',
          'transition-all duration-200',
          'w-full text-right'
        )}
      >
        <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-foreground truncate">
            {currentCompany.company_name_ar || currentCompany.company_name}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {roleLabels[companyRole || 'viewer']} • {currentCompany.default_currency}
          </div>
        </div>
        <ChevronDown className={cn(
          'w-4 h-4 text-primary flex-shrink-0 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {userCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleSwitch(company.id)}
                disabled={isSwitching}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-3',
                  'hover:bg-muted/50 transition-colors',
                  'border-b border-border/50 last:border-0',
                  company.id === currentCompany.id && 'bg-primary/5'
                )}
              >
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 text-right">
                  <div className="text-sm font-semibold text-foreground">
                    {company.company_name_ar || company.company_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {company.country} • {company.default_currency}
                  </div>
                </div>
                {company.id === currentCompany.id && (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}