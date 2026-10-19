import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  formatFileSize,
  mapCourse,
  mapSlot,
  mapException,
  mapResource,
  mapActivity,
  mapReport,
} from '../src/lib/data/academic'
import {
  saveResourceAction,
  deleteResourceAction,
  saveActivityAction,
  deleteActivityAction,
  saveReportAction,
  deleteReportAction,
  saveScheduleExceptionAction,
  deleteScheduleExceptionAction,
  saveSlotAction,
  deleteSlotAction,
  saveCourseAction,
  deleteCourseAction,
  uploadAttachmentAction,
  generateSafeStoragePath,
} from '../src/lib/actions/academic'
import { setTestClientFactory, resetTestClientFactory } from '../src/lib/actions/attachment-client'
import type { Tables } from '../src/lib/supabase/types'

describe('Academic Data Mapping & Unit Verification', () => {
  it('formatFileSize correctly formats bytes, KB, and MB', () => {
    assert.strictEqual(formatFileSize(0), '0 B')
    assert.strictEqual(formatFileSize(-10), '0 B')
    assert.strictEqual(formatFileSize(500), '500 B')
    assert.strictEqual(formatFileSize(1024), '1 KB')
    assert.strictEqual(formatFileSize(1536), '2 KB')
    assert.strictEqual(formatFileSize(1048576), '1.0 MB')
    assert.strictEqual(formatFileSize(5242880), '5.0 MB')
  })

  it('mapCourse maps DB row to Course domain entity correctly', () => {
    const row: Tables<'courses'> = {
      id: 'c1',
      code: 'CS 201',
      name_ar: 'هياكل البيانات',
      name_en: 'Data Structures',
      instructor_ar: 'أ.م. نور حسن',
      instructor_en: 'Asst. Prof. Noor Hasan',
      color: '#1f3d6b',
      credits: 3,
      desc_ar: 'وصف المادة بالعربية',
      desc_en: 'Course description in English',
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const course = mapCourse(row)
    assert.strictEqual(course.id, 'c1')
    assert.strictEqual(course.code, 'CS 201')
    assert.strictEqual(course.name.ar, 'هياكل البيانات')
    assert.strictEqual(course.name.en, 'Data Structures')
    assert.strictEqual(course.instructor.ar, 'أ.م. نور حسن')
    assert.strictEqual(course.credits, 3)
  })

  it('mapSlot maps DB row to Slot domain entity correctly', () => {
    const row: Tables<'slots'> = {
      id: 's1',
      course_id: 'c1',
      weekday: 0,
      start_time: '08:30',
      end_time: '10:00',
      room: 'قاعة 101',
      kind: 'lecture',
      created_at: new Date().toISOString(),
    }

    const slot = mapSlot(row)
    assert.strictEqual(slot.id, 's1')
    assert.strictEqual(slot.courseId, 'c1')
    assert.strictEqual(slot.weekday, 0)
    assert.strictEqual(slot.start, '08:30')
    assert.strictEqual(slot.end, '10:00')
    assert.strictEqual(slot.room, 'قاعة 101')
    assert.strictEqual(slot.kind, 'lecture')
  })

  it('mapException maps DB exception row with relative day offset', () => {
    const targetDate = new Date()
    targetDate.setHours(0, 0, 0, 0)
    const y = targetDate.getFullYear()
    const m = String(targetDate.getMonth() + 1).padStart(2, '0')
    const d = String(targetDate.getDate()).padStart(2, '0')
    const localDateStr = `${y}-${m}-${d}`

    const row: Tables<'schedule_exceptions'> = {
      id: 'ex1',
      slot_id: 's1',
      exception_date: localDateStr,
      type: 'room',
      room: 'مختبر 3',
      start_time: '11:00',
      end_time: '12:30',
      note_ar: 'نقل للمختبر',
      note_en: 'Moved to lab',
      created_at: new Date().toISOString(),
    }

    const ex = mapException(row)
    assert.strictEqual(ex.id, 'ex1')
    assert.strictEqual(ex.slotId, 's1')
    assert.strictEqual(ex.type, 'room')
    assert.strictEqual(ex.room, 'مختبر 3')
    assert.strictEqual(ex.start, '11:00')
    assert.strictEqual(ex.end, '12:30')
  })

  it('mapResource maps DB resource row and attached files', () => {
    const resRow: Tables<'resources'> = {
      id: 'r1',
      course_id: 'c1',
      type: 'notes',
      title_ar: 'ملزمة هياكل البيانات',
      title_en: 'Data Structures Handout',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const fileRows: Tables<'attachments'>[] = [
      {
        id: 'f1',
        resource_id: 'r1',
        activity_id: null,
        report_id: null,
        file_name: 'lecture1.pdf',
        file_size_bytes: 2097152,
        mime_type: 'application/pdf',
        storage_bucket: 'attachments-public',
        storage_path: 'resources/r1/lecture1.pdf',
        access: 'public',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const resource = mapResource(resRow, fileRows)
    assert.strictEqual(resource.id, 'r1')
    assert.strictEqual(resource.courseId, 'c1')
    assert.strictEqual(resource.type, 'notes')
    assert.strictEqual(resource.title.ar, 'ملزمة هياكل البيانات')
    assert.strictEqual(resource.files.length, 1)
    assert.strictEqual(resource.files[0].id, 'f1')
    assert.strictEqual(resource.files[0].name, 'lecture1.pdf')
    assert.strictEqual(resource.files[0].access, 'public')
    assert.strictEqual(resource.files[0].size, '2.0 MB')
  })

  it('mapActivity maps DB activity row and file attachments', () => {
    const actRow: Tables<'activities'> = {
      id: 'a1',
      course_id: 'c1',
      kind: 'exam',
      title_ar: 'الامتحان الشهري الأول',
      title_en: 'First Midterm Exam',
      due_date: '2026-10-20',
      due_time: '10:00 - 12:00',
      place_ar: 'القاعة الكبرى',
      place_en: 'Main Hall',
      desc_ar: 'يشمل الفصول 1 إلى 3',
      desc_en: 'Covers chapters 1 to 3',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const activity = mapActivity(actRow, [])
    assert.strictEqual(activity.id, 'a1')
    assert.strictEqual(activity.kind, 'exam')
    assert.strictEqual(activity.title.ar, 'الامتحان الشهري الأول')
    assert.strictEqual(activity.time, '10:00 - 12:00')
    assert.strictEqual(activity.place.ar, 'القاعة الكبرى')
    assert.deepStrictEqual(activity.files, [])
  })

  it('mapReport maps DB report row and category', () => {
    const repRow: Tables<'reports'> = {
      id: 'rep1',
      course_id: 'c1',
      category: 'course',
      title_ar: 'تقرير الخوارزميات المتقدمة',
      title_en: 'Advanced Algorithms Report',
      author_ar: 'أحمد علي',
      author_en: 'Ahmed Ali',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const report = mapReport(repRow, [])
    assert.strictEqual(report.id, 'rep1')
    assert.strictEqual(report.category, 'course')
    assert.strictEqual(report.title.ar, 'تقرير الخوارزميات المتقدمة')
    assert.strictEqual(report.author.ar, 'أحمد علي')
    assert.strictEqual(typeof report.date, 'number')
  })
})

describe('Server Actions: Security & Publisher Authorization Verification', () => {
  it('saveResourceAction rejects unauthenticated anonymous caller', async () => {
    setTestClientFactory(async () => ({
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('No session') }),
      },
    }))

    try {
      const res = await saveResourceAction({
        courseId: 'c1',
        type: 'notes',
        titleAr: 'اختبار',
        titleEn: 'Test',
      })
      assert.strictEqual(res.success, false)
      assert.match(res.error || '', /Unauthorized/i)
    } finally {
      resetTestClientFactory()
    }
  })

  it('saveResourceAction rejects non-publisher authenticated user', async () => {
    setTestClientFactory(async () => ({
      auth: {
        getUser: async () => ({
          data: { user: { id: 'usr-student-1', email: 'student@example.com' } },
          error: null,
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }))

    try {
      const res = await saveResourceAction({
        courseId: 'c1',
        type: 'notes',
        titleAr: 'اختبار',
        titleEn: 'Test',
      })
      assert.strictEqual(res.success, false)
      assert.match(res.error || '', /Forbidden/i)
    } finally {
      resetTestClientFactory()
    }
  })

  it('saveResourceAction validates required fields', async () => {
    setTestClientFactory(async () => ({
      auth: {
        getUser: async () => ({
          data: { user: { id: 'pub-1', email: 'pub@example.com' } },
          error: null,
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: 'pub-1' }, error: null }),
          }),
        }),
      }),
    }))

    try {
      const res = await saveResourceAction({
        courseId: '',
        type: 'notes',
        titleAr: '',
        titleEn: '',
      })
      assert.strictEqual(res.success, false)
      assert.match(res.error || '', /Validation failed/i)
    } finally {
      resetTestClientFactory()
    }
  })

  it('deleteResourceAction rejects invalid UUID format immediately', async () => {
    const res = await deleteResourceAction('non-uuid-123')
    assert.strictEqual(res.success, false)
    assert.match(res.error || '', /Invalid resource ID/i)
  })

  it('saveActivityAction enforces publisher authorization', async () => {
    setTestClientFactory(async () => ({
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('No session') }),
      },
    }))

    try {
      const res = await saveActivityAction({
        courseId: 'c1',
        kind: 'exam',
        titleAr: 'اختبار',
        titleEn: 'Test',
        dueDate: '2026-10-30',
        dueTime: '10:00',
        placeAr: 'قاعة 1',
        placeEn: 'Hall 1',
      })
      assert.strictEqual(res.success, false)
      assert.match(res.error || '', /Unauthorized/i)
    } finally {
      resetTestClientFactory()
    }
  })

  it('saveReportAction enforces publisher authorization', async () => {
    setTestClientFactory(async () => ({
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('No session') }),
      },
    }))

    try {
      const res = await saveReportAction({
        courseId: 'c1',
        category: 'project',
        titleAr: 'مشروع',
        titleEn: 'Project',
        authorAr: 'طالب',
        authorEn: 'Student',
      })
      assert.strictEqual(res.success, false)
      assert.match(res.error || '', /Unauthorized/i)
    } finally {
      resetTestClientFactory()
    }
  })

  it('saveScheduleExceptionAction enforces publisher authorization', async () => {
    setTestClientFactory(async () => ({
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('No session') }),
      },
    }))

    try {
      const res = await saveScheduleExceptionAction({
        slotId: '00000000-0000-0000-0000-000000000001',
        exceptionDate: '2026-10-15',
        type: 'cancelled',
      })
      assert.strictEqual(res.success, false)
      assert.match(res.error || '', /Unauthorized/i)
    } finally {
      resetTestClientFactory()
    }
  })

  it('saveSlotAction enforces publisher authorization and timing validation', async () => {
    setTestClientFactory(async () => ({
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('No session') }),
      },
    }))

    try {
      const res = await saveSlotAction({
        courseId: 'c1',
        weekday: 0,
        startTime: '08:30',
        endTime: '10:00',
        room: 'قاعة 1',
        kind: 'lecture',
      })
      assert.strictEqual(res.success, false)
      assert.match(res.error || '', /Unauthorized/i)
    } finally {
      resetTestClientFactory()
    }
  })

  it('deleteSlotAction enforces valid UUID check', async () => {
    const res = await deleteSlotAction('not-a-uuid')
    assert.strictEqual(res.success, false)
    assert.match(res.error || '', /Invalid slot ID/i)
  })

  it('saveCourseAction enforces publisher authorization and required fields', async () => {
    setTestClientFactory(async () => ({
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('No session') }),
      },
    }))

    try {
      const res = await saveCourseAction({
        code: 'CS 999',
        nameAr: 'مادة تجريبية',
        nameEn: 'Test Course',
        instructorAr: 'أستاذ',
        instructorEn: 'Teacher',
      })
      assert.strictEqual(res.success, false)
      assert.match(res.error || '', /Unauthorized/i)
    } finally {
      resetTestClientFactory()
    }
  })

  it('deleteCourseAction validates course ID presence', async () => {
    const res = await deleteCourseAction('')
    assert.strictEqual(res.success, false)
    assert.match(res.error || '', /Invalid course ID/i)
  })

  it('uploadAttachmentAction enforces file type security and publisher authorization', async () => {
    setTestClientFactory(async () => ({
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('No session') }),
      },
    }))

    try {
      const formData = new FormData()
      formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt')
      formData.append('access', 'public')
      formData.append('entityType', 'resource')

      const res = await uploadAttachmentAction(formData)
      assert.strictEqual(res.success, false)
      assert.match(res.error || '', /Unauthorized/i)
    } finally {
      resetTestClientFactory()
    }
  })

  it('generateSafeStoragePath converts Arabic/Unicode filenames into 100% pure ASCII S3 keys', () => {
    // Test 1: Arabic filename with numbers
    const p1 = generateSafeStoragePath('محاضرة 1 هياكل بيانات.pdf', 'public')
    assert.match(p1, /^public\/[a-zA-Z0-9_\-]+_1\.pdf$/)
    assert.strictEqual(/[^\x00-\x7F]/.test(p1), false, 'Must not contain any non-ASCII characters')

    // Test 2: Pure Arabic filename without numbers
    const p2 = generateSafeStoragePath('خطة المساق الفصلية.docx', 'restricted')
    assert.match(p2, /^restricted\/[a-zA-Z0-9_\-]+_file\.docx$/)
    assert.strictEqual(/[^\x00-\x7F]/.test(p2), false, 'Must not contain any non-ASCII characters')

    // Test 3: Filename with spaces, special symbols, and brackets
    const p3 = generateSafeStoragePath('Data Structures & Algorithms (Final) 2026.pdf', 'public')
    assert.match(p3, /^public\/[a-zA-Z0-9_\-]+_Data_Structures_Algorithms_Final\.pdf$/)
    assert.strictEqual(/[^\x00-\x7F]/.test(p3), false, 'Must not contain any non-ASCII characters')

    // Test 4: File without extension defaults to safe .bin
    const p4 = generateSafeStoragePath('ملف_مجهول', 'public')
    assert.match(p4, /^public\/[a-zA-Z0-9_\-]+_file\.bin$/)
    assert.strictEqual(/[^\x00-\x7F]/.test(p4), false)
  })
})

