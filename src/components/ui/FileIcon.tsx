import React from 'react'

export const ext = (n: string) => (n.includes('.') ? n.split('.').pop()!.toUpperCase() : 'FILE')

export const FILE_KINDS: Record<string, { color: string; ar: string; en: string }> = {
  PDF: { color: '#d64535', ar: 'مستند PDF', en: 'PDF document' },
  PPTX: { color: '#d9722b', ar: 'عرض تقديمي', en: 'Presentation' },
  PPT: { color: '#d9722b', ar: 'عرض تقديمي', en: 'Presentation' },
  DOCX: { color: '#3b78c9', ar: 'مستند Word', en: 'Word document' },
  DOC: { color: '#3b78c9', ar: 'مستند Word', en: 'Word document' },
  XLSX: { color: '#2f8a57', ar: 'جدول بيانات', en: 'Spreadsheet' },
  ZIP: { color: '#7c6aa8', ar: 'ملف مضغوط', en: 'Archive' },
  SQL: { color: '#2c8a7a', ar: 'ملف شيفرة', en: 'Code file' },
}

export const kindOf = (name: string) =>
  FILE_KINDS[ext(name)] ?? { color: '#7a8396', ar: 'ملف', en: 'File' }

export function FileIcon({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const e = ext(name)
  const { color } = kindOf(name)
  const box = size === 'sm' ? 'w-8 h-10' : 'w-10 h-12'

  return (
    <span className={`relative ${box} shrink-0`} aria-hidden>
      <svg viewBox="0 0 40 48" className="absolute inset-0 size-full">
        <path
          d="M4.5 4.5a4 4 0 0 1 4-4h18.5l12.5 12.5v30.5a4 4 0 0 1-4 4h-27a4 4 0 0 1-4-4z"
          fill={color}
          fillOpacity=".14"
          stroke={color}
          strokeOpacity=".4"
        />
        <path d="M27 .5v8.5a4 4 0 0 0 4 4h8.5" fill={color} fillOpacity=".3" />
      </svg>
      <span className="absolute inset-x-0 bottom-1.5 flex justify-center">
        <span
          className="px-1 rounded-[3px] text-[8.5px] font-bold leading-[13px] tracking-wide text-white"
          style={{ background: color }}
        >
          {e.slice(0, 4)}
        </span>
      </span>
    </span>
  )
}
