export {}

declare global {
  interface TelegramWebApp {
    ready: () => void
    expand: () => void
    close: () => void
    viewportHeight?: number
    isExpanded?: boolean
    initData?: string
    initDataUnsafe?: {
      user?: {
        id: number
        first_name: string
        last_name?: string
        username?: string
        language_code?: string
      }
    }
    colorScheme?: 'light' | 'dark'
    themeParams?: {
      bg_color?: string
      text_color?: string
      hint_color?: string
      link_color?: string
      button_color?: string
      button_text_color?: string
      secondary_bg_color?: string
    }
    setHeaderColor?: (color: string) => void
    setBackgroundColor?: (color: string) => void
    HapticFeedback?: {
      impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
      notificationOccurred: (type: 'error' | 'success' | 'warning') => void
      selectionChanged: () => void
    }
  }

  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

