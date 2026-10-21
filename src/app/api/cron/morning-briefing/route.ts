import { NextRequest, NextResponse } from 'next/server'
import { fetchCourses, fetchSlots, fetchScheduleExceptions } from '@/lib/data/academic'
import { getDaySchedule } from '@/lib/utils/schedule'
import { formatMorningBriefing, sendChannelBroadcast } from '@/lib/telegram/bot'

export async function GET(req: NextRequest) {
  try {
    // Verify optional cron secret if configured
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday

    // Weekend in Iraqi Universities: Friday (5) and Saturday (6)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      return NextResponse.json({
        ok: true,
        message: 'Weekend in Iraq (Friday/Saturday) - morning briefing skipped',
      })
    }

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

    const briefingText = formatMorningBriefing(mapped)
    const broadcastRes = await sendChannelBroadcast(
      briefingText,
      '/schedule',
      '📅 فتح جدول اليوم الكامل'
    )

    return NextResponse.json({
      ok: true,
      broadcastRes,
      lectureCount: todaySlots.length,
    })
  } catch (err) {
    console.error('[MorningBriefingCron] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
