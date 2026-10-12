import {
  dayFrom,
  type Course,
  type FileItem,
  type ScheduleException,
  type Slot,
} from '@/lib/data/initialData'
import { locale, tr, type Lang } from '@/lib/i18n/dict'

export interface DaySlot extends Slot {
  ex?: ScheduleException
}

/**
 * Returns timetable slots for a day offset relative to today (0 = today, -1 = yesterday, etc.)
 */
export function getDaySchedule(
  offset: number,
  allSlots: Slot[],
  allExceptions: ScheduleException[]
): DaySlot[] {
  const targetDate = dayFrom(offset)
  const weekday = targetDate.getDay()

  return allSlots
    .filter((s) => s.weekday === weekday)
    .map((s) => {
      const ex = allExceptions.find((e) => e.slotId === s.id && e.offset === offset)
      return {
        ...s,
        ex,
      }
    })
    .sort((a, b) => {
      const startA = a.ex?.start ?? a.start
      const startB = b.ex?.start ?? b.start
      return startA.localeCompare(startB)
    })
}

export function fmtDate(
  lang: Lang,
  offset: number,
  opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
) {
  return dayFrom(offset).toLocaleDateString(locale(lang), opts)
}

export function relPast(lang: Lang, daysAgo: number) {
  if (daysAgo === 0) return tr(lang, 'justNow')
  if (daysAgo === -1) return tr(lang, 'dayAgo')
  return tr(lang, 'daysAgo', { n: -daysAgo })
}

export function relFuture(lang: Lang, dueDays: number) {
  if (dueDays === 0) return tr(lang, 'dueToday')
  if (dueDays === 1) return tr(lang, 'inDay')
  return tr(lang, 'inDays', { n: dueDays })
}
