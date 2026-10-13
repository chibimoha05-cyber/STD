'use client'

import React, { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Empty } from '@/components/ui/Empty'
import { Icon } from '@/components/ui/Icon'
import { fmtDate } from '@/lib/utils/schedule'
import { useI18n } from '@/lib/i18n/context'

type PublisherTab =
  | 'overview'
  | 'schedule'
  | 'courses'
  | 'resources'
  | 'reports'
  | 'activities'

const WEEKDAYS = [
  { value: 0, labelKey: 'weekday0' },
  { value: 1, labelKey: 'weekday1' },
  { value: 2, labelKey: 'weekday2' },
  { value: 3, labelKey: 'weekday3' },
  { value: 4, labelKey: 'weekday4' },
] as const

export default function PublisherDashboardPage() {
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

  const [activeTab, setActiveTab] = useState<PublisherTab>('overview')
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all')

  const findCourse = (id: string) => courses.find((c) => c.id === id)

  // Calculate stats
  const allFiles = [...resources, ...activities, ...reports].flatMap((x) => x.files || [])
  const restrictedFilesCount = allFiles.filter((f) => f.access === 'restricted').length
  const activeExceptionsCount = exceptions.filter((e) => e.offset >= 0 && e.offset <= 7).length

  const stats = [
    { label: t('statsCourses'), value: courses.length, icon: 'bookOpen', color: 'text-brand' },
    { label: t('statsWeeklySlots'), value: slots.length, icon: 'calendar', color: 'text-accent' },
    { label: t('statsTotalResources'), value: resources.length, icon: 'files', color: 'text-success' },
    { label: t('statsTotalAnnouncements'), value: reports.length, icon: 'message', color: 'text-warn' },
    { label: t('todayExceptions'), value: activeExceptionsCount, icon: 'alert', color: 'text-danger' },
    { label: t('restrictedFiles'), value: restrictedFilesCount, icon: 'lock', color: 'text-ink' },
  ]


  // Filtered slots for schedule tab
  const filteredSlots = selectedDay === 'all'
    ? slots
    : slots.filter((s) => s.weekday === selectedDay)

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
                if (activeTab === 'schedule') setEditorTarget({ kind: 'slot' })
                else if (activeTab === 'courses') setEditorTarget({ kind: 'course' })
                else if (activeTab === 'reports') setEditorTarget({ kind: 'report' })
                else if (activeTab === 'activities') setEditorTarget({ kind: 'activity' })
                else setEditorTarget({ kind: 'resource' })
              }}
            >
              {activeTab === 'schedule'
                ? t('addSlot')
                : activeTab === 'courses'
                ? t('addCourse')
                : activeTab === 'reports'
                ? t('newContent')
                : activeTab === 'activities'
                ? t('newContent')
                : t('newContent')}
            </Button>
          </div>
        }
      />

      {/* Main Tab Switcher */}
      <div className="overflow-x-auto pb-1">
        <Segmented
          value={activeTab}
          onChange={(v) => setActiveTab(v as PublisherTab)}
          options={[
            { value: 'overview', label: t('overview') },
            { value: 'schedule', label: t('manageSchedule'), count: slots.length },
            { value: 'courses', label: t('manageCourses'), count: courses.length },
            { value: 'resources', label: t('manageMaterials'), count: resources.length },
            { value: 'reports', label: t('manageAnnouncements'), count: reports.length },
            { value: 'activities', label: t('manageActivities'), count: activities.length },
          ]}
        />
      </div>

      {/* ============================================================================== */}
      {/* 1. OVERVIEW TAB */}
      {/* ============================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-muted text-xs font-medium">
                  <Icon name={s.icon} className={`size-4 ${s.color}`} />
                  <span className="truncate">{s.label}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-ink mt-2">
                  {s.value}
                </div>
              </Card>
            ))}
          </div>

          {/* Quick Actions Panel */}
          <Card className="p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Icon name="sparkles" className="size-5 text-accent" />
              <span>{t('quickActions')}</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                onClick={() => setEditorTarget({ kind: 'slot' })}
                className="p-3.5 rounded-xl border border-line bg-surface hover:bg-neutral-subtle text-start transition-all group"
              >
                <div className="size-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Icon name="calendar" className="size-4" />
                </div>
                <div className="text-xs font-bold text-ink">{t('addSlot')}</div>
                <div className="text-[11px] text-muted mt-0.5">جدول الأسبوع</div>
              </button>

              <button
                onClick={() => setEditorTarget({ kind: 'course' })}
                className="p-3.5 rounded-xl border border-line bg-surface hover:bg-neutral-subtle text-start transition-all group"
              >
                <div className="size-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Icon name="bookOpen" className="size-4" />
                </div>
                <div className="text-xs font-bold text-ink">{t('addCourse')}</div>
                <div className="text-[11px] text-muted mt-0.5">مادة أكاديمية</div>
              </button>

              <button
                onClick={() => setEditorTarget({ kind: 'resource' })}
                className="p-3.5 rounded-xl border border-line bg-surface hover:bg-neutral-subtle text-start transition-all group"
              >
                <div className="size-8 rounded-lg bg-success-soft text-success flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Icon name="upload" className="size-4" />
                </div>
                <div className="text-xs font-bold text-ink">رفع ملزمة / مصدر</div>
                <div className="text-[11px] text-muted mt-0.5">ملفات ومحاضرات</div>
              </button>

              <button
                onClick={() => setEditorTarget({ kind: 'report' })}
                className="p-3.5 rounded-xl border border-line bg-surface hover:bg-neutral-subtle text-start transition-all group"
              >
                <div className="size-8 rounded-lg bg-warn-soft text-warn flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Icon name="alert" className="size-4" />
                </div>
                <div className="text-xs font-bold text-ink">نشر بلاغ / تنبيه</div>
                <div className="text-[11px] text-muted mt-0.5">إشعار للطلبة</div>
              </button>

              <button
                onClick={() => setEditorTarget({ kind: 'activity' })}
                className="p-3.5 rounded-xl border border-line bg-surface hover:bg-neutral-subtle text-start transition-all group"
              >
                <div className="size-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Icon name="clock" className="size-4" />
                </div>
                <div className="text-xs font-bold text-ink">إضافة امتحان / واجب</div>
                <div className="text-[11px] text-muted mt-0.5">مواعيد التسليم</div>
              </button>
            </div>
          </Card>

          {/* Active Exceptions List */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Icon name="alert" className="size-5 text-danger" />
                <span>{t('todayExceptions')}</span>
              </h2>
              <Badge tone="neutral">{exceptions.length} استثناء</Badge>
            </div>

            {exceptions.length === 0 ? (
              <p className="text-xs text-muted py-2">لا توجد استثناءات أو تعديلات لحظية نشطة في الوقت الحالي.</p>
            ) : (
              <div className="divide-y divide-line">
                {exceptions.map((ex) => {
                  const slot = slots.find((s) => s.id === ex.slotId)
                  const course = slot ? findCourse(slot.courseId) : null
                  return (
                    <div key={ex.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-ink text-sm flex items-center gap-2">
                          <span>{course ? `${course.code} – ${L(course.name)}` : 'حصة دراسية'}</span>
                          <Badge tone={ex.type === 'cancelled' ? 'danger' : 'warn'}>
                            {t(ex.type)}
                          </Badge>
                        </div>
                        <div className="text-muted mt-0.5">
                          {ex.room && `القاعة: ${ex.room} · `}
                          {ex.start && `${ex.start} - ${ex.end} · `}
                          <span>{L(ex.note)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="trash"
                        className="hover:!text-danger"
                        onClick={() => setDeletingItem({ kind: 'exception', item: ex })}
                      >
                        {t('delete')}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 2. SCHEDULE & HALLS TAB */}
      {/* ============================================================================== */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Day Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedDay('all')}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                  selectedDay === 'all'
                    ? 'border-brand bg-brand text-white font-semibold'
                    : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                {t('all')} ({slots.length})
              </button>
              {WEEKDAYS.map((w) => {
                const count = slots.filter((s) => s.weekday === w.value).length
                return (
                  <button
                    key={w.value}
                    onClick={() => setSelectedDay(w.value)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                      selectedDay === w.value
                        ? 'border-brand bg-brand text-white font-semibold'
                        : 'border-line bg-surface text-muted hover:text-ink'
                    }`}
                  >
                    {t(w.labelKey)} ({count})
                  </button>
                )
              })}
            </div>

            <Button
              size="sm"
              variant="primary"
              icon="plus"
              onClick={() => setEditorTarget({ kind: 'slot' })}
            >
              {t('addSlot')}
            </Button>
          </div>

          {/* Slots Table / Cards */}
          <Card className="overflow-hidden shadow-sm">
            <div className="hidden md:grid grid-cols-[1.2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3.5 bg-subtle border-b border-line text-xs font-semibold text-muted">
              <span>اليوم</span>
              <span>المادة</span>
              <span>القاعة / المختبر</span>
              <span>التوقيت</span>
              <span>النوع</span>
              <span className="w-28 text-end">{t('actions')}</span>
            </div>

            {filteredSlots.length === 0 ? (
              <Empty title={t('noLectures')} hint="لا توجد حصص مجدولة لهذا اليوم." />
            ) : (
              <div className="divide-y divide-line">
                {filteredSlots.map((slot) => {
                  const course = findCourse(slot.courseId)
                  const dayObj = WEEKDAYS.find((w) => w.value === slot.weekday)
                  const slotEx = exceptions.find((e) => e.slotId === slot.id && e.offset === 0)

                  return (
                    <div
                      key={slot.id}
                      className="grid md:grid-cols-[1.2fr_2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-subtle/50 transition-colors"
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

                      <div className="text-sm font-medium text-ink">
                        {slot.room}
                      </div>

                      <div className="text-xs text-muted font-mono">
                        {slot.start} - {slot.end}
                      </div>

                      <div>
                        <Badge tone={slot.kind === 'lab' ? 'accent' : 'neutral'}>
                          {t(slot.kind)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="alert"
                          title="استثناء لحظي / إلغاء لليوم"
                          onClick={() => setEditorTarget({ kind: 'exception', slotId: slot.id })}
                        >
                          استثناء
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="pencil"
                          onClick={() => setEditorTarget({ kind: 'slot', item: slot })}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="trash"
                          className="hover:!text-danger"
                          onClick={() => setDeletingItem({ kind: 'slot', item: slot })}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 3. COURSES MANAGEMENT TAB */}
      {/* ============================================================================== */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">إدارة المواد الأكاديمية، التدريسيين، الساعات، والتفاصيل.</p>
            <Button
              size="sm"
              variant="primary"
              icon="plus"
              onClick={() => setEditorTarget({ kind: 'course' })}
            >
              {t('addCourse')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <Card key={course.id} className="p-5 flex flex-col justify-between border-t-4" style={{ borderTopColor: course.color }}>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-subtle text-muted">
                      {course.code}
                    </span>
                    <Badge tone="neutral">{course.credits} {t('creditsCount')}</Badge>
                  </div>

                  <h3 className="font-bold text-base text-ink mt-2">
                    {L(course.name)}
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    {L(course.instructor)}
                  </p>

                  {course.desc && (
                    <p className="text-xs text-muted/80 mt-2 line-clamp-2">
                      {L(course.desc)}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-line">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="pencil"
                    onClick={() => setEditorTarget({ kind: 'course', item: course })}
                  >
                    {t('edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    className="hover:!text-danger"
                    onClick={() => setDeletingItem({ kind: 'course', item: course })}
                  >
                    {t('delete')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 4. RESOURCES / MATERIALS TAB */}
      {/* ============================================================================== */}
      {activeTab === 'resources' && (
        <Card className="overflow-hidden shadow-sm">
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-4 px-6 py-3.5 bg-subtle border-b border-line text-xs font-semibold text-muted">
            <span>{t('item')}</span>
            <span>{t('course')}</span>
            <span>{t('files')}</span>
            <span>{t('updated')}</span>
            <span className="w-20 text-end">{t('actions')}</span>
          </div>

          {resources.length === 0 ? (
            <Empty title={t('emptyTab')} hint={t('emptyTabHint')} />
          ) : (
            <div className="divide-y divide-line">
              {resources.map((item) => {
                const course = findCourse(item.courseId)
                const files = item.files || []
                const restrictedCount = files.filter((f) => f.access === 'restricted').length

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
                        <Badge tone="neutral">{t(item.type)}</Badge>
                      </div>
                    </div>

                    <div className="text-xs text-muted truncate">
                      {course ? `${course.code} – ${L(course.name)}` : item.courseId}
                    </div>

                    <div className="text-xs text-muted flex items-center gap-1.5">
                      <Icon name="files" className="size-3.5" />
                      <span>{files.length}</span>
                      {restrictedCount > 0 && (
                        <Badge tone="warn" icon="lock">
                          {restrictedCount}
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted">
                      {fmtDate(lang, item.date)}
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="pencil"
                        onClick={() => setEditorTarget({ kind: 'resource', item })}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="trash"
                        className="hover:!text-danger"
                        onClick={() => setDeletingItem({ kind: 'resource', item })}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ============================================================================== */}
      {/* 5. REPORTS / ANNOUNCEMENTS TAB */}
      {/* ============================================================================== */}
      {activeTab === 'reports' && (
        <Card className="overflow-hidden shadow-sm">
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-4 px-6 py-3.5 bg-subtle border-b border-line text-xs font-semibold text-muted">
            <span>{t('item')}</span>
            <span>{t('course')}</span>
            <span>{t('files')}</span>
            <span>{t('updated')}</span>
            <span className="w-20 text-end">{t('actions')}</span>
          </div>

          {reports.length === 0 ? (
            <Empty title={t('emptyTab')} hint={t('emptyTabHint')} />
          ) : (
            <div className="divide-y divide-line">
              {reports.map((item) => {
                const course = findCourse(item.courseId)
                const files = item.files || []

                return (
                  <div
                    key={item.id}
                    className="grid md:grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-6 py-4 hover:bg-subtle/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-ink truncate">
                        {L(item.title)}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge tone="accent">
                          {t(
                            ({ course: 'catCourse', lab: 'catLab', project: 'catProject' } as const)[
                              item.category
                            ] || 'report'
                          )}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-xs text-muted truncate">
                      {course ? `${course.code} – ${L(course.name)}` : item.courseId}
                    </div>

                    <div className="text-xs text-muted flex items-center gap-1.5">
                      <Icon name="files" className="size-3.5" />
                      <span>{files.length}</span>
                    </div>

                    <div className="text-xs text-muted">
                      {fmtDate(lang, item.date)}
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="pencil"
                        onClick={() => setEditorTarget({ kind: 'report', item })}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="trash"
                        className="hover:!text-danger"
                        onClick={() => setDeletingItem({ kind: 'report', item })}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ============================================================================== */}
      {/* 6. ACTIVITIES TAB */}
      {/* ============================================================================== */}
      {activeTab === 'activities' && (
        <Card className="overflow-hidden shadow-sm">
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-4 px-6 py-3.5 bg-subtle border-b border-line text-xs font-semibold text-muted">
            <span>{t('item')}</span>
            <span>{t('course')}</span>
            <span>الموعد</span>
            <span>المكان</span>
            <span className="w-20 text-end">{t('actions')}</span>
          </div>

          {activities.length === 0 ? (
            <Empty title={t('emptyTab')} hint={t('emptyTabHint')} />
          ) : (
            <div className="divide-y divide-line">
              {activities.map((item) => {
                const course = findCourse(item.courseId)

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
                        <Badge tone={item.kind === 'exam' ? 'danger' : 'accent'}>
                          {t(item.kind)}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-xs text-muted truncate">
                      {course ? `${course.code} – ${L(course.name)}` : item.courseId}
                    </div>

                    <div className="text-xs text-muted">
                      {fmtDate(lang, item.due)} · {item.time}
                    </div>

                    <div className="text-xs text-muted truncate">
                      {L(item.place)}
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="pencil"
                        onClick={() => setEditorTarget({ kind: 'activity', item })}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="trash"
                        className="hover:!text-danger"
                        onClick={() => setDeletingItem({ kind: 'activity', item })}
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
