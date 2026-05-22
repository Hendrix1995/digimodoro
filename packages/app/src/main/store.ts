import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, appendFileSync } from 'node:fs'
import * as path from 'node:path'
import {
  type EvolutionRule,
  type PetState,
  type PomodoroSession,
  initialState,
} from '@digimodoro/core'
import { PATHS, dataRoot } from './paths.js'

type AppConfig = {
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

const DEFAULT_CONFIG: AppConfig = {
  schemaVersion: 1,
  ui: { alwaysOnTop: false, petScale: 1.0, language: 'ko' },
  pomodoro: { focusMinutes: 50, breakMinutes: 10 },
  notifications: { onForkComplete: true, onEvolve: true, onBreakEnd: true },
}

export function ensureDirs(): void {
  if (!existsSync(PATHS.userDir)) mkdirSync(PATHS.userDir, { recursive: true })
}

function atomicWriteJson(file: string, data: unknown): void {
  const tmp = `${file}.tmp.${process.pid}`
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  renameSync(tmp, file)
}

// --- pet state ---------------------------------------------------------

function randomPetId(): string {
  return `pet_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

function randomEggVariant(): number {
  return 1 + Math.floor(Math.random() * 11)
}

function randomPersonality(): PetState['personality'] {
  const list = ['calm', 'gentle', 'holy', 'mischief', 'savage'] as const
  return list[Math.floor(Math.random() * list.length)]
}

export function loadState(): PetState {
  ensureDirs()
  if (!existsSync(PATHS.state)) {
    const fresh = initialState({
      now: Math.floor(Date.now() / 1000),
      petId: randomPetId(),
      seedEggVariant: randomEggVariant(),
      personality: randomPersonality(),
    })
    atomicWriteJson(PATHS.state, fresh)
    return fresh
  }
  try {
    const raw = JSON.parse(readFileSync(PATHS.state, 'utf8')) as PetState
    // Back-fill optional fields a future schema might need; keep this minimal.
    if (!raw.streak) {
      raw.streak = { lastForkAt: 0, missDays: 0, lifetimeMisses: 0 }
    }
    return raw
  } catch (e) {
    console.error('[store] state.json corrupt; starting fresh:', e)
    const fresh = initialState({
      now: Math.floor(Date.now() / 1000),
      petId: randomPetId(),
      seedEggVariant: randomEggVariant(),
      personality: randomPersonality(),
    })
    atomicWriteJson(PATHS.state, fresh)
    return fresh
  }
}

export function saveState(state: PetState): void {
  ensureDirs()
  atomicWriteJson(PATHS.state, state)
}

export function resetPet(): PetState {
  ensureDirs()
  // Move current pet to graveyard if it died (or even if it didn't — anything
  // overwritten gets a tombstone).
  if (existsSync(PATHS.state)) {
    try {
      const prev = readFileSync(PATHS.state, 'utf8')
      appendFileSync(PATHS.graveyard, prev.replace(/\s+/g, ' ') + '\n', 'utf8')
    } catch (e) {
      console.warn('[store] failed to archive previous pet:', e)
    }
  }
  const fresh = initialState({
    now: Math.floor(Date.now() / 1000),
    petId: randomPetId(),
    seedEggVariant: randomEggVariant(),
    personality: randomPersonality(),
  })
  atomicWriteJson(PATHS.state, fresh)
  return fresh
}

// --- config ------------------------------------------------------------

export function loadConfig(): AppConfig {
  ensureDirs()
  if (!existsSync(PATHS.config)) {
    atomicWriteJson(PATHS.config, DEFAULT_CONFIG)
    return DEFAULT_CONFIG
  }
  try {
    const raw = JSON.parse(readFileSync(PATHS.config, 'utf8')) as Partial<AppConfig>
    return {
      ...DEFAULT_CONFIG,
      ...raw,
      ui: { ...DEFAULT_CONFIG.ui, ...(raw.ui ?? {}) },
      pomodoro: { ...DEFAULT_CONFIG.pomodoro, ...(raw.pomodoro ?? {}) },
      notifications: { ...DEFAULT_CONFIG.notifications, ...(raw.notifications ?? {}) },
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(cfg: AppConfig): void {
  ensureDirs()
  atomicWriteJson(PATHS.config, cfg)
}

// --- sessions log ------------------------------------------------------

export function appendSession(session: PomodoroSession): void {
  ensureDirs()
  appendFileSync(PATHS.sessions, JSON.stringify(session) + '\n', 'utf8')
}

// --- graveyard ---------------------------------------------------------

export function loadGraveyard(): PetState[] {
  ensureDirs()
  if (!existsSync(PATHS.graveyard)) return []
  try {
    const raw = readFileSync(PATHS.graveyard, 'utf8')
    const out: PetState[] = []
    for (const line of raw.split('\n')) {
      const s = line.trim()
      if (!s) continue
      try {
        out.push(JSON.parse(s) as PetState)
      } catch {
        // one bad line shouldn't sink the whole list
      }
    }
    return out
  } catch (e) {
    console.error('[store] graveyard read failed:', e)
    return []
  }
}

// --- evolution rules ---------------------------------------------------

export function loadEvolutionRules(): EvolutionRule[] {
  const { dataDir } = dataRoot()
  const file = path.join(dataDir, 'evolution.json')
  return JSON.parse(readFileSync(file, 'utf8')) as EvolutionRule[]
}

export function loadEggLineage(): Record<string, string> {
  const { dataDir } = dataRoot()
  const file = path.join(dataDir, 'egg-lineage.json')
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>
}

export type { AppConfig }
