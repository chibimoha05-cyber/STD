'use client'

import React from 'react'
import type { Resource } from '@/lib/data/initialData'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CourseTag } from './CourseTag'
import { FilesDrawer } from './FileRow'
import { relPast } from '@/lib/utils/schedule'
import { useI18n } from '@/lib/i18n/context'

function AdminBar({ item }: { item: Resource }) {
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
        onClick={() => setEditorTarget({ kind: 'resource', item })}
      />
      <Button
        size="sm"
        variant="ghost"
        icon="trash"
        title={t('delete')}
        className="!px-2 hover:!text-danger"
        onClick={() => setDeletingItem({ kind: 'resource', item })}
      />
    </div>
  )
}

export function ResourceCard({
  resource,
  r,
  showCourse = true,
}: {
  resource?: Resource
  r?: Resource
  showCourse?: boolean
}) {
  const item = resource || r
  const { L, t, lang } = useI18n()
  if (!item) return null

  return (
    <Card className="p-5 rise">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge tone="brand">{t(item.type)}</Badge>
            <span className="text-xs text-muted">{relPast(lang, item.date)}</span>
          </div>
          <h3 className="font-semibold leading-snug">{L(item.title)}</h3>
          {showCourse && (
            <div className="mt-1.5">
              <CourseTag id={item.courseId} />
            </div>
          )}
        </div>
        <AdminBar item={item} />
      </div>

      <FilesDrawer files={item.files} />
    </Card>
  )
}
