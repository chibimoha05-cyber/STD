// Telegram Admin Interactive Commands (/exam, /homework, /report)

import { isTelegramAdmin } from './config'
import {
  sendTelegramMessage,
  formatActivityNotification,
  formatReportNotification,
  sendChannelBroadcast,
} from './bot'
import {
  initialCourses,
  initialActivities,
  initialReports,
  type Activity,
  type Report,
  type ActivityKind,
  type ReportCategory,
} from '@/lib/data/initialData'

export type AwaitingType = 'exam' | 'assignment' | 'report'

interface PendingSession {
  type: AwaitingType
  timestamp: number
}

// In-memory conversation state keyed by Telegram User ID
const userSessions = new Map<string, PendingSession>()

export function getUserSession(userId: string | number): PendingSession | null {
  const session = userSessions.get(String(userId))
  if (!session) return null
  // Expire session after 15 minutes of inactivity
  if (Date.now() - session.timestamp > 15 * 60 * 1000) {
    userSessions.delete(String(userId))
    return null
  }
  return session
}

export function setUserSession(userId: string | number, type: AwaitingType): void {
  userSessions.set(String(userId), { type, timestamp: Date.now() })
}

export function clearUserSession(userId: string | number): void {
  userSessions.delete(String(userId))
}

// Match course name or ID (e.g., "c4", "معمارية", "معالجات", "قواعد بيانات")
export function findCourseByQuery(query: string) {
  const clean = query.trim().toLowerCase()
  if (!clean) return initialCourses[0]

  // Direct ID / Code / Name / Desc match
  const found = initialCourses.find(
    (c) =>
      c.id.toLowerCase() === clean ||
      c.code.toLowerCase().includes(clean) ||
      c.name.ar.toLowerCase().includes(clean) ||
      c.name.en.toLowerCase().includes(clean) ||
      c.desc.ar.toLowerCase().includes(clean) ||
      c.desc.en.toLowerCase().includes(clean)
  )
  if (found) return found

  // Keyword alias mapping for natural Arabic terminology
  if (clean.includes('معمار') || clean.includes('معالج') || clean.includes('تجميع') || clean.includes('assembly')) {
    return initialCourses.find((c) => c.id === 'c4') || initialCourses[0]
  }
  if (clean.includes('هياكل') || clean.includes('خوارزم') || clean.includes('data struct')) {
    return initialCourses.find((c) => c.id === 'c1') || initialCourses[0]
  }
  if (clean.includes('قواعد') || clean.includes('database') || clean.includes('sql')) {
    return initialCourses.find((c) => c.id === 'c2') || initialCourses[0]
  }
  if (clean.includes('كيان') || clean.includes('كائن') || clean.includes('oop')) {
    return initialCourses.find((c) => c.id === 'c3') || initialCourses[0]
  }
  if (clean.includes('تفاضل') || clean.includes('رياض') || clean.includes('math') || clean.includes('calculus')) {
    return initialCourses.find((c) => c.id === 'c5') || initialCourses[0]
  }
  if (clean.includes('حوسب') || clean.includes('اتومات') || clean.includes('automata')) {
    return initialCourses.find((c) => c.id === 'c6') || initialCourses[0]
  }

  return initialCourses[0]
}

// Parses user text input lines (key: value)
export function parseKeyValues(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.split('\n')

  for (const line of lines) {
    const colonIdx = line.indexOf(':') !== -1 ? line.indexOf(':') : line.indexOf('：')
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim().toLowerCase()
      const val = line.slice(colonIdx + 1).trim()
      result[key] = val
    }
  }
  return result
}

export function parseDueOffsetAndDate(rawDue: string): { dueDays: number; dueDateString: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if string contains ISO date like 2026-11-20
  const dateMatch = rawDue.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (dateMatch) {
    const parsedDate = new Date(dateMatch[1])
    parsedDate.setHours(0, 0, 0, 0)
    const diff = Math.round((parsedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return {
      dueDays: Number.isNaN(diff) ? 3 : diff,
      dueDateString: dateMatch[1],
    }
  }

  // Check if string contains number of days, e.g. "بعد 5 أيام" or "5"
  const numMatch = rawDue.match(/\d+/)
  const days = numMatch ? parseInt(numMatch[0], 10) : 3
  const targetDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
  return {
    dueDays: days,
    dueDateString: targetDate.toISOString().split('T')[0],
  }
}

export function parseReportCategory(rawCat: string): ReportCategory {
  const clean = (rawCat || '').toLowerCase()
  if (clean.includes('lab') || clean.includes('مختبر') || clean.includes('عملي')) return 'lab'
  if (clean.includes('project') || clean.includes('مشروع')) return 'project'
  return 'course'
}

// Prompts for each command
export async function promptAddCommand(
  chatId: string | number,
  userId: string | number,
  type: AwaitingType
) {
  if (!isTelegramAdmin(userId)) {
    return sendTelegramMessage(chatId, '⛔ <b>عذراً:</b> هذا الأمر مخصص لناشري ومسؤولي المنصة فقط.')
  }

  setUserSession(userId, type)

  let title = ''
  let example = ''

  if (type === 'exam') {
    title = '📝 <b>إضافة امتحان جديد</b>'
    example =
      `المادة: معمارية الحاسوب\n` +
      `العنوان: امتحان الشهر الأول\n` +
      `الموعد: بعد 5 أيام (أو 2026-11-20)\n` +
      `الوقت: 10:30\n` +
      `القاعة: المختبر 2\n` +
      `التفاصيل: يشمل مادة المعالج 8086 وتتبع السجلات`
  } else if (type === 'assignment') {
    title = '📌 <b>إضافة واجب / تكليف دراسي</b>'
    example =
      `المادة: هياكل البيانات\n` +
      `العنوان: واجب خوارزمية البحث الثنائي\n` +
      `الموعد: بعد 3 أيام\n` +
      `الوقت: 23:59\n` +
      `القاعة: تسليم إلكتروني\n` +
      `التفاصيل: كتابة الكود بلغة C++ مع تقرير بسيط`
  } else {
    title = '📊 <b>إضافة تقرير دراسي</b>'
    example =
      `المادة: نظم قواعد البيانات\n` +
      `العنوان: تقرير المقارنة بين SQL و NoSQL\n` +
      `النوع: lab (أو course / project)\n` +
      `الكاتب: أحمد علي وحيدر محمد`
  }

  const promptText =
    `${title}\n\n` +
    `أرسل تفاصيل البيانات رداً على هذه الرسالة بالشكل التالي (سطر لكل بيان):\n\n` +
    `<code>${example}</code>\n\n` +
    `<i>للإلغاء أرسل /cancel في أي وقت.</i>`

  return sendTelegramMessage(chatId, promptText, {
    reply_markup: {
      force_reply: true,
      selective: true,
    },
  })
}

async function persistActivityToSupabase(activity: Activity, dueDateString: string) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key || url.includes('placeholder')) return

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(url, key)
    await supabase.from('activities').insert({
      course_id: activity.courseId,
      kind: activity.kind,
      title_ar: activity.title.ar,
      title_en: activity.title.en,
      due_date: dueDateString,
      due_time: activity.time,
      place_ar: activity.place.ar,
      place_en: activity.place.en,
      desc_ar: activity.desc.ar,
      desc_en: activity.desc.en,
    })
  } catch (err) {
    console.error('[TelegramCommand] Error persisting activity to Supabase:', err)
  }
}

async function persistReportToSupabase(report: Report) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key || url.includes('placeholder')) return

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(url, key)
    await supabase.from('reports').insert({
      course_id: report.courseId,
      category: report.category,
      title_ar: report.title.ar,
      title_en: report.title.en,
      author_ar: report.author.ar,
      author_en: report.author.en,
    })
  } catch (err) {
    console.error('[TelegramCommand] Error persisting report to Supabase:', err)
  }
}

export interface TelegramIncomingMessage {
  message_id: number
  from?: { id: number; first_name?: string; username?: string }
  chat?: { id: number; type: string }
  text?: string
  reply_to_message?: {
    text?: string
    message_id?: number
  }
}

/**
 * Main dispatcher for Telegram Admin commands & interactive sessions.
 * Returns true if the message was handled by an admin workflow.
 */
export async function handleAdminCommands(msg: TelegramIncomingMessage): Promise<boolean> {
  const chatId = msg.chat?.id
  const fromId = msg.from?.id
  const rawText = (msg.text || '').trim()
  if (!chatId || !fromId || !rawText) return false

  const textLower = rawText.toLowerCase()

  // 1. Cancel active session
  if (textLower === '/cancel') {
    if (isTelegramAdmin(fromId)) {
      clearUserSession(fromId)
      await sendTelegramMessage(chatId, '🚫 تم إلغاء العملية بنجاح.')
      return true
    }
    return false
  }

  // 2. Commands trigger
  if (textLower.startsWith('/exam')) {
    await promptAddCommand(chatId, fromId, 'exam')
    return true
  }

  if (textLower.startsWith('/homework') || textLower.startsWith('/assignment')) {
    await promptAddCommand(chatId, fromId, 'assignment')
    return true
  }

  if (textLower.startsWith('/report')) {
    await promptAddCommand(chatId, fromId, 'report')
    return true
  }

  // 3. Check for active session OR direct reply to prompt
  let awaitingType: AwaitingType | null = null
  const session = getUserSession(fromId)
  if (session) {
    awaitingType = session.type
  } else if (msg.reply_to_message?.text && isTelegramAdmin(fromId)) {
    const promptText = msg.reply_to_message.text
    if (promptText.includes('إضافة امتحان')) awaitingType = 'exam'
    else if (promptText.includes('إضافة واجب')) awaitingType = 'assignment'
    else if (promptText.includes('إضافة تقرير')) awaitingType = 'report'
  }

  if (!awaitingType || !isTelegramAdmin(fromId) || rawText.startsWith('/')) {
    return false
  }

  // 4. Process incoming submission
  const kv = parseKeyValues(rawText)
  const courseQuery = kv['المادة'] || kv['مادة'] || kv['course'] || ''
  const course = findCourseByQuery(courseQuery)
  const titleStr = kv['العنوان'] || kv['عنوان'] || kv['title'] || rawText.split('\n')[0]

  if (awaitingType === 'exam' || awaitingType === 'assignment') {
    const placeStr = kv['القاعة'] || kv['قاعة'] || kv['المكان'] || kv['مكان'] || 'القسم'
    const timeStr = kv['الوقت'] || kv['وقت'] || '10:00'
    const descStr = kv['التفاصيل'] || kv['تفاصيل'] || kv['desc'] || ''
    const rawDue = kv['الموعد'] || kv['موعد'] || kv['due'] || 'بعد 3 أيام'
    const { dueDays, dueDateString } = parseDueOffsetAndDate(rawDue)

    const activity: Activity = {
      id: `act-${Date.now()}`,
      courseId: course.id,
      kind: awaitingType as ActivityKind,
      title: { ar: titleStr, en: titleStr },
      due: dueDays,
      time: timeStr,
      place: { ar: placeStr, en: placeStr },
      desc: { ar: descStr, en: descStr },
      files: [],
    }

    // Save in-memory
    initialActivities.unshift(activity)

    // Save in Supabase if connected
    await persistActivityToSupabase(activity, dueDateString)

    clearUserSession(fromId)

    const typeWord = awaitingType === 'exam' ? 'الامتحان' : 'الواجب'
    const confirmationText =
      `✅ <b>تم حفظ ونشر ${typeWord} بنجاح!</b>\n\n` +
      formatActivityNotification(activity, course)

    await sendTelegramMessage(chatId, confirmationText)

    // Broadcast to Telegram Channel
    await sendChannelBroadcast(
      formatActivityNotification(activity, course),
      '/activities',
      '📝 فتح صفحة الامتحانات والواجبات'
    ).catch(() => {})

    return true
  }

  if (awaitingType === 'report') {
    const authorStr = kv['الكاتب'] || kv['كاتب'] || kv['author'] || 'ناشر معتمد'
    const rawCategory = kv['النوع'] || kv['نوع'] || kv['category'] || 'course'
    const category = parseReportCategory(rawCategory)

    const report: Report = {
      id: `rep-${Date.now()}`,
      category,
      courseId: course.id,
      title: { ar: titleStr, en: titleStr },
      author: { ar: authorStr, en: authorStr },
      date: 0,
      files: [],
    }

    // Save in-memory
    initialReports.unshift(report)

    // Save in Supabase if connected
    await persistReportToSupabase(report)

    clearUserSession(fromId)

    const confirmationText =
      `✅ <b>تم حفظ ونشر التقرير بنجاح!</b>\n\n` +
      formatReportNotification(report, course)

    await sendTelegramMessage(chatId, confirmationText)

    // Broadcast to Telegram Channel
    await sendChannelBroadcast(
      formatReportNotification(report, course),
      '/reports',
      '📊 فتح صفحة التقارير'
    ).catch(() => {})

    return true
  }

  return false
}
