import React, { type ReactNode } from 'react'

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-line rounded-2xl ${
        onClick
          ? 'cursor-pointer hover:border-line-strong hover:shadow-[0_4px_20px_-8px_rgba(22,33,58,.15)] transition-all'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
