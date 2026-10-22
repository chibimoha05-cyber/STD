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

    // 2. Unregister any service workers to ensure clean live network execution
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            registration.unregister()
          }
        })
        .catch(() => {})
    }
  }, [])

  return null
}
