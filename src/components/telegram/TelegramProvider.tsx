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

    // 2. Register Service Worker for offline support
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silently ignore if not supported or blocked
      })
    }
  }, [])

  return null
}
