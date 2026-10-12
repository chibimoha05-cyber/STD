'use client'

import React from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n/context'

export function MobileHeader() {
  const { lang, setLang, dark, toggleTheme, publisher, t } = useI18n()

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-line px-4 h-14 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="grid place-items-center size-8 rounded-lg bg-brand text-white shadow-sm">
          <Icon name="book" className="size-4" />
        </span>
        <span className="font-semibold text-ink text-sm sm:text-base">
          {t('appName')}
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {publisher && (
          <span className="text-[11px] font-semibold px-2 h-6 inline-flex items-center rounded-md bg-accent text-white">
            {t('publisherMode')}
          </span>
        )}

        <Button
          size="sm"
          variant="ghost"
          icon={dark ? 'sun' : 'moon'}
          title={t(dark ? 'lightMode' : 'darkMode')}
          className="!px-2"
          onClick={toggleTheme}
        />

        <Link href="/search">
          <Button
            size="sm"
            variant="ghost"
            icon="search"
            title={t('search')}
            className="!px-2"
          />
        </Link>

        <Button
          size="sm"
          variant="ghost"
          className="!px-2 font-semibold text-xs"
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        >
          {lang === 'ar' ? 'EN' : 'ع'}
        </Button>
      </div>
    </header>
  )
}
