// Surface exposed via preload contextBridge. Pet window and Control window
// preloads expose overlapping but not identical subsets — keeping one union
// keeps the renderer code typed without dragging preload into the bundle.
export type Snapshot = {
  state: {
    schemaVersion: 1
    petId: string
    bornAt: number
    seedEggVariant?: number
    personality?: 'calm' | 'gentle' | 'holy' | 'mischief' | 'savage'
    digimonId: string
    stage: 'egg' | 'fresh' | 'baby' | 'child' | 'adult' | 'perfect' | 'mega'
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

export type DigimodoroApi = {
  getSnapshot: () => Promise<Snapshot>
  getSpriteBase: () => Promise<string>

  startFocus: () => Promise<void>
  abortFocus: () => Promise<void>
  ackDone: () => Promise<void>
  skipBreak: () => Promise<void>
  resetPet: () => Promise<void>
  showControl: () => Promise<void>
  showPetMenu: (pos: { x: number; y: number }) => Promise<void>
  dragStart: () => Promise<void>
  dragEnd: () => Promise<void>
  setHover: (hover: boolean) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  getConfig: () => Promise<AppConfig>
  saveConfig: (cfg: AppConfig) => Promise<void>
  setScale: (scale: number) => Promise<void>
  getGraveyard: () => Promise<GraveyardEntry[]>
  onLang: (cb: (lang: 'ko' | 'en') => void) => () => void

  onSnapshot: (cb: (snap: Snapshot) => void) => () => void
  onPetFacing: (cb: (dir: 'left' | 'right') => void) => () => void
  onPetJump: (cb: (e: { durationMs: number }) => void) => () => void
  onPetPos: (cb: (p: { x: number; y: number; scale: number }) => void) => () => void
  onEvolve: (cb: (e: { from: string; to: string }) => void) => () => void
  onForkComplete: (cb: (e: { slot: string }) => void) => () => void
  onBreakEnd: (cb: () => void) => () => void
  onRip: (cb: () => void) => () => void
}

declare global {
  interface Window {
    digimodoro: DigimodoroApi
  }
}
