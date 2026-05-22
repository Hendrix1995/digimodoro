import type { TimeSlot } from './types.js'

// Slot boundaries in local-time hours (inclusive start, exclusive end).
// `night` wraps around midnight.
//   morning : 05–09
//   forenoon: 09–12
//   midday  : 12–17
//   evening : 17–21
//   night   : 21–05
export function getTimeSlot(epochSec: number): TimeSlot {
  const hour = new Date(epochSec * 1000).getHours()
  if (hour >= 5 && hour < 9) return 'morning'
  if (hour >= 9 && hour < 12) return 'forenoon'
  if (hour >= 12 && hour < 17) return 'midday'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

// Local-time day key (YYYY-MM-DD) — used to detect day rollovers for the
// streak-miss counter so 1 fork at 23:59 and 1 fork at 00:01 count as two
// separate days.
export function dayKey(epochSec: number): string {
  const d = new Date(epochSec * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Whole local-day difference (later - earlier) — assumes both are in the same
// time zone. Used to decide how many "missed days" to credit on rollover.
export function daysBetween(earlierSec: number, laterSec: number): number {
  if (laterSec <= earlierSec) return 0
  const a = new Date(earlierSec * 1000)
  const b = new Date(laterSec * 1000)
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.max(0, Math.round((bMid - aMid) / 86_400_000))
}
