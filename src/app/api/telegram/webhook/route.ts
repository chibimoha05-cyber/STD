import { NextRequest, NextResponse } from 'next/server'
import {
  sendTelegramMessage,
  pinChatMessage,
  buildWebAppKeyboard,
  saveTargetChannelId,
} from '@/lib/telegram/bot'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // 1. When Bot is added to a Group or Channel (or promoted to admin)
    if (body.my_chat_member?.chat) {
      const chat = body.my_chat_member.chat
      const status = body.my_chat_member.new_chat_member?.status
      if (status === 'member' || status === 'administrator') {
        saveTargetChannelId(chat.id)

        const res = await sendTelegramMessage(
          chat.id,
          `🎓 <b>المنصة الأكاديمية – قسم علوم الحاسبات</b>\n\n` +
            `أهلاً بكم في المنصة الأكاديمية الرسمية.\n` +
            `اضغطوا على الزر أدناه لفتح المنصة مباشرة 👇`,
          {
            reply_markup: buildWebAppKeyboard('Open', '', false),
          }
        )

        if (res.ok && res.result && typeof res.result === 'object' && 'message_id' in res.result) {
          const msgId = (res.result as { message_id: number }).message_id
          await pinChatMessage(chat.id, msgId).catch(() => {})
        }
      }
      return NextResponse.json({ ok: true })
    }

    // 2. Incoming messages in Private chat or Groups
    if (body.message) {
      const msg = body.message
      const chatId = msg.chat?.id
      if (!chatId) return NextResponse.json({ ok: true })

      const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup'
      const text = (msg.text || '').trim().toLowerCase()

      // When bot is newly added to a group via user invite
      if (isGroup && Array.isArray(msg.new_chat_members)) {
        const isBotAdded = msg.new_chat_members.some(
          (u: { is_bot?: boolean; username?: string }) =>
            u.is_bot || u.username?.toLowerCase() === 'computerac_bot'
        )
        if (isBotAdded) {
          saveTargetChannelId(chatId)
          const res = await sendTelegramMessage(
            chatId,
            `🎓 <b>المنصة الأكاديمية – قسم علوم الحاسبات</b>\n\n` +
              `أهلاً بكم في المنصة الأكاديمية الرسمية.\n` +
              `اضغطوا على الزر أدناه لفتح المنصة ومتابعة المحاضرات والملازم مباشرة 👇`,
            {
              reply_markup: buildWebAppKeyboard('Open', '', false),
            }
          )
          if (res.ok && res.result && typeof res.result === 'object' && 'message_id' in res.result) {
            const msgId = (res.result as { message_id: number }).message_id
            await pinChatMessage(chatId, msgId).catch(() => {})
          }
          return NextResponse.json({ ok: true })
        }
      }

      // In groups: respond if message starts with /start, /open, or mentions the bot
      // In private: respond to any message or /start
      const shouldRespond =
        !isGroup ||
        text.startsWith('/start') ||
        text.startsWith('/open') ||
        text.includes('@computerac_bot')

      if (shouldRespond) {
        if (isGroup) {
          saveTargetChannelId(chatId)
        }

        await sendTelegramMessage(
          chatId,
          `🎓 <b>المنصة الأكاديمية – قسم علوم الحاسبات</b>\n\n` +
            `أهلاً بكم في المنصة الأكاديمية الرسمية.\n` +
            `اضغطوا على الزر أدناه لفتح المنصة ومتابعة المحاضرات والملازم والامتحانات مباشرة 👇`,
          {
            reply_markup: buildWebAppKeyboard('Open', '', !isGroup),
          }
        )
        return NextResponse.json({ ok: true })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[TelegramWebhook] Handler error:', err)
    return NextResponse.json({ ok: true })
  }
}
