import React, { type ReactNode } from 'react'

export function PageHeader({
  title,
  sub,
  actions,
  eyebrow,
}: {
  title: string
  sub?: string
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {sub && <p className="text-sm text-muted mt-1 leading-relaxed max-w-2xl">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold text-ink">{children}</h2>
      {action}
    </div>
  )
}
