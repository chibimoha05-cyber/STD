'use client'

import React, { useState, useEffect } from 'react'
import {
  initialCourses,
  initialSlots,
  dayFrom,
} from '@/lib/data/initialData'
import { getDaySchedule, fmtDate } from '@/lib/utils/schedule'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty } from '@/components/ui/Empty'
import { LectureRow } from '@/components/cards/LectureRow'
import { WeekGrid } from '@/components/schedule/WeekGrid'
import { useI18n } from '@/lib/i18n/context'

export default function SchedulePage() {
  const { t, lang, exceptions } = useI18n()
  const [view, setView] = useState<'day' | 'week'>('day')
  const [off, setOff] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setView('week')
    }
  }, [])

  const courses = initialCourses
  const slots = initialSlots

  const findCourse = (id: string) => courses.find((c) => c.id === id)!

  const list = getDaySchedule(off, slots, exceptions)
  const strip = Array.from({ length: 7 }, (_, i) => off - 3 + i)
  const weekStart = off - dayFrom(off).getDay()
  const thisWeekStart = -dayFrom(0).getDay()
  const weekCount = Array.from({ length: 5 }, (_, i) =>
    getDaySchedule(weekStart + i, slots, exceptions).length
  ).reduce((a, b) => a + b, 0)
  const atHome = view === 'day' ? off === 0 : weekStart === thisWeekStart

  return (
    <div>
      <PageHeader
        title={t('schedule')}
        actions={
          <>
            {!atHome && (
              <Button size="sm" onClick={() => setOff(0)}>
                {t(view === 'day' ? 'backToday' : 'backThisWeek')}
              </Button>
            )}
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'day', label: t('dayView') },
                { value: 'week', label: t('weekView') },
              ]}
            />
          </>
        }
      />

      {view === 'week' ? (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                icon="chevL"
                title={t('prevWeek')}
                className="!px-2"
                onClick={() => setOff(weekStart - 7)}
              />
              <Button
                size="sm"
                variant="ghost"
                icon="chevR"
                title={t('nextWeek')}
                className="!px-2"
                onClick={() => setOff(weekStart + 7)}
              />
              <h2 className="text-lg font-semibold ms-2">
                {fmtDate(lang, weekStart, { day: 'numeric', month: 'short' })} –{' '}
                {fmtDate(lang, weekStart + 4, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </h2>
            </div>
            <span className="text-sm text-muted">
              {weekStart === thisWeekStart ? t('thisWeek') + ' · ' : ''}
              {t('lecturesCount', { n: weekCount })}
            </span>
          </div>

          <WeekGrid
            startOffset={weekStart}
            courses={courses}
            slots={slots}
            exceptions={exceptions}
          />
        </>
      ) : (
        <>
          <Card className="p-3 mb-6">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                icon="chevL"
                title={t('prevDay')}
                className="!px-2"
                onClick={() => setOff(off - 1)}
              />
              <div className="grid grid-cols-7 gap-1 flex-1">
                {strip.map((o) => {
                  const has = getDaySchedule(o, slots, exceptions)
                  const ex = has.some((s) => s.ex)
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOff(o)}
                      className={`relative rounded-xl py-2 text-center transition-colors cursor-pointer ${
                        o === off
                          ? 'bg-brand text-white'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      } ${Math.abs(o - off) === 3 ? 'hidden sm:block' : ''}`}
                    >
                      <div
                        className={`text-[11px] ${
                          o === off ? 'text-white/70' : 'text-muted'
                        }`}
                      >
                        {fmtDate(lang, o, { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-semibold leading-tight">
                        {fmtDate(lang, o, { day: 'numeric' })}
                      </div>
                      <div className="flex justify-center gap-0.5 h-1.5 mt-0.5">
                        {has.length > 0 && (
                          <span
                            className={`size-1.5 rounded-full ${
                              ex
                                ? 'bg-accent'
                                : o === off
                                ? 'bg-white/70'
                                : 'bg-brand/40'
                            }`}
                          />
                        )}
                      </div>
                      {o === 0 && o !== off && (
                        <span className="absolute top-1 end-1 size-1.5 rounded-full bg-accent" />
                      )}
                    </button>
                  )
                })}
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon="chevR"
                title={t('nextDay')}
                className="!px-2"
                onClick={() => setOff(off + 1)}
              />
            </div>
          </Card>

          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {off === 0
                ? t('today')
                : off === 1
                ? t('tomorrow')
                : fmtDate(lang, off, { weekday: 'long' })}
              <span className="text-muted font-normal ms-2 text-sm">
                {fmtDate(lang, off, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </h2>
          </div>

          {list.length ? (
            <div className="space-y-3">
              {list.map((s) => (
                <LectureRow
                  key={s.id}
                  slot={s}
                  course={findCourse(s.courseId)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <Empty
                icon="calendar"
                title={t('noLectures')}
                hint={t('noLecturesHint')}
              />
            </Card>
          )}
        </>
      )}
    </div>
  )
}
