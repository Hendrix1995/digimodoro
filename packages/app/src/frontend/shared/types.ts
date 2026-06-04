export type Snapshot = {
  state: {
    schemaVersion: 1
    petId: string
    bornAt: number
    seedEggVariant?: number
    personality?: 'calm' | 'gentle' | 'holy' | 'mischief' | 'savage'
    digimonId: string
    stage: 'egg' | 'fresh' | 'baby' | 'child' | 'adult' | 'perfect' | 'mega' | 'ultra'
    xp: { totalForks: number; inStageForks: number }
    inStageSlotForks: {
      morning: number
      forenoon: number
      midday: number
      evening: number
      night: number
    }
    streak: { lastForkAt: number; missDays: number; lifetimeMisses: number }
    evolutionHistory: Array<{
      at: number
      from: string
      to: string
      dominantSlot: string
      slotForksAtEvolve: Record<string, number>
    }>
    rip?: { at: number; cause: string }
  }
  phase:
    | { kind: 'idle' }
    | { kind: 'focus'; startedAt: number; endsAt: number }
    | { kind: 'break'; startedAt: number; endsAt: number }
    | { kind: 'done'; completedAt: number; slot: string }
    | { kind: 'paused'; previous: 'focus' | 'break'; remainingSec: number; pausedAt: number }
  remainingSec: number
  nowSec: number
  nextStageForksRequired?: number
  daysUntilRip: number
}

export type GraveyardEntry = {
  schemaVersion: 1
  petId: string
  bornAt: number
  seedEggVariant?: number
  personality?: 'calm' | 'gentle' | 'holy' | 'mischief' | 'savage'
  digimonId: string
  stage: 'egg' | 'fresh' | 'baby' | 'child' | 'adult' | 'perfect' | 'mega'
  xp: { totalForks: number; inStageForks: number }
  streak: { lastForkAt: number; missDays: number; lifetimeMisses: number }
  evolutionHistory: Array<{
    at: number
    from: string
    to: string
    dominantSlot: string
  }>
  rip?: { at: number; cause: string }
}

export type AppConfig = {
  schemaVersion: 1
  ui: {
    alwaysOnTop: boolean
    petScale: number
    language: 'ko' | 'en'
  }
  pomodoro: {
    focusMinutes: number
    breakMinutes: number
  }
  notifications: {
    onForkComplete: boolean
    onEvolve: boolean
    onBreakEnd: boolean
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  schemaVersion: 1,
  ui: { alwaysOnTop: false, petScale: 1.0, language: 'ko' },
  pomodoro: { focusMinutes: 50, breakMinutes: 10 },
  notifications: { onForkComplete: true, onEvolve: true, onBreakEnd: true },
}

// --- Box (favorite-pet storage) ---

export type PetState = Snapshot['state']

export type BoxSlot = { frozenAt: number; pet: PetState } | null

export type BoxData = { slots: BoxSlot[] }

export const BOX_CAPACITY = 20
