// Telegram Admin Interactive Commands (/exam, /homework, /report)

import { isTelegramAdmin, TELEGRAM_BOT_TOKEN } from './config'
import {
  sendTelegramMessage,
  deleteTelegramMessage,
  formatActivityNotification,
  formatReportNotification,
  sendChannelBroadcast,
  saveTargetChannelId,
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
  promptMessageId?: number
  triggerMessageId?: number
  chatId?: string | number
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

export function setUserSession(
  userId: string | number,
  type: AwaitingType,
  promptMessageId?: number,
  triggerMessageId?: number,
  chatId?: string | number
): void {
  userSessions.set(String(userId), {
    type,
    promptMessageId,
    triggerMessageId,
    chatId,
    timestamp: Date.now(),
  })
}

export function clearUserSession(userId: string | number): PendingSession | null {
  const session = userSessions.get(String(userId)) || null
  userSessions.delete(String(userId))
  return session
}

// Match course name or ID in Arabic or English
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

  // Keyword alias mapping for natural Arabic & English terminology
  if (
    clean.includes('معمار') ||
    clean.includes('معالج') ||
    clean.includes('تجميع') ||
    clean.includes('assembly') ||
    clean.includes('micro') ||
    clean.includes('arch') ||
    clean.includes('8086')
  ) {
    return initialCourses.find((c) => c.id === 'c4') || initialCourses[0]
  }
  if (
    clean.includes('هياكل') ||
    clean.includes('خوارزم') ||
    clean.includes('data struct') ||
    clean.includes('algo')
  ) {
    return initialCourses.find((c) => c.id === 'c1') || initialCourses[0]
  }
  if (
    clean.includes('قواعد') ||
    clean.includes('database') ||
    clean.includes('sql') ||
    clean.includes('db')
  ) {
    return initialCourses.find((c) => c.id === 'c2') || initialCourses[0]
  }
  if (
    clean.includes('كيان') ||
    clean.includes('كائن') ||
    clean.includes('oop') ||
    clean.includes('c++') ||
    clean.includes('object')
  ) {
    return initialCourses.find((c) => c.id === 'c3') || initialCourses[0]
  }
  if (
    clean.includes('تفاضل') ||
    clean.includes('رياض') ||
    clean.includes('عددي') ||
    clean.includes('numerical') ||
    clean.includes('math') ||
    clean.includes('calculus') ||
    clean.includes('calc')
  ) {
    return initialCourses.find((c) => c.id === 'c5') || initialCourses[0]
  }
  if (
    clean.includes('حوسب') ||
    clean.includes('احتساب') ||
    clean.includes('اتومات') ||
    clean.includes('automata') ||
    clean.includes('computation') ||
    clean.includes('toc')
  ) {
    return initialCourses.find((c) => c.id === 'c6') || initialCourses[0]
  }
  if (
    clean.includes('منهج') ||
    clean.includes('مناهج') ||
    clean.includes('كتب') ||
    clean.includes('curricul') ||
    clean.includes('textbook')
  ) {
    return initialCourses.find((c) => c.id === 'c7') || initialCourses[0]
  }
  if (
    clean.includes('قياد') ||
    clean.includes('إدار') ||
    clean.includes('ادارة') ||
    clean.includes('leadership') ||
    clean.includes('admin')
  ) {
    return initialCourses.find((c) => c.id === 'c8') || initialCourses[0]
  }
  if (
    clean.includes('إنكليز') ||
    clean.includes('انكليز') ||
    clean.includes('انجليز') ||
    clean.includes('english')
  ) {
    return initialCourses.find((c) => c.id === 'c9') || initialCourses[0]
  }
  if (
    clean.includes('عرب') ||
    clean.includes('لغة عربية') ||
    clean.includes('arabic')
  ) {
    return initialCourses.find((c) => c.id === 'c10') || initialCourses[0]
  }
  if (
    clean.includes('تفكير') ||
    clean.includes('think')
  ) {
    return initialCourses.find((c) => c.id === 'c11') || initialCourses[0]
  }
  if (
    clean.includes('بعث') ||
    clean.includes('جرائم') ||
    clean.includes('baath')
  ) {
    return initialCourses.find((c) => c.id === 'c12') || initialCourses[0]
  }

  return initialCourses[0]
}

// Parses user text input lines (key: value), supporting Arabic, English & bilingual keys
export function parseKeyValues(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.split('\n')

  for (const line of lines) {
    const colonIdx = line.indexOf(':') !== -1 ? line.indexOf(':') : line.indexOf('：')
    if (colonIdx !== -1) {
      const rawKey = line.slice(0, colonIdx).trim().toLowerCase()
      const val = line.slice(colonIdx + 1).trim()
      result[rawKey] = val

      // Clean emojis and symbols
      const cleanKey = rawKey.replace(/[^\p{L}\p{N}\s\/\-,|]/gu, '').trim()
      if (cleanKey) {
        result[cleanKey] = val
        // Split bilingual labels like "المادة / course" into individual indexable keys
        const parts = cleanKey.split(/[\/\-|,]/).map((p) => p.trim()).filter(Boolean)
        for (const p of parts) {
          result[p] = val
        }
      }
    }
  }
  return result
}

export function parseDueOffsetAndDate(rawDue: string): { dueDays: number; dueDateString: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const clean = (rawDue || '').trim().toLowerCase()

  // 1. ISO date like 2026-11-20
  const dateMatch = clean.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (dateMatch) {
    const parsedDate = new Date(dateMatch[1])
    parsedDate.setHours(0, 0, 0, 0)
    const diff = Math.round((parsedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return {
      dueDays: Number.isNaN(diff) ? 3 : diff,
      dueDateString: dateMatch[1],
    }
  }

  // 2. Relative keywords (Arabic & English)
  if (clean.includes('today') || clean.includes('اليوم')) {
    return { dueDays: 0, dueDateString: today.toISOString().split('T')[0] }
  }
  if (
    clean.includes('after tomorrow') ||
    clean.includes('بعد غد') ||
    clean.includes('عكبه') ||
    clean.includes('عگبه')
  ) {
    const d = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
    return { dueDays: 2, dueDateString: d.toISOString().split('T')[0] }
  }
  if (
    clean.includes('tomorrow') ||
    clean.includes('غدا') ||
    clean.includes('غداً') ||
    clean.includes('باجر')
  ) {
    const d = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000)
    return { dueDays: 1, dueDateString: d.toISOString().split('T')[0] }
  }
  if (
    clean.includes('next week') ||
    clean.includes('اسبوع') ||
    clean.includes('أسبوع') ||
    clean.includes('week')
  ) {
    const num = clean.match(/\d+/)
    const weeks = num ? parseInt(num[0], 10) : 1
    const days = weeks * 7
    const d = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
    return { dueDays: days, dueDateString: d.toISOString().split('T')[0] }
  }

  // 3. Numbers: "in 5 days", "بعد 5 أيام", "after 5 days", "5 days", or just "5"
  const numMatch = clean.match(/\d+/)
  const days = numMatch ? parseInt(numMatch[0], 10) : 3
  const targetDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
  return {
    dueDays: days,
    dueDateString: targetDate.toISOString().split('T')[0],
  }
}

export function parseReportCategory(rawCat: string): ReportCategory {
  const clean = (rawCat || '').toLowerCase()
  if (
    clean.includes('lab') ||
    clean.includes('مختبر') ||
    clean.includes('عملي') ||
    clean.includes('practical')
  )
    return 'lab'
  if (
    clean.includes('project') ||
    clean.includes('مشروع') ||
    clean.includes('graduation')
  )
    return 'project'
  return 'course'
}

export interface TelegramIncomingMessage {
  message_id: number
  from?: { id: number; first_name?: string; username?: string; is_bot?: boolean }
  sender_chat?: { id: number; title?: string; type?: string }
  chat?: { id: number; type: string; title?: string }
  text?: string
  reply_to_message?: {
    text?: string
    message_id?: number
  }
}

/**
 * Checks if the caller is an authorized administrator:
 * 1. Configured Admin / Owner (Mohamed / Harith / env admins)
 * 2. Anonymous Admin posting as the group/channel itself
 * 3. Group Admin / Creator in Telegram groups
 */
export async function isUserAuthorizedAdmin(
  chatId: string | number,
  userId: string | number,
  senderChatId?: string | number
): Promise<boolean> {
  if (isTelegramAdmin(userId)) return true

  // Anonymous admin sending as the group chat itself
  if (senderChatId && String(senderChatId) === String(chatId)) {
    return true
  }

  // Telegram Group Anonymous Bot ID
  if (String(userId) === '1087968824') {
    return true
  }

  const strChatId = String(chatId)
  if (strChatId.startsWith('-') && TELEGRAM_BOT_TOKEN) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.ok && data.result) {
        const status = data.result.status
        if (status === 'creator' || status === 'administrator') {
          return true
        }
      }
    } catch {}
  }

  return false
}

// Prompts for each command
export async function promptAddCommand(
  chatId: string | number,
  userId: string | number,
  type: AwaitingType,
  messageId?: number,
  senderChatId?: string | number
) {
  const authorized = await isUserAuthorizedAdmin(chatId, userId, senderChatId)
  if (!authorized) {
    return sendTelegramMessage(chatId, '⛔ <b>عذراً:</b> هذا الأمر مخصص لمشرفي ومسؤولي المنصة فقط.', {
      reply_to_message_id: messageId,
    })
  }

  let title = ''
  let example = ''

  if (type === 'exam') {
    title = '📝 <b>إضافة امتحان جديد | Add New Exam</b>'
    example =
      `المادة / Course: معمارية الحاسوب (or Microprocessors)\n` +
      `العنوان / Title: امتحان الشهر الأول\n` +
      `الموعد / Due: بعد 5 أيام (or in 5 days or 2026-11-20)\n` +
      `الوقت / Time: 10:30\n` +
      `القاعة / Hall: المختبر 2\n` +
      `التفاصيل / Details: يشمل مادة المعالج 8086 وتتبع السجلات`
  } else if (type === 'assignment') {
    title = '📌 <b>إضافة واجب | Add Assignment</b>'
    example =
      `المادة / Course: هياكل البيانات (or Data Structures)\n` +
      `العنوان / Title: واجب خوارزمية البحث الثنائي\n` +
      `الموعد / Due: بعد 3 أيام (or in 3 days)\n` +
      `الوقت / Time: 23:59\n` +
      `القاعة / Place: تسليم إلكتروني (or Online)\n` +
      `التفاصيل / Details: كتابة الكود بلغة C++ مع تقرير بسيط`
  } else {
    title = '📊 <b>إضافة تقرير دراسي | Add Report</b>'
    example =
      `المادة / Course: نظم قواعد البيانات (or Databases)\n` +
      `العنوان / Title: تقرير المقارنة بين SQL و NoSQL\n` +
      `النوع / Type: lab (or course / project)\n` +
      `الكاتب / Author: أحمد علي وحيدر محمد`
  }

  const promptText =
    `${title}\n\n` +
    `⚠️ <b>تنبيه / Note:</b> قم بالرد (Reply) المباشر على هذه الرسالة لإرسال البيانات بالعربية أو الإنجليزية:\n\n` +
    `<code>${example}</code>\n\n` +
    `<i>سيتم حذف هذه الرسالة تلقائياً فور إكمال الإضافة أو عند إرسال /cancel.</i>`

  const sent = await sendTelegramMessage(chatId, promptText, {
    reply_to_message_id: messageId,
    reply_markup: {
      force_reply: true,
      selective: true,
    },
  })

  const promptMsgId =
    sent.ok && sent.result && typeof sent.result === 'object' && 'message_id' in sent.result
      ? (sent.result as { message_id: number }).message_id
      : undefined

  setUserSession(userId, type, promptMsgId, messageId, chatId)
  return sent
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

/**
 * Main dispatcher for Telegram Admin commands & interactive sessions.
 * Returns true if the message was handled by an admin workflow.
 */
export async function handleAdminCommands(msg: TelegramIncomingMessage): Promise<boolean> {
  const chatId = msg.chat?.id
  const fromId = msg.from?.id
  const rawText = (msg.text || '').trim()
  if (!chatId || !fromId || !rawText) return false

  const isGroup = msg.chat?.type === 'group' || msg.chat?.type === 'supergroup'
  if (isGroup) {
    saveTargetChannelId(chatId)
  }

  const isAuthorized = await isUserAuthorizedAdmin(chatId, fromId, msg.sender_chat?.id)
  const textLower = rawText.toLowerCase()

  // 1. Diagnostics / Health check command (/test or /ping)
  if (
    textLower === '/test' ||
    textLower.startsWith('/test@') ||
    textLower === '/ping' ||
    textLower.startsWith('/ping@')
  ) {
    const roleText = isAuthorized
      ? '👑 رتبتك: <b>مشرف معتمد (Admin)</b> ✅'
      : '👤 رتبتك: <b>طالب / عضو</b>'
    const statusText =
      `🟢 <b>البوت متصل ويعمل بنجاح!</b>\n\n` +
      `${roleText}\n` +
      `🆔 المعرف: <code>${fromId}</code>\n\n` +
      (isAuthorized
        ? `الأوامر المتاحة لك:\n• /exam - إضافة امتحان\n• /homework - إضافة واجب\n• /report - إضافة تقرير\n• /cancel - إلغاء العملية الجارية`
        : `الأوامر المتاحة لك:\n• /start - فتح المنصة الأكاديمية\n• /open - رابط المنصة المباشر`)

    await sendTelegramMessage(chatId, statusText, {
      reply_to_message_id: msg.message_id,
    })
    return true
  }

  // 2. Cancel active session
  if (textLower === '/cancel' || textLower.startsWith('/cancel@')) {
    if (isAuthorized) {
      const active = clearUserSession(fromId)
      if (active?.promptMessageId) {
        await deleteTelegramMessage(chatId, active.promptMessageId).catch(() => {})
      }
      if (active?.triggerMessageId) {
        await deleteTelegramMessage(chatId, active.triggerMessageId).catch(() => {})
      }
      await deleteTelegramMessage(chatId, msg.message_id).catch(() => {})

      const cancelRes = await sendTelegramMessage(chatId, '🚫 تم إلغاء العملية وحذف مسودة الإدخال.')
      if (
        cancelRes.ok &&
        cancelRes.result &&
        typeof cancelRes.result === 'object' &&
        'message_id' in cancelRes.result
      ) {
        const cMsgId = (cancelRes.result as { message_id: number }).message_id
        // Auto-delete cancel message after 5 seconds
        setTimeout(() => {
          deleteTelegramMessage(chatId, cMsgId).catch(() => {})
        }, 5000)
      }
      return true
    }
    return false
  }

  // 3. Commands trigger
  if (textLower.startsWith('/exam')) {
    await promptAddCommand(chatId, fromId, 'exam', msg.message_id, msg.sender_chat?.id)
    return true
  }

  if (textLower.startsWith('/homework') || textLower.startsWith('/assignment')) {
    await promptAddCommand(chatId, fromId, 'assignment', msg.message_id, msg.sender_chat?.id)
    return true
  }

  if (textLower.startsWith('/report')) {
    await promptAddCommand(chatId, fromId, 'report', msg.message_id, msg.sender_chat?.id)
    return true
  }

  // 4. Input submission: ONLY process if the user is explicitly replying to the bot's prompt message!
  const replyTo = msg.reply_to_message
  if (!replyTo) {
    // Normal chat message — do NOT consume as form data!
    return false
  }

  let awaitingType: AwaitingType | null = null
  const session = getUserSession(fromId)

  if (session && session.promptMessageId && replyTo.message_id === session.promptMessageId) {
    awaitingType = session.type
  } else if (replyTo.text) {
    const rText = replyTo.text.toLowerCase()
    if (rText.includes('إضافة امتحان') || rText.includes('new exam') || rText.includes('exam')) {
      awaitingType = 'exam'
    } else if (
      rText.includes('إضافة واجب') ||
      rText.includes('new assignment') ||
      rText.includes('assignment') ||
      rText.includes('homework')
    ) {
      awaitingType = 'assignment'
    } else if (
      rText.includes('إضافة تقرير') ||
      rText.includes('new report') ||
      rText.includes('report')
    ) {
      awaitingType = 'report'
    }
  }

  if (!awaitingType || !isAuthorized || rawText.startsWith('/')) {
    return false
  }

  // Auto-delete the prompt message, the initial command trigger, and the user draft input
  const promptIdToDelete = session?.promptMessageId || replyTo.message_id
  if (promptIdToDelete) {
    await deleteTelegramMessage(chatId, promptIdToDelete).catch(() => {})
  }
  if (session?.triggerMessageId) {
    await deleteTelegramMessage(chatId, session.triggerMessageId).catch(() => {})
  }
  await deleteTelegramMessage(chatId, msg.message_id).catch(() => {})

  clearUserSession(fromId)

  // 5. Process incoming submission
  const kv = parseKeyValues(rawText)
  const courseQuery =
    kv['المادة'] ||
    kv['مادة'] ||
    kv['course'] ||
    kv['subject'] ||
    kv['class'] ||
    kv['module'] ||
    ''
  const course = findCourseByQuery(courseQuery)
  const titleStr =
    kv['العنوان'] ||
    kv['عنوان'] ||
    kv['title'] ||
    kv['topic'] ||
    kv['name'] ||
    rawText.split('\n')[0]

  if (awaitingType === 'exam' || awaitingType === 'assignment') {
    const placeStr =
      kv['القاعة'] ||
      kv['قاعة'] ||
      kv['المكان'] ||
      kv['مكان'] ||
      kv['hall'] ||
      kv['room'] ||
      kv['lab'] ||
      kv['place'] ||
      kv['location'] ||
      (awaitingType === 'exam' ? 'القسم' : 'تسليم إلكتروني')
    const timeStr = kv['الوقت'] || kv['وقت'] || kv['time'] || '10:00'
    const descStr =
      kv['التفاصيل'] ||
      kv['تفاصيل'] ||
      kv['desc'] ||
      kv['description'] ||
      kv['details'] ||
      kv['notes'] ||
      kv['note'] ||
      ''
    const rawDue =
      kv['الموعد'] ||
      kv['موعد'] ||
      kv['due'] ||
      kv['date'] ||
      kv['deadline'] ||
      kv['when'] ||
      'بعد 3 أيام'
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

    const typeWord = awaitingType === 'exam' ? 'الامتحان | Exam' : 'الواجب | Assignment'
    const confirmationText =
      `✅ <b>تم نشر ${typeWord} بنجاح! | Published Successfully!</b>\n\n` +
      formatActivityNotification(activity, course)

    await sendTelegramMessage(chatId, confirmationText)

    // Broadcast to Telegram Channel (if different from this chat)
    await sendChannelBroadcast(
      formatActivityNotification(activity, course),
      '/activities',
      '📝 فتح صفحة الامتحانات والواجبات'
    ).catch(() => {})

    return true
  }

  if (awaitingType === 'report') {
    const authorStr =
      kv['الكاتب'] ||
      kv['كاتب'] ||
      kv['author'] ||
      kv['by'] ||
      kv['student'] ||
      kv['writer'] ||
      'ناشر معتمد'
    const rawCategory =
      kv['النوع'] ||
      kv['نوع'] ||
      kv['category'] ||
      kv['type'] ||
      kv['kind'] ||
      'course'
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

    const confirmationText =
      `✅ <b>تم نشر التقرير بنجاح! | Report Published Successfully!</b>\n\n` +
      formatReportNotification(report, course)

    await sendTelegramMessage(chatId, confirmationText)

    // Broadcast to Telegram Channel (if different from this chat)
    await sendChannelBroadcast(
      formatReportNotification(report, course),
      '/reports',
      '📊 فتح صفحة التقارير'
    ).catch(() => {})

    return true
  }

  return false
}
