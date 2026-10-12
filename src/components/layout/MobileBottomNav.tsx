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
  const { lang, setLang, dark, toggleTheme, publisher, setPublisher, showToast, t } = useI18n()
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

  const Toggle = () => (
    <div>
      <div className="text-[11px] text-muted mb-1.5 flex items-center gap-1 font-medium">
        <Icon name="eye" className="size-3.5" />
        {t('previewMode')}
      </div>
      <div className="flex p-1 bg-sunken rounded-xl">
        {[false, true].map((b) => (
          <button
            key={String(b)}
            type="button"
            onClick={() => {
              setPublisher(b)
              showToast(b ? t('publisherMode') : t('visitor'))
            }}
            className={`flex-1 h-8 rounded-lg text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              publisher === b
                ? b
                  ? 'bg-accent text-white shadow-sm font-semibold'
                  : 'bg-surface text-ink shadow-sm font-semibold'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Icon name={b ? 'shield' : 'globe'} className="size-4" />
            <span>{t(b ? 'publisherMode' : 'visitor')}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-1.5 leading-snug">
        {t('prototypeNote')}
      </p>
    </div>
  )

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line grid grid-cols-5 pb-[env(safe-area-inset-bottom)] select-none shadow-lg">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors ${
                active ? 'text-brand font-semibold' : 'text-muted'
              }`}
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
            isMoreActive ? 'text-brand font-semibold' : 'text-muted'
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

          {publisher && (
            <Link
              href="/publisher"
              onClick={() => setMoreOpen(false)}
              className="w-full flex items-center gap-3 h-12 px-3 rounded-xl bg-accent-soft text-accent-ink text-sm font-semibold transition-colors"
            >
              <Icon name="grid" className="size-5" />
              <span>{t('publisher')}</span>
              <span className="ms-auto text-[10px] font-semibold px-2 py-0.5 rounded bg-accent text-white">
                {t('publisherMode')}
              </span>
            </Link>
          )}
        </div>

        <div className="pt-4 border-t border-line space-y-4">
          <Toggle />

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon="globe"
              className="flex-1"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            >
              {t('language')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={dark ? 'sun' : 'moon'}
              onClick={toggleTheme}
              className="flex-1"
            >
              {t(dark ? 'lightMode' : 'darkMode')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
