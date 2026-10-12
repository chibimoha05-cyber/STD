import React from 'react'

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  label?: string
}) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Field({
  label,
  value,
  onChange,
  dir,
  error,
  type = 'text',
  textarea,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  dir?: 'rtl' | 'ltr'
  error?: string
  type?: string
  textarea?: boolean
  placeholder?: string
}) {
  const common =
    'w-full px-3.5 rounded-xl border bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand'
  const border = error ? 'border-danger-line' : 'border-line'

  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      {textarea ? (
        <textarea
          dir={dir}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${common} ${border} py-2.5 resize-none`}
        />
      ) : (
        <input
          dir={dir}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${common} ${border} h-11`}
        />
      )}
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  )
}
