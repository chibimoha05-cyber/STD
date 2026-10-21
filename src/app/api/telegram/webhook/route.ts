import { NextRequest, NextResponse } from 'next/server'
import { isTelegramAdmin, getAdminIds } from '@/lib/telegram/config'
import {
  sendTelegramMessage,
  sendChannelBroadcast,
  saveTargetChannelId,
  buildWebAppKeyboard,
  formatMorningBriefing,
} from '@/lib/telegram/bot'
import { fetchCourses, fetchSlots, fetchScheduleExceptions, fetchActivities } from '@/lib/data/academic'
import { getDaySchedule } from '@/lib/utils/schedule'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // 1. Listen for Bot being added to Channel / Group as Administrator
    if (body.my_chat_member) {
      const chat = body.my_chat_member.chat
      const status = body.my_chat_member.new_chat_member?.status

      if (status === 'administrator') {
        saveTargetChannelId(chat.id)

        // Send confirmation announcement to the channel
        await sendTelegramMessage(
          chat.id,
          `<b>🎓 تم تفعيل البوت الأكاديمي بنجاح في القناة!</b>\n\n` +
            `سيتم نشر مواعيد الامتحانات، الواجبات، وتنبيهات المحاضرات الصباحية هنا تلقائياً.\n` +
            `يمكنكم فتح المنصة الأكاديمية في أي وقت من الزر أدناه 👇`,
          {
            reply_markup: buildWebAppKeyboard('🚀 فتح المنصة الأكاديمية', '/courses/c4'),
          }
        )

        // Notify Admins
        const adminIds = getAdminIds()
        for (const adminId of adminIds) {
          await sendTelegramMessage(
            adminId,
            `📢 <b>تنبيه الإدارة:</b>\nتمت إضافة البوت كأدمن في القناة بنجاح!\n` +
              `🏷️ <b>اسم القناة:</b> ${chat.title || 'بدون اسم'}\n` +
              `🆔 <b>معرف القناة:</b> <code>${chat.id}</code>`
          )
        }

        return NextResponse.json({ ok: true })
      }
    }

    // 2. Handle Text Messages & Commands
    if (body.message && body.message.text) {
      const msg = body.message
      const text = msg.text.trim()
      const chatId = msg.chat.id
      const userId = msg.from.id
      const isAdmin = isTelegramAdmin(userId)

      // Command: /id or /myid
      if (text.startsWith('/id') || text.startsWith('/myid')) {
        const roleText = isAdmin ? 'مسؤول معتمد (Admin) 👑' : 'طالب (Student) 🎓'
        await sendTelegramMessage(
          chatId,
          `🆔 <b>معرف تيليجرام الخاص بك:</b> <code>${userId}</code>\n` +
            `👤 <b>الاسم:</b> ${msg.from.first_name || ''} ${msg.from.last_name || ''}\n` +
            `🛡️ <b>الرتبة:</b> ${roleText}`
        )
        return NextResponse.json({ ok: true })
      }

      // Command: /start
      if (text.startsWith('/start')) {
        if (isAdmin) {
          await sendTelegramMessage(
            chatId,
            `👋 <b>أهلاً بك يا أدمن (${msg.from.first_name})!</b> 👑\n\n` +
              `أنت مصرح لك بنشر الإعلانات وإدارة تنبيهات القناة.\n\n` +
              `<b>الأوامر المتاحة لك:</b>\n` +
              `📢 <code>/post [نص الإعلان]</code> - نشر إعلان فوري بالقناة\n` +
              `☀️ <code>/today</code> - عرض محاضرات اليوم\n` +
              `📝 <code>/exams</code> - عرض الامتحانات القادمة\n` +
              `🆔 <code>/id</code> - عرض معرفك الرقمي`,
            {
              reply_markup: buildWebAppKeyboard('🚀 فتح المنصة الأكاديمية', '/courses/c4'),
            }
          )
        } else {
          await sendTelegramMessage(
            chatId,
            `🎓 <b>أهلاً بك في بوت المنصة الأكاديمية!</b>\n\n` +
              `تابع جدول المحاضرات، تنبيهات القاعات، والواجبات مباشرة من تيليجرام.\n` +
              `اضغط الزر أدناه لفتح المنصة 👇`,
            {
              reply_markup: buildWebAppKeyboard('🚀 فتح المنصة الأكاديمية', '/courses/c4'),
            }
          )
        }
        return NextResponse.json({ ok: true })
      }

      // Command: /post [announcement text] (Admins Only)
      if (text.startsWith('/post')) {
        if (!isAdmin) {
          await sendTelegramMessage(chatId, `⚠️ <b>عذراً:</b> هذا الأمر مخصص لمسؤولي المرحلة فقط.`)
          return NextResponse.json({ ok: true })
        }

        const announcementText = text.replace(/^\/post\s*/, '').trim()
        if (!announcementText) {
          await sendTelegramMessage(
            chatId,
            `⚠️ يرجى كتابة نص الإعلان بعد الأمر.\n\n<b>مثال:</b>\n<code>/post امتحان الشهر الثاني لمادة قواعد البيانات الأحد القادم في قاعة 2</code>`
          )
          return NextResponse.json({ ok: true })
        }

        const formatted =
          `📢 <b>إعلان رسمي من إدارة المرحلة</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `${announcementText}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `✍️ <i>بواسطة: ${msg.from.first_name || 'مسؤول'}</i>`

        const broadcastRes = await sendChannelBroadcast(formatted, '/courses/c4', '📱 فتح المنصة')
        if (broadcastRes.ok) {
          await sendTelegramMessage(chatId, `✅ <b>تم نشر الإعلان في القناة بنجاح!</b>`)
        } else {
          await sendTelegramMessage(
            chatId,
            `❌ <b>فشل النشر:</b> ${broadcastRes.description || 'تأكد من إضافة البوت كأدمن في القناة أولاً.'}`
          )
        }
        return NextResponse.json({ ok: true })
      }

      // Command: /today
      if (text.startsWith('/today') || text.includes('محاضرات اليوم')) {
        const [courses, slots, exceptions] = await Promise.all([
          fetchCourses(),
          fetchSlots(),
          fetchScheduleExceptions(),
        ])
        const todaySlots = getDaySchedule(0, slots, exceptions)
        const mapped = todaySlots.map((s) => ({
          slot: s,
          course: courses.find((c) => c.id === s.courseId),
          ex: s.ex,
        }))

        const briefing = formatMorningBriefing(mapped)
        await sendTelegramMessage(chatId, briefing, {
          reply_markup: buildWebAppKeyboard('📅 عرض الجدول الكامل', '/schedule'),
        })
        return NextResponse.json({ ok: true })
      }

      // Command: /exams
      if (text.startsWith('/exams') || text.includes('الامتحانات')) {
        const [courses, activities] = await Promise.all([fetchCourses(), fetchActivities()])
        const exams = activities
          .filter((a) => a.kind === 'exam' && a.due >= 0)
          .sort((a, b) => a.due - b.due)

        if (!exams.length) {
          await sendTelegramMessage(chatId, `🎉 <b>لا توجد امتحانات قادمة قريبة!</b>`)
        } else {
          let msgText = `<b>📝 جدول الامتحانات القادمة</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n`
          for (const ex of exams) {
            const course = courses.find((c) => c.id === ex.courseId)
            const courseName = course ? course.name.ar : ex.courseId
            msgText += `📌 <b>${courseName}</b> - ${ex.title.ar}\n`
            msgText += `   🗓️ بعد ${ex.due} أيام${ex.time ? ` (${ex.time})` : ''} | 📍 ${ex.place.ar || 'القاعة'}\n\n`
          }
          await sendTelegramMessage(chatId, msgText, {
            reply_markup: buildWebAppKeyboard('📖 فتح قسم الامتحانات', '/activities'),
          })
        }
        return NextResponse.json({ ok: true })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[TelegramWebhook] Handler error:', err)
    return NextResponse.json({ ok: true })
  }
}
