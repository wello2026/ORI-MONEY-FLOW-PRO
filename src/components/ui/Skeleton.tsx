import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('skeleton', className)} />
  )
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-card/60 border border-white/5 rounded-3xl p-5 space-y-3', className)}>
      <Skeleton className="h-4 w-3/4 rounded-lg" />
      <Skeleton className="h-3 w-1/2 rounded-lg" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonRow({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-3 p-4 bg-card/60 border border-white/5 rounded-2xl', className)}>
      <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded-lg" />
        <Skeleton className="h-3 w-1/3 rounded-lg" />
      </div>
      <Skeleton className="h-5 w-16 rounded-lg" />
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card/60 border border-white/5 rounded-2xl p-4">
          <Skeleton className="h-3 w-16 rounded-lg mb-2" />
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}