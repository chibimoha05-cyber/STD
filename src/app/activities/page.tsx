'use client'

import React, { useState } from 'react'
import { type ActivityKind } from '@/lib/data/initialData'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Empty } from '@/components/ui/Empty'
import { ActivityCard } from '@/components/cards/ActivityCard'
import { useI18n } from '@/lib/i18n/context'

export default function ActivitiesPage() {
  const { t, L, courses, activities } = useI18n()
  const [kind, setKind] = useState<'all' | ActivityKind>('all')
  const [cid, setCid] = useState('')

  const list = activities
    .filter(
      (a) =>
        (kind === 'all' || a.kind === kind) && (!cid || a.courseId === cid)
    )
    .sort((a, b) => a.due - b.due)

  return (
    <div>
      <PageHeader title={t('activities')} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: t('all') },
            { value: 'exam', label: t('exam') },
            { value: 'assignment', label: t('assignment') },
          ]}
        />
        <div className="sm:w-60">
          <Select
            value={cid}
            onChange={setCid}
            options={[
              { value: '', label: t('allCourses') },
              ...courses.map((c) => ({ value: c.id, label: L(c.name) })),
            ]}
          />
        </div>
      </div>

      {list.length ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {list.map((a) => (
            <ActivityCard key={a.id} a={a} expanded />
          ))}
        </div>
      ) : (
        <Card>
          <Empty
            icon="clipboard"
            title={t('noResults')}
            hint={t('noResultsHint')}
          />
        </Card>
      )}
    </div>
  )
}
