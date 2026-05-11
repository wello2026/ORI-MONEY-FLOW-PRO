import { WifiOff } from 'lucide-react'

interface OfflineBannerProps {
  pendingCount?: number
}

export function OfflineBanner({ pendingCount = 0 }: OfflineBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] bg-warning text-warning-foreground text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        أنت غير متصل بالإنترنت
        {pendingCount > 0 && ` — ${pendingCount} تغييرات بانتظار المزامنة`}
      </span>
    </div>
  )
}