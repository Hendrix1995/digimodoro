import {
  freshForEggVariant,
  isReadyToEvolve,
  nextStage,
  pickBranch,
} from './evolution.js'
import { rolloverStreak, shouldRip } from './streak-miss.js'
import { awardFork, emptySlotForks } from './xp.js'
import {
  type EvolutionRule,
  type PetState,
  type Personality,
  type PomodoroSession,
  type TimeSlot,
  type Tunables,
} from './types.js'

export type ReducerAction =
  | { type: 'pomodoro_completed'; slot: TimeSlot; now: number }
  | { type: 'tick'; now: number }

export type ReduceArgs = {
  rules: EvolutionRule[]
  tunables: Tunables
}

export type ReduceResult = {
  state: PetState
  evolved: boolean
  ripped: boolean
  completedSession?: PomodoroSession
}

export type InitArgs = {
  now: number
  petId: string
  seedEggVariant?: number
  personality?: Personality
}

export function initialState({ now, petId, seedEggVariant, personality }: InitArgs): PetState {
  return {
    schemaVersion: 1,
    petId,
    bornAt: now,
    ...(seedEggVariant != null ? { seedEggVariant } : {}),
    ...(personality != null ? { personality } : {}),
    digimonId: 'egg',
    stage: 'egg',
    xp: { totalForks: 0, inStageForks: 0 },
    inStageSlotForks: emptySlotForks(),
    streak: { lastForkAt: 0, missDays: 0, lifetimeMisses: 0 },
    evolutionHistory: [],
  }
}

export function reduce(
  prev: PetState,
  action: ReducerAction,
  args: ReduceArgs,
): ReduceResult {
  const { rules, tunables } = args
  let next = prev
  let evolved = false
  let ripped = false
  let completedSession: PomodoroSession | undefined

  if (action.type === 'pomodoro_completed') {
    next = awardFork(next, action.slot, action.now)
    completedSession = {
      startedAt: action.now - tunables.FOCUS_DURATION_SEC,
      finishedAt: action.now,
      slot: action.slot,
      durationSec: tunables.FOCUS_DURATION_SEC,
    }
  }

  // Always refresh streak from wall clock — both tick and pomodoro_completed
  // need this since hours/days can pass between events.
  next = rolloverStreak(next, action.now)

  // R.I.P. check from neglect
  if (shouldRip(next, tunables)) {
    next = { ...next, rip: { at: action.now, cause: 'neglect' } }
    ripped = true
    return { state: next, evolved, ripped }
  }

  // Evolution loop — handles overflow if a single pomodoro tips multiple
  // stages (unlikely in practice but cheap to support).
  while (!next.rip && next.stage !== 'mega') {
    const rule = rules.find((r) => r.from === next.digimonId)
    if (!rule || !isReadyToEvolve(rule, next.xp.inStageForks)) break

    const pick = pickBranch(
      rule,
      next.inStageSlotForks,
      next.personality,
      next.petId,
      next.evolutionHistory.length,
      tunables,
    )

    // egg → fresh is decided by the egg variant the pet hatched from. It
    // overrides slot/personality/lucky-roll because the variant is the
    // promise on the egg sprite.
    const to =
      (next.digimonId === 'egg' && freshForEggVariant(next.seedEggVariant)) || pick.branch.to

    const slotForksAtEvolve = { ...next.inStageSlotForks }

    next = {
      ...next,
      digimonId: to,
      stage: nextStage(next.stage),
      xp: {
        ...next.xp,
        inStageForks: Math.max(0, next.xp.inStageForks - rule.forksRequired),
      },
      inStageSlotForks: emptySlotForks(),
      evolutionHistory: [
        ...next.evolutionHistory,
        {
          at: action.now,
          from: rule.from,
          to,
          dominantSlot: pick.dominantSlot,
          slotForksAtEvolve,
        },
      ],
    }
    evolved = true
  }

  return { state: next, evolved, ripped, ...(completedSession ? { completedSession } : {}) }
}
