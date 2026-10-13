'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { type ResourceType } from '@/lib/data/initialData'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty } from '@/components/ui/Empty'
import { Icon } from '@/components/ui/Icon'
import { Segmented } from '@/components/ui/Segmented'
import { ResourceCard } from '@/components/cards/ResourceCard'
import { ActivityCard } from '@/components/cards/ActivityCard'
import { useI18n } from '@/lib/i18n/context'

const RTYPES: ResourceType[] = ['notes', 'summary', 'source', 'prep', 'pastExam', 'other']

export default function CourseDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const { t, L, publisher, setEditorTarget, courses, resources, activities } = useI18n()
  const [tab, setTab] = useState<'overview' | ResourceType | 'activities'>('overview')

  const c = courses.find((course) => course.id === id)

  if (!c) {
    return (
      <div className="py-12">
        <Empty
          icon="book"
          title="المادة غير موجودة"
          hint="تعذر العثور على المادة الدراسية المطلوبة."
          action={
            <Link href="/courses">
              <Button variant="primary">العودة للمواد</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const res = resources.filter((r) => r.courseId === id)
  const acts = activities.filter((a) => a.courseId === id).sort((a, b) => a.due - b.due)
  const shown = tab === 'overview' ? res : res.filter((r) => r.type === tab)

  return (
    <div>
      <Link
        href="/courses"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-4"
      >
        <Icon name="chevL" flip className="size-4" />
        {t('courses')}
      </Link>

      <div
        className="rounded-3xl p-6 sm:p-8 mb-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)` }}
      >
        <div className="absolute -end-10 -top-10 size-48 rounded-full bg-white/10" />
        <span dir="ltr" className="text-sm font-semibold text-white/80">
          {c.code}
        </span>
        <h1 className="text-2xl sm:text-3xl font-semibold mt-1">{L(c.name)}</h1>
        <p className="text-white/80 mt-2 max-w-2xl leading-relaxed">{L(c.desc)}</p>
        <div className="flex flex-wrap gap-6 mt-5 text-sm">
          <div>
            <div className="text-white/60 text-xs">{t('instructor')}</div>
            {L(c.instructor)}
          </div>
          <div>
            <div className="text-white/60 text-xs">{t('credits')}</div>
            {c.credits}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <Segmented
          value={tab}
          onChange={(v) => setTab(v as 'overview' | ResourceType | 'activities')}
          options={[
            { value: 'overview', label: t('all'), count: res.length },
            ...RTYPES.map((r) => ({
              value: r,
              label: t(r),
              count: res.filter((x) => x.type === r).length,
            })),
            { value: 'activities', label: t('activities'), count: acts.length },
          ]}
        />
        {publisher && (
          <Button
            variant="primary"
            size="sm"
            icon="plus"
            onClick={() =>
              setEditorTarget(
                tab === 'activities'
                  ? { kind: 'activity', courseId: id }
                  : { kind: 'resource', courseId: id }
              )
            }
          >
            {t('addHere')}
          </Button>
        )}
      </div>

      {tab === 'activities' ? (
        acts.length ? (
          <div className="grid lg:grid-cols-2 gap-4">
            {acts.map((a) => (
              <ActivityCard key={a.id} a={a} expanded />
            ))}
          </div>
        ) : (
          <Card>
            <Empty icon="clipboard" title={t('emptyTab')} hint={t('emptyTabHint')} />
          </Card>
        )
      ) : shown.length ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {shown.map((r) => (
            <ResourceCard key={r.id} r={r} showCourse={false} />
          ))}
        </div>
      ) : (
        <Card>
          <Empty
            icon="file"
            title={t('emptyTab')}
            hint={t('emptyTabHint')}
            action={
              publisher && (
                <Button
                  variant="primary"
                  size="sm"
                  icon="plus"
                  onClick={() => setEditorTarget({ kind: 'resource', courseId: id })}
                >
                  {t('addContent')}
                </Button>
              )
            }
          />
        </Card>
      )}
    </div>
  )
}
