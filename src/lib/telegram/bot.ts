// Telegram Bot API client and academic message formatters

import { TELEGRAM_BOT_TOKEN, PLATFORM_BASE_URL } from './config'
import type { Activity, Resource, ScheduleException, Course, Slot } from '@/lib/data/initialData'
import fs from 'fs'
import path from 'path'

let memoryCachedChannelId: string | null = null
const CHANNEL_CACHE_FILE = path.join(process.cwd(), '.telegram_channel_id')
const TMP_CHANNEL_CACHE_FILE = '/tmp/.telegram_channel_id'

export function getTargetChannelId(): string | null {
  if (process.env.TELEGRAM_CHANNEL_ID) {
    return process.env.TELEGRAM_CHANNEL_ID
  }
  if (memoryCachedChannelId) {
    return memoryCachedChannelId
  }
  try {
    if (fs.existsSync(TMP_CHANNEL_CACHE_FILE)) {
      const cached = fs.readFileSync(TMP_CHANNEL_CACHE_FILE, 'utf8').trim()
      if (cached) return cached
    }
  } catch {}
  try {
    if (fs.existsSync(CHANNEL_CACHE_FILE)) {
      const cached = fs.readFileSync(CHANNEL_CACHE_FILE, 'utf8').trim()
      if (cached) return cached
    }
  } catch {}
  return null
}

export function saveTargetChannelId(channelId: string | number): void {
  const strId = String(channelId)
  memoryCachedChannelId = strId
  try {
    fs.writeFileSync(TMP_CHANNEL_CACHE_FILE, strId, 'utf8')
  } catch {}
  try {
    fs.writeFileSync(CHANNEL_CACHE_FILE, strId, 'utf8')
  } catch {}
}

export interface SendMessageOptions {
  parse_mode?: 'HTML' | 'MarkdownV2'
  reply_markup?: unknown
  disable_web_page_preview?: boolean
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: SendMessageOptions = {}
): Promise<{ ok: boolean; result?: unknown; description?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN is not configured' }
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode || 'HTML',
        disable_web_page_preview: options.disable_web_page_preview ?? true,
        reply_markup: options.reply_markup,
      }),
    })

    return await res.json()
  } catch (err) {
    console.error('[TelegramBot] Network error sending message:', err)
    return { ok: false, description: String(err) }
  }
}

export async function pinChatMessage(
  chatId: string | number,
  messageId: number
): Promise<{ ok: boolean; description?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN is not configured' }
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/pinChatMessage`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        disable_notification: false,
      }),
    })
    return await res.json()
  } catch (err) {
    return { ok: false, description: String(err) }
  }
}

export function buildWebAppKeyboard(buttonText: string, subPath = '', isPrivate = false) {
  const fullUrl = `${PLATFORM_BASE_URL}${subPath.startsWith('/') ? subPath : `/${subPath}`}`
  if (isPrivate) {
    return {
      inline_keyboard: [
        [
          {
            text: buttonText,
            web_app: {
              url: fullUrl,
            },
          },
        ],
      ],
    }
  }
  return {
    inline_keyboard: [
      [
        {
          text: buttonText,
          url: fullUrl,
        },
      ],
    ],
  }
}

export async function sendChannelBroadcast(
  text: string,
  webAppSubPath = '/courses/c4',
  buttonLabel = '🚀 فتح المنصة الأكاديمية'
): Promise<{ ok: boolean; description?: string }> {
  const channelId = getTargetChannelId()
  if (!channelId) {
    return { ok: false, description: 'No channel configured. Invite bot as Admin to channel first.' }
  }

  const reply_markup = buildWebAppKeyboard(buttonLabel, webAppSubPath, false)
  return await sendTelegramMessage(channelId, text, {
    parse_mode: 'HTML',
    reply_markup,
  })
}

// ================= Formatting Helpers (Arabic RTL) =================

export function formatActivityNotification(activity: Activity, course?: Course): string {
  const isExam = activity.kind === 'exam'
  const icon = isExam ? '📝' : '📌'
  const header = isExam ? 'إشعار امتحان جديد' : 'واجب / تكليف دراسي جديد'

  let msg = `<b>${icon} ${header}</b>\n\n`
  if (course) {
    msg += `📚 <b>المادة:</b> ${course.name.ar} (${course.code})\n`
    msg += `👨‍🏫 <b>المحاضر:</b> ${course.instructor.ar}\n`
  }
  msg += `🏷️ <b>العنوان:</b> ${activity.title.ar}\n`
  msg += `🗓️ <b>الموعد:</b> بعد ${activity.due} أيام${activity.time ? ` (الساعة ${activity.time})` : ''}\n`
  if (activity.place.ar) {
    msg += `📍 <b>المكان:</b> ${activity.place.ar}\n`
  }
  if (activity.desc.ar) {
    msg += `\n💬 <b>تفاصيل:</b>\n${activity.desc.ar}\n`
  }

  return msg
}

export function formatResourceNotification(resource: Resource, course?: Course): string {
  let typeArabic = 'ملف تعليمي'
  if (resource.type === 'notes') typeArabic = 'ملاحظات وسلايدات المحاضرة'
  if (resource.type === 'summary') typeArabic = 'ملخص دراسي'
  if (resource.type === 'pastExam') typeArabic = 'أسئلة سنوات سابقة'
  if (resource.type === 'source') typeArabic = 'مصدر / كتاب المادة'

  let msg = `<b>📚 إضافة مادة ومصادر جديدة</b>\n\n`
  if (course) {
    msg += `📖 <b>المادة:</b> ${course.name.ar} (${course.code})\n`
  }
  msg += `🏷️ <b>العنوان:</b> ${resource.title.ar}\n`
  msg += `📂 <b>النوع:</b> ${typeArabic}\n`
  if (resource.files && resource.files.length > 0) {
    msg += `📎 <b>عدد المرفقات:</b> ${resource.files.length} ملف\n`
  }

  return msg
}

export function formatScheduleExceptionNotification(
  exception: ScheduleException,
  course?: Course
): string {
  let typeArabic = 'تعديل جدول المحاضرة'
  let icon = '⚠️'
  if (exception.type === 'cancelled') {
    typeArabic = 'إلغاء محاضرة'
    icon = '🚫'
  } else if (exception.type === 'moved') {
    typeArabic = 'تغيير موعد المحاضرة'
    icon = '⏰'
  } else if (exception.type === 'room') {
    typeArabic = 'تغيير قاعة المحاضرة'
    icon = '📍'
  }

  let msg = `<b>${icon} تنبيه عاجل: ${typeArabic}</b>\n\n`
  if (course) {
    msg += `📚 <b>المادة:</b> ${course.name.ar} (${course.code})\n`
  }
  if (exception.room) {
    msg += `🏢 <b>القاعة الجديدة:</b> ${exception.room}\n`
  }
  if (exception.start && exception.end) {
    msg += `⏰ <b>الوقت المعدل:</b> ${exception.start} - ${exception.end}\n`
  }
  if (exception.note.ar) {
    msg += `💬 <b>ملاحظة:</b> ${exception.note.ar}\n`
  }

  return msg
}

export function formatMorningBriefing(
  slots: { slot: Slot; course?: Course; ex?: ScheduleException }[]
): string {
  let msg = `<b>☀️ صباح الخير! جدول محاضرات اليوم</b>\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`

  if (!slots.length) {
    msg += `🎉 لا توجد محاضرات مقررة لهذا اليوم! استمتعوا بوقتكم.\n`
    return msg
  }

  for (const item of slots) {
    const isCancelled = item.ex?.type === 'cancelled'
    const statusIcon = isCancelled ? '🚫' : item.slot.kind === 'lab' ? '🔬' : '📖'
    const courseName = item.course ? item.course.name.ar : item.slot.courseId
    const room = item.ex?.room || item.slot.room
    const time = `${item.ex?.start || item.slot.start} - ${item.ex?.end || item.slot.end}`

    if (isCancelled) {
      msg += `<s>${statusIcon} <b>${courseName}</b> (${time})</s>\n`
      msg += `   └ ⚠️ <b>ملغية:</b> ${item.ex?.note.ar || 'تم إلغاء المحاضرة'}\n\n`
    } else {
      msg += `${statusIcon} <b>${courseName}</b>\n`
      msg += `   ⏰ ${time} | 📍 ${room}\n`
      if (item.course?.instructor.ar) {
        msg += `   👨‍🏫 ${item.course.instructor.ar}\n`
      }
      if (item.ex?.note.ar) {
        msg += `   💬 <i>${item.ex.note.ar}</i>\n`
      }
      msg += `\n`
    }
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `نتمنى لكم يوماً دراسياً موفقاً! ✨`
  return msg
}

