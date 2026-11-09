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
    `⚠️ <b>تنبيه:</b> يجب الرد (Reply) المباشر على هذه الرسالة لإرسال البيانات بالشكل التالي:\n\n` +
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
    if (replyTo.text.includes('إضافة امتحان')) awaitingType = 'exam'
    else if (replyTo.text.includes('إضافة واجب')) awaitingType = 'assignment'
    else if (replyTo.text.includes('إضافة تقرير')) awaitingType = 'report'
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

    const typeWord = awaitingType === 'exam' ? 'الامتحان' : 'الواجب'
    const confirmationText =
      `✅ <b>تم نشر ${typeWord} بنجاح!</b>\n\n` +
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

    const confirmationText =
      `✅ <b>تم نشر التقرير بنجاح!</b>\n\n` +
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
