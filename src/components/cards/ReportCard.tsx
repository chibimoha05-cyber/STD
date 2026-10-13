'use client'

import React from 'react'
import type { Report, Course, FileItem } from '@/lib/data/initialData'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CourseTag } from './CourseTag'
import { FilesDrawer } from './FileRow'
import { relPast } from '@/lib/utils/schedule'
import { useI18n } from '@/lib/i18n/context'

function AdminBar({ item }: { item: Report }) {
  const { publisher, t, setEditorTarget, setDeletingItem } = useI18n()
  if (!publisher) return null

  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      <Button
        size="sm"
        variant="ghost"
        icon="edit"
        title={t('edit')}
        className="!px-2"
        onClick={() => setEditorTarget({ kind: 'report', item })}
      />
      <Button
        size="sm"
        variant="ghost"
        icon="trash"
        title={t('delete')}
        className="!px-2 hover:!text-danger"
        onClick={() => setDeletingItem({ kind: 'report', item })}
      />
    </div>
  )
}

export function ReportCard({
  report,
  r,
  course,
  onPreview,
}: {
  report?: Report
  r?: Report
  course?: Course
  onPreview?: (f: FileItem) => void
}) {
  const item = report || r
  const { L, t, lang } = useI18n()
  if (!item) return null

  const catMap = {
    course: ['catCourse', 'book'],
    lab: ['catLab', 'flask'],
    project: ['catProject', 'layers'],
  }[item.category] as ['catCourse' | 'catLab' | 'catProject', string]

  return (
    <Card className="p-5 rise">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge tone="accent" icon={catMap[1]}>
              {t(catMap[0])}
            </Badge>
            <span className="text-xs text-muted">{relPast(lang, item.date)}</span>
          </div>

          <h3 className="font-semibold leading-snug">{L(item.title)}</h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <CourseTag id={item.courseId} course={course} />
            <span className="text-xs text-muted">
              {t('by')}: {L(item.author)}
            </span>
          </div>
        </div>

        <AdminBar item={item} />
      </div>

      <FilesDrawer files={item.files} onPreview={onPreview} />
    </Card>
  )
}
