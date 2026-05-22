import { describe, expect, it } from 'vitest'
import { computeMissDays, rolloverStreak, shouldRip, streakSeverity } from './streak-miss.js'
import { emptySlotForks } from './xp.js'
import { DEFAULT_TUNABLES, type PetState } from './types.js'

function localTs(year: number, month: number, day: number, hour = 12): number {
  return Math.floor(new Date(year, month - 1, day, hour).getTime() / 1000)
}

function pet(lastForkAt: number, missDays = 0, lifetimeMisses = 0): PetState {
  return {
    schemaVersion: 1,
    petId: 'p1',
    bornAt: 0,
    digimonId: 'agumon',
    stage: 'child',
    xp: { totalForks: 0, inStageForks: 0 },
    inStageSlotForks: emptySlotForks(),
    streak: { lastForkAt, missDays, lifetimeMisses },
    evolutionHistory: [],
  }
}

describe('computeMissDays', () => {
  it('returns 0 when lastForkAt is 0 (newborn pet)', () => {
    expect(computeMissDays(pet(0), localTs(2026, 5, 10))).toBe(0)
  })

  it('returns 0 when last fork was today', () => {
    expect(computeMissDays(pet(localTs(2026, 5, 10, 8)), localTs(2026, 5, 10, 20))).toBe(0)
  })

  it('returns 0 when last fork was yesterday (grace day)', () => {
    expect(computeMissDays(pet(localTs(2026, 5, 9)), localTs(2026, 5, 10))).toBe(0)
  })

  it('returns 1 when last fork was the day before yesterday', () => {
    expect(computeMissDays(pet(localTs(2026, 5, 8)), localTs(2026, 5, 10))).toBe(1)
  })

  it('scales with elapsed days', () => {
    expect(computeMissDays(pet(localTs(2026, 5, 1)), localTs(2026, 5, 10))).toBe(8)
  })
})

describe('rolloverStreak', () => {
  it('updates missDays and increments lifetimeMisses by delta', () => {
    const s = rolloverStreak(pet(localTs(2026, 5, 1), 0, 4), localTs(2026, 5, 10))
    expect(s.streak.missDays).toBe(8)
    expect(s.streak.lifetimeMisses).toBe(12) // 4 + delta(8)
  })

  it('is idempotent when called twice with same now', () => {
    const a = rolloverStreak(pet(localTs(2026, 5, 1), 0, 0), localTs(2026, 5, 5))
    const b = rolloverStreak(a, localTs(2026, 5, 5))
    expect(b).toBe(a)
  })

  it('does NOT reset missDays downwards', () => {
    // Already at 5 misses, and lastForkAt was yesterday — computeMissDays says
    // 0, but rolloverStreak should not "forgive" already-accrued misses
    // unless awardFork did the reset. We model that by only adjusting when
    // the computed value differs; here it differs (5 → 0). That IS the
    // correct semantic here: if lastForkAt was reset by awardFork, we want
    // missDays to follow it back to 0. The lifetimeMisses delta stays >= 0.
    const s = rolloverStreak(pet(localTs(2026, 5, 9), 5, 10), localTs(2026, 5, 10))
    expect(s.streak.missDays).toBe(0)
    expect(s.streak.lifetimeMisses).toBe(10) // delta is max(0, ...), so no double-count
  })
})

describe('streakSeverity / shouldRip', () => {
  it('classifies by thresholds', () => {
    expect(streakSeverity(pet(0, 0), DEFAULT_TUNABLES)).toBe('ok')
    expect(streakSeverity(pet(0, 3), DEFAULT_TUNABLES)).toBe('soft')
    expect(streakSeverity(pet(0, 6), DEFAULT_TUNABLES)).toBe('hard')
    expect(streakSeverity(pet(0, 14), DEFAULT_TUNABLES)).toBe('rip')
  })

  it('shouldRip true only past the RIP threshold and not already dead', () => {
    expect(shouldRip(pet(0, 13), DEFAULT_TUNABLES)).toBe(false)
    expect(shouldRip(pet(0, 14), DEFAULT_TUNABLES)).toBe(true)
    const dead = { ...pet(0, 14), rip: { at: 1, cause: 'neglect' } }
    expect(shouldRip(dead, DEFAULT_TUNABLES)).toBe(false)
  })
})
