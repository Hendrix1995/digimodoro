import { describe, expect, it } from 'vitest'
import {
  applyPersonalityWeights,
  dominantSlot,
  freshForEggVariant,
  isReadyToEvolve,
  nextStage,
  pickBranch,
} from './evolution.js'
import { emptySlotForks } from './xp.js'
import {
  DEFAULT_TUNABLES,
  type EvolutionRule,
  type SlotForks,
  type Tunables,
} from './types.js'

const noLuckTunables: Tunables = { ...DEFAULT_TUNABLES, LUCKY_ROLL_CHANCE: 0 }
const alwaysLuckyTunables: Tunables = { ...DEFAULT_TUNABLES, LUCKY_ROLL_CHANCE: 1 }

function forks(partial: Partial<SlotForks>): SlotForks {
  return { ...emptySlotForks(), ...partial }
}

const rule: EvolutionRule = {
  from: 'agumon',
  forksRequired: 10,
  branches: [
    { slot: 'morning', to: 'greymon' },
    { slot: 'forenoon', to: 'monochromon' },
    { slot: 'midday', to: 'tyrannomon' },
    { slot: 'evening', to: 'devimon' },
    { slot: 'night', to: 'numemon' },
  ],
}

describe('isReadyToEvolve', () => {
  it('compares forks to threshold', () => {
    expect(isReadyToEvolve(rule, 9)).toBe(false)
    expect(isReadyToEvolve(rule, 10)).toBe(true)
    expect(isReadyToEvolve(rule, 99)).toBe(true)
  })
})

describe('applyPersonalityWeights', () => {
  it('returns identical numbers for calm', () => {
    const f = forks({ morning: 4, night: 2 })
    expect(applyPersonalityWeights(f, 'calm')).toEqual(f)
  })

  it('boosts morning/forenoon for holy', () => {
    const f = forks({ morning: 10, night: 10 })
    const w = applyPersonalityWeights(f, 'holy')
    expect(w.morning).toBeGreaterThan(w.night)
  })

  it('boosts night for savage', () => {
    const f = forks({ morning: 10, night: 10 })
    const w = applyPersonalityWeights(f, 'savage')
    expect(w.night).toBeGreaterThan(w.morning)
  })
})

describe('dominantSlot', () => {
  it('picks the slot with most forks', () => {
    expect(dominantSlot(forks({ morning: 5, evening: 2 }), undefined, 'seed')).toBe('morning')
    expect(dominantSlot(forks({ night: 7, midday: 2 }), undefined, 'seed')).toBe('night')
  })

  it('ties are deterministic per seed', () => {
    const f = forks({ morning: 3, night: 3 })
    const a = dominantSlot(f, undefined, 'pet-a:tie:0')
    const b = dominantSlot(f, undefined, 'pet-a:tie:0')
    expect(a).toBe(b)
  })

  it('personality tilts close calls', () => {
    // morning vs night, equal raw count; savage should push night.
    const f = forks({ morning: 10, night: 10 })
    expect(dominantSlot(f, 'savage', 'any')).toBe('night')
    expect(dominantSlot(f, 'holy', 'any')).toBe('morning')
  })
})

describe('pickBranch (no luck)', () => {
  it('returns branch matching dominant slot', () => {
    const pick = pickBranch(rule, forks({ midday: 8 }), undefined, 'pet1', 0, noLuckTunables)
    expect(pick.branch.to).toBe('tyrannomon')
    expect(pick.dominantSlot).toBe('midday')
    expect(pick.luckySwerved).toBe(false)
  })

  it('respects personality bias on near-ties', () => {
    const pick = pickBranch(
      rule,
      forks({ evening: 5, night: 5 }),
      'savage',
      'pet1',
      0,
      noLuckTunables,
    )
    expect(pick.branch.to).toBe('numemon')
    expect(pick.dominantSlot).toBe('night')
  })
})

describe('pickBranch (always lucky)', () => {
  it('swerves away from the dominant branch when luck triggers', () => {
    const pick = pickBranch(rule, forks({ morning: 9 }), undefined, 'pet1', 0, alwaysLuckyTunables)
    expect(pick.luckySwerved).toBe(true)
    expect(pick.branch.to).not.toBe('greymon')
  })
})

describe('nextStage', () => {
  it('advances one stage', () => {
    expect(nextStage('egg')).toBe('fresh')
    expect(nextStage('child')).toBe('adult')
    expect(nextStage('perfect')).toBe('mega')
    expect(nextStage('mega')).toBe('ultra')
  })
  it('stays at ultra', () => {
    expect(nextStage('ultra')).toBe('ultra')
  })
})

describe('freshForEggVariant', () => {
  it('returns undefined for missing/invalid', () => {
    expect(freshForEggVariant(undefined)).toBeUndefined()
    expect(freshForEggVariant(99)).toBeUndefined()
  })
})
