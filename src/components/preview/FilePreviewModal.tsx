'use client'

import React, { useState, useEffect } from 'react'
import type { FileItem } from '@/lib/data/initialData'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FileIcon } from '@/components/ui/FileIcon'
import { Empty } from '@/components/ui/Empty'
import { Skeleton } from '@/components/ui/Skeleton'
import { useI18n } from '@/lib/i18n/context'

export function FilePreviewModal({
  file,
  onClose,
  isPublisher,
}: {
  file: FileItem | null
  onClose: () => void
  isPublisher?: boolean
}) {
  const { t, publisher } = useI18n()
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  const canPublish = isPublisher ?? publisher
  const locked = file ? file.access === 'restricted' && !canPublish : false

  useEffect(() => {
    if (!file) return
    setState('loading')
    const h = setTimeout(
      () => setState(file.broken && attempt === 0 ? 'error' : 'ok'),
      700
    )
    return () => clearTimeout(h)
  }, [file, attempt])

  if (!file) return null

  const handleDownload = () => {
    window.location.href = `/api/attachments/${file.id}/download`
  }

  return (
    <Modal
      open={!!file}
      size="lg"
      onClose={onClose}
      title={
        <span className="flex items-center gap-3">
          <FileIcon name={file.name} />
          <span dir="ltr" className="truncate text-base">
            {file.name}
          </span>
        </span>
      }
      footer={
        !locked &&
        state === 'ok' && (
          <>
            <Button onClick={onClose}>{t('close')}</Button>
            <Button variant="primary" icon="download" onClick={handleDownload}>
              {t('download')}
            </Button>
          </>
        )
      }
    >
      {locked ? (
        <Empty icon="lock" title={t('restricted')} hint={t('restrictedMsg')} />
      ) : state === 'loading' ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : state === 'error' ? (
        <Empty
          icon="alert"
          title={t('previewError')}
          hint={t('previewErrorHint')}
          action={
            <Button icon="refresh" onClick={() => setAttempt(attempt + 1)}>
              {t('retry')}
            </Button>
          }
        />
      ) : (
        <div className="bg-sunken rounded-xl p-4 sm:p-8">
          <div
            dir="ltr"
            className="bg-surface rounded-lg shadow-sm max-w-md mx-auto aspect-[1/1.3] p-8 text-left"
          >
            <div className="h-3 w-2/3 bg-ink/80 rounded mb-6" />
            {[100, 92, 96, 70, 0, 88, 94, 60, 0, 98, 85].map((w, i) => (
              <div
                key={i}
                className="h-2 bg-line rounded mb-2.5"
                style={{ width: w + '%', opacity: w ? 1 : 0 }}
              />
            ))}
            <div className="h-20 rounded bg-brand-soft mt-4" />
          </div>
          <p className="text-center text-xs text-muted mt-4">
            {t('page')} 1 / 12 · <span dir="ltr">{file.size}</span>
          </p>
        </div>
      )}
    </Modal>
  )
}
