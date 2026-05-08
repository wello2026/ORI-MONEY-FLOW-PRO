import { WifiOff, RefreshCw } from 'lucide-react'
import { useSyncStore } from '@/stores/syncStore'

export function OfflineIndicator() {
  const isSyncing = useSyncStore((state) => state.isSyncing)
  const pendingCount = useSyncStore((state) => state.pendingCount)

  return (
    <div className="offline-indicator flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span>أنت غير متصل بالإنترنت</span>
      {pendingCount > 0 && (
        <span className="text-xs opacity-80">({pendingCount} معاملة معلقة)</span>
      )}
      {isSyncing && <RefreshCw className="w-4 h-4 animate-spin" />}
    </div>
  )
}