'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Empty } from '@/components/ui/Empty'
import { Icon } from '@/components/ui/Icon'
import { fmtDate } from '@/lib/utils/schedule'
import { useI18n, type EditableItem } from '@/lib/i18n/context'
import { createClient } from '@/lib/supabase/client'

const WEEKDAYS = [
  { value: 0, labelKey: 'weekday0' },
  { value: 1, labelKey: 'weekday1' },
  { value: 2, labelKey: 'weekday2' },
  { value: 3, labelKey: 'weekday3' },
  { value: 4, labelKey: 'weekday4' },
] as const

export default function PublisherDashboardPage() {
  const router = useRouter()
  const {
    t,
    L,
    lang,
    courses,
    slots,
    resources,
    activities,
    reports,
    exceptions,
    logout,
    setEditorTarget,
    setDeletingItem,
  } = useI18n()

  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [activeTab, setActiveTab] = useState<'resource' | 'schedule' | 'activity' | 'report'>('resource')

  // Strict Real Publisher Authentication Guard
  useEffect(() => {
    let mounted = true
    const verifyPublisher = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          if (mounted) {
            router.replace('/publisher/login')
          }
          return
        }

        const { data: publisherData, error: pubError } = await supabase
          .from('publishers')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (pubError || !publisherData) {
          await supabase.auth.signOut()
          if (mounted) {
            router.replace('/publisher/login?error=unauthorized')
          }
          return
        }

        if (mounted) {
          setIsAuthorized(true)
          setAuthChecked(true)
        }
      } catch {
        if (mounted) {
          router.replace('/publisher/login')
        }
      }
    }

    verifyPublisher()
    return () => {
      mounted = false
    }
  }, [router])

  const findCourse = (id: string) => courses.find((c) => c.id === id)

  // Calculate stats (Classic 3-card layout)
  const allFiles = [...resources, ...activities, ...reports].flatMap((x) => x.files || [])
  const publicFilesCount = allFiles.filter((f) => f.access === 'public').length
  const restrictedFilesCount = allFiles.filter((f) => f.access === 'restricted').length
  const totalPostsCount = resources.length + activities.length + reports.length

  const stats = [
    { label: t('totalItems'), value: totalPostsCount, icon: 'layers' },
    { label: t('publicFiles'), value: publicFilesCount, icon: 'globe' },
    { label: t('restrictedFiles'), value: restrictedFilesCount, icon: 'lock' },
  ]

  // Rows for resource, activity, report
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
      : activeTab === 'report'
      ? reports.map((item) => ({
          kind: 'report' as const,
          item,
          typeLabel: t(
            ({ course: 'catCourse', lab: 'catLab', project: 'catProject' } as const)[
              item.category
            ] || 'report'
          ),
        }))
      : []

  if (!authChecked || !isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="size-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <p className="text-sm text-muted">جارٍ التحقق من صلاحيات الناشر…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Classic PageHeader */}
      <PageHeader
        eyebrow={
          <Badge tone="accent" icon="shield">
            {t('publisherOnly')}
          </Badge>
        }
        title={t('manage')}
        sub={t('manageSub')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              icon="x"
              onClick={logout}
              className="hover:!text-danger"
            >
              {t('logout')}
            </Button>
            <Button
              variant="primary"
              icon="plus"
              onClick={() => {
                if (activeTab === 'schedule') {
                  setEditorTarget({ kind: 'slot' })
                } else {
                  setEditorTarget({ kind: activeTab })
                }
              }}
            >
              {activeTab === 'schedule' ? t('addSlot') : t('newContent')}
            </Button>
          </div>
        }
      />

      {/* Classic 3 Statistics Cards */}
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

      {/* Classic Segmented Switcher */}
      <div>
        <Segmented
          value={activeTab}
          onChange={(v) => setActiveTab(v as 'resource' | 'schedule' | 'activity' | 'report')}
          options={[
            { value: 'resource', label: t('courses'), count: resources.length },
            { value: 'schedule', label: t('manageSchedule'), count: slots.length },
            { value: 'activity', label: t('activities'), count: activities.length },
            { value: 'report', label: t('reports'), count: reports.length },
          ]}
        />
      </div>

      {/* ============================================================================== */}
      {/* 1. SCHEDULE & HALLS TAB */}
      {/* ============================================================================== */}
      {activeTab === 'schedule' ? (
        <Card className="overflow-hidden shadow-sm">
          <div className="hidden md:grid grid-cols-[1.2fr_2fr_1.2fr_1fr_auto] gap-4 px-6 py-3.5 bg-subtle border-b border-line text-xs font-semibold text-muted">
            <span>اليوم</span>
            <span>{t('course')}</span>
            <span>{t('room')}</span>
            <span>{t('schedule')}</span>
            <span className="w-28 text-end">{t('actions')}</span>
          </div>

          {slots.length === 0 ? (
            <Empty title={t('noLectures')} hint="لا توجد حصص مجدولة حالياً." />
          ) : (
            <div className="divide-y divide-line">
              {slots.map((slot) => {
                const course = findCourse(slot.courseId)
                const dayObj = WEEKDAYS.find((w) => w.value === slot.weekday)
                const slotEx = exceptions.find((e) => e.slotId === slot.id && e.offset === 0)

                return (
                  <div
                    key={slot.id}
                    className="grid md:grid-cols-[1.2fr_2fr_1.2fr_1fr_auto] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-subtle/50 transition-colors"
                  >
                    <div className="font-semibold text-sm text-ink flex items-center gap-2">
                      <span>{dayObj ? t(dayObj.labelKey) : slot.weekday}</span>
                      {slotEx && (
                        <Badge tone={slotEx.type === 'cancelled' ? 'danger' : 'warn'}>
                          {t(slotEx.type)}
                        </Badge>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-ink truncate">
                        {course ? `${course.code} – ${L(course.name)}` : slot.courseId}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {course ? L(course.instructor) : ''}
                      </div>
                    </div>

                    <div className="text-sm font-medium text-ink flex items-center gap-2">
                      <span>{slot.room}</span>
                      <Badge tone={slot.kind === 'lab' ? 'accent' : 'neutral'}>
                        {t(slot.kind)}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted font-mono">
                      {slot.start} - {slot.end}
                    </div>

                    <div className="flex items-center gap-1 md:w-28 md:justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="alert"
                        title="استثناء لحظي / إلغاء لليوم"
                        className="!px-2 text-xs"
                        onClick={() => setEditorTarget({ kind: 'exception', slotId: slot.id })}
                      >
                        استثناء
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="edit"
                        title={t('edit')}
                        className="!px-2"
                        onClick={() => setEditorTarget({ kind: 'slot', item: slot })}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="trash"
                        title={t('delete')}
                        className="!px-2 hover:!text-danger"
                        onClick={() => setDeletingItem({ kind: 'slot', item: slot })}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      ) : (
        /* ============================================================================== */
        /* 2. CLASSIC CONTENT MANAGEMENT TABLE (RESOURCES, ACTIVITIES, REPORTS) */
        /* ============================================================================== */
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
                  (f) => f.access === 'restricted'
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
                        onClick={() => setEditorTarget({ kind, item })}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="trash"
                        title={t('delete')}
                        className="!px-2 hover:!text-danger"
                        onClick={() => setDeletingItem({ kind, item } as EditableItem)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
