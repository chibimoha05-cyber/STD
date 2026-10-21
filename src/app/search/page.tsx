'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Empty } from '@/components/ui/Empty'
import { Icon } from '@/components/ui/Icon'
import { useI18n } from '@/lib/i18n/context'

type Hit = {
  id: string
  type: 'course' | 'resource' | 'file' | 'exam' | 'assignment' | 'report'
  title: string
  sub: string
  cid: string
  go: () => void
}

export default function SearchPage() {
  const router = useRouter()
  const { t, L, publisher, setPreviewFile, courses, resources, activities, reports } = useI18n()
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | Hit['type']>('all')
  const [cid, setCid] = useState('')

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

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    const m = (...xs: (string | undefined)[]) =>
      xs.some((x) => x && x.toLowerCase().includes(s))
    const out: Hit[] = []

    courses.forEach((c) => {
      if (m(c.name.ar, c.name.en, c.code)) {
        out.push({
          id: c.id,
          type: 'course',
          title: L(c.name),
          sub: c.code,
          cid: c.id,
          go: () => router.push(`/courses/${c.id}`),
        })
      }
    })

    resources.forEach((r) => {
      if (m(r.title.ar, r.title.en)) {
        out.push({
          id: r.id,
          type: 'resource',
          title: L(r.title),
          sub: t(r.type),
          cid: r.courseId,
          go: () => router.push(`/courses/${r.courseId}`),
        })
      }
      r.files.forEach((f) => {
        if (m(f.name)) {
          out.push({
            id: f.id,
            type: 'file',
            title: f.name,
            sub: L(r.title),
            cid: r.courseId,
            go: () =>
              f.access === 'restricted' && !publisher
                ? router.push(`/courses/${r.courseId}`)
                : setPreviewFile(f),
          })
        }
      })
    })

    activities.forEach((a) => {
      if (m(a.title.ar, a.title.en)) {
        out.push({
          id: a.id,
          type: a.kind,
          title: L(a.title),
          sub: L(a.place),
          cid: a.courseId,
          go: () => router.push('/activities'),
        })
      }
    })

    reports.forEach((r) => {
      if (m(r.title.ar, r.title.en, r.author.ar, r.author.en)) {
        out.push({
          id: r.id,
          type: 'report',
          title: L(r.title),
          sub: L(r.author),
          cid: r.courseId,
          go: () => router.push('/reports'),
        })
      }
    })

    return out
  }, [q, courses, resources, activities, reports, L, t, router, publisher, setPreviewFile])

  const filtered = hits.filter(
    (h) => (type === 'all' || h.type === type) && (!cid || h.cid === cid)
  )

  const typeLabel = (x: Hit['type']) =>
    ({
      course: t('course'),
      resource: t('resource'),
      file: t('file'),
      exam: t('exam'),
      assignment: t('assignment'),
      report: t('report'),
    })[x]

  const icons: Record<Hit['type'], string> = {
    course: 'book',
    resource: 'layers',
    file: 'file',
    exam: 'clipboard',
    assignment: 'edit',
    report: 'chart',
  }

  const examples = L({
    ar: 'الأشجار، SQL، مختبر، pdf',
    en: 'trees, SQL, lab, pdf',
  }).split(/،\s|,\s/)

  return (
    <div>
      <PageHeader title={t('search')} />

      <div className="relative mb-4">
        <Icon
          name="search"
          className="size-5 absolute top-1/2 -translate-y-1/2 start-4 text-muted"
        />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('searchPh')}
          className="w-full h-14 ps-12 pe-12 rounded-2xl border border-line bg-surface text-base shadow-sm focus:outline-2 focus:outline-brand"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            className="absolute top-1/2 -translate-y-1/2 end-4 text-muted hover:text-ink cursor-pointer"
          >
            <Icon name="x" className="size-5" />
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: t('all') },
            ...([
              'course',
              'resource',
              'file',
              'exam',
              'assignment',
              'report',
            ] as const).map((x) => ({
              value: x,
              label: typeLabel(x),
              count: q ? hits.filter((h) => h.type === x).length : undefined,
            })),
          ]}
        />
        <div className="sm:w-56">
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

      {!q.trim() ? (
        <Card>
          <Empty
            icon="search"
            title={t('startSearch')}
            action={
              <div className="flex flex-wrap justify-center gap-2 items-center">
                <span className="text-sm text-muted">{t('tryExamples')}</span>
                {examples.map((e) => (
                  <Button key={e} size="sm" onClick={() => setQ(e)}>
                    {e}
                  </Button>
                ))}
              </div>
            }
          />
        </Card>
      ) : filtered.length ? (
        <>
          <p className="text-sm text-muted mb-3">
            {t('results', { n: filtered.length })}
          </p>
          <Card className="divide-y divide-line">
            {filtered.map((h) => (
              <button
                key={h.type + h.id}
                type="button"
                onClick={h.go}
                className="w-full flex items-center gap-4 text-start px-5 py-4 hover:bg-subtle first:rounded-t-2xl last:rounded-b-2xl cursor-pointer"
              >
                <span className="grid place-items-center size-10 rounded-xl bg-brand-soft text-brand shrink-0">
                  <Icon name={icons[h.type]} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block font-medium truncate"
                    dir={h.type === 'file' ? 'ltr' : undefined}
                    style={h.type === 'file' ? { textAlign: 'start' } : undefined}
                  >
                    {h.title}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted">
                    <Badge>{typeLabel(h.type)}</Badge>
                    {h.type !== 'course' && (
                      <span>{L(course(h.cid).name)}</span>
                    )}
                    <span className="truncate">· {h.sub}</span>
                  </span>
                </span>
                <Icon name="chevR" flip className="size-4 text-muted" />
              </button>
            ))}
          </Card>
        </>
      ) : (
        <Card>
          <Empty
            icon="search"
            title={t('noResults')}
            hint={t('noResultsHint')}
            action={
              (type !== 'all' || cid) && (
                <Button
                  size="sm"
                  onClick={() => {
                    setType('all')
                    setCid('')
                  }}
                >
                  {t('clearFilters')}
                </Button>
              )
            }
          />
        </Card>
      )}
    </div>
  )
}
