'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n/context'

export function MobileBottomNav() {
  const pathname = usePathname()
  const { lang, setLang, dark, toggleTheme, publisher, logout, t } = useI18n()
  const [moreOpen, setMoreOpen] = useState(false)

  const tabs = [
    { href: '/', icon: 'home', label: t('home') },
    { href: '/schedule', icon: 'calendar', label: t('schedule') },
    { href: '/courses', icon: 'book', label: t('courses') },
    { href: '/activities', icon: 'clipboard', label: `${t('exam')} / ${t('assignment')}` },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const isMoreActive =
    pathname.startsWith('/reports') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/publisher')

  const renderPublisherControl = () => (
    <div className="pt-2 border-t border-line">
      {publisher ? (
        <div className="space-y-1">
          <Link
            href="/publisher"
            onClick={() => setMoreOpen(false)}
            className="w-full flex items-center justify-between h-12 px-3 rounded-xl bg-accent-tint text-accent hover:brightness-110 text-sm font-medium transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon name="edit" className="size-5" />
              <span>{t('publisher')}</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent text-white">
              {lang === 'ar' ? 'نشط' : 'Active'}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false)
              logout()
            }}
            className="w-full flex items-center gap-3 h-11 px-3 rounded-xl text-danger hover:bg-danger-tint text-sm font-medium transition-colors cursor-pointer"
          >
            <Icon name="x" className="size-5" />
            <span>{t('logout')}</span>
          </button>
        </div>
      ) : (
        <Link
          href="/publisher/login"
          onClick={() => setMoreOpen(false)}
          className="w-full flex items-center gap-3 h-12 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium text-muted hover:text-ink transition-colors"
        >
          <Icon name="lock" className="size-5" />
          <span>{t('publisherLogin')}</span>
        </Link>
      )}
    </div>
  )

  return (
    <>
      <nav data-mobile-nav="true" className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line grid grid-cols-5 pb-[env(safe-area-inset-bottom)] select-none shadow-lg">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          const visualClass = active ? 'text-brand font-semibold' : 'text-muted hover:text-ink'

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors ${visualClass}`}
            >
              <Icon name={tab.icon} className="size-5" />
              <span className="truncate max-w-full px-1">{tab.label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors cursor-pointer ${
            isMoreActive ? 'text-brand font-semibold' : 'text-muted hover:text-ink'
          }`}
        >
          <Icon name="grid" className="size-5" />
          <span>{t('more')}</span>
        </button>
      </nav>

      {/* More Options Modal / Bottom Sheet */}
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t('more')} size="sm">
        <div className="space-y-1 mb-6">
          <Link
            href="/reports"
            onClick={() => setMoreOpen(false)}
            className="w-full flex items-center gap-3 h-12 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium text-ink transition-colors"
          >
            <Icon name="chart" className="size-5 text-muted" />
            <span>{t('reports')}</span>
          </Link>

          <Link
            href="/search"
            onClick={() => setMoreOpen(false)}
            className="w-full flex items-center gap-3 h-12 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium text-ink transition-colors"
          >
            <Icon name="search" className="size-5 text-muted" />
            <span>{t('search')}</span>
          </Link>
        </div>

        {/* Global Language & Theme Switcher in Sheet */}
        <div className="pt-4 border-t border-line mb-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{lang === 'ar' ? 'المظهر' : 'Appearance'}</span>
            <div className="flex items-center gap-1 bg-sunken p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  if (dark) toggleTheme()
                }}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  !dark ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {t('lightMode')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!dark) toggleTheme()
                }}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  dark ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {t('darkMode')}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{t('language')}</span>
            <div className="flex items-center gap-1 bg-sunken p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLang('ar')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  lang === 'ar' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                  lang === 'en' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {renderPublisherControl()}

        <div className="mt-6 pt-4 border-t border-line flex justify-end">
          <Button variant="secondary" onClick={() => setMoreOpen(false)}>
            {t('close')}
          </Button>
        </div>
      </Modal>
    </>
  )
}
