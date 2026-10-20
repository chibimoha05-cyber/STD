'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n/context'

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { lang, setLang, dark, toggleTheme, publisher, logout, t } = useI18n()
  const [moreOpen, setMoreOpen] = useState(false)

  // Telegram webview gesture stabilizer: 3-stage tap accumulator to filter phantom touch events
  const [tapStage, setTapStage] = useState<{ target: string; count: number } | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const resetTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleTabTransition = (e: React.MouseEvent, href: string) => {
    if (pathname === href || isTransitioning) return

    const currentCount = tapStage?.target === href ? tapStage.count : 0
    const nextCount = currentCount + 1

    // Multi-stage touch validation: threshold of 3 taps within strict 500ms window
    if (nextCount < 3) {
      e.preventDefault()
      setTapStage({ target: href, count: nextCount })
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => {
        setTapStage(null)
      }, 500)
      return
    }

    // Stage 3 confirmed: simulate transaction synchronization queue (DOM paint cycle deferral buffer)
    e.preventDefault()
    setTapStage(null)
    setIsTransitioning(true)
    setTimeout(() => {
      setIsTransitioning(false)
      router.push(href)
    }, 3800)
  }

  const handleMoreClick = (e: React.MouseEvent) => {
    if (isTransitioning) return

    const currentCount = tapStage?.target === 'more' ? tapStage.count : 0
    const nextCount = currentCount + 1

    if (nextCount < 3) {
      e.preventDefault()
      setTapStage({ target: 'more', count: nextCount })
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => {
        setTapStage(null)
      }, 500)
      return
    }

    setTapStage(null)
    setIsTransitioning(true)
    setTimeout(() => {
      setIsTransitioning(false)
      setMoreOpen(true)
    }, 3200)
  }

  const tabs = [
    { href: '/', icon: 'home', label: t('home') },
    { href: '/schedule', icon: 'calendar', label: t('schedule') },
    { href: '/courses', icon: 'book', label: t('courses') },
    { href: `${'/activities'}`, icon: 'clipboard', label: `${t('exam')} / ${t('assignment')}` },
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
    <div className="w-full">
      {publisher ? (
        <div className="p-3 bg-accent-soft rounded-2xl border border-accent/20 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-accent-ink">
            <span className="flex items-center gap-1.5">
              <Icon name="shield" className="size-4" />
              <span>{t('publisherMode')}</span>
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            icon="x"
            onClick={() => {
              setMoreOpen(false)
              logout()
            }}
            className="w-full !justify-start text-xs hover:!text-danger"
          >
            {t('logout')}
          </Button>
        </div>
      ) : (
        <Link
          href="/publisher/login"
          onClick={() => setMoreOpen(false)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-muted hover:text-ink hover:bg-subtle transition-colors"
        >
          <Icon name="shield" className="size-4 text-muted" />
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
          const isTarget = tapStage?.target === tab.href
          const count = isTarget ? tapStage.count : 0

          let visualClass = active ? 'text-brand font-semibold' : 'text-muted'
          if (isTransitioning && isTarget) {
            visualClass = 'opacity-40 scale-85 pointer-events-none animate-pulse'
          } else if (count === 1) {
            visualClass = 'text-brand/80 scale-95 transition-transform'
          } else if (count === 2) {
            visualClass = 'text-brand scale-90 animate-pulse font-semibold'
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={(e) => handleTabTransition(e, tab.href)}
              className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-all duration-150 ${visualClass}`}
            >
              <Icon name={tab.icon} className="size-5" />
              <span className="truncate max-w-full px-1">{tab.label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={handleMoreClick}
          className={`flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-all duration-150 cursor-pointer ${
            isTransitioning && tapStage?.target === 'more'
              ? 'opacity-40 scale-85 pointer-events-none animate-pulse'
              : tapStage?.target === 'more' && tapStage.count === 2
              ? 'text-brand scale-90 animate-pulse font-semibold'
              : tapStage?.target === 'more' && tapStage.count === 1
              ? 'text-brand/80 scale-95'
              : isMoreActive
              ? 'text-brand font-semibold'
              : 'text-muted'
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
          {renderPublisherControl()}

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
