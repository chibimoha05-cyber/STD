import React, { type ReactNode } from 'react'
import { Icon } from './Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
export type ButtonSize = 'sm' | 'md'

export interface ButtonProps {
  children?: ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: string
  className?: string
  disabled?: boolean
  title?: string
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  disabled,
  title,
  type = 'button',
}: ButtonProps) {
  const variantStyles = {
    primary: 'bg-brand text-white hover:brightness-110 shadow-sm',
    accent: 'bg-accent text-white hover:brightness-110 shadow-sm',
    secondary:
      'bg-surface text-ink border border-line hover:border-line-strong hover:bg-subtle',
    ghost:
      'text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-ink',
    danger: 'bg-danger text-white hover:brightness-110 shadow-sm',
  }[variant]

  const sizeStyles =
    size === 'sm'
      ? 'h-8 px-3 text-[13px] gap-1.5 rounded-lg'
      : 'h-10 px-4 text-sm gap-2 rounded-xl'

  return (
    <button
      type={type}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap cursor-pointer ${variantStyles} ${sizeStyles} ${className}`}
    >
      {icon && (
        <Icon
          name={icon}
          className={size === 'sm' ? 'size-4' : 'size-[18px]'}
          flip={icon.startsWith('chev')}
        />
      )}
      {children}
    </button>
  )
}
