'use server'

import { verifyPublisherAuth } from '@/lib/actions/attachments'
import { isValidUUID } from '@/lib/utils/uuid'
import { generateSafeStoragePath } from '@/lib/utils/storage'
import type {
  ResourceType,
  ActivityKind,
  ReportCategory,
  ExceptionType,
  Course,
  Activity,
  Resource,
  ScheduleException,
} from '@/lib/data/initialData'
import {
  formatActivityNotification,
  formatResourceNotification,
  formatScheduleExceptionNotification,
  sendChannelBroadcast,
} from '@/lib/telegram/bot'
import { fetchCourses, fetchSlots } from '@/lib/data/academic'

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ==============================================================================
// 1. RESOURCE ACTIONS
// ==============================================================================

export interface SaveResourceInput {
  id?: string
  courseId: string
  type: ResourceType
  titleAr: string
  titleEn: string
  attachmentIds?: string[]
}

export async function saveResourceAction(
  input: SaveResourceInput
): Promise<ActionResult<{ id: string }>> {
  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { courseId, type, titleAr, titleEn, attachmentIds } = input
  if (!courseId || !type || !titleAr?.trim() || !titleEn?.trim()) {
    return { success: false, error: 'Validation failed: Required fields missing.' }
  }

  // Cast client to handle Postgrest generic schema methods
  const db = auth.supabase as unknown as {
    from: (table: string) => {
      insert: (data: unknown) => {
        select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> }
      }
      update: (data: unknown) => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
        in: (col: string, vals: unknown[]) => Promise<{ error: { message: string } | null }>
      }
      delete: () => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
      }
    }
  }

  let resourceId = input.id

  if (resourceId && isValidUUID(resourceId)) {
    const { error: updateError } = await db
      .from('resources')
      .update({
        course_id: courseId,
        type,
        title_ar: titleAr.trim(),
        title_en: titleEn.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', resourceId)

    if (updateError) {
      return { success: false, error: `Failed to update resource: ${updateError.message}` }
    }
  } else {
    const { data: newRow, error: insertError } = await db
      .from('resources')
      .insert({
        course_id: courseId,
        type,
        title_ar: titleAr.trim(),
        title_en: titleEn.trim(),
      })
      .select('id')
      .single()

    if (insertError || !newRow) {
      return { success: false, error: `Failed to create resource: ${insertError?.message}` }
    }
    resourceId = newRow.id
  }

  if (attachmentIds && attachmentIds.length > 0) {
    const validIds = attachmentIds.filter(isValidUUID)
    if (validIds.length > 0) {
      await db
        .from('attachments')
        .update({ resource_id: resourceId })
        .in('id', validIds)
    }
  }

  try {
    if (!input.id) {
      const resData: Resource = {
        id: resourceId,
        courseId,
        type,
        title: { ar: titleAr.trim(), en: titleEn.trim() },
        date: 0,
        files: (attachmentIds || []).map((id) => ({ id, name: 'مرفق', size: '0 B', access: 'public' })),
      }
      fetchCourses(auth.supabase as any)
        .then((courses) => {
          const course = courses.find((c) => c.id === courseId)
          const text = formatResourceNotification(resData, course)
          sendChannelBroadcast(text, `/courses/${courseId}`, '📖 فتح المصادر').catch(() => {})
        })
        .catch(() => {})
    }
  } catch {}

  return { success: true, data: { id: resourceId } }
}

export async function deleteResourceAction(id: string): Promise<ActionResult> {
  if (!id || !isValidUUID(id)) {
    return { success: false, error: 'Invalid resource ID. Must be a valid UUID.' }
  }

  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { error } = await auth.supabase.from('resources').delete().eq('id', id)
  if (error) {
    return { success: false, error: `Failed to delete resource: ${error.message}` }
  }

  return { success: true }
}

// ==============================================================================
// 2. ACTIVITY ACTIONS (Exams & Assignments)
// ==============================================================================

export interface SaveActivityInput {
  id?: string
  courseId: string
  kind: ActivityKind
  titleAr: string
  titleEn: string
  dueDate: string // YYYY-MM-DD
  dueTime?: string
  placeAr?: string
  placeEn?: string
  descAr?: string
  descEn?: string
  attachmentIds?: string[]
}

export async function saveActivityAction(
  input: SaveActivityInput
): Promise<ActionResult<{ id: string }>> {
  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { courseId, kind, titleAr, titleEn, dueDate } = input
  if (!courseId || !kind || !titleAr?.trim() || !titleEn?.trim() || !dueDate) {
    return { success: false, error: 'Validation failed: Required fields missing.' }
  }

  const db = auth.supabase as unknown as {
    from: (table: string) => {
      insert: (data: unknown) => {
        select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> }
      }
      update: (data: unknown) => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
        in: (col: string, vals: unknown[]) => Promise<{ error: { message: string } | null }>
      }
      delete: () => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
      }
    }
  }

  let activityId = input.id

  const payload = {
    course_id: courseId,
    kind,
    title_ar: titleAr.trim(),
    title_en: titleEn.trim(),
    due_date: dueDate,
    due_time: input.dueTime || '23:59',
    place_ar: input.placeAr?.trim() || 'تسليم إلكتروني',
    place_en: input.placeEn?.trim() || 'Online submission',
    desc_ar: input.descAr?.trim() || '',
    desc_en: input.descEn?.trim() || '',
    updated_at: new Date().toISOString(),
  }

  if (activityId && isValidUUID(activityId)) {
    const { error: updateError } = await db
      .from('activities')
      .update(payload)
      .eq('id', activityId)

    if (updateError) {
      return { success: false, error: `Failed to update activity: ${updateError.message}` }
    }
  } else {
    const { data: newRow, error: insertError } = await db
      .from('activities')
      .insert(payload)
      .select('id')
      .single()

    if (insertError || !newRow) {
      return { success: false, error: `Failed to create activity: ${insertError?.message}` }
    }
    activityId = newRow.id
  }

  if (input.attachmentIds && input.attachmentIds.length > 0) {
    const validIds = input.attachmentIds.filter(isValidUUID)
    if (validIds.length > 0) {
      await db
        .from('attachments')
        .update({ activity_id: activityId })
        .in('id', validIds)
    }
  }

  try {
    if (!input.id) {
      const dueDateObj = new Date(dueDate)
      dueDateObj.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diffDays = Math.round((dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      const actData: Activity = {
        id: activityId,
        courseId,
        kind,
        title: { ar: titleAr.trim(), en: titleEn.trim() },
        due: diffDays,
        time: input.dueTime || '23:59',
        place: { ar: input.placeAr?.trim() || 'تسليم إلكتروني', en: input.placeEn?.trim() || 'Online submission' },
        desc: { ar: input.descAr?.trim() || '', en: input.descEn?.trim() || '' },
        files: [],
      }
      fetchCourses(auth.supabase as any)
        .then((courses) => {
          const course = courses.find((c) => c.id === courseId)
          const text = formatActivityNotification(actData, course)
          sendChannelBroadcast(text, '/activities', '📝 تفاصيل الواجب / الامتحان').catch(() => {})
        })
        .catch(() => {})
    }
  } catch {}

  return { success: true, data: { id: activityId } }
}

export async function deleteActivityAction(id: string): Promise<ActionResult> {
  if (!id || !isValidUUID(id)) {
    return { success: false, error: 'Invalid activity ID. Must be a valid UUID.' }
  }

  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { error } = await auth.supabase.from('activities').delete().eq('id', id)
  if (error) {
    return { success: false, error: `Failed to delete activity: ${error.message}` }
  }

  return { success: true }
}

// ==============================================================================
// 3. REPORT ACTIONS
// ==============================================================================

export interface SaveReportInput {
  id?: string
  courseId: string
  category: ReportCategory
  titleAr: string
  titleEn: string
  authorAr?: string
  authorEn?: string
  attachmentIds?: string[]
}

export async function saveReportAction(
  input: SaveReportInput
): Promise<ActionResult<{ id: string }>> {
  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { courseId, category, titleAr, titleEn } = input
  if (!courseId || !category || !titleAr?.trim() || !titleEn?.trim()) {
    return { success: false, error: 'Validation failed: Required fields missing.' }
  }

  const db = auth.supabase as unknown as {
    from: (table: string) => {
      insert: (data: unknown) => {
        select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> }
      }
      update: (data: unknown) => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
        in: (col: string, vals: unknown[]) => Promise<{ error: { message: string } | null }>
      }
      delete: () => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
      }
    }
  }

  let reportId = input.id

  const payload = {
    course_id: courseId,
    category,
    title_ar: titleAr.trim(),
    title_en: titleEn.trim(),
    author_ar: input.authorAr?.trim() || 'الناشر',
    author_en: input.authorEn?.trim() || 'Publisher',
    updated_at: new Date().toISOString(),
  }

  if (reportId && isValidUUID(reportId)) {
    const { error: updateError } = await db
      .from('reports')
      .update(payload)
      .eq('id', reportId)

    if (updateError) {
      return { success: false, error: `Failed to update report: ${updateError.message}` }
    }
  } else {
    const { data: newRow, error: insertError } = await db
      .from('reports')
      .insert(payload)
      .select('id')
      .single()

    if (insertError || !newRow) {
      return { success: false, error: `Failed to create report: ${insertError?.message}` }
    }
    reportId = newRow.id
  }

  if (input.attachmentIds && input.attachmentIds.length > 0) {
    const validIds = input.attachmentIds.filter(isValidUUID)
    if (validIds.length > 0) {
      await db
        .from('attachments')
        .update({ report_id: reportId })
        .in('id', validIds)
    }
  }

  return { success: true, data: { id: reportId } }
}

export async function deleteReportAction(id: string): Promise<ActionResult> {
  if (!id || !isValidUUID(id)) {
    return { success: false, error: 'Invalid report ID. Must be a valid UUID.' }
  }

  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { error } = await auth.supabase.from('reports').delete().eq('id', id)
  if (error) {
    return { success: false, error: `Failed to delete report: ${error.message}` }
  }

  return { success: true }
}

// ==============================================================================
// 4. SCHEDULE EXCEPTION ACTIONS
// ==============================================================================

export interface SaveScheduleExceptionInput {
  id?: string
  slotId: string
  exceptionDate: string // YYYY-MM-DD
  type: ExceptionType
  startTime?: string
  endTime?: string
  room?: string
  noteAr?: string
  noteEn?: string
}

export async function saveScheduleExceptionAction(
  input: SaveScheduleExceptionInput
): Promise<ActionResult<{ id: string }>> {
  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { slotId, exceptionDate, type } = input
  if (!slotId || !isValidUUID(slotId) || !exceptionDate || !type) {
    return { success: false, error: 'Validation failed: Required fields missing.' }
  }

  const db = auth.supabase as unknown as {
    from: (table: string) => {
      insert: (data: unknown) => {
        select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> }
      }
      update: (data: unknown) => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
      }
      delete: () => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
      }
    }
  }

  let exId = input.id

  const payload = {
    slot_id: slotId,
    exception_date: exceptionDate,
    type,
    start_time: input.startTime || null,
    end_time: input.endTime || null,
    room: input.room || null,
    note_ar: input.noteAr?.trim() || '',
    note_en: input.noteEn?.trim() || '',
  }

  if (exId && isValidUUID(exId)) {
    const { error: updateError } = await db
      .from('schedule_exceptions')
      .update(payload)
      .eq('id', exId)

    if (updateError) {
      return { success: false, error: `Failed to update exception: ${updateError.message}` }
    }
  } else {
    const { data: newRow, error: insertError } = await db
      .from('schedule_exceptions')
      .insert(payload)
      .select('id')
      .single()

    if (insertError || !newRow) {
      return { success: false, error: `Failed to create exception: ${insertError?.message}` }
    }
    exId = newRow.id
  }

  try {
    if (!input.id) {
      const exData: ScheduleException = {
        id: exId,
        slotId,
        offset: 0,
        type,
        start: input.startTime || undefined,
        end: input.endTime || undefined,
        room: input.room || undefined,
        note: { ar: input.noteAr?.trim() || '', en: input.noteEn?.trim() || '' },
      }
      Promise.all([
        fetchCourses(auth.supabase as any),
        fetchSlots(auth.supabase as any),
      ])
        .then(([courses, slots]) => {
          const slot = slots.find((s) => s.id === slotId)
          const course = slot ? courses.find((c) => c.id === slot.courseId) : undefined
          const text = formatScheduleExceptionNotification(exData, course)
          sendChannelBroadcast(text, '/schedule', '📅 عرض الجدول').catch(() => {})
        })
        .catch(() => {})
    }
  } catch {}

  return { success: true, data: { id: exId } }
}

export async function deleteScheduleExceptionAction(id: string): Promise<ActionResult> {
  if (!id || !isValidUUID(id)) {
    return { success: false, error: 'Invalid exception ID. Must be a valid UUID.' }
  }

  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { error } = await auth.supabase.from('schedule_exceptions').delete().eq('id', id)
  if (error) {
    return { success: false, error: `Failed to delete exception: ${error.message}` }
  }

  return { success: true }
}

// ==============================================================================
// 5. TIMETABLE SLOTS ACTIONS
// ==============================================================================

export interface SaveSlotInput {
  id?: string
  courseId: string
  weekday: number
  startTime: string
  endTime: string
  room: string
  kind: 'lecture' | 'lab'
}

export async function saveSlotAction(
  input: SaveSlotInput
): Promise<ActionResult<{ id: string }>> {
  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { courseId, weekday, startTime, endTime, room, kind } = input
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

  if (
    !courseId?.trim() ||
    typeof weekday !== 'number' ||
    weekday < 0 ||
    weekday > 6 ||
    !timeRegex.test(startTime) ||
    !timeRegex.test(endTime) ||
    startTime >= endTime ||
    !room?.trim() ||
    (kind !== 'lecture' && kind !== 'lab')
  ) {
    return { success: false, error: 'Validation failed: Invalid slot timing or room data.' }
  }

  const db = auth.supabase as unknown as {
    from: (table: string) => {
      insert: (data: unknown) => {
        select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> }
      }
      update: (data: unknown) => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
      }
      delete: () => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
      }
    }
  }

  let slotId = input.id

  const payload = {
    course_id: courseId.trim(),
    weekday,
    start_time: startTime,
    end_time: endTime,
    room: room.trim(),
    kind,
  }

  if (slotId && isValidUUID(slotId)) {
    const { error: updateError } = await db
      .from('slots')
      .update(payload)
      .eq('id', slotId)

    if (updateError) {
      return { success: false, error: `Failed to update slot: ${updateError.message}` }
    }
  } else {
    const { data: newRow, error: insertError } = await db
      .from('slots')
      .insert(payload)
      .select('id')
      .single()

    if (insertError || !newRow) {
      return { success: false, error: `Failed to create slot: ${insertError?.message}` }
    }
    slotId = newRow.id
  }

  return { success: true, data: { id: slotId } }
}

export async function deleteSlotAction(id: string): Promise<ActionResult> {
  if (!id || !isValidUUID(id)) {
    return { success: false, error: 'Invalid slot ID. Must be a valid UUID.' }
  }

  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { error } = await auth.supabase.from('slots').delete().eq('id', id)
  if (error) {
    return { success: false, error: `Failed to delete slot: ${error.message}` }
  }

  return { success: true }
}

// ==============================================================================
// 6. COURSES ACTIONS
// ==============================================================================

export interface SaveCourseInput {
  id?: string
  code: string
  nameAr: string
  nameEn: string
  instructorAr: string
  instructorEn: string
  color?: string
  credits?: number
  descAr?: string
  descEn?: string
}

export async function saveCourseAction(
  input: SaveCourseInput
): Promise<ActionResult<{ id: string }>> {
  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { code, nameAr, nameEn, instructorAr, instructorEn } = input
  if (
    !code?.trim() ||
    !nameAr?.trim() ||
    !nameEn?.trim() ||
    !instructorAr?.trim() ||
    !instructorEn?.trim()
  ) {
    return { success: false, error: 'Validation failed: Course code, name, and instructor are required.' }
  }

  const db = auth.supabase as unknown as {
    from: (table: string) => {
      insert: (data: unknown) => {
        select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> }
      }
      update: (data: unknown) => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
      }
      delete: () => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
      }
    }
  }

  // Generate ID if new and none provided
  const courseId = input.id?.trim() || `c_${code.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`

  const payload = {
    id: courseId,
    code: code.trim(),
    name_ar: nameAr.trim(),
    name_en: nameEn.trim(),
    instructor_ar: instructorAr.trim(),
    instructor_en: instructorEn.trim(),
    color: input.color?.trim() || '#1f3d6b',
    credits: typeof input.credits === 'number' && input.credits > 0 ? input.credits : 3,
    desc_ar: input.descAr?.trim() || '',
    desc_en: input.descEn?.trim() || '',
    updated_at: new Date().toISOString(),
  }

  if (input.id) {
    const { error: updateError } = await db
      .from('courses')
      .update(payload)
      .eq('id', input.id)

    if (updateError) {
      return { success: false, error: `Failed to update course: ${updateError.message}` }
    }
  } else {
    const { data: newRow, error: insertError } = await db
      .from('courses')
      .insert(payload)
      .select('id')
      .single()

    if (insertError || !newRow) {
      return { success: false, error: `Failed to create course: ${insertError?.message}` }
    }
  }

  return { success: true, data: { id: courseId } }
}

export async function deleteCourseAction(id: string): Promise<ActionResult> {
  if (!id?.trim()) {
    return { success: false, error: 'Invalid course ID.' }
  }

  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { error } = await auth.supabase.from('courses').delete().eq('id', id.trim())
  if (error) {
    return { success: false, error: `Failed to delete course: ${error.message}` }
  }

  return { success: true }
}

// ==============================================================================
// 7. ATTACHMENT UPLOAD ACTION
// ==============================================================================


const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB limit

export { generateSafeStoragePath }

export interface UploadAttachmentResult {
  id: string
  name: string
  size: string
  access: 'public' | 'restricted'
}

export async function uploadAttachmentAction(
  formData: FormData
): Promise<ActionResult<UploadAttachmentResult>> {
  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const file = formData.get('file') as File | null
  const access = (formData.get('access') as string) || 'public'

  if (!file) {
    return { success: false, error: 'No file provided.' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `File size exceeds the 50 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    }
  }

  const safeAccess: 'public' | 'restricted' = access === 'restricted' ? 'restricted' : 'public'
  const targetBucket = safeAccess === 'restricted' ? 'attachments-restricted' : 'attachments-public'

  const storagePath = generateSafeStoragePath(file.name, safeAccess)
  const supabase = auth.supabase

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (uploadError) {
      console.error('[Storage Upload Error]', uploadError)
      return { success: false, error: `Storage upload failed: ${uploadError.message}` }
    }

    // Insert attachment metadata row in PostgreSQL database
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

    const { data: attachmentRow, error: dbError } = await db
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

    if (dbError || !attachmentRow) {
      await supabase.storage.from(targetBucket).remove([storagePath])
      console.error('[Database Attachment Insert Error]', dbError)
      return { success: false, error: `Failed to record attachment metadata: ${dbError?.message}` }
    }

    const kb = attachmentRow.file_size_bytes / 1024
    const formattedSize =
      kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`

    return {
      success: true,
      data: {
        id: attachmentRow.id,
        name: attachmentRow.file_name,
        size: formattedSize,
        access: attachmentRow.access as 'public' | 'restricted',
      },
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown storage exception'
    return { success: false, error: `Upload exception: ${msg}` }
  }
}

export interface RecordAttachmentMetadataInput {
  fileName: string
  fileSizeBytes: number
  mimeType?: string
  access: 'public' | 'restricted'
  storageBucket: string
  storagePath: string
}

export async function recordAttachmentMetadataAction(
  input: RecordAttachmentMetadataInput
): Promise<ActionResult<UploadAttachmentResult>> {
  const auth = await verifyPublisherAuth()
  if (!auth.authorized || !auth.supabase) {
    return { success: false, error: auth.error }
  }

  const { fileName, fileSizeBytes, mimeType, access, storageBucket, storagePath } = input
  const safeAccess: 'public' | 'restricted' = access === 'restricted' ? 'restricted' : 'public'

  const db = auth.supabase as unknown as {
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

  const { data: attachmentRow, error: dbError } = await db
    .from('attachments')
    .insert({
      file_name: fileName,
      file_size_bytes: fileSizeBytes,
      mime_type: mimeType || 'application/octet-stream',
      access: safeAccess,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      version: 1,
    })
    .select('id, file_name, file_size_bytes, access')
    .single()

  if (dbError || !attachmentRow) {
    return { success: false, error: `Failed to record attachment metadata: ${dbError?.message}` }
  }

  const kb = attachmentRow.file_size_bytes / 1024
  const formattedSize =
    kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`

  return {
    success: true,
    data: {
      id: attachmentRow.id,
      name: attachmentRow.file_name,
      size: formattedSize,
      access: attachmentRow.access as 'public' | 'restricted',
    },
  }
}

