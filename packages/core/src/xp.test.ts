import { describe, expect, it } from 'vitest'
import { awardFork, emptySlotForks } from './xp.js'
import type { PetState } from './types.js'

function basePet(): PetState {
  return {
    schemaVersion: 1,
    petId: 'p1',
    bornAt: 0,
    digimonId: 'agumon',
    stage: 'child',
    xp: { totalForks: 3, inStageForks: 1 },
    inStageSlotForks: emptySlotForks(),
    streak: { lastForkAt: 0, missDays: 2, lifetimeMisses: 5 },
    evolutionHistory: [],
  }
}

describe('awardFork', () => {
  it('increments totalForks and inStageForks by 1', () => {
    const next = awardFork(basePet(), 'morning', 1000)
    expect(next.xp.totalForks).toBe(4)
    expect(next.xp.inStageForks).toBe(2)
  })

  it('accumulates into the right slot', () => {
    const next = awardFork(basePet(), 'evening', 1000)
    expect(next.inStageSlotForks.evening).toBe(1)
    expect(next.inStageSlotForks.morning).toBe(0)
  })

  it('resets missDays and updates lastForkAt; keeps lifetimeMisses', () => {
    const next = awardFork(basePet(), 'midday', 9999)
    expect(next.streak.missDays).toBe(0)
    expect(next.streak.lastForkAt).toBe(9999)
    expect(next.streak.lifetimeMisses).toBe(5)
  })

  it('is pure (does not mutate input)', () => {
    const prev = basePet()
    const snapshot = JSON.parse(JSON.stringify(prev))
    awardFork(prev, 'night', 1)
    expect(prev).toEqual(snapshot)
  })
})
