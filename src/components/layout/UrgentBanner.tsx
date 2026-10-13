'use client'

import React, { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useI18n } from '@/lib/i18n/context'
import Link from 'next/link'

export function UrgentBanner() {
  const { t, L, reports, exceptions, slots, courses } = useI18n()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  // 1. Check for active schedule exceptions for today (offset 0)
  const todayExceptions = exceptions.filter((ex) => ex.offset === 0)
  const todayCancelled = todayExceptions.find((ex) => ex.type === 'cancelled')
  const todayRoomChanged = todayExceptions.find((ex) => ex.type === 'room')

  // 2. Check for urgent reports (title containing عاجل / urgent / هام)
  const urgentReport = reports.find(
    (r) =>
      r.title.ar.includes('عاجل') ||
      r.title.ar.includes('هام') ||
      r.title.en.toLowerCase().includes('urgent') ||
      r.title.en.toLowerCase().includes('important')
  )

  let bannerMessage = ''
  let bannerLink = '/schedule'
  let isDanger = true

  if (todayCancelled) {
    const slot = slots.find((s) => s.id === todayCancelled.slotId)
    const course = slot ? courses.find((c) => c.id === slot.courseId) : null
    bannerMessage = `${t('cancelled')}: ${course ? L(course.name) : ''} (${slot?.start || ''}) – ${L(todayCancelled.note)}`
    bannerLink = '/schedule'
    isDanger = true
  } else if (todayRoomChanged) {
    const slot = slots.find((s) => s.id === todayRoomChanged.slotId)
    const course = slot ? courses.find((c) => c.id === slot.courseId) : null
    bannerMessage = `${t('roomChange')}: ${course ? L(course.name) : ''} إلى (${todayRoomChanged.room || ''}) – ${L(todayRoomChanged.note)}`
    bannerLink = '/schedule'
    isDanger = false
  } else if (urgentReport) {
    bannerMessage = `${t('urgentNotice')}: ${L(urgentReport.title)}`
    bannerLink = '/reports'
    isDanger = true
  } else {
    return null
  }

  return (
    <div
      className={`relative z-30 px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold transition-all border-b ${
        isDanger
          ? 'bg-danger/10 border-danger/20 text-danger'
          : 'bg-warn/10 border-warn/20 text-warn-ink'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span
          className={`size-2 rounded-full shrink-0 animate-ping ${
            isDanger ? 'bg-danger' : 'bg-warn'
          }`}
        />
        <Link
          href={bannerLink}
          className="truncate hover:underline flex items-center gap-2"
        >
          <span className="font-bold underline decoration-dotted">
            {isDanger ? '⚠️ ' + t('urgentNotice') : 'ℹ️ ' + t('roomChange')}:
          </span>
          <span className="truncate">{bannerMessage}</span>
        </Link>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity shrink-0"
        title={t('dismiss')}
      >
        <Icon name="x" className="size-4" />
      </button>
    </div>
  )
}
