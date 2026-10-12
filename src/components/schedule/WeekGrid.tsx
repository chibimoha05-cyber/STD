'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import type { Course, Slot, ScheduleException } from '@/lib/data/initialData'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { getDaySchedule, fmtDate } from '@/lib/utils/schedule'
import { useI18n } from '@/lib/i18n/context'

const HOUR_PX = 60
const START_H = 8
const END_H = 16

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function WeekGrid({
  startOffset,
  courses,
  slots,
  exceptions,
}: {
  startOffset: number
  courses: Course[]
  slots: Slot[]
  exceptions: ScheduleException[]
}) {
  const router = useRouter()
  const { t, lang, L } = useI18n()

  const hours = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i)
  const days = Array.from({ length: 5 }, (_, i) => startOffset + i)
  const course = (id: string) => courses.find((c) => c.id === id)!

  return (
    <Card className="overflow-x-auto">
      <div className="min-w-[720px] p-4">
        {/* Day headers */}
        <div className="grid grid-cols-[56px_repeat(5,1fr)] border-b border-line pb-2 text-center text-xs">
          <div className="text-muted self-end pb-1">
            <Icon name="clock" className="size-4 mx-auto" />
          </div>
          {days.map((o) => (
            <div key={o} className="py-1">
              <div className="text-muted">
                {fmtDate(lang, o, { weekday: 'short' })}
              </div>
              <div
                className={`mt-1 inline-grid place-items-center size-8 rounded-full text-[15px] font-semibold ${
                  o === 0 ? 'bg-brand text-white' : ''
                }`}
              >
                {fmtDate(lang, o, { day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>

        {/* Timetable grid */}
        <div
          className="grid grid-cols-[56px_repeat(5,1fr)] relative"
          style={{ height: (END_H - START_H) * HOUR_PX }}
        >
          {/* Hour markers */}
          <div className="relative">
            {hours.slice(0, -1).map((h) => (
              <div
                key={h}
                dir="ltr"
                className="absolute inset-x-0 text-[11px] text-muted text-center -translate-y-2"
                style={{ top: (h - START_H) * HOUR_PX }}
              >
                {h > START_H && `${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((o) => (
            <div
              key={o}
              className={`relative border-s border-line ${
                o === 0 ? 'bg-brand-soft/30' : ''
              }`}
            >
              {hours.slice(1, -1).map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-line/70"
                  style={{ top: (h - START_H) * HOUR_PX }}
                />
              ))}

              {getDaySchedule(o, slots, exceptions).map((s) => {
                const c = course(s.courseId)
                const ex = s.ex
                const cancelled = ex?.type === 'cancelled'
                const st = ex?.start ?? s.start
                const en = ex?.end ?? s.end
                const top = ((toMin(st) - START_H * 60) / 60) * HOUR_PX
                const h = ((toMin(en) - toMin(st)) / 60) * HOUR_PX

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => router.push(`/courses/${c.id}`)}
                    title={ex ? L(ex.note) : undefined}
                    className={`absolute inset-x-1 rounded-lg px-2 py-1.5 text-start overflow-hidden border-s-[3px] transition-[filter,transform] hover:brightness-95 dark:hover:brightness-125 hover:-translate-y-px cursor-pointer ${
                      cancelled ? 'opacity-55' : ''
                    }`}
                    style={{
                      top: top + 2,
                      height: h - 4,
                      borderColor: c.color,
                      background: `color-mix(in srgb, ${c.color} 16%, var(--color-surface))`,
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        dir="ltr"
                        className={`text-[11px] font-semibold text-muted ${
                          cancelled ? 'line-through' : ''
                        }`}
                      >
                        {st}–{en}
                      </span>
                      {ex && (
                        <Icon
                          name="alert"
                          className={`size-3 ${
                            cancelled ? 'text-danger' : 'text-warn'
                          }`}
                        />
                      )}
                    </div>
                    <div
                      className={`text-[13px] font-semibold leading-tight mt-0.5 text-ink ${
                        cancelled ? 'line-through' : ''
                      }`}
                    >
                      {L(c.name)}
                    </div>
                    {h > 70 && (
                      <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1">
                        <span>{t(s.kind)}</span>
                        <span>·</span>
                        <span
                          dir="ltr"
                          className={
                            ex?.type === 'room' ? 'text-warn font-semibold' : ''
                          }
                        >
                          {ex?.room ?? s.room}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
