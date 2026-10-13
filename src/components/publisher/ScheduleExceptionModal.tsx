'use client'

import React, { useState } from 'react'
import type { Slot, Course, ScheduleException, ExceptionType } from '@/lib/data/initialData'
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export function ScheduleExceptionModal({
  slot,
  course,
  exception,
  onClose,
  onSaved,
}: {
  slot: Slot
  course?: Course
  exception?: ScheduleException
  onClose: () => void
  onSaved: () => void
}) {
  const { t, L, saveException, showToast } = useI18n()

  const todayStr = new Date().toISOString().split('T')[0]

  const [exceptionDate, setExceptionDate] = useState(todayStr)
  const [type, setType] = useState<ExceptionType>(exception?.type || 'cancelled')
  const [newRoom, setNewRoom] = useState(exception?.room || '')
  const [startTime, setStartTime] = useState(exception?.start || slot.start)
  const [endTime, setEndTime] = useState(exception?.end || slot.end)
  const [noteAr, setNoteAr] = useState(exception?.note?.ar || '')
  const [noteEn, setNoteEn] = useState(exception?.note?.en || '')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exceptionDate) {
      setErrorMsg('يرجى تحديد تاريخ الاستثناء')
      return
    }
    if (type === 'room' && !newRoom.trim()) {
      setErrorMsg('يرجى تحديد القاعة البديلة')
      return
    }
    if (type === 'moved' && startTime >= endTime) {
      setErrorMsg('يجب أن يكون وقت الانتهاء بعد وقت البدء')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    const res = await saveException({
      id: exception?.id,
      slotId: slot.id,
      exceptionDate,
      type,
      room: type === 'room' ? newRoom.trim() : undefined,
      startTime: type === 'moved' ? startTime : undefined,
      endTime: type === 'moved' ? endTime : undefined,
      noteAr: noteAr.trim() || (type === 'cancelled' ? 'إلغاء المحاضرة لهذا اليوم' : 'تعديل استثنائي'),
      noteEn: noteEn.trim() || (type === 'cancelled' ? 'Session cancelled for today' : 'Temporary schedule override'),
    })

    setLoading(false)

    if (res.success) {
      showToast(t(exception ? 'saved' : 'published'))
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
      title={t('addException')}
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

        {/* Selected Slot summary card */}
        <div className="p-3.5 rounded-xl border border-line bg-surface/50 text-xs text-muted flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink text-sm">
              {course ? `${course.code} – ${L(course.name)}` : slot.courseId}
            </p>
            <p className="mt-0.5">
              {slot.room} · {slot.start} - {slot.end}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-brand-soft text-brand font-medium">
            {t(slot.kind)}
          </span>
        </div>

        {/* Override Date */}
        <FormField label={t('exceptionDate')}>
          <input
            type="date"
            required
            value={exceptionDate}
            onChange={(e) => setExceptionDate(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
          />
        </FormField>

        {/* Exception Action Type */}
        <FormField label={t('type')}>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType('cancelled')}
              className={`h-11 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                type === 'cancelled'
                  ? 'border-danger bg-danger text-white shadow-sm'
                  : 'border-line bg-surface text-ink hover:bg-neutral-subtle'
              }`}
            >
              <Icon name="x" className="size-3.5" />
              <span>{t('cancelled')}</span>
            </button>
            <button
              type="button"
              onClick={() => setType('room')}
              className={`h-11 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                type === 'room'
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-line bg-surface text-ink hover:bg-neutral-subtle'
              }`}
            >
              <Icon name="mapPin" className="size-3.5" />
              <span>{t('roomChange')}</span>
            </button>
            <button
              type="button"
              onClick={() => setType('moved')}
              className={`h-11 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                type === 'moved'
                  ? 'border-warn bg-warn text-white shadow-sm'
                  : 'border-line bg-surface text-ink hover:bg-neutral-subtle'
              }`}
            >
              <Icon name="clock" className="size-3.5" />
              <span>{t('moved')}</span>
            </button>
          </div>
        </FormField>

        {/* Conditional Room input */}
        {type === 'room' && (
          <FormField label={t('newRoom')}>
            <input
              type="text"
              required
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder="مثال: القاعة الكبرى أو مختبر 2"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {COMMON_ROOMS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNewRoom(r)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    newRoom === r
                      ? 'border-brand bg-brand-soft text-brand font-semibold'
                      : 'border-line bg-card text-muted hover:text-ink'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </FormField>
        )}

        {/* Conditional Time input */}
        {type === 'moved' && (
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
        )}

        {/* Note / Reason */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={`${t('exceptionNote')} (عربي)`}>
            <input
              type="text"
              value={noteAr}
              onChange={(e) => setNoteAr(e.target.value)}
              placeholder="مثال: ظرف طارئ للأستاذ أو أعمال صيانة"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </FormField>
          <FormField label={`${t('exceptionNote')} (English)`}>
            <input
              type="text"
              value={noteEn}
              onChange={(e) => setNoteEn(e.target.value)}
              placeholder="e.g. Instructor emergency or hall maintenance"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </FormField>
        </div>

      </form>
    </Modal>
  )
}
