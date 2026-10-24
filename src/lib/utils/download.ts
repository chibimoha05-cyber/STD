'use client'

import { isValidUUID } from '@/lib/utils/uuid'
import type { FileItem } from '@/lib/data/initialData'

export interface ResolvedFileUrls {
  previewUrl: string
  downloadUrl: string
  isReal: boolean
}

/**
 * Resolves preview and download URLs for any FileItem (real UUID from Supabase or demo/mock).
 */
export function resolveFileUrls(file: { id: string; name: string }): ResolvedFileUrls {
  const isReal = isValidUUID(file.id)

  if (isReal) {
    return {
      previewUrl: `/api/attachments/${file.id}/download?preview=true`,
      downloadUrl: `/api/attachments/${file.id}/download`,
      isReal: true,
    }
  }

  // Demo / Initial files
  const encodedName = encodeURIComponent(file.name)
  return {
    previewUrl: `/api/attachments/demo?name=${encodedName}&preview=true`,
    downloadUrl: `/api/attachments/demo?name=${encodedName}`,
    isReal: false,
  }
}

/**
 * Converts a relative URL to an absolute URL with scheme and origin.
 */
export function getAbsoluteFileUrl(url: string): string {
  if (typeof window === 'undefined') return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
}

/**
 * Opens a URL externally in Telegram Mini App or browser tab.
 */
export function openFileExternal(url: string): void {
  if (typeof window === 'undefined') return
  const absoluteUrl = getAbsoluteFileUrl(url)

  const tg = window.Telegram?.WebApp
  if (tg && typeof tg.openLink === 'function') {
    // In Telegram WebApp: openLink delegates to the device's native browser
    tg.openLink(absoluteUrl, { try_instant_view: false })
    return
  }

  // In standard browser: open new tab
  window.open(absoluteUrl, '_blank', 'noopener,noreferrer')
}

/**
 * Downloads a file item reliably across Telegram WebApp and standard browsers.
 */
export function downloadFileItem(
  file: FileItem | { id: string; name: string },
  customDownloadUrl?: string
): void {
  if (typeof window === 'undefined') return

  const urls = resolveFileUrls(file)
  const targetUrl = customDownloadUrl || urls.downloadUrl
  const absoluteUrl = getAbsoluteFileUrl(targetUrl)

  const tg = window.Telegram?.WebApp

  // In Telegram Mini App: Telegram WebView blocks dynamic <a>.click() downloads.
  // Using openLink delegates the download URL to the device's native browser (Chrome/Safari)
  // which immediately prompts and saves the file to Downloads!
  if (tg && typeof tg.openLink === 'function') {
    tg.openLink(absoluteUrl, { try_instant_view: false })
    return
  }

  // In standard browsers: trigger native browser download
  const a = document.createElement('a')
  a.href = absoluteUrl
  a.download = file.name
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
