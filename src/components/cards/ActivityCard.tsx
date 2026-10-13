'use client'

import React from 'react'
import type { Activity, Course, FileItem } from '@/lib/data/initialData'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { CourseTag } from './CourseTag'
import { FilesDrawer } from './FileRow'
import { fmtDate, relFuture } from '@/lib/utils/schedule'
import { useI18n } from '@/lib/i18n/context'

function AdminBar({ item }: { item: Activity }) {
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
        onClick={() => setEditorTarget({ kind: 'activity', item })}
      />
      <Button
        size="sm"
        variant="ghost"
        icon="trash"
        title={t('delete')}
        className="!px-2 hover:!text-danger"
        onClick={() => setDeletingItem({ kind: 'activity', item })}
      />
    </div>
  )
}

export function ActivityCard({
  activity,
  a,
  course,
  expanded = false,
  onPreview,
}: {
  activity?: Activity
  a?: Activity
  course?: Course
  expanded?: boolean
  onPreview?: (f: FileItem) => void
}) {
  const item = activity || a
  const { L, t, lang } = useI18n()
  if (!item) return null

  const urgent = item.due <= 2

  return (
    <Card className="p-5 rise">
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 w-14 rounded-xl text-center py-2 ${
            urgent ? 'bg-accent-soft text-accent-ink' : 'bg-chip text-ink'
          }`}
        >
          <div className="text-xl font-semibold leading-none">
            {fmtDate(lang, item.due, { day: 'numeric' })}
          </div>
          <div className="text-[11px] mt-1">
            {fmtDate(lang, item.due, { month: 'short' })}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge
                tone={item.kind === 'exam' ? 'danger' : 'brand'}
                icon={item.kind === 'exam' ? 'clipboard' : 'edit'}
              >
                {t(item.kind)}
              </Badge>
              <span
                className={`text-xs font-medium ${
                  urgent ? 'text-accent-ink' : 'text-muted'
                }`}
              >
                {relFuture(lang, item.due)}
              </span>
            </div>
            <AdminBar item={item} />
          </div>

          <h3 className="font-semibold leading-snug">{L(item.title)}</h3>

          <div className="mt-1.5">
            <CourseTag id={item.courseId} course={course} />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" className="size-3.5" />
              <span dir="ltr">{item.time}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" className="size-3.5" />
              <span>{L(item.place)}</span>
            </span>
          </div>

          {expanded && item.desc && (
            <p className="text-sm text-muted mt-3 leading-relaxed">
              {L(item.desc)}
            </p>
          )}

          {expanded && item.files && item.files.length > 0 && (
            <FilesDrawer files={item.files} onPreview={onPreview} />
          )}
        </div>
      </div>
    </Card>
  )
}
