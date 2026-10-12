'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n/context'

interface NavItem {
  href: string
  icon: string
  key: 'home' | 'schedule' | 'courses' | 'activities' | 'reports' | 'search' | 'publisher'
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', icon: 'home', key: 'home' },
  { href: '/schedule', icon: 'calendar', key: 'schedule' },
  { href: '/courses', icon: 'book', key: 'courses' },
  { href: '/activities', icon: 'clipboard', key: 'activities' },
  { href: '/reports', icon: 'chart', key: 'reports' },
  { href: '/search', icon: 'search', key: 'search' },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const { lang, setLang, dark, toggleTheme, publisher, setPublisher, showToast, t } = useI18n()

  const active = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const Toggle = ({ full }: { full?: boolean }) => (
    <div className={full ? 'w-full' : ''}>
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
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-surface text-ink shadow-sm'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Icon name={b ? 'shield' : 'globe'} className="size-4" />
            {t(b ? 'publisherMode' : 'visitor')}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-1.5 leading-snug">
        {t('prototypeNote')}
      </p>
    </div>
  )

  const LangBtn = () => (
    <Button
      size="sm"
      icon="globe"
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
    >
      {t('language')}
    </Button>
  )

  const ThemeBtn = ({ label }: { label?: boolean }) => (
    <Button
      size="sm"
      icon={dark ? 'sun' : 'moon'}
      title={t(dark ? 'lightMode' : 'darkMode')}
      className={label ? '' : '!px-2'}
      onClick={toggleTheme}
    >
      {label && t(dark ? 'lightMode' : 'darkMode')}
    </Button>
  )

  return (
    <aside className="hidden lg:flex fixed inset-y-0 start-0 w-68 flex-col bg-surface border-e border-line px-5 py-6 z-30 select-none">
      {/* Brand Header */}
      <Link href="/" className="flex items-center gap-3 px-2 mb-8 text-start">
        <span className="grid place-items-center size-10 rounded-xl bg-brand text-white">
          <Icon name="book" className="size-5" />
        </span>
        <span>
          <span className="block font-semibold leading-tight">{t('appName')}</span>
          <span className="block text-xs text-muted">{t('appSub')}</span>
        </span>
      </Link>

      {/* Navigation Links */}
      <nav className="space-y-1 flex-1">
        {NAV_ITEMS.map((n) => {
          const isAct = active(n.href)
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`w-full flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-medium transition-colors ${
                isAct
                  ? 'bg-brand-soft text-brand'
                  : 'text-muted hover:bg-black/[.04] dark:hover:bg-white/5 hover:text-ink'
              }`}
            >
              <Icon name={n.icon} />
              {t(n.key)}
            </Link>
          )
        })}

        {publisher && (
          <>
            <div className="h-px bg-line my-3" />
            <Link
              href="/publisher"
              className={`w-full flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-medium transition-colors ${
                pathname.startsWith('/publisher')
                  ? 'bg-accent-soft text-accent-ink'
                  : 'text-muted hover:bg-black/[.04] dark:hover:bg-white/5 hover:text-ink'
              }`}
            >
              <Icon name="grid" />
              {t('publisher')}
            </Link>
          </>
        )}
      </nav>

      {/* Footer controls: Mode Toggle, Language, Theme */}
      <div className="space-y-4 pt-4 border-t border-line">
        <Toggle />
        <div className="flex flex-wrap gap-2">
          <LangBtn />
          <ThemeBtn label />
        </div>
      </div>
    </aside>
  )
}
