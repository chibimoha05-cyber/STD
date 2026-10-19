'use client'

import React, { useState, useRef } from 'react'
import type {
  Course,
  Resource,
  Activity,
  Report,
  ResourceType,
  ReportCategory,
  AccessType,
} from '@/lib/data/initialData'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Field } from '@/components/ui/Select'
import { FileIcon } from '@/components/ui/FileIcon'
import { AccessBadge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { useI18n, type SaveItemPayload, type EditorTarget } from '@/lib/i18n/context'
import {
  uploadAttachmentAction,
  recordAttachmentMetadataAction,
} from '@/lib/actions/academic'
import { createClient } from '@/lib/supabase/client'
import { isValidUUID } from '@/lib/utils/uuid'
import { generateSafeStoragePath } from '@/lib/utils/storage'

export type ContentEditorTarget = {
  kind: 'resource' | 'activity' | 'report'
  item?: Resource | Activity | Report
  courseId?: string
}

export type EditableItem = EditorTarget

interface UploadingFile {
  id: string
  name: string
  size: string
  access: AccessType
  status: 'uploading' | 'done' | 'failed'
  progress: number
  rawFile?: File
  errorMessage?: string
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
  target: ContentEditorTarget | null
  courses: Course[]
  onClose: () => void
  onSave: (saved: SaveItemPayload, isNew: boolean) => void
}) {
  const { t, L } = useI18n()
  const existing = target?.item as Resource | Activity | Report | undefined

  const [kind, setKind] = useState<'resource' | 'activity' | 'report'>(
    target?.kind || 'resource'
  )
  const [courseId, setCourseId] = useState(
    target?.courseId || existing?.courseId || courses[0]?.id || 'c1'
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
      status: 'done' as const,
      progress: 100,
    }))
  )

  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!target) return null

  const isNew = !existing

  const uploadSingleFile = async (tempId: string, file: File, access: AccessType) => {
    const safeAccess: 'public' | 'restricted' = access === 'restricted' ? 'restricted' : 'public'
    const targetBucket = safeAccess === 'restricted' ? 'attachments-restricted' : 'attachments-public'
    const storagePath = generateSafeStoragePath(file.name, safeAccess)

    // --------------------------------------------------------------------------
    // Strategy 1: Direct Client-to-Storage Upload (Bypasses Vercel 4.5MB limit)
    // --------------------------------------------------------------------------
    try {
      const supabase = createClient()
      // Proactively ensure active session state before direct upload
      await supabase.auth.getSession().catch(() => null)

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(targetBucket)
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true,
        })

      if (!uploadErr && uploadData) {
        // Record attachment metadata via Server Action
        const recordRes = await recordAttachmentMetadataAction({
          fileName: file.name,
          fileSizeBytes: file.size,
          mimeType: file.type || 'application/octet-stream',
          access: safeAccess,
          storageBucket: targetBucket,
          storagePath,
        })

        if (recordRes.success && recordRes.data) {
          setFiles((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? {
                    id: recordRes.data!.id,
                    name: recordRes.data!.name,
                    size: recordRes.data!.size,
                    access: recordRes.data!.access,
                    status: 'done' as const,
                    progress: 100,
                  }
                : item
            )
          )
          return
        }

        // Direct DB insert fallback via client
        const db = supabase as unknown as {
          from: (table: string) => {
            insert: (data: unknown) => {
              select: (cols: string) => {
                single: () => Promise<{
                  data: { id: string; file_name: string; file_size_bytes: number; access: string } | null
                  error: { message: string } | null
                }>
              }
            }
          }
        }

        const { data: directDbRow, error: directDbErr } = await db
          .from('attachments')
          .insert({
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: file.type || 'application/octet-stream',
            access: safeAccess,
            storage_bucket: targetBucket,
            storage_path: storagePath,
            version: 1,
          })
          .select('id, file_name, file_size_bytes, access')
          .single()

        if (!directDbErr && directDbRow) {
          setFiles((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? {
                    id: directDbRow.id,
                    name: directDbRow.file_name,
                    size: fmtSize(directDbRow.file_size_bytes),
                    access: directDbRow.access as AccessType,
                    status: 'done' as const,
                    progress: 100,
                  }
                : item
            )
          )
          return
        }
      } else if (uploadErr) {
        console.warn('[Direct Upload] Storage API error:', uploadErr)
      }
    } catch (clientErr) {
      console.warn('[Direct Upload] Attempt failed, falling back to Server Action:', clientErr)
    }

    // --------------------------------------------------------------------------
    // Strategy 2: Server Action Fallback
    // --------------------------------------------------------------------------
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('access', access)

      const res = await uploadAttachmentAction(formData)
      if (res.success && res.data) {
        setFiles((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  id: res.data!.id,
                  name: res.data!.name,
                  size: res.data!.size,
                  access: res.data!.access,
                  status: 'done' as const,
                  progress: 100,
                }
              : item
          )
        )
      } else {
        const errorMsg = res.error || 'فشل في رفع الملف'
        setFiles((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, status: 'failed' as const, progress: 0, errorMessage: errorMsg }
              : item
          )
        )
      }
    } catch (actionErr) {
      const errorMsg = actionErr instanceof Error ? actionErr.message : 'فشل غير متوقع أثناء الرفع'
      setFiles((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? { ...item, status: 'failed' as const, progress: 0, errorMessage: errorMsg }
            : item
        )
      )
    }
  }

  const handleFilesAdded = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const incoming = Array.from(fileList)

    for (let i = 0; i < incoming.length; i++) {
      const f = incoming[i]
      const tempId = `temp_${Date.now()}_${i}`
      const initialItem: UploadingFile = {
        id: tempId,
        name: f.name,
        size: fmtSize(f.size),
        access: 'public',
        status: 'uploading',
        progress: 50,
        rawFile: f,
      }

      setFiles((prev) => [...prev, initialItem])
      await uploadSingleFile(tempId, f, 'public')
    }
  }

  const handleRetry = (fileId: string) => {
    const targetFile = files.find((f) => f.id === fileId)
    if (!targetFile || !targetFile.rawFile) return

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: 'uploading' as const, progress: 40 } : f
      )
    )
    uploadSingleFile(fileId, targetFile.rawFile, targetFile.access)
  }

  const handleToggleAccess = async (fileId: string, currentAccess: AccessType) => {
    const nextAccess: AccessType = currentAccess === 'public' ? 'restricted' : 'public'
    setFiles((prev) =>
      prev.map((x) => (x.id === fileId ? { ...x, access: nextAccess } : x))
    )

    if (isValidUUID(fileId)) {
      try {
        const res = await fetch(`/api/attachments/${fileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access: nextAccess }),
        })
        if (!res.ok) {
          // Revert if API rejected
          setFiles((prev) =>
            prev.map((x) => (x.id === fileId ? { ...x, access: currentAccess } : x))
          )
        }
      } catch {
        setFiles((prev) =>
          prev.map((x) => (x.id === fileId ? { ...x, access: currentAccess } : x))
        )
      }
    }
  }

  const handleRemoveFile = async (fileId: string) => {
    setFiles((prev) => prev.filter((x) => x.id !== fileId))

    if (isValidUUID(fileId)) {
      try {
        await fetch(`/api/attachments/${fileId}`, { method: 'DELETE' })
      } catch {
        // Handled silently
      }
    }
  }

  const handleSave = () => {
    const errs: Record<string, string> = {}
    if (!titleAr.trim()) errs.titleAr = t('required')
    if (!titleEn.trim()) errs.titleEn = t('required')
    if (files.some((f) => f.status !== 'done')) errs.files = t('waitUploads')

    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const doneFiles = files.filter((f) => f.status === 'done')
    const attachmentIds = doneFiles.map((f) => f.id)

    const baseData = {
      id: existing?.id,
      courseId,
      title: { ar: titleAr.trim(), en: titleEn.trim() },
      files: doneFiles.map(({ id, name, size, access }) => ({ id, name, size, access })),
    }

    let payload: SaveItemPayload['item'] = baseData

    if (kind === 'resource') {
      payload = {
        ...baseData,
        type: resourceType,
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
        author: (existing as Report)?.author || { ar: 'الناشر', en: 'Publisher' },
      }
    }

    onSave({ kind, item: payload, attachmentIds }, isNew)
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
          onChange={(v) => isNew && setKind(v as 'resource' | 'activity' | 'report')}
          options={[
            { value: 'resource', label: t('resource') },
            { value: 'activity', label: t('activity') },
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
            label: `${c.code} · ${L(c.name)}`,
          }))}
        />

        {/* Title AR */}
        <Field
          label={t('titleAr')}
          value={titleAr}
          onChange={setTitleAr}
          placeholder="مثال: هياكل البيانات – المحاضرة 1"
          error={errors.titleAr}
        />

        {/* Title EN */}
        <Field
          label={t('titleEn')}
          value={titleEn}
          onChange={setTitleEn}
          placeholder="e.g. Data Structures – Lecture 1"
          error={errors.titleEn}
        />

        {/* Resource specific type */}
        {kind === 'resource' && (
          <Select
            label={t('resourceType')}
            value={resourceType}
            onChange={(v) => setResourceType(v as ResourceType)}
            options={resourceTypes.map((r) => ({
              value: r,
              label: t(r),
            }))}
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
              onChange={(v) => setActivityKind(v as 'exam' | 'assignment')}
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
                          {f.errorMessage || t('failed')}
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
                        onClick={() => handleToggleAccess(f.id, f.access)}
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
                    onClick={() => handleRemoveFile(f.id)}
                  />
                </div>

                {f.status === 'uploading' && (
                  <div className="h-1 bg-sunken rounded-full mt-2.5 overflow-hidden">
                    <div
                      className="h-full bg-brand transition-all"
                      style={{ width: `${f.progress}%` }}
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
