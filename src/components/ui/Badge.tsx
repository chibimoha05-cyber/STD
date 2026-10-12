import React, { type ReactNode } from 'react'
import { Icon } from './Icon'

export type BadgeTone = 'neutral' | 'brand' | 'accent' | 'danger' | 'success' | 'warn'

export function Badge({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode
  tone?: BadgeTone
  icon?: string
}) {
  const toneStyles = {
    neutral: 'bg-chip text-muted',
    brand: 'bg-brand-soft text-brand',
    accent: 'bg-accent-soft text-accent-ink',
    danger: 'bg-danger-soft text-danger',
    success: 'bg-success-soft text-success',
    warn: 'bg-warn-soft text-warn',
  }[tone]

  return (
    <span
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium whitespace-nowrap ${toneStyles}`}
    >
      {icon && <Icon name={icon} className="size-3.5" />}
      {children}
    </span>
  )
}

export function AccessBadge({ access }: { access: 'public' | 'restricted' }) {
  return access === 'public' ? (
    <Badge tone="success" icon="globe">
      عام
    </Badge>
  ) : (
    <Badge tone="warn" icon="lock">
      مقيّد
    </Badge>
  )
}
