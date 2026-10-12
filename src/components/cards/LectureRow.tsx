'use client'

import React from 'react'
import Link from 'next/link'
import type { DaySlot } from '@/lib/utils/schedule'
import type { Course } from '@/lib/data/initialData'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { useI18n } from '@/lib/i18n/context'

export function LectureRow({
  slot,
  s,
  course,
  compact,
}: {
  slot?: DaySlot
  s?: DaySlot
  course: Course
  compact?: boolean
}) {
  const item = slot || s!
  const { L, t } = useI18n()
  const ex = item.ex
  const cancelled = ex?.type === 'cancelled'
  const start = ex?.start ?? item.start
  const end = ex?.end ?? item.end
  const room = ex?.room ?? item.room

  return (
    <Link
      href={`/courses/${course.id}`}
      className={`group flex gap-4 cursor-pointer rounded-2xl border p-4 transition-colors ${
        ex
          ? cancelled
            ? 'border-danger-line bg-danger-tint'
            : 'border-warn-line bg-warn-tint'
          : 'border-line bg-surface hover:border-line-strong'
      }`}
    >
      <div className="w-16 shrink-0 text-center" dir="ltr">
        <div
          className={`text-[15px] font-semibold ${
            cancelled ? 'line-through text-muted' : ''
          }`}
        >
          {start}
        </div>
        <div className="text-xs text-muted">{end}</div>
        {ex?.type === 'moved' && (
          <div className="text-[11px] text-muted line-through mt-0.5">
            {item.start}
          </div>
        )}
      </div>

      <div
        className="w-1 rounded-full shrink-0"
        style={{ background: course.color, opacity: cancelled ? 0.3 : 1 }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={`font-semibold ${
              cancelled ? 'line-through text-muted' : ''
            }`}
          >
            {L(course.name)}
          </h3>
          <Badge tone={item.kind === 'lab' ? 'accent' : 'neutral'}>
            {t(item.kind)}
          </Badge>
          {ex && (
            <Badge tone={cancelled ? 'danger' : 'warn'} icon="alert">
              {t(cancelled ? 'cancelled' : ex.type === 'moved' ? 'moved' : 'roomChange')}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[13px] text-muted">
          <span dir="ltr">{course.code}</span>
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" className="size-3.5" />
            {t('room')}{' '}
            <span
              dir="ltr"
              className={ex?.type === 'room' ? 'font-semibold text-warn' : ''}
            >
              {room}
            </span>
            {ex?.type === 'room' && (
              <span dir="ltr" className="line-through ms-1">
                {item.room}
              </span>
            )}
          </span>
          {!compact && <span>{L(course.instructor)}</span>}
        </div>

        {ex && <p className="text-[13px] mt-2 text-ink/80">{L(ex.note)}</p>}
      </div>

      <Icon
        name="chevR"
        flip
        className="size-5 text-muted self-center opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </Link>
  )
}
