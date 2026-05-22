import {
  DEFAULT_TUNABLES,
  IDLE_PHASE,
  reduce,
  remainingSec,
  stepPomodoro,
  type EvolutionRule,
  type PetState,
  type PomodoroAction,
  type PomodoroPhase,
  type Tunables,
} from '@digimodoro/core'
import { appendSession, saveState } from './store.js'
import { notify } from './notifications.js'

export type Snapshot = {
  state: PetState
  phase: PomodoroPhase
  remainingSec: number
  nowSec: number
  // Forks needed for the current pet's next evolution. `undefined` once at
  // mega (terminal stage, no further rule).
  nextStageForksRequired?: number
  // Days remaining before missDays reaches the RIP threshold. Clamped to >= 0.
  daysUntilRip: number
}

export type SchedulerEvents = {
  onChange: (snap: Snapshot) => void
  onEvolve: (from: string, to: string) => void
  onForkComplete: (slot: string) => void
  onBreakEnd: () => void
  onRip: () => void
}

export class Scheduler {
  private state: PetState
  private phase: PomodoroPhase = IDLE_PHASE
  private rules: EvolutionRule[]
  private timer: NodeJS.Timeout | undefined
  private events: SchedulerEvents
  private tunables: Tunables = DEFAULT_TUNABLES

  constructor(state: PetState, rules: EvolutionRule[], events: SchedulerEvents) {
    this.state = state
    this.rules = rules
    this.events = events
  }

  setTunables(t: Tunables): void {
    this.tunables = t
  }

  start(): void {
    if (this.timer) return
    // 1s tick — UI countdown precision; reducer also runs on this cadence so
    // streak rollover catches up even when the user just leaves the app open.
    this.timer = setInterval(() => this.tick(), 1000)
    this.emitChange()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }

  snapshot(): Snapshot {
    const rule = this.rules.find((r) => r.from === this.state.digimonId)
    const daysUntilRip = Math.max(
      0,
      this.tunables.STREAK_MISS_RIP_DAYS - this.state.streak.missDays,
    )
    return {
      state: this.state,
      phase: this.phase,
      remainingSec: remainingSec(this.phase, nowSec()),
      nowSec: nowSec(),
      nextStageForksRequired: rule?.forksRequired,
      daysUntilRip,
    }
  }

  dispatch(action: PomodoroAction): void {
    this.applyPomodoroStep(action)
    this.emitChange()
  }

  resetPet(fresh: PetState): void {
    this.state = fresh
    this.phase = IDLE_PHASE
    this.emitChange()
  }

  private tick(): void {
    // Drive the pomodoro state machine
    this.applyPomodoroStep({ type: 'tick', now: nowSec() })
    // Always also let the reducer run on a bare 'tick' so streak rollover
    // happens even during long idle periods.
    const result = reduce(
      this.state,
      { type: 'tick', now: nowSec() },
      { rules: this.rules, tunables: this.tunables },
    )
    if (result.ripped) {
      this.state = result.state
      saveState(this.state)
      this.events.onRip()
    } else if (result.state !== this.state) {
      this.state = result.state
      saveState(this.state)
    }
    this.emitChange()
  }

  private applyPomodoroStep(action: PomodoroAction): void {
    const { next, forkCompleted } = stepPomodoro(this.phase, action, this.tunables)

    if (forkCompleted && next.kind === 'done') {
      // Apply fork to pet state via reducer (handles evolution + streak)
      const result = reduce(
        this.state,
        { type: 'pomodoro_completed', slot: next.slot, now: next.completedAt },
        { rules: this.rules, tunables: this.tunables },
      )
      this.state = result.state
      saveState(this.state)
      if (result.completedSession) appendSession(result.completedSession)

      this.events.onForkComplete(next.slot)
      if (result.evolved) {
        const last = result.state.evolutionHistory[result.state.evolutionHistory.length - 1]
        if (last) this.events.onEvolve(last.from, last.to)
      }
      if (result.ripped) this.events.onRip()
    }

    if (this.phase.kind === 'break' && next.kind === 'idle') {
      this.events.onBreakEnd()
    }

    this.phase = next
  }

  private emitChange(): void {
    this.events.onChange(this.snapshot())
  }
}

export function nowSec(): number {
  return Math.floor(Date.now() / 1000)
}
