import React, { type ReactNode } from 'react'
import { Icon } from './Icon'

export function Empty({
  icon = 'layers',
  title,
  hint,
  action,
}: {
  icon?: string
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="grid place-items-center size-14 rounded-2xl bg-brand-soft text-brand mb-4">
        <Icon name={icon} className="size-6" />
      </div>
      <p className="font-semibold text-ink text-base">{title}</p>
      {hint && <p className="text-sm text-muted mt-1 max-w-sm leading-relaxed">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
