import { describe, expect, it } from 'vitest'
import { IDLE_PHASE, remainingSec, startFocus, stepPomodoro } from './pomodoro.js'
import { DEFAULT_TUNABLES, type PomodoroPhase, type Tunables } from './types.js'

// Fast-running tunables — keeps tests readable without relying on wall-clock.
const T: Tunables = {
  ...DEFAULT_TUNABLES,
  FOCUS_DURATION_SEC: 10,
  BREAK_DURATION_SEC: 5,
}

describe('stepPomodoro: idle', () => {
  it('start_focus transitions to focus with correct endsAt', () => {
    const { next, forkCompleted } = stepPomodoro(IDLE_PHASE, { type: 'start_focus', now: 100 }, T)
    expect(next).toEqual({ kind: 'focus', startedAt: 100, endsAt: 110 })
    expect(forkCompleted).toBe(false)
  })

  it('ignores tick / abort / skip_break while idle', () => {
    expect(stepPomodoro(IDLE_PHASE, { type: 'tick', now: 1 }, T).next).toBe(IDLE_PHASE)
    expect(stepPomodoro(IDLE_PHASE, { type: 'abort', now: 1 }, T).next).toBe(IDLE_PHASE)
    expect(stepPomodoro(IDLE_PHASE, { type: 'skip_break', now: 1 }, T).next).toBe(IDLE_PHASE)
  })
})

describe('stepPomodoro: focus', () => {
  const focus: PomodoroPhase = { kind: 'focus', startedAt: 100, endsAt: 110 }

  it('tick before endsAt keeps focus', () => {
    const { next, forkCompleted } = stepPomodoro(focus, { type: 'tick', now: 105 }, T)
    expect(next).toBe(focus)
    expect(forkCompleted).toBe(false)
  })

  it('tick at endsAt completes a fork and transitions to done', () => {
    const { next, forkCompleted } = stepPomodoro(focus, { type: 'tick', now: 110 }, T)
    expect(forkCompleted).toBe(true)
    expect(next.kind).toBe('done')
    if (next.kind === 'done') {
      expect(next.completedAt).toBe(110)
      // slot derived from local time — just ensure it's one of the 5
      expect(['morning', 'forenoon', 'midday', 'evening', 'night']).toContain(next.slot)
    }
  })

  it('abort returns to idle WITHOUT completing a fork', () => {
    const { next, forkCompleted } = stepPomodoro(focus, { type: 'abort', now: 105 }, T)
    expect(next).toEqual(IDLE_PHASE)
    expect(forkCompleted).toBe(false)
  })
})

describe('stepPomodoro: done', () => {
  it('acknowledge_done starts a break', () => {
    const done: PomodoroPhase = { kind: 'done', completedAt: 110, slot: 'morning' }
    const { next, forkCompleted } = stepPomodoro(done, { type: 'acknowledge_done', now: 111 }, T)
    expect(next).toEqual({ kind: 'break', startedAt: 111, endsAt: 116 })
    expect(forkCompleted).toBe(false)
  })

  it('skip_break from done goes straight to idle', () => {
    const done: PomodoroPhase = { kind: 'done', completedAt: 110, slot: 'morning' }
    const { next } = stepPomodoro(done, { type: 'skip_break', now: 111 }, T)
    expect(next).toEqual(IDLE_PHASE)
  })
})

describe('stepPomodoro: break', () => {
  const br: PomodoroPhase = { kind: 'break', startedAt: 111, endsAt: 116 }

  it('tick before endsAt keeps break', () => {
    const { next } = stepPomodoro(br, { type: 'tick', now: 113 }, T)
    expect(next).toBe(br)
  })

  it('tick at endsAt returns to idle', () => {
    const { next } = stepPomodoro(br, { type: 'tick', now: 116 }, T)
    expect(next).toEqual(IDLE_PHASE)
  })

  it('skip_break returns to idle', () => {
    const { next } = stepPomodoro(br, { type: 'skip_break', now: 113 }, T)
    expect(next).toEqual(IDLE_PHASE)
  })
})

describe('remainingSec', () => {
  it('returns positive seconds during focus/break', () => {
    expect(remainingSec({ kind: 'focus', startedAt: 0, endsAt: 50 }, 30)).toBe(20)
    expect(remainingSec({ kind: 'break', startedAt: 0, endsAt: 50 }, 60)).toBe(0)
  })

  it('returns 0 for idle/done', () => {
    expect(remainingSec(IDLE_PHASE, 100)).toBe(0)
    expect(remainingSec({ kind: 'done', completedAt: 1, slot: 'morning' }, 100)).toBe(0)
  })
})

describe('startFocus convenience', () => {
  it('builds a focus phase from now + duration', () => {
    expect(startFocus(50, T)).toEqual({ kind: 'focus', startedAt: 50, endsAt: 60 })
  })
})
