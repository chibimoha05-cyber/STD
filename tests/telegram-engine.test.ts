import { describe, it } from 'node:test'
import assert from 'node:assert'
import { isTelegramAdmin, getAdminIds } from '../src/lib/telegram/config'
import {
  formatActivityNotification,
  formatResourceNotification,
  formatScheduleExceptionNotification,
  formatMorningBriefing,
  formatReportNotification,
  buildWebAppKeyboard,
} from '../src/lib/telegram/bot'
import {
  findCourseByQuery,
  parseKeyValues,
  parseDueOffsetAndDate,
  parseReportCategory,
  getUserSession,
  setUserSession,
  clearUserSession,
  handleAdminCommands,
} from '../src/lib/telegram/commands'
import type { Course, Activity, Resource, ScheduleException, Slot, Report } from '../src/lib/data/initialData'

describe('Telegram Bot Engine & Multi-Admin Security Verification', () => {
  it('correctly authorizes designated Admins (User & Harith)', () => {
    // User ID (Owner)
    assert.strictEqual(isTelegramAdmin('1669700577'), true)
    assert.strictEqual(isTelegramAdmin(1669700577), true)

    // Harith ID
    assert.strictEqual(isTelegramAdmin('1428611723'), true)
    assert.strictEqual(isTelegramAdmin(1428611723), true)

    // Unauthorized random user
    assert.strictEqual(isTelegramAdmin('987654321'), false)
    assert.strictEqual(isTelegramAdmin(123456789), false)
  })

  it('buildWebAppKeyboard constructs valid Telegram WebApp inline markup', () => {
    const kbPrivate = buildWebAppKeyboard('🚀 فتح المنصة', '/courses/c4', true)
    assert.ok(kbPrivate.inline_keyboard)
    const btnPrivate = kbPrivate.inline_keyboard[0][0] as { text: string; web_app: { url: string } }
    assert.strictEqual(btnPrivate.text, '🚀 فتح المنصة')
    assert.ok(btnPrivate.web_app?.url.includes('/courses/c4'))

    const kbGroup = buildWebAppKeyboard('🚀 فتح المنصة', '/courses/c4', false)
    assert.ok(kbGroup.inline_keyboard)
    const btnGroup = kbGroup.inline_keyboard[0][0] as { text: string; url: string }
    assert.strictEqual(btnGroup.text, '🚀 فتح المنصة')
    assert.ok(btnGroup.url?.includes('courses') && btnGroup.url?.includes('c4'))
  })

  it('formatActivityNotification generates structured Arabic HTML card for exams', () => {
    const course: Course = {
      id: 'c1',
      code: 'CS 201',
      name: { ar: 'هياكل البيانات', en: 'Data Structures' },
      instructor: { ar: 'أ.م. نور حسن', en: 'Asst. Prof. Noor' },
      color: '#1f3d6b',
      credits: 3,
      desc: { ar: 'وصف', en: 'desc' },
    }

    const exam: Activity = {
      id: 'a1',
      courseId: 'c1',
      kind: 'exam',
      title: { ar: 'امتحان الشهر الأول', en: 'Midterm 1' },
      due: 4,
      time: '09:00',
      place: { ar: 'قاعة 2', en: 'Hall 2' },
      desc: { ar: 'مادة الامتحان: الفصل الأول والثاني', en: 'Chapters 1 & 2' },
      files: [],
    }

    const text = formatActivityNotification(exam, course)
    assert.ok(text.includes('إشعار امتحان جديد'))
    assert.ok(text.includes('هياكل البيانات'))
    assert.ok(text.includes('امتحان الشهر الأول'))
    assert.ok(text.includes('بعد 4 أيام'))
    assert.ok(text.includes('قاعة 2'))
  })

  it('formatResourceNotification formats PDF and summary materials card', () => {
    const course: Course = {
      id: 'c2',
      code: 'CS 202',
      name: { ar: 'قواعد البيانات', en: 'Databases' },
      instructor: { ar: 'أ.د. علي محمد', en: 'Prof. Ali' },
      color: '#2f6b5a',
      credits: 3,
      desc: { ar: 'وصف', en: 'desc' },
    }

    const res: Resource = {
      id: 'r1',
      courseId: 'c2',
      type: 'notes',
      title: { ar: 'سلايدات المحاضرة 3 - لغة SQL', en: 'Lecture 3 Slides' },
      date: 0,
      files: [{ id: 'f1', name: 'lecture3.pdf', size: '2.4 MB', access: 'public' }],
    }

    const text = formatResourceNotification(res, course)
    assert.ok(text.includes('إضافة مادة ومصادر جديدة'))
    assert.ok(text.includes('قواعد البيانات'))
    assert.ok(text.includes('سلايدات المحاضرة 3'))
    assert.ok(text.includes('1 ملف'))
  })

  it('formatScheduleExceptionNotification formats lecture cancellation alerts', () => {
    const course: Course = {
      id: 'c3',
      code: 'CS 203',
      name: { ar: 'البرمجة الكيانية', en: 'OOP' },
      instructor: { ar: 'أ.م.د. عادل', en: 'Dr. Adel' },
      color: '#4f3b6a',
      credits: 3,
      desc: { ar: 'وصف', en: 'desc' },
    }

    const ex: ScheduleException = {
      id: 'ex1',
      slotId: 's1',
      offset: 0,
      type: 'cancelled',
      note: { ar: 'إلغاء المحاضرة لظرف طارئ للمحاضر', en: 'Cancelled' },
    }

    const text = formatScheduleExceptionNotification(ex, course)
    assert.ok(text.includes('إلغاء محاضرة'))
    assert.ok(text.includes('البرمجة الكيانية'))
    assert.ok(text.includes('ظرف طارئ'))
  })

  it('formatMorningBriefing handles both empty days and active schedule lists', () => {
    // Empty day
    const emptyBriefing = formatMorningBriefing([])
    assert.ok(emptyBriefing.includes('لا توجد محاضرات مقررة'))

    // Day with slots
    const slot: Slot = {
      id: 's1',
      courseId: 'c1',
      weekday: 0,
      start: '08:30',
      end: '10:30',
      room: 'Hall 2',
      kind: 'lecture',
    }
    const course: Course = {
      id: 'c1',
      code: 'CS 201',
      name: { ar: 'هياكل البيانات', en: 'Data Structures' },
      instructor: { ar: 'أ.م. نور حسن', en: 'Prof. Noor' },
      color: '#1f3d6b',
      credits: 3,
      desc: { ar: 'وصف', en: 'desc' },
    }

    const activeBriefing = formatMorningBriefing([{ slot, course }])
    assert.ok(activeBriefing.includes('جدول محاضرات اليوم'))
    assert.ok(activeBriefing.includes('هياكل البيانات'))
    assert.ok(activeBriefing.includes('08:30 - 10:30'))
    assert.ok(activeBriefing.includes('Hall 2'))
  })

  it('formatReportNotification formats academic report card', () => {
    const course: Course = {
      id: 'c2',
      code: 'CS 202',
      name: { ar: 'قواعد البيانات', en: 'Databases' },
      instructor: { ar: 'أ.د. علي محمد', en: 'Prof. Ali' },
      color: '#2f6b5a',
      credits: 3,
      desc: { ar: 'وصف', en: 'desc' },
    }
    const report: Report = {
      id: 'r-test',
      category: 'lab',
      courseId: 'c2',
      title: { ar: 'تقرير استعلامات SQL المتقدمة', en: 'Advanced SQL Report' },
      author: { ar: 'أحمد علي وحيدر محمد', en: 'Ahmed & Haider' },
      date: 0,
      files: [],
    }

    const text = formatReportNotification(report, course)
    assert.ok(text.includes('إضافة تقرير أكاديمي جديد'))
    assert.ok(text.includes('قواعد البيانات'))
    assert.ok(text.includes('تقرير مختبر عملي'))
    assert.ok(text.includes('استعلامات SQL المتقدمة'))
    assert.ok(text.includes('أحمد علي وحيدر محمد'))
  })

  it('findCourseByQuery matches course by code, arabic name, or english name', () => {
    const cByCode = findCourseByQuery('CS 201')
    assert.strictEqual(cByCode.id, 'c1')

    const cByAr = findCourseByQuery('معمارية')
    assert.strictEqual(cByAr.id, 'c4')

    const cByEn = findCourseByQuery('automata')
    assert.strictEqual(cByEn.id, 'c6')
  })

  it('parseKeyValues and parseDueOffsetAndDate handle flexible input formats', () => {
    const sample = `المادة: هياكل البيانات\nالعنوان: امتحان فصلي\nالموعد: 2026-12-01\nالوقت: 11:00\nالقاعة: قاعة 4\nالتفاصيل: الفصول الأولى`
    const kv = parseKeyValues(sample)
    assert.strictEqual(kv['المادة'], 'هياكل البيانات')
    assert.strictEqual(kv['العنوان'], 'امتحان فصلي')
    assert.strictEqual(kv['الوقت'], '11:00')
    assert.strictEqual(kv['القاعة'], 'قاعة 4')
    assert.strictEqual(kv['التفاصيل'], 'الفصول الأولى')

    const dueIso = parseDueOffsetAndDate('2026-12-01')
    assert.strictEqual(dueIso.dueDateString, '2026-12-01')

    const dueRel = parseDueOffsetAndDate('بعد 4 أيام')
    assert.strictEqual(dueRel.dueDays, 4)

    assert.strictEqual(parseReportCategory('تقرير مختبر عملي'), 'lab')
    assert.strictEqual(parseReportCategory('مشروع تخرج'), 'project')
    assert.strictEqual(parseReportCategory('مادة دراسية'), 'course')
  })

  it('handleAdminCommands lifecycle and security verification', async () => {
    const adminId = 1669700577 // Owner Admin
    const randomId = 999999999 // Unauthorized

    // 1. Non-admin trying /exam is rejected
    const nonAdminRes = await handleAdminCommands({
      message_id: 101,
      from: { id: randomId },
      chat: { id: 12345, type: 'private' },
      text: '/exam',
    })
    // Even if promptAddCommand runs, it returns permission error and session is not created
    assert.strictEqual(getUserSession(randomId), null)

    // 2. Admin initiating /exam sets session
    const adminExamTrigger = await handleAdminCommands({
      message_id: 102,
      from: { id: adminId },
      chat: { id: 12345, type: 'private' },
      text: '/exam',
    })
    assert.strictEqual(adminExamTrigger, true)
    assert.strictEqual(getUserSession(adminId)?.type, 'exam')

    // 3. Admin cancel command clears session
    const adminCancel = await handleAdminCommands({
      message_id: 103,
      from: { id: adminId },
      chat: { id: 12345, type: 'private' },
      text: '/cancel',
    })
    assert.strictEqual(adminCancel, true)
    assert.strictEqual(getUserSession(adminId), null)

    // 4. Admin initiating /report and submitting details
    await handleAdminCommands({
      message_id: 104,
      from: { id: adminId },
      chat: { id: 12345, type: 'private' },
      text: '/report',
    })
    assert.strictEqual(getUserSession(adminId)?.type, 'report')

    const submitRes = await handleAdminCommands({
      message_id: 105,
      from: { id: adminId },
      chat: { id: 12345, type: 'private' },
      text: `المادة: هياكل البيانات\nالعنوان: تقرير الأشجار الثنائية\nالنوع: lab\nالكاتب: محمد اركان`,
    })
    assert.strictEqual(submitRes, true)
    assert.strictEqual(getUserSession(adminId), null) // Session cleared after submission
  })
})


