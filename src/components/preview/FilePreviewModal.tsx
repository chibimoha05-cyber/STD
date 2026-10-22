'use client'

import React, { useState } from 'react'
import type { FileItem } from '@/lib/data/initialData'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FileIcon } from '@/components/ui/FileIcon'
import { AccessBadge } from '@/components/ui/Badge'
import { Empty } from '@/components/ui/Empty'
import { useI18n } from '@/lib/i18n/context'
import { isValidUUID } from '@/lib/utils/uuid'
import { PdfViewer } from '@/components/preview/PdfViewer'

function downloadFileItem(file: FileItem, downloadUrl: string, isReal: boolean) {
  if (!isReal) {
    const content = `[ملف أكاديمي تجريبي: ${file.name}]\n[Demo Academic File: ${file.name}]\n\nالحجم / Size: ${file.size}\nنوع الوصول / Access: ${file.access}\nهذا الملف نموذجي مخصص للمعاينة التجريبية في المنصة.`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.includes('.') ? file.name : `${file.name}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return
  }

  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function FilePreviewBody({
  file,
  previewUrl,
  downloadUrl,
  isReal,
}: {
  file: FileItem
  previewUrl: string
  downloadUrl: string
  isReal: boolean
}) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const isPdf = ext === 'pdf'
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)
  const isVideo = ['mp4', 'webm'].includes(ext)

  const handleDownload = () => {
    downloadFileItem(file, downloadUrl, isReal)
  }

  if (loadError) {
    return (
      <Empty
        icon="alert"
        title={t('previewError')}
        hint={t('previewErrorHint')}
        action={
          <div className="flex items-center gap-2 mt-2">
            <Button
              icon="refresh"
              onClick={() => {
                setLoadError(false)
                setLoading(true)
              }}
            >
              {t('retry')}
            </Button>
            <Button variant="primary" icon="download" onClick={handleDownload}>
              {t('download')}
            </Button>
          </div>
        }
      />
    )
  }

  if (!isReal) {
    return (
      <div className="bg-sunken rounded-2xl p-6 sm:p-10 text-center space-y-4">
        <div className="size-16 rounded-2xl bg-surface border border-line grid place-items-center mx-auto shadow-sm">
          <FileIcon name={file.name} size="lg" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-ink" dir="ltr">
            {file.name}
          </h3>
          <p className="text-sm text-muted">{t('mockFileNotice')}</p>
        </div>
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-surface border border-line text-xs font-mono text-muted">
          <span>{file.size}</span>
          <span>•</span>
          <span>{file.access}</span>
        </div>
        <div className="pt-2">
          <Button variant="primary" icon="download" onClick={handleDownload}>
            {t('download')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[50vh] flex flex-col justify-center">
      {loading && !isPdf && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-[2px] gap-3 z-10 rounded-xl">
          <div className="size-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <p className="text-xs text-muted font-medium">جارٍ تحميل الملف…</p>
        </div>
      )}

      {isPdf ? (
        <PdfViewer
          url={previewUrl}
          fileName={file.name}
          fileSize={file.size}
          access={file.access}
          onOpenExternal={() => window.open(previewUrl, '_blank')}
          onDownload={handleDownload}
        />
      ) : isImage ? (
        <div className="flex items-center justify-center min-h-[50vh] max-h-[72vh] bg-sunken rounded-xl p-3 sm:p-6 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={file.name}
            className="max-h-[68vh] max-w-full rounded-lg object-contain shadow-md"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false)
              setLoadError(true)
            }}
          />
        </div>
      ) : isAudio ? (
        <div className="p-8 bg-sunken rounded-xl text-center space-y-4">
          <div className="size-16 rounded-2xl bg-surface border border-line grid place-items-center mx-auto shadow-sm">
            <FileIcon name={file.name} size="lg" />
          </div>
          <h4 className="font-semibold text-ink" dir="ltr">
            {file.name}
          </h4>
          <audio
            controls
            src={previewUrl}
            className="w-full max-w-md mx-auto"
            onCanPlay={() => setLoading(false)}
            onError={() => {
              setLoading(false)
              setLoadError(true)
            }}
          />
        </div>
      ) : isVideo ? (
        <div className="flex items-center justify-center min-h-[50vh] max-h-[72vh] bg-black rounded-xl p-2 overflow-hidden">
          <video
            controls
            src={previewUrl}
            className="max-h-[68vh] max-w-full rounded-lg"
            onCanPlay={() => setLoading(false)}
            onError={() => {
              setLoading(false)
              setLoadError(true)
            }}
          />
        </div>
      ) : (
        <div className="w-full h-[65vh] sm:h-[75vh] rounded-xl overflow-hidden border border-line bg-surface shadow-inner">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(
              previewUrl
            )}&embedded=true`}
            className="w-full h-full border-0"
            title={file.name}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false)
              setLoadError(true)
            }}
          />
        </div>
      )}
    </div>
  )
}

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

  if (!file) return null

  const canPublish = isPublisher ?? publisher
  const locked = file.access === 'restricted' && !canPublish
  const isReal = isValidUUID(file.id)

  const previewUrl = `/api/attachments/${file.id}/download?preview=true`
  const downloadUrl = `/api/attachments/${file.id}/download`

  const handleDownload = () => {
    downloadFileItem(file, downloadUrl, isReal)
  }

  const handleOpenInNewTab = () => {
    window.open(previewUrl, '_blank')
  }

  return (
    <Modal
      open={!!file}
      size="xl"
      onClose={onClose}
      title={
        <div className="flex items-center gap-3 min-w-0">
          <FileIcon name={file.name} />
          <div className="min-w-0 flex-1">
            <span dir="ltr" className="truncate text-base font-semibold text-ink block">
              {file.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
              <span dir="ltr">{file.size}</span>
              <span>•</span>
              <AccessBadge access={file.access} />
            </div>
          </div>
        </div>
      }
      footer={
        !locked && (
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
              <Button onClick={onClose}>{t('close')}</Button>
            </div>
            <div className="flex items-center gap-2">
              {isReal && (
                <Button
                  variant="secondary"
                  icon="external"
                  onClick={handleOpenInNewTab}
                  title={t('openInNewTab')}
                >
                  <span>{t('openInNewTab')}</span>
                </Button>
              )}
              <Button variant="primary" icon="download" onClick={handleDownload}>
                {t('download')}
              </Button>
            </div>
          </div>
        )
      }
    >
      {locked ? (
        <Empty icon="lock" title={t('restricted')} hint={t('restrictedMsg')} />
      ) : (
        <FilePreviewBody
          key={file.id}
          file={file}
          previewUrl={previewUrl}
          downloadUrl={downloadUrl}
          isReal={isReal}
        />
      )}
    </Modal>
  )
}
