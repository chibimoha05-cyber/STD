'use client'

import React, { useState } from 'react'
import {
  type ReportCategory,
} from '@/lib/data/initialData'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { Card } from '@/components/ui/Card'
import { Empty } from '@/components/ui/Empty'
import { ReportCard } from '@/components/cards/ReportCard'
import { useI18n } from '@/lib/i18n/context'

export default function ReportsPage() {
  const { t, reports } = useI18n()
  const [cat, setCat] = useState<'all' | ReportCategory>('all')

  const list = reports
    .filter((r) => cat === 'all' || r.category === cat)
    .sort((a, b) => b.date - a.date)

  const count = (c: ReportCategory) => reports.filter((r) => r.category === c).length

  return (
    <div>
      <PageHeader title={t('reports')} />

      <div className="mb-6">
        <Segmented
          value={cat}
          onChange={setCat}
          options={[
            { value: 'all', label: t('all'), count: reports.length },
            { value: 'course', label: t('catCourse'), count: count('course') },
            { value: 'lab', label: t('catLab'), count: count('lab') },
            { value: 'project', label: t('catProject'), count: count('project') },
          ]}
        />
      </div>

      {list.length ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {list.map((r) => (
            <ReportCard key={r.id} r={r} />
          ))}
        </div>
      ) : (
        <Card>
          <Empty icon="chart" title={t('emptyTab')} hint={t('emptyTabHint')} />
        </Card>
      )}
    </div>
  )
}
