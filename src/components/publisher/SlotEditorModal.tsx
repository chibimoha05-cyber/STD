'use client'

import React, { useState } from 'react'
import type { Course, Slot, SlotKind } from '@/lib/data/initialData'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useI18n } from '@/lib/i18n/context'

const COMMON_ROOMS = [
  'القاعة 1',
  'القاعة 2',
  'القاعة 3',
  'مختبر الحاسوب 1',
  'مختبر الحاسوب 2',
  'قاعة الخوارزمي',
]

const WEEKDAYS = [
  { value: 0, labelKey: 'weekday0' },
  { value: 1, labelKey: 'weekday1' },
  { value: 2, labelKey: 'weekday2' },
  { value: 3, labelKey: 'weekday3' },
  { value: 4, labelKey: 'weekday4' },
] as const

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export function SlotEditorModal({
  slot,
  initialCourseId,
  courses,
  onClose,
  onSaved,
}: {
  slot?: Slot
  initialCourseId?: string
  courses: Course[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t, L, saveSlot, showToast } = useI18n()

  const [courseId, setCourseId] = useState(
    slot?.courseId || initialCourseId || courses[0]?.id || 'c1'
  )
  const [weekday, setWeekday] = useState<number>(slot?.weekday ?? 0)
  const [startTime, setStartTime] = useState(slot?.start || '08:30')
  const [endTime, setEndTime] = useState(slot?.end || '10:30')
  const [room, setRoom] = useState(slot?.room || 'القاعة 1')
  const [kind, setKind] = useState<SlotKind>(slot?.kind || 'lecture')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!room.trim()) {
      setErrorMsg('يرجى تحديد القاعة أو المختبر')
      return
    }
    if (startTime >= endTime) {
      setErrorMsg('يجب أن يكون وقت الانتهاء بعد وقت البدء')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    const res = await saveSlot({
      id: slot?.id,
      courseId,
      weekday,
      startTime,
      endTime,
      room: room.trim(),
      kind,
    })

    setLoading(false)

    if (res.success) {
      showToast(t(slot ? 'saved' : 'published'))
      onSaved()
      onClose()
    } else {
      setErrorMsg(res.error || t('failed'))
    }
  }

  return (
    <Modal
      open={true}
      size="md"
      onClose={onClose}
      title={t(slot ? 'editSlot' : 'addSlot')}
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading}
            icon="check"
          >
            {loading ? t('saving') : t('save')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-danger-soft border border-danger-line text-danger text-sm">
            <Icon name="alert" className="size-4 shrink-0" />
            <p className="leading-snug">{errorMsg}</p>
          </div>
        )}

        {/* Course selection */}
        <FormField label={t('courses')}>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand cursor-pointer"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} – {L(c.name)}
              </option>
            ))}
          </select>
        </FormField>

        {/* Day selection */}
        <FormField label={t('schedule')}>
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className="w-full h-11 px-3 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand cursor-pointer"
          >
            {WEEKDAYS.map((w) => (
              <option key={w.value} value={w.value}>
                {t(w.labelKey)}
              </option>
            ))}
          </select>
        </FormField>

        {/* Session Type (Lecture / Lab) */}
        <FormField label={t('type')}>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind('lecture')}
              className={`h-10 rounded-xl border text-sm font-semibold transition-all ${
                kind === 'lecture'
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-line bg-surface text-ink hover:bg-neutral-subtle'
              }`}
            >
              {t('lecture')} (نظري)
            </button>
            <button
              type="button"
              onClick={() => setKind('lab')}
              className={`h-10 rounded-xl border text-sm font-semibold transition-all ${
                kind === 'lab'
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-line bg-surface text-ink hover:bg-neutral-subtle'
              }`}
            >
              {t('lab')} (عملي)
            </button>
          </div>
        </FormField>

        {/* Time Pickers */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('startTime')}>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </FormField>
          <FormField label={t('endTime')}>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </FormField>
        </div>

        {/* Room / Venue */}
        <FormField label={t('room')}>
          <input
            type="text"
            required
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="مثال: القاعة 3 أو مختبر 1"
            className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand mb-2"
          />
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {COMMON_ROOMS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoom(r)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  room === r
                    ? 'border-brand bg-brand-soft text-brand font-semibold'
                    : 'border-line bg-card text-muted hover:text-ink'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </FormField>
      </form>
    </Modal>
  )
}
