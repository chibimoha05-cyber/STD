import React from 'react'

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number }[]
}) {
  return (
    <div className="flex gap-1 p-1 bg-sunken rounded-xl overflow-x-auto max-w-full">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`h-8 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
            value === o.value
              ? 'bg-surface text-ink shadow-sm'
              : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="ms-1.5 text-xs opacity-60">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
