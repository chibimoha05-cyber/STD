'use client'

import React, { useState, useRef, useEffect } from 'react'
import type {
  Course,
  Resource,
  Activity,
  Report,
  ResourceType,
  ReportCategory,
  FileItem,
  AccessType,
} from '@/lib/data/initialData'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Field } from '@/components/ui/Select'
import { FileIcon } from '@/components/ui/FileIcon'
import { AccessBadge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { useI18n } from '@/lib/i18n/context'

export type EditableItem =
  | { kind: 'resource'; item?: Resource }
  | { kind: 'activity'; item?: Activity }
  | { kind: 'report'; item?: Report }

interface UploadingFile {
  id: string
  name: string
  size: string
  access: AccessType
  status: 'uploading' | 'done' | 'failed'
  progress: number
}

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  const kb = bytes / 1024
  if (kb < 1024) return kb.toFixed(0) + ' KB'
  return (kb / 1024).toFixed(1) + ' MB'
}

export function ContentEditorModal({
  target,
  courses,
  onClose,
  onSave,
}: {
  target: EditableItem | null
  courses: Course[]
  onClose: () => void
  onSave: (saved: any, isNew: boolean) => void
}) {
  const { t, L } = useI18n()
  const existing = target?.item

  const [kind, setKind] = useState<'resource' | 'activity' | 'report'>(
    target?.kind || 'resource'
  )
  const [courseId, setCourseId] = useState(
    existing?.courseId || courses[0]?.id || 'c1'
  )
  const [titleAr, setTitleAr] = useState(existing?.title?.ar || '')
  const [titleEn, setTitleEn] = useState(existing?.title?.en || '')
  const [resourceType, setResourceType] = useState<ResourceType>(
    (existing as Resource)?.type || 'notes'
  )
  const [reportCat, setReportCat] = useState<ReportCategory>(
    (existing as Report)?.category || 'course'
  )
  const [activityKind, setActivityKind] = useState<'exam' | 'assignment'>(
    (existing as Activity)?.kind || 'exam'
  )
  const [dueDays, setDueDays] = useState(String((existing as Activity)?.due ?? 3))
  const [dueTime, setDueTime] = useState((existing as Activity)?.time || '10:00')
  const [descAr, setDescAr] = useState((existing as Activity)?.desc?.ar || '')

  const [files, setFiles] = useState<UploadingFile[]>(() =>
    (existing?.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      access: f.access,
      status: 'done',
      progress: 100,
    }))
  )

  const [dragActive, setDragActive] = useState(false)
  const [simulateFail, setSimulateFail] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    return () => timersRef.current.forEach(clearInterval)
  }, [])

  if (!target) return null

  const isNew = !existing

  const simulateUpload = (fileId: string, shouldFail: boolean) => {
    const timer = window.setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id !== fileId || f.status !== 'uploading') return f
          const nextProgress = f.progress + 15 + Math.random() * 20
          if (shouldFail && nextProgress > 50) {
            clearInterval(timer)
            return { ...f, status: 'failed', progress: 50 }
          }
          if (nextProgress >= 100) {
            clearInterval(timer)
            return { ...f, status: 'done', progress: 100 }
          }
          return { ...f, progress: nextProgress }
        })
      )
    }, 180)
    timersRef.current.push(timer)
  }

  const handleFilesAdded = (fileList: FileList | null) => {
    if (!fileList) return
    const newItems: UploadingFile[] = Array.from(fileList).map((f, i) => ({
      id: 'up_' + Date.now() + '_' + i,
      name: f.name,
      size: fmtSize(f.size),
      access: 'public',
      status: 'uploading',
      progress: 0,
    }))

    setFiles((prev) => [...prev, ...newItems])
    newItems.forEach((f, index) => {
      simulateUpload(f.id, simulateFail && index === 0)
    })
    setSimulateFail(false)
  }

  const handleRetry = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: 'uploading', progress: 0 } : f
      )
    )
    simulateUpload(fileId, false)
  }

  const handleSave = () => {
    const errs: Record<string, string> = {}
    if (!titleAr.trim()) errs.titleAr = t('required')
    if (!titleEn.trim()) errs.titleEn = t('required')
    if (files.some((f) => f.status !== 'done')) errs.files = t('waitUploads')

    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const baseData = {
      id: existing?.id || 'n_' + Date.now(),
      courseId,
      title: { ar: titleAr, en: titleEn },
      files: files.map(({ id, name, size, access }) => ({ id, name, size, access })),
    }

    let payload: any = baseData

    if (kind === 'resource') {
      payload = {
        ...baseData,
        type: resourceType,
        date: (existing as Resource)?.date ?? 0,
      }
    } else if (kind === 'activity') {
      payload = {
        ...baseData,
        kind: activityKind,
        due: Number(dueDays) || 0,
        time: dueTime,
        place: (existing as Activity)?.place || { ar: 'تسليم إلكتروني', en: 'Online submission' },
        desc: { ar: descAr, en: (existing as Activity)?.desc?.en || descAr },
      }
    } else {
      payload = {
        ...baseData,
        category: reportCat,
        date: (existing as Report)?.date ?? 0,
        author: (existing as Report)?.author || { ar: 'الناشر', en: 'Publisher' },
      }
    }

    onSave({ kind, item: payload }, isNew)
  }

  const resourceTypes: ResourceType[] = ['notes', 'summary', 'source', 'prep', 'pastExam', 'other']

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={isNew ? t('addContent') : t('editContent')}
      footer={
        <>
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" icon="check" onClick={handleSave}>
            {isNew ? t('publish') : t('save')}
          </Button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Kind Selector (disabled if editing existing) */}
        <Select
          label={t('contentKind')}
          value={kind}
          onChange={(v) => isNew && setKind(v as any)}
          options={[
            { value: 'resource', label: t('resource') },
            { value: 'activity', label: `${t('exam')} / ${t('assignment')}` },
            { value: 'report', label: t('report') },
          ]}
        />

        {/* Course Selector */}
        <Select
          label={t('course')}
          value={courseId}
          onChange={setCourseId}
          options={courses.map((c) => ({
            value: c.id,
            label: `${c.code} — ${L(c.name)}`,
          }))}
        />

        {/* Arabic Title */}
        <Field
          label={t('titleAr')}
          dir="rtl"
          value={titleAr}
          onChange={setTitleAr}
          error={errors.titleAr}
        />

        {/* English Title */}
        <Field
          label={t('titleEn')}
          dir="ltr"
          value={titleEn}
          onChange={setTitleEn}
          error={errors.titleEn}
        />

        {/* Resource specific category */}
        {kind === 'resource' && (
          <Select
            label={t('resourceType')}
            value={resourceType}
            onChange={(v) => setResourceType(v as ResourceType)}
            options={resourceTypes.map((r) => ({ value: r, label: t(r) }))}
          />
        )}

        {/* Report specific category */}
        {kind === 'report' && (
          <Select
            label={t('category')}
            value={reportCat}
            onChange={(v) => setReportCat(v as ReportCategory)}
            options={[
              { value: 'course', label: t('catCourse') },
              { value: 'lab', label: t('catLab') },
              { value: 'project', label: t('catProject') },
            ]}
          />
        )}

        {/* Activity specific fields */}
        {kind === 'activity' && (
          <>
            <Select
              label={t('type')}
              value={activityKind}
              onChange={(v) => setActivityKind(v as any)}
              options={[
                { value: 'exam', label: t('exam') },
                { value: 'assignment', label: t('assignment') },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={t('dueDate')}
                type="number"
                value={dueDays}
                onChange={setDueDays}
              />
              <Field
                label={t('time')}
                type="time"
                value={dueTime}
                onChange={setDueTime}
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                textarea
                label={t('description')}
                value={descAr}
                onChange={setDescAr}
              />
            </div>
          </>
        )}
      </div>

      {/* Attachments Section */}
      <div className="mt-6 pt-5 border-t border-line">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-ink">
            {t('attachments')}
          </span>
          <label className="inline-flex items-center gap-2 text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={simulateFail}
              onChange={(e) => setSimulateFail(e.target.checked)}
              className="accent-danger"
            />
            <span>{t('simulateFail')}</span>
          </label>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            handleFilesAdded(e.dataTransfer.files)
          }}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            dragActive
              ? 'border-brand bg-brand-soft/40'
              : errors.files
              ? 'border-danger-line bg-danger-soft/20'
              : 'border-line hover:border-line-strong bg-subtle'
          }`}
        >
          <Icon name="upload" className="size-6 mx-auto text-brand" />
          <p className="text-sm font-semibold text-ink mt-2">
            {t('dropFiles')}
          </p>
          <p className="text-xs text-muted mt-1">{t('multiHint')}</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              handleFilesAdded(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {errors.files && (
          <p className="text-xs text-danger mt-2 font-medium">{errors.files}</p>
        )}

        {/* File items list */}
        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((f) => (
              <div
                key={f.id}
                className={`rounded-xl border p-3 ${
                  f.status === 'failed'
                    ? 'border-danger-line bg-danger-tint'
                    : 'border-line bg-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileIcon name={f.name} size="sm" />

                  <div className="min-w-0 flex-1">
                    <div
                      dir="ltr"
                      className="text-sm font-semibold truncate text-start rtl:text-right text-ink"
                    >
                      {f.name}
                    </div>
                    <div className="text-xs mt-0.5 flex items-center gap-2">
                      <span dir="ltr" className="text-muted">
                        {f.size}
                      </span>
                      {f.status === 'uploading' && (
                        <span className="text-brand font-medium">
                          {t('uploading')} {Math.round(f.progress)}%
                        </span>
                      )}
                      {f.status === 'done' && (
                        <span className="text-success font-medium inline-flex items-center gap-1">
                          <Icon name="check" className="size-3.5" />
                          {t('uploaded')}
                        </span>
                      )}
                      {f.status === 'failed' && (
                        <span className="text-danger font-medium inline-flex items-center gap-1">
                          <Icon name="alert" className="size-3.5" />
                          {t('failed')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Access Switch: Public vs Restricted */}
                  {f.status === 'done' && (
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline text-xs text-muted">
                        {t('access')}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((prev) =>
                            prev.map((x) =>
                              x.id === f.id
                                ? {
                                    ...x,
                                    access:
                                      x.access === 'public'
                                        ? 'restricted'
                                        : 'public',
                                  }
                                : x
                            )
                          )
                        }
                        title={t('access')}
                        className="cursor-pointer"
                      >
                        <AccessBadge access={f.access} />
                      </button>
                    </div>
                  )}

                  {f.status === 'failed' && (
                    <Button
                      size="sm"
                      icon="refresh"
                      onClick={() => handleRetry(f.id)}
                    >
                      {t('retry')}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    icon="x"
                    title={t('remove')}
                    className="!px-2"
                    onClick={() =>
                      setFiles((prev) => prev.filter((x) => x.id !== f.id))
                    }
                  />
                </div>

                {f.status === 'uploading' && (
                  <div className="h-1 bg-sunken rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="h-full bg-brand transition-all"
                      style={{ width: f.progress + '%' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
