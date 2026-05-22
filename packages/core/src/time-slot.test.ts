import { describe, expect, it } from 'vitest'
import { dayKey, daysBetween, getTimeSlot } from './time-slot.js'

// Helper: build an epoch-second value from local-time hour/minute on a fixed day.
function localTs(year: number, month: number, day: number, hour: number, minute = 0): number {
  return Math.floor(new Date(year, month - 1, day, hour, minute).getTime() / 1000)
}

describe('getTimeSlot', () => {
  it('returns morning for 05–09', () => {
    expect(getTimeSlot(localTs(2026, 5, 1, 5, 0))).toBe('morning')
    expect(getTimeSlot(localTs(2026, 5, 1, 8, 59))).toBe('morning')
  })

  it('returns forenoon for 09–12', () => {
    expect(getTimeSlot(localTs(2026, 5, 1, 9, 0))).toBe('forenoon')
    expect(getTimeSlot(localTs(2026, 5, 1, 11, 59))).toBe('forenoon')
  })

  it('returns midday for 12–17', () => {
    expect(getTimeSlot(localTs(2026, 5, 1, 12, 0))).toBe('midday')
    expect(getTimeSlot(localTs(2026, 5, 1, 16, 59))).toBe('midday')
  })

  it('returns evening for 17–21', () => {
    expect(getTimeSlot(localTs(2026, 5, 1, 17, 0))).toBe('evening')
    expect(getTimeSlot(localTs(2026, 5, 1, 20, 59))).toBe('evening')
  })

  it('returns night for 21–05 (wraps midnight)', () => {
    expect(getTimeSlot(localTs(2026, 5, 1, 21, 0))).toBe('night')
    expect(getTimeSlot(localTs(2026, 5, 1, 23, 59))).toBe('night')
    expect(getTimeSlot(localTs(2026, 5, 2, 0, 0))).toBe('night')
    expect(getTimeSlot(localTs(2026, 5, 2, 4, 59))).toBe('night')
  })
})

describe('dayKey', () => {
  it('formats local date as YYYY-MM-DD', () => {
    expect(dayKey(localTs(2026, 5, 1, 12, 0))).toBe('2026-05-01')
    expect(dayKey(localTs(2026, 12, 31, 23, 59))).toBe('2026-12-31')
  })
})

describe('daysBetween', () => {
  it('returns 0 for same calendar day regardless of hour', () => {
    expect(daysBetween(localTs(2026, 5, 1, 0, 1), localTs(2026, 5, 1, 23, 59))).toBe(0)
  })

  it('returns 1 across midnight even if only minutes apart', () => {
    expect(daysBetween(localTs(2026, 5, 1, 23, 59), localTs(2026, 5, 2, 0, 1))).toBe(1)
  })

  it('returns 0 when later <= earlier', () => {
    expect(daysBetween(localTs(2026, 5, 5, 12, 0), localTs(2026, 5, 1, 12, 0))).toBe(0)
  })
})
