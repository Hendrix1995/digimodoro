import { getTimeSlot } from './time-slot.js'
import type { PomodoroAction, PomodoroPhase, Tunables } from './types.js'

// Outcome of stepping the Pomodoro state machine once. `forkCompleted` is the
// signal the reducer watches for to actually award XP and append to the
// sessions log — the state machine itself stays purely about which phase the
// timer is in.
export type PomodoroStep = {
  next: PomodoroPhase
  forkCompleted: boolean
}

export const IDLE_PHASE: PomodoroPhase = { kind: 'idle' }

export function startFocus(now: number, tunables: Tunables): PomodoroPhase {
  return {
    kind: 'focus',
    startedAt: now,
    endsAt: now + tunables.FOCUS_DURATION_SEC,
  }
}

export function stepPomodoro(
  phase: PomodoroPhase,
  action: PomodoroAction,
  tunables: Tunables,
): PomodoroStep {
  switch (phase.kind) {
    case 'idle':
      if (action.type === 'start_focus') {
        return { next: startFocus(action.now, tunables), forkCompleted: false }
      }
      return { next: phase, forkCompleted: false }

    case 'focus':
      if (action.type === 'tick') {
        if (action.now >= phase.endsAt) {
          return {
            next: {
              kind: 'done',
              completedAt: phase.endsAt,
              slot: getTimeSlot(phase.endsAt),
            },
            forkCompleted: true,
          }
        }
        return { next: phase, forkCompleted: false }
      }
      if (action.type === 'abort') {
        return { next: IDLE_PHASE, forkCompleted: false }
      }
      if (action.type === 'pause') {
        return {
          next: {
            kind: 'paused',
            previous: 'focus',
            remainingSec: Math.max(0, phase.endsAt - action.now),
            pausedAt: action.now,
          },
          forkCompleted: false,
        }
      }
      return { next: phase, forkCompleted: false }

    case 'done':
      if (action.type === 'acknowledge_done') {
        return {
          next: {
            kind: 'break',
            startedAt: action.now,
            endsAt: action.now + tunables.BREAK_DURATION_SEC,
          },
          forkCompleted: false,
        }
      }
      if (action.type === 'skip_break') {
        return { next: IDLE_PHASE, forkCompleted: false }
      }
      return { next: phase, forkCompleted: false }

    case 'break':
      if (action.type === 'tick') {
        if (action.now >= phase.endsAt) {
          return { next: IDLE_PHASE, forkCompleted: false }
        }
        return { next: phase, forkCompleted: false }
      }
      if (action.type === 'skip_break') {
        return { next: IDLE_PHASE, forkCompleted: false }
      }
      if (action.type === 'pause') {
        return {
          next: {
            kind: 'paused',
            previous: 'break',
            remainingSec: Math.max(0, phase.endsAt - action.now),
            pausedAt: action.now,
          },
          forkCompleted: false,
        }
      }
      return { next: phase, forkCompleted: false }

    case 'paused':
      if (action.type === 'resume') {
        const endsAt = action.now + phase.remainingSec
        return {
          next: { kind: phase.previous, startedAt: action.now, endsAt },
          forkCompleted: false,
        }
      }
      if (action.type === 'abort') {
        return { next: IDLE_PHASE, forkCompleted: false }
      }
      // tick / pause / others — no change while paused
      return { next: phase, forkCompleted: false }
  }
}

// Convenience: how many seconds remain in the current phase, clamped to 0.
export function remainingSec(phase: PomodoroPhase, now: number): number {
  if (phase.kind === 'focus' || phase.kind === 'break') {
    return Math.max(0, phase.endsAt - now)
  }
  if (phase.kind === 'paused') return phase.remainingSec
  return 0
}
