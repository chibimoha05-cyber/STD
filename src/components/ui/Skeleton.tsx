import React from 'react'

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton ${className}`} />
)

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
