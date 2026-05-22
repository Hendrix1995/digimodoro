import { daysBetween } from './time-slot.js'
import type { PetState, Tunables } from './types.js'

// How many full days the pet has gone without completing a fork. Computed
// idempotently from `lastForkAt` so calling rollover repeatedly with the same
// `now` is a no-op.
//
// Day 0 (today) is always a grace period — you can still complete a fork later
// today. We only count a "missed day" once a full calendar day has elapsed
// without any fork. So lastForkAt = yesterday → missDays = 0;
// lastForkAt = day before yesterday → missDays = 1.
export function computeMissDays(state: PetState, now: number): number {
  if (state.streak.lastForkAt <= 0) return 0
  const days = daysBetween(state.streak.lastForkAt, now)
  return Math.max(0, days - 1)
}

export function rolloverStreak(state: PetState, now: number): PetState {
  const missDays = computeMissDays(state, now)
  if (missDays === state.streak.missDays) return state
  const delta = Math.max(0, missDays - state.streak.missDays)
  return {
    ...state,
    streak: {
      ...state.streak,
      missDays,
      lifetimeMisses: state.streak.lifetimeMisses + delta,
    },
  }
}

export function shouldRip(state: PetState, tunables: Tunables): boolean {
  return !state.rip && state.streak.missDays >= tunables.STREAK_MISS_RIP_DAYS
}

export type StreakSeverity = 'ok' | 'soft' | 'hard' | 'rip'

export function streakSeverity(state: PetState, tunables: Tunables): StreakSeverity {
  const d = state.streak.missDays
  if (d >= tunables.STREAK_MISS_RIP_DAYS) return 'rip'
  if (d >= tunables.STREAK_MISS_HARD_DAYS) return 'hard'
  if (d >= tunables.STREAK_MISS_SOFT_DAYS) return 'soft'
  return 'ok'
}
