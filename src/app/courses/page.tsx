'use client'

import React from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { useI18n } from '@/lib/i18n/context'

export default function CoursesPage() {
  const { t, L, courses, resources } = useI18n()

  return (
    <div>
      <PageHeader title={t('courses')} />

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses.map((c) => (
          <Link key={c.id} href={`/courses/${c.id}`} className="block">
            <Card className="p-5 group rise overflow-hidden relative">
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: c.color }}
              />
              <div className="flex items-center justify-between">
                <span
                  dir="ltr"
                  className="text-xs font-semibold tracking-wide dark:brightness-[1.8]"
                  style={{ color: c.color }}
                >
                  {c.code}
                </span>
                <Icon
                  name="chevR"
                  flip
                  className="size-4 text-muted group-hover:text-ink"
                />
              </div>
              <h3 className="text-lg font-semibold mt-2">{L(c.name)}</h3>
              <p className="text-sm text-muted mt-1 line-clamp-2 leading-relaxed">
                {L(c.desc)}
              </p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-line text-xs text-muted">
                <span>{L(c.instructor)}</span>
                <span>
                  {t('resourcesCount', {
                    n: resources.filter((r) => r.courseId === c.id).length,
                  })}
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
