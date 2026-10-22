'use client'

import { useEffect } from 'react'

export function TelegramProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Initialize Telegram Mini App SDK
    const initTelegram = () => {
      const tg = window.Telegram?.WebApp
      if (tg) {
        tg.ready()
        tg.expand()

        // Sync header background color if available
        if (typeof tg.setHeaderColor === 'function') {
          tg.setHeaderColor('secondary_bg_color')
        }
      }
    }

    if (window.Telegram?.WebApp) {
      initTelegram()
    } else {
      window.addEventListener('load', initTelegram)
    }

    // 2. Register Service Worker for offline support and precache runtime bundles
    if (
      'serviceWorker' in navigator &&
      (window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1')
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Immediately cache all Next.js static script and stylesheet chunks
          const cacheRuntimeAssets = () => {
            try {
              const urls = [
                ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map(
                  (s) => s.src
                ),
                ...Array.from(
                  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
                ).map((l) => l.href),
              ].filter(
                (u) =>
                  u.includes('/_next/static/') ||
                  u.includes('/icon-') ||
                  u.includes('telegram-web-app.js')
              )

              if (urls.length > 0 && reg.active) {
                reg.active.postMessage({
                  type: 'CACHE_URLS',
                  urls: Array.from(new Set(urls)),
                })
              }
            } catch {}
          }

          if (document.readyState === 'complete') {
            cacheRuntimeAssets()
          } else {
            window.addEventListener('load', cacheRuntimeAssets)
          }
        })
        .catch(() => {
          // Silently ignore if not supported or blocked
        })
    }
  }, [])

  return null
}
