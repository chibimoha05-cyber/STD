// Telegram Bot Configuration for Academic Platform & Channel Integration

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8720103626:AAExTckkGTQGdJHVgkZ0_GAhv9jkWECJgDA'

export const DEFAULT_ADMIN_IDS = [
  '1669700577', // Main Admin (Owner)
  '1428611723', // Harith (Harth)
]

export function getAdminIds(): string[] {
  const envAdmins = process.env.TELEGRAM_ADMIN_IDS
    ? process.env.TELEGRAM_ADMIN_IDS.split(',').map((id) => id.trim())
    : []
  const combined = new Set([...DEFAULT_ADMIN_IDS, ...envAdmins])
  return Array.from(combined).filter(Boolean)
}

export function isTelegramAdmin(userId: number | string): boolean {
  const strId = String(userId)
  return getAdminIds().includes(strId)
}

export const PLATFORM_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://std-platform.vercel.app'

