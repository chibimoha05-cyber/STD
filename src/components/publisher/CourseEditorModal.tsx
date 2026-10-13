'use client'

import React, { useState } from 'react'
import type { Course } from '@/lib/data/initialData'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useI18n } from '@/lib/i18n/context'

const PALETTE = [
  '#1f3d6b',
  '#0d6efd',
  '#198754',
  '#dc3545',
  '#6f42c1',
  '#fd7e14',
  '#20c997',
  '#0dcaf0',
]

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export function CourseEditorModal({
  course,
  onClose,
  onSaved,
}: {
  course?: Course
  onClose: () => void
  onSaved: () => void
}) {
  const { t, saveCourse, showToast } = useI18n()

  const [code, setCode] = useState(course?.code || '')
  const [nameAr, setNameAr] = useState(course?.name?.ar || '')
  const [nameEn, setNameEn] = useState(course?.name?.en || '')
  const [instructorAr, setInstructorAr] = useState(course?.instructor?.ar || '')
  const [instructorEn, setInstructorEn] = useState(course?.instructor?.en || '')
  const [credits, setCredits] = useState(course?.credits || 3)
  const [color, setColor] = useState(course?.color || '#1f3d6b')
  const [descAr, setDescAr] = useState(course?.desc?.ar || '')
  const [descEn, setDescEn] = useState(course?.desc?.en || '')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !nameAr.trim() || !instructorAr.trim()) {
      setErrorMsg('يرجى ملء رمز المادة، اسمها، واسم الأستاذ')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    const res = await saveCourse({
      id: course?.id,
      code: code.trim(),
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim() || nameAr.trim(),
      instructorAr: instructorAr.trim(),
      instructorEn: instructorEn.trim() || instructorAr.trim(),
      credits: Number(credits) || 3,
      color,
      descAr: descAr.trim(),
      descEn: descEn.trim(),
    })

    setLoading(false)

    if (res.success) {
      showToast(t(course ? 'saved' : 'published'))
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
      title={t(course ? 'editCourse' : 'addCourse')}
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

        {/* Code & Credits */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label={t('courseCode')}>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="مثال: CS 201"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </FormField>
          <FormField label={t('creditsCount')}>
            <input
              type="number"
              min={1}
              max={10}
              required
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </FormField>
        </div>

        {/* Course Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={t('courseNameAr')}>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: هياكل البيانات"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </FormField>
          <FormField label={t('courseNameEn')}>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Data Structures"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </FormField>
        </div>

        {/* Instructor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={t('instructorAr')}>
            <input
              type="text"
              required
              value={instructorAr}
              onChange={(e) => setInstructorAr(e.target.value)}
              placeholder="مثال: أ.د. علي حسين"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </FormField>
          <FormField label={t('instructorEn')}>
            <input
              type="text"
              value={instructorEn}
              onChange={(e) => setInstructorEn(e.target.value)}
              placeholder="e.g. Prof. Ali Hussein"
              className="w-full h-11 px-3.5 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand"
            />
          </FormField>
        </div>

        {/* Color Palette */}
        <FormField label={t('courseColor')}>
          <div className="flex items-center gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`size-7 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-125 border-ink' : 'border-transparent hover:scale-110'
                }`}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-8 rounded-lg cursor-pointer bg-transparent border-0 ms-2"
            />
          </div>
        </FormField>

        {/* Descriptions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={`${t('description')} (عربي)`}>
            <textarea
              rows={2}
              value={descAr}
              onChange={(e) => setDescAr(e.target.value)}
              placeholder="وصف مختصر لمفردات المادة..."
              className="w-full p-3 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand resize-none"
            />
          </FormField>
          <FormField label={`${t('description')} (English)`}>
            <textarea
              rows={2}
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              placeholder="Brief course syllabus summary..."
              className="w-full p-3 rounded-xl border border-line bg-surface text-ink text-sm transition-colors focus:outline-2 focus:outline-brand resize-none"
            />
          </FormField>
        </div>

      </form>
    </Modal>
  )
}
