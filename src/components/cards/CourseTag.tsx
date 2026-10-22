import React from 'react'
import { initialCourses, type Course } from '@/lib/data/initialData'
import { useI18n } from '@/lib/i18n/context'

export function CourseTag({
  course,
  id,
}: {
  course?: Course
  id?: string
}) {
  const { L, courses } = useI18n()
  const c =
    course ||
    (courses && courses.find((x) => x.id === id)) ||
    initialCourses.find((x) => x.id === id)

  if (!c) return null

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span
        className="size-2 rounded-full shrink-0"
        style={{ background: c.color }}
      />
      <span dir="ltr" className="font-semibold text-ink">
        {c.code}
      </span>
      <span>·</span>
      <span className="truncate">{L(c.name)}</span>
    </span>
  )
}
