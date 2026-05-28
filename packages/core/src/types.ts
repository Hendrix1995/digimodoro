export type Stage = 'egg' | 'fresh' | 'baby' | 'child' | 'adult' | 'perfect' | 'mega' | 'ultra'

export const STAGES: readonly Stage[] = [
  'egg',
  'fresh',
  'baby',
  'child',
  'adult',
  'perfect',
  'mega',
  'ultra',
] as const

export type TimeSlot = 'morning' | 'forenoon' | 'midday' | 'evening' | 'night'

export const TIME_SLOTS: readonly TimeSlot[] = [
  'morning',
  'forenoon',
  'midday',
  'evening',
  'night',
] as const

export type Personality = 'calm' | 'gentle' | 'holy' | 'mischief' | 'savage'

export const PERSONALITIES: readonly Personality[] = [
  'calm',
  'gentle',
  'holy',
  'mischief',
  'savage',
] as const

export type SlotForks = Record<TimeSlot, number>

export type PomodoroPhase =
  | { kind: 'idle' }
  | { kind: 'focus'; startedAt: number; endsAt: number }
  | { kind: 'break'; startedAt: number; endsAt: number }
  | { kind: 'done'; completedAt: number; slot: TimeSlot }
  | { kind: 'paused'; previous: 'focus' | 'break'; remainingSec: number; pausedAt: number }

export type PomodoroAction =
  | { type: 'start_focus'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'abort'; now: number }
  | { type: 'skip_break'; now: number }
  | { type: 'acknowledge_done'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }

export type PomodoroSession = {
  startedAt: number
  finishedAt: number
  slot: TimeSlot
  durationSec: number
}

export type EvolutionHistoryEntry = {
  at: number
  from: string
  to: string
  dominantSlot: TimeSlot
  slotForksAtEvolve: SlotForks
}

export type PetState = {
  schemaVersion: 1
  petId: string
  bornAt: number
  seedEggVariant?: number
  personality?: Personality
  digimonId: string
  stage: Stage

  xp: {
    totalForks: number
    inStageForks: number
  }

  inStageSlotForks: SlotForks

  streak: {
    lastForkAt: number
    missDays: number
    lifetimeMisses: number
  }

  evolutionHistory: EvolutionHistoryEntry[]

  rip?: { at: number; cause: string }
}

export type EvolutionBranch = {
  slot: TimeSlot
  to: string
  // Optional weight for pickBranch selection within a slot pool.
  // Defaults to 1.0 when absent. e.g. 0.1 = ~10% chance vs others at 1.0.
  weight?: number
}

export type EvolutionRule = {
  from: string
  forksRequired: number
  branches: EvolutionBranch[]
}

export type DigimonSprite = {
  idle: string
  walk?: string
  happy?: string
  sad?: string
  sleep?: string
}

export type Digimon = {
  id: string
  name: string
  stage: Stage
  sprite: DigimonSprite
  attribute?: 'vaccine' | 'data' | 'virus' | 'free'
}

export type Tunables = {
  FOCUS_DURATION_SEC: number
  BREAK_DURATION_SEC: number
  LUCKY_ROLL_CHANCE: number
  STREAK_MISS_SOFT_DAYS: number
  STREAK_MISS_HARD_DAYS: number
  STREAK_MISS_RIP_DAYS: number
}

export const DEFAULT_TUNABLES: Tunables = {
  FOCUS_DURATION_SEC: 50 * 60,
  BREAK_DURATION_SEC: 10 * 60,
  LUCKY_ROLL_CHANCE: 0.12,
  STREAK_MISS_SOFT_DAYS: 1,
  STREAK_MISS_HARD_DAYS: 2,
  STREAK_MISS_RIP_DAYS: 3,
}

export const EMPTY_SLOT_FORKS: SlotForks = {
  morning: 0,
  forenoon: 0,
  midday: 0,
  evening: 0,
  night: 0,
}
