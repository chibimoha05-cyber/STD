'use client'

import React, { useState } from 'react'
import { initialCourses } from '@/lib/data/initialData'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Empty } from '@/components/ui/Empty'
import { Icon } from '@/components/ui/Icon'
import { fmtDate } from '@/lib/utils/schedule'
import { useI18n } from '@/lib/i18n/context'

export default function PublisherDashboardPage() {
  const {
    t,
    L,
    lang,
    resources,
    activities,
    reports,
    setEditorTarget,
    setDeletingItem,
  } = useI18n()

  const courses = initialCourses
  const [activeTab, setActiveTab] = useState<'resource' | 'activity' | 'report'>('resource')

  const findCourse = (id: string) => courses.find((c) => c.id === id)

  // Calculate stats
  const allFiles = [...resources, ...activities, ...reports].flatMap((x) => x.files || [])
  const publicFilesCount = allFiles.filter((f) => f.access === 'public').length
  const restrictedFilesCount = allFiles.filter((f) => f.access === 'restricted').length
  const totalPostsCount = resources.length + activities.length + reports.length

  const stats = [
    { label: t('totalItems'), value: totalPostsCount, icon: 'layers' },
    { label: t('publicFiles'), value: publicFilesCount, icon: 'globe' },
    { label: t('restrictedFiles'), value: restrictedFilesCount, icon: 'lock' },
  ]

  // Rows for the active tab
  const rows =
    activeTab === 'resource'
      ? resources.map((item) => ({
          kind: 'resource' as const,
          item,
          typeLabel: t(item.type),
        }))
      : activeTab === 'activity'
      ? activities.map((item) => ({
          kind: 'activity' as const,
          item,
          typeLabel: t(item.kind),
        }))
      : reports.map((item) => ({
          kind: 'report' as const,
          item,
          typeLabel: t(
            ({ course: 'catCourse', lab: 'catLab', project: 'catProject' } as const)[
              item.category
            ]
          ),
        }))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Badge tone="accent" icon="shield">
            {t('publisherOnly')}
          </Badge>
        }
        title={t('manage')}
        sub={t('manageSub')}
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setEditorTarget({ kind: activeTab })}
          >
            {t('newContent')}
          </Button>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">
            <div className="flex items-center gap-2 text-muted text-xs sm:text-sm font-medium">
              <Icon name={s.icon} className="size-4" />
              <span>{s.label}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-ink mt-2">
              {s.value}
            </div>
          </Card>
        ))}
      </div>

      {/* Tab Switcher */}
      <div>
        <Segmented
          value={activeTab}
          onChange={(v) => setActiveTab(v as any)}
          options={[
            { value: 'resource', label: t('courses'), count: resources.length },
            { value: 'activity', label: t('activities'), count: activities.length },
            { value: 'report', label: t('reports'), count: reports.length },
          ]}
        />
      </div>

      {/* Content Management Table */}
      <Card className="overflow-hidden shadow-sm">
        <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-4 px-6 py-3.5 bg-subtle border-b border-line text-xs font-semibold text-muted">
          <span>{t('item')}</span>
          <span>{t('course')}</span>
          <span>{t('files')}</span>
          <span>{t('updated')}</span>
          <span className="w-20 text-end">{t('actions')}</span>
        </div>

        {rows.length === 0 ? (
          <Empty title={t('emptyTab')} hint={t('emptyTabHint')} />
        ) : (
          <div className="divide-y divide-line">
            {rows.map(({ kind, item, typeLabel }) => {
              const course = findCourse(item.courseId)
              const files = item.files || []
              const restrictedCount = files.filter(
                (f: any) => f.access === 'restricted'
              ).length
              const dateVal = 'due' in item ? item.due : item.date

              return (
                <div
                  key={item.id}
                  className="grid md:grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-subtle/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-ink truncate">
                      {L(item.title)}
                    </div>
                    <div className="mt-1">
                      <Badge tone="neutral">{typeLabel}</Badge>
                    </div>
                  </div>

                  <div className="text-sm text-muted truncate">
                    {course ? L(course.name) : item.courseId}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="success" icon="globe">
                      {files.length - restrictedCount}
                    </Badge>
                    {restrictedCount > 0 && (
                      <Badge tone="warn" icon="lock">
                        {restrictedCount}
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted">
                    {fmtDate(lang, dateVal, { day: 'numeric', month: 'short' })}
                  </div>

                  <div className="flex items-center gap-1 md:w-20 md:justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="edit"
                      title={t('edit')}
                      className="!px-2"
                      onClick={() => setEditorTarget({ kind, item } as any)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="trash"
                      title={t('delete')}
                      className="!px-2 hover:!text-danger"
                      onClick={() => setDeletingItem({ kind, item } as any)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
