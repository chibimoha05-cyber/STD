import type { Metadata } from 'next'
import './globals.css'
import { I18nProvider } from '@/lib/i18n/context'
import { AppShell } from '@/components/layout/AppShell'
import { TelegramProvider } from '@/components/telegram/TelegramProvider'

export const metadata: Metadata = {
  title: 'قسم علوم الحاسبات – كلية التربية للعلوم الصرفة',
  description: 'المنصة الأكاديمية لطلبة قسم علوم الحاسبات: جداول المحاضرات، المواد والملازم، الامتحانات والواجبات، والتقارير الأكاديمية.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1f3d6b" />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const l = localStorage.getItem('app_lang') || 'ar';
                document.documentElement.lang = l;
                document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
                const t = localStorage.getItem('app_theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-paper text-ink transition-colors selection:bg-brand selection:text-white">
        <I18nProvider>
          <TelegramProvider />
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  )
}
