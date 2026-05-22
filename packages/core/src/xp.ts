import { EMPTY_SLOT_FORKS, type PetState, type SlotForks, type TimeSlot } from './types.js'

// One completed Pomodoro = one fork = fixed XP. We keep the count in "forks"
// rather than seconds so the XP economy is integer and easy to display.
export function awardFork(state: PetState, slot: TimeSlot, now: number): PetState {
  return {
    ...state,
    xp: {
      totalForks: state.xp.totalForks + 1,
      inStageForks: state.xp.inStageForks + 1,
    },
    inStageSlotForks: addSlotFork(state.inStageSlotForks, slot),
    streak: {
      ...state.streak,
      lastForkAt: now,
      missDays: 0,
    },
  }
}

export function addSlotFork(prev: SlotForks, slot: TimeSlot): SlotForks {
  return { ...prev, [slot]: prev[slot] + 1 }
}

export function emptySlotForks(): SlotForks {
  return { ...EMPTY_SLOT_FORKS }
}
