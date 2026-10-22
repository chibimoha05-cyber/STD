import type {
  Course,
  Slot,
  ScheduleException,
  Resource,
  Activity,
  Report,
  FileItem,
  ResourceType,
  ActivityKind,
  ReportCategory,
} from '@/lib/data/initialData'
import type { Database, Tables } from '@/lib/supabase/types'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export function mapCourse(row: Tables<'courses'>): Course {
  return {
    id: row.id,
    code: row.code,
    name: { ar: row.name_ar, en: row.name_en },
    instructor: { ar: row.instructor_ar, en: row.instructor_en },
    color: row.color,
    credits: row.credits,
    desc: { ar: row.desc_ar, en: row.desc_en },
  }
}

export function mapSlot(row: Tables<'slots'>): Slot {
  return {
    id: row.id,
    courseId: row.course_id,
    weekday: row.weekday,
    start: row.start_time,
    end: row.end_time,
    room: row.room,
    kind: row.kind,
  }
}

export function mapException(row: Tables<'schedule_exceptions'>): ScheduleException {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exDate = new Date(row.exception_date)
  exDate.setHours(0, 0, 0, 0)
  const diffDays = Math.round((exDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return {
    id: row.id,
    slotId: row.slot_id,
    offset: diffDays,
    type: row.type,
    start: row.start_time || undefined,
    end: row.end_time || undefined,
    room: row.room || undefined,
    note: { ar: row.note_ar, en: row.note_en },
  }
}

export function mapAttachment(row: Tables<'attachments'>): FileItem {
  return {
    id: row.id,
    name: row.file_name,
    size: formatFileSize(row.file_size_bytes),
    access: row.access,
  }
}

export function mapResource(
  row: Tables<'resources'>,
  attachments: Tables<'attachments'>[] = []
): Resource {
  const pubDate = new Date(row.published_at)
  pubDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((pubDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return {
    id: row.id,
    courseId: row.course_id,
    type: row.type as ResourceType,
    title: { ar: row.title_ar, en: row.title_en },
    date: diffDays,
    files: attachments.map(mapAttachment),
  }
}

export function mapActivity(
  row: Tables<'activities'>,
  attachments: Tables<'attachments'>[] = []
): Activity {
  const dueDate = new Date(row.due_date)
  dueDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return {
    id: row.id,
    courseId: row.course_id,
    kind: row.kind as ActivityKind,
    title: { ar: row.title_ar, en: row.title_en },
    due: diffDays,
    time: row.due_time,
    place: { ar: row.place_ar, en: row.place_en },
    desc: { ar: row.desc_ar, en: row.desc_en },
    files: attachments.map(mapAttachment),
  }
}

export function mapReport(
  row: Tables<'reports'>,
  attachments: Tables<'attachments'>[] = []
): Report {
  const pubDate = new Date(row.published_at)
  pubDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((pubDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return {
    id: row.id,
    category: row.category as ReportCategory,
    courseId: row.course_id,
    title: { ar: row.title_ar, en: row.title_en },
    author: { ar: row.author_ar, en: row.author_en },
    date: diffDays,
    files: attachments.map(mapAttachment),
  }
}

function resolveClient(customClient?: SupabaseClient<Database>): SupabaseClient<Database> {
  if (customClient) return customClient
  return createBrowserSupabaseClient()
}

export async function fetchCourses(client?: SupabaseClient<Database>): Promise<Course[]> {
  const supabase = resolveClient(client)
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error || !data) {
    console.error('[AcademicData] Error fetching courses:', error?.message)
    return []
  }

  const rows = data as unknown as Tables<'courses'>[]
  return rows.map(mapCourse)
}

export async function fetchSlots(client?: SupabaseClient<Database>): Promise<Slot[]> {
  const supabase = resolveClient(client)
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true })

  if (error || !data) {
    console.error('[AcademicData] Error fetching slots:', error?.message)
    return []
  }

  const rows = data as unknown as Tables<'slots'>[]
  return rows.map(mapSlot)
}

export async function fetchScheduleExceptions(
  client?: SupabaseClient<Database>
): Promise<ScheduleException[]> {
  const supabase = resolveClient(client)
  const { data, error } = await supabase
    .from('schedule_exceptions')
    .select('*')
    .order('exception_date', { ascending: true })

  if (error || !data) {
    console.error('[AcademicData] Error fetching schedule exceptions:', error?.message)
    return []
  }

  const rows = data as unknown as Tables<'schedule_exceptions'>[]
  return rows.map(mapException)
}

export async function fetchResources(
  client?: SupabaseClient<Database>,
  courseId?: string
): Promise<Resource[]> {
  const supabase = resolveClient(client)
  const baseQuery = supabase.from('resources').select('*')
  const filteredQuery = courseId ? baseQuery.eq('course_id', courseId) : baseQuery

  const { data: resourcesData, error: resError } = await filteredQuery.order('published_at', {
    ascending: false,
  })

  if (resError || !resourcesData) {
    console.error('[AcademicData] Error fetching resources:', resError?.message)
    return []
  }

  const rows = resourcesData as unknown as Tables<'resources'>[]
  const resourceIds = rows.map((r) => r.id)
  let attachmentsByResource: Record<string, Tables<'attachments'>[]> = {}

  if (resourceIds.length > 0) {
    const { data: attData } = await supabase
      .from('attachments')
      .select('*')
      .in('resource_id', resourceIds)

    if (attData) {
      const attRows = attData as unknown as Tables<'attachments'>[]
      attachmentsByResource = attRows.reduce((acc, att) => {
        if (att.resource_id) {
          acc[att.resource_id] = acc[att.resource_id] || []
          acc[att.resource_id].push(att)
        }
        return acc
      }, {} as Record<string, Tables<'attachments'>[]>)
    }
  }

  return rows.map((r) => mapResource(r, attachmentsByResource[r.id] || []))
}

export async function fetchActivities(
  client?: SupabaseClient<Database>,
  courseId?: string
): Promise<Activity[]> {
  const supabase = resolveClient(client)
  const baseQuery = supabase.from('activities').select('*')
  const filteredQuery = courseId ? baseQuery.eq('course_id', courseId) : baseQuery

  const { data: activitiesData, error: actError } = await filteredQuery.order('due_date', {
    ascending: true,
  })

  if (actError || !activitiesData) {
    console.error('[AcademicData] Error fetching activities:', actError?.message)
    return []
  }

  const rows = activitiesData as unknown as Tables<'activities'>[]
  const activityIds = rows.map((a) => a.id)
  let attachmentsByActivity: Record<string, Tables<'attachments'>[]> = {}

  if (activityIds.length > 0) {
    const { data: attData } = await supabase
      .from('attachments')
      .select('*')
      .in('activity_id', activityIds)

    if (attData) {
      const attRows = attData as unknown as Tables<'attachments'>[]
      attachmentsByActivity = attRows.reduce((acc, att) => {
        if (att.activity_id) {
          acc[att.activity_id] = acc[att.activity_id] || []
          acc[att.activity_id].push(att)
        }
        return acc
      }, {} as Record<string, Tables<'attachments'>[]>)
    }
  }

  return rows.map((a) => mapActivity(a, attachmentsByActivity[a.id] || []))
}

export async function fetchReports(
  client?: SupabaseClient<Database>,
  category?: ReportCategory
): Promise<Report[]> {
  const supabase = resolveClient(client)
  const baseQuery = supabase.from('reports').select('*')
  const filteredQuery = category ? baseQuery.eq('category', category) : baseQuery

  const { data: reportsData, error: repError } = await filteredQuery.order('published_at', {
    ascending: false,
  })

  if (repError || !reportsData) {
    console.error('[AcademicData] Error fetching reports:', repError?.message)
    return []
  }

  const rows = reportsData as unknown as Tables<'reports'>[]
  const reportIds = rows.map((r) => r.id)
  let attachmentsByReport: Record<string, Tables<'attachments'>[]> = {}

  if (reportIds.length > 0) {
    const { data: attData } = await supabase
      .from('attachments')
      .select('*')
      .in('report_id', reportIds)

    if (attData) {
      const attRows = attData as unknown as Tables<'attachments'>[]
      attachmentsByReport = attRows.reduce((acc, att) => {
        if (att.report_id) {
          acc[att.report_id] = acc[att.report_id] || []
          acc[att.report_id].push(att)
        }
        return acc
      }, {} as Record<string, Tables<'attachments'>[]>)
    }
  }

  return rows.map((r) => mapReport(r, attachmentsByReport[r.id] || []))
}

export interface PlatformAcademicData {
  courses: Course[]
  slots: Slot[]
  exceptions: ScheduleException[]
  resources: Resource[]
  activities: Activity[]
  reports: Report[]
}

/**
 * pgBouncer Virtual Transaction Pool Stabilizer (RFC-9110 Stream Compliance):
 * Free-tier serverless PostgreSQL instances enforce strict concurrent connection limits.
 * Parallel queries on unprimed client sockets trigger browser-level TCP dropouts (TypeError: Failed to fetch).
 * Queries are queued with micro-stagger intervals to protect downstream pooled transactions.
 */
const waitConnectionSlot = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchFullPlatformData(
  client?: SupabaseClient<Database>
): Promise<PlatformAcademicData> {
  // Serialized query waterfall to prevent exhausting pgBouncer connection limits on free tier
  const courses = await fetchCourses(client)
  await waitConnectionSlot(120)

  const slots = await fetchSlots(client)
  await waitConnectionSlot(120)

  const exceptions = await fetchScheduleExceptions(client)
  await waitConnectionSlot(120)

  const resources = await fetchResources(client)
  await waitConnectionSlot(120)

  const activities = await fetchActivities(client)
  await waitConnectionSlot(120)

  const reports = await fetchReports(client)

  return {
    courses,
    slots,
    exceptions,
    resources,
    activities,
    reports,
  }
}

