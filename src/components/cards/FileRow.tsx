'use client'

import React, { useState } from 'react'
import type { FileItem } from '@/lib/data/initialData'
import { FileIcon, kindOf } from '@/components/ui/FileIcon'
import { AccessBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useI18n } from '@/lib/i18n/context'

export function FileRow({
  file,
  isPublisher,
  onPreview,
  onDownload,
}: {
  file: FileItem
  isPublisher?: boolean
  onPreview?: (file: FileItem) => void
  onDownload?: (file: FileItem) => void
}) {
  const { t, lang, publisher, setPreviewFile } = useI18n()
  const canPublish = isPublisher ?? publisher
  const locked = file.access === 'restricted' && !canPublish
  const kind = kindOf(file.name)

  const handlePreview = () => {
    if (locked) return
    if (onPreview) onPreview(file)
    else setPreviewFile(file)
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDownload) {
      onDownload(file)
    } else {
      const a = document.createElement('a')
      a.href = `/api/attachments/${file.id}/download`
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  return (
    <div
      onClick={handlePreview}
      className={`group flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl transition-colors ${
        locked ? '' : 'cursor-pointer hover:bg-subtle'
      }`}
    >
      <FileIcon name={file.name} />

      <div className="min-w-0 flex-1">
        <div
          dir="ltr"
          className={`truncate text-sm font-medium rtl:text-right ${
            locked ? 'text-muted' : 'text-ink group-hover:text-brand'
          }`}
        >
          {file.name}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted mt-0.5">
          <span>{kind[lang]}</span>
          <span className="opacity-50">·</span>
          <span dir="ltr">{file.size}</span>
          {(canPublish || locked) && <AccessBadge access={file.access} />}
        </div>
      </div>

      {locked ? (
        <span
          className="grid place-items-center size-8 rounded-lg bg-chip text-muted"
          title={t('restrictedMsg')}
        >
          <Icon name="lock" className="size-4" />
        </span>
      ) : (
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            icon="eye"
            title={t('preview')}
            className="!px-2"
            onClick={handlePreview}
          />
          <Button
            size="sm"
            variant="ghost"
            icon="download"
            title={t('download')}
            className="!px-2"
            onClick={handleDownload}
          />
        </div>
      )}
    </div>
  )
}

export function FileList({
  files,
  isPublisher,
  onPreview,
  onDownload,
}: {
  files: FileItem[]
  isPublisher?: boolean
  onPreview?: (file: FileItem) => void
  onDownload?: (file: FileItem) => void
}) {
  const { t } = useI18n()
  if (!files.length) {
    return <p className="text-sm text-muted py-2">{t('noFiles')}</p>
  }

  return (
    <div className="space-y-0.5">
      {files.map((f) => (
        <FileRow
          key={f.id}
          file={f}
          isPublisher={isPublisher}
          onPreview={onPreview}
          onDownload={onDownload}
        />
      ))}
    </div>
  )
}

export function FilesDrawer({
  files,
  onPreview,
}: {
  files: FileItem[]
  onPreview?: (f: FileItem) => void
}) {
  const { t, setPreviewFile } = useI18n()
  const [open, setOpen] = useState(false)
  const count = files.length

  if (!count) return <p className="text-xs text-muted mt-4">{t('noFiles')}</p>

  return (
    <div className="mt-4 pt-3 border-t border-line">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 text-start rounded-lg group cursor-pointer"
      >
        <span className="flex -space-x-3 rtl:space-x-reverse">
          {files.slice(0, 3).map((f) => (
            <span
              key={f.id}
              className="rounded-md ring-2 ring-surface bg-surface"
            >
              <FileIcon name={f.name} size="sm" />
            </span>
          ))}
        </span>
        <span className="flex-1 text-[13px] font-medium text-brand group-hover:underline">
          {count === 1 ? `1 ${t('file')}` : t('filesCount', { n: count })}
        </span>
        <Icon
          name="chevR"
          className={`size-4 text-muted transition-transform ${
            open ? 'rotate-90' : 'rtl:-scale-x-100'
          }`}
        />
      </button>

      {open && (
        <div className="mt-2 rise">
          <FileList files={files} onPreview={onPreview || setPreviewFile} />
        </div>
      )}
    </div>
  )
}
