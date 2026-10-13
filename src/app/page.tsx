'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getDaySchedule, fmtDate } from '@/lib/utils/schedule'
import { LectureRow } from '@/components/cards/LectureRow'
import { ActivityCard } from '@/components/cards/ActivityCard'
import { FileList } from '@/components/cards/FileRow'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Empty } from '@/components/ui/Empty'
import { SectionTitle } from '@/components/ui/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { useI18n } from '@/lib/i18n/context'

export default function HomePage() {
  const router = useRouter()
  const { t, lang, L, courses, slots, resources, activities, reports, exceptions } = useI18n()

  const course = (id: string) =>
    courses.find((c) => c.id === id) || {
      id,
      code: id,
      name: { ar: id, en: id },
      instructor: { ar: '', en: '' },
      color: '#1f3d6b',
      credits: 0,
      desc: { ar: '', en: '' },
    }

  const today = getDaySchedule(0, slots, exceptions)
  const todayCourses = new Set(
    today.filter((s) => s.ex?.type !== 'cancelled').map((s) => s.courseId)
  )
  const related = resources
    .filter((r) => todayCourses.has(r.courseId))
    .sort((a, b) => b.date - a.date)
    .slice(0, 4)

  const upcoming = [...activities]
    .filter((a) => a.due >= 0 && a.due <= 14)
    .sort((a, b) => a.due - b.due)
    .slice(0, 3)

  const latest = [
    ...resources.map((r) => ({
      id: r.id,
      title: r.title,
      date: r.date,
      cid: r.courseId,
      label: t(r.type),
    })),
    ...reports.map((r) => ({
      id: r.id,
      title: r.title,
      date: r.date,
      cid: r.courseId,
      label: t('report'),
    })),
  ]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5)

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-accent font-medium">{fmtDate(lang, 0)}</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
          {t('greeting')}
        </h1>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
        <div className="space-y-8 min-w-0">
          <section>
            <SectionTitle
              action={
                <Link href="/schedule">
                  <Button size="sm" variant="ghost">
                    {t('fullSchedule')}
                    <Icon name="chevR" flip className="size-4" />
                  </Button>
                </Link>
              }
            >
              {t('todayLectures')}
            </SectionTitle>
            {today.length ? (
              <div className="space-y-3">
                {today.map((s) => (
                  <LectureRow
                    key={s.id}
                    s={s}
                    course={course(s.courseId)}
                    compact
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
          </section>

          {related.length > 0 && (
            <section>
              <SectionTitle>{t('relatedFiles')}</SectionTitle>
              <Card className="px-5 py-2 divide-y divide-line">
                {related.map((r) => (
                  <div key={r.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{L(r.title)}</span>
                      <Badge tone="brand">{t(r.type)}</Badge>
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {L(course(r.courseId).name)}
                    </div>
                    <FileList files={r.files} />
                  </div>
                ))}
              </Card>
            </section>
          )}
        </div>

        <div className="space-y-8 min-w-0">
          <section>
            <SectionTitle
              action={
                <Link href="/activities">
                  <Button size="sm" variant="ghost">
                    {t('viewAll')}
                  </Button>
                </Link>
              }
            >
              {t('upcoming')}
            </SectionTitle>
            {upcoming.length ? (
              <div className="space-y-3">
                {upcoming.map((a) => (
                  <ActivityCard key={a.id} a={a} />
                ))}
              </div>
            ) : (
              <Card>
                <Empty
                  icon="clipboard"
                  title={t('emptyTab')}
                  hint={t('emptyTabHint')}
                />
              </Card>
            )}
          </section>

          <section>
            <SectionTitle>{t('latest')}</SectionTitle>
            <Card className="divide-y divide-line">
              {latest.length ? (
                latest.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() =>
                      router.push(
                        x.label === t('report')
                          ? '/reports'
                          : `/courses/${x.cid}`
                      )
                    }
                    className="w-full text-start px-5 py-3.5 hover:bg-subtle first:rounded-t-2xl last:rounded-b-2xl cursor-pointer"
                  >
                    <div className="text-sm font-medium leading-snug">
                      {L(x.title)}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                      <span>{x.label}</span>
                      <span>·</span>
                      <span>{L(course(x.cid).name)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <Empty title={t('emptyTab')} hint={t('emptyTabHint')} />
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}
