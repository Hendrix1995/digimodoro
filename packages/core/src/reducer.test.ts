import { describe, expect, it } from 'vitest'
import { initialState, reduce } from './reducer.js'
import {
  DEFAULT_TUNABLES,
  type EvolutionRule,
  type PetState,
  type TimeSlot,
  type Tunables,
} from './types.js'

function localTs(year: number, month: number, day: number, hour = 12, minute = 0): number {
  return Math.floor(new Date(year, month - 1, day, hour, minute).getTime() / 1000)
}

const allSlotsTo = (to: string): EvolutionRule['branches'] =>
  (['morning', 'forenoon', 'midday', 'evening', 'night'] as TimeSlot[]).map((slot) => ({
    slot,
    to,
  }))

// Small, deterministic rule set covering one egg → fresh → adult path plus a
// branching adult.
const RULES: EvolutionRule[] = [
  { from: 'egg', forksRequired: 1, branches: allSlotsTo('botamon') },
  { from: 'botamon', forksRequired: 2, branches: allSlotsTo('koromon') },
  { from: 'koromon', forksRequired: 2, branches: allSlotsTo('agumon') },
  {
    from: 'agumon',
    forksRequired: 4,
    branches: [
      { slot: 'morning', to: 'greymon' },
      { slot: 'forenoon', to: 'monochromon' },
      { slot: 'midday', to: 'tyrannomon' },
      { slot: 'evening', to: 'devimon' },
      { slot: 'night', to: 'numemon' },
    ],
  },
]

const T: Tunables = { ...DEFAULT_TUNABLES, LUCKY_ROLL_CHANCE: 0 }

function feedFork(state: PetState, slot: TimeSlot, now: number): PetState {
  return reduce(state, { type: 'pomodoro_completed', slot, now }, { rules: RULES, tunables: T })
    .state
}

describe('initialState', () => {
  it('creates an egg with all slot counters at 0', () => {
    const s = initialState({ now: 1000, petId: 'p1', seedEggVariant: 1, personality: 'calm' })
    expect(s.stage).toBe('egg')
    expect(s.digimonId).toBe('egg')
    expect(s.xp.totalForks).toBe(0)
    expect(s.inStageSlotForks).toEqual({
      morning: 0,
      forenoon: 0,
      midday: 0,
      evening: 0,
      night: 0,
    })
    expect(s.seedEggVariant).toBe(1)
    expect(s.personality).toBe('calm')
  })
})

describe('reduce: fork awards', () => {
  it('a completed pomodoro increments forks and slot counter', () => {
    const s0 = initialState({ now: 1000, petId: 'p1' })
    // egg has forksRequired=1, so 1 fork would hatch it. Use a pet already past
    // egg stage by piping through reducer once and asking for current slot.
    const s1 = reduce(
      s0,
      { type: 'pomodoro_completed', slot: 'midday', now: 1000 },
      { rules: RULES, tunables: T },
    )
    expect(s1.state.xp.totalForks).toBe(1)
    // Egg auto-hatched immediately so inStageSlotForks resets after evolve.
    expect(s1.evolved).toBe(true)
  })
})

describe('reduce: egg → fresh by variant', () => {
  it('falls back to branch.to when no variant is set', () => {
    const a = initialState({ now: 1000, petId: 'a' })
    const after = feedFork(a, 'morning', 1001)
    expect(after.digimonId).toBe('botamon') // all-slot branch
    expect(after.stage).toBe('fresh')
  })
})

describe('reduce: neglect leads to R.I.P.', () => {
  it('14+ days without a fork sets rip on next action', () => {
    let s = initialState({ now: localTs(2026, 5, 1), petId: 'lost' })
    s = feedFork(s, 'morning', localTs(2026, 5, 1, 9)) // hatches → botamon
    // Now skip ahead 20 days with no forks
    const future = localTs(2026, 5, 22, 9)
    const result = reduce(s, { type: 'tick', now: future }, { rules: RULES, tunables: T })
    expect(result.ripped).toBe(true)
    expect(result.state.rip).toBeDefined()
    expect(result.state.streak.missDays).toBeGreaterThanOrEqual(14)
  })

  it('completing a fork resets missDays to 0 and keeps lifetimeMisses', () => {
    let s = initialState({ now: localTs(2026, 5, 1), petId: 'recover' })
    s = feedFork(s, 'morning', localTs(2026, 5, 1, 9)) // hatch
    // 5 days pass — should accumulate 4 misses
    const t1 = reduce(
      s,
      { type: 'tick', now: localTs(2026, 5, 6, 9) },
      { rules: RULES, tunables: T },
    ).state
    expect(t1.streak.missDays).toBe(4)
    // Then a fork — missDays returns to 0, lifetimeMisses preserved
    const t2 = reduce(
      t1,
      { type: 'pomodoro_completed', slot: 'morning', now: localTs(2026, 5, 6, 9) },
      { rules: RULES, tunables: T },
    ).state
    expect(t2.streak.missDays).toBe(0)
    expect(t2.streak.lifetimeMisses).toBe(4)
  })
})

describe('reduce: determinism', () => {
  it('same pet + same actions → same evolution outcome', () => {
    const make = () => {
      let s = initialState({ now: 0, petId: 'twin' })
      // mix of slots that tie morning vs midday
      const slots: TimeSlot[] = ['morning', 'midday', 'morning', 'midday', 'midday']
      slots.forEach((slot, i) => {
        s = feedFork(s, slot, 100 + i)
      })
      return s
    }
    const a = make()
    const b = make()
    expect(a.digimonId).toBe(b.digimonId)
    expect(a.evolutionHistory).toEqual(b.evolutionHistory)
  })
})
