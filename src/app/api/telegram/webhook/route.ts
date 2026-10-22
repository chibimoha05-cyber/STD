import { NextRequest, NextResponse } from 'next/server'
import {
  sendTelegramMessage,
  buildWebAppKeyboard,
  saveTargetChannelId,
} from '@/lib/telegram/bot'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // 1. Channel / Group updates
    if (body.my_chat_member?.chat) {
      saveTargetChannelId(body.my_chat_member.chat.id)
      return NextResponse.json({ ok: true })
    }

    // 2. Only /start and direct opening button
    if (body.message) {
      const msg = body.message
      const chatId = msg.chat?.id
      if (!chatId) return NextResponse.json({ ok: true })

      const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup'
      if (isGroup) {
        saveTargetChannelId(chatId)
      }

      await sendTelegramMessage(
        chatId,
        `🎓 <b>المنصة الأكاديمية – قسم علوم الحاسبات</b>\n\n` +
          `أهلاً بكم في المنصة الأكاديمية الرسمية.\n` +
          `اضغطوا على الزر أدناه لفتح المنصة ومتابعة المحاضرات والملازم والامتحانات مباشرة 👇`,
        {
          reply_markup: buildWebAppKeyboard('🚀 فتح المنصة الأكاديمية', '', !isGroup),
        }
      )
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[TelegramWebhook] Handler error:', err)
    return NextResponse.json({ ok: true })
  }
}
