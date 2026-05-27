import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'
import {
  DEFAULT_TUNABLES,
  type EvolutionRule,
  type PetState,
  initialState,
  setEggLineage,
  t,
  type Lang,
} from '@digimodoro/core'
import { Scheduler } from './scheduler'
import { PetMover } from './mover'
import type { Snapshot, AppConfig } from '../shared/types'
import { DEFAULT_CONFIG } from '../shared/types'
import { SPRITE_DEFAULT_FACING, loadSprite } from '../shared/sprite-utils'

const sprite = document.getElementById('sprite') as HTMLImageElement
const bubble = document.getElementById('bubble') as HTMLElement

let lang: Lang = 'ko'
let lastDigi = ''
let lastVariant: number | undefined
let config: AppConfig = DEFAULT_CONFIG
let scheduler: Scheduler
let mover: PetMover

const BASE_PX = 96

async function refreshSprite(digimonId: string, variant: number | undefined): Promise<void> {
  if (digimonId === lastDigi && variant === lastVariant) return
  lastDigi = digimonId
  lastVariant = variant
  try {
    sprite.src = await loadSprite(digimonId, variant)
  } catch {}
}

function setFacing(dir: 'left' | 'right'): void {
  const def = SPRITE_DEFAULT_FACING[lastDigi] ?? 'left'
  const flip = dir === def ? 1 : -1
  sprite.style.setProperty('--facing', String(flip))
}

async function notify(title: string, body: string): Promise<void> {
  try {
    let granted = await isPermissionGranted()
    if (!granted) {
      const perm = await requestPermission()
      granted = perm === 'granted'
    }
    if (granted) sendNotification({ title, body })
  } catch {}
}

let bubbleTimer: ReturnType<typeof setTimeout> | undefined
type BubbleAction = { label: string; onClick: () => void }
function showBubble(text: string, ms = 2200, action?: BubbleAction): void {
  bubble.textContent = ''
  bubble.classList.remove('has-action')
  const span = document.createElement('span')
  span.textContent = text
  bubble.appendChild(span)
  if (action) {
    const btn = document.createElement('button')
    btn.className = 'bubble-btn'
    btn.textContent = action.label
    btn.addEventListener('click', () => {
      action.onClick()
      bubble.classList.add('hidden')
      if (bubbleTimer) clearTimeout(bubbleTimer)
    })
    bubble.appendChild(btn)
    bubble.classList.add('has-action')
  }
  bubble.classList.remove('hidden')
  if (bubbleTimer) clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => { bubble.classList.add('hidden') }, ms)
}

let isDragging = false
let dragOffsetX = 0
let dragOffsetY = 0

sprite.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return
  e.preventDefault()
  isDragging = true
  mover.setDragging(true)
  const pos = mover.position()
  dragOffsetX = e.screenX - pos.x
  dragOffsetY = e.screenY - pos.y
  const onMove = (ev: MouseEvent): void => {
    if (!isDragging) return
    mover.setPosition(ev.screenX - dragOffsetX, ev.screenY - dragOffsetY)
  }
  const onUp = (): void => {
    isDragging = false
    mover.setDragging(false)
    window.removeEventListener('mousemove', onMove, true)
    window.removeEventListener('mouseup', onUp, true)
  }
  window.addEventListener('mousemove', onMove, true)
  window.addEventListener('mouseup', onUp, true)
})

async function doHatchNew(): Promise<void> {
  const fresh = initialState({
    now: Math.floor(Date.now() / 1000),
    petId: `pet_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`,
    seedEggVariant: 1 + Math.floor(Math.random() * 11),
    personality: (['calm', 'gentle', 'holy', 'mischief', 'savage'] as const)[Math.floor(Math.random() * 5)]!,
  })
  await invoke('reset_pet', { newState: fresh })
  void emit('digi:reset-pet', { fresh })
}

let currentSnap: Snapshot | undefined

window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  void showNativeContextMenu()
})

async function showNativeContextMenu(): Promise<void> {
  const items: { id: string; label: string }[] = []
  const snap = currentSnap

  if (!snap || snap.state.rip) {
    items.push({ id: 'hatchNew', label: t('hatchNew', lang) })
  } else {
    const phase = snap.phase.kind
    if (phase === 'idle') {
      items.push({ id: 'startFocus', label: t('startFocus', lang) })
    } else if (phase === 'focus') {
      items.push({ id: 'pause', label: t('pause', lang) })
      items.push({ id: 'abort', label: t('abort', lang) })
    } else if (phase === 'paused') {
      items.push({ id: 'resume', label: t('resume', lang) })
      items.push({ id: 'abort', label: t('abort', lang) })
    } else if (phase === 'done') {
      items.push({ id: 'startBreak', label: t('startBreak', lang) })
      items.push({ id: 'skipBreak', label: t('skipBreak', lang) })
    } else if (phase === 'break') {
      items.push({ id: 'pause', label: t('pause', lang) })
      items.push({ id: 'skipBreak', label: t('skipBreak', lang) })
    }
  }

  items.push({ id: '__sep__', label: '' })
  items.push({ id: 'showStatus', label: t('showStatus', lang) })
  items.push({ id: '__sep__', label: '' })
  items.push({ id: 'quit', label: t('quit', lang) })

  await invoke('show_pet_menu', { items })
}

function dispatchPetMenuAction(action: string): void {
  const now = Math.floor(Date.now() / 1000)
  switch (action) {
    case 'hatchNew': void doHatchNew(); break
    case 'startFocus': scheduler.dispatch({ type: 'start_focus', now }); break
    case 'pause': scheduler.dispatch({ type: 'pause', now }); break
    case 'resume': scheduler.dispatch({ type: 'resume', now }); break
    case 'abort': scheduler.dispatch({ type: 'abort', now }); break
    case 'startBreak': scheduler.dispatch({ type: 'acknowledge_done', now }); break
    case 'skipBreak': scheduler.dispatch({ type: 'skip_break', now }); break
    case 'showStatus': void invoke('show_control_window'); break
    case 'quit': void invoke('quit_app').catch(() => {}); break
  }
}

function broadcastSnapshot(snap: Snapshot): void {
  currentSnap = snap
  void emit('digi:snapshot', snap)
}

async function registerActionListener(): Promise<void> {
  await listen<{ type: string; now: number }>('digi:action', (event) => {
    const { type, now } = event.payload
    const ts = now ?? Math.floor(Date.now() / 1000)
    switch (type) {
      case 'start_focus': scheduler.dispatch({ type: 'start_focus', now: ts }); break
      case 'abort': scheduler.dispatch({ type: 'abort', now: ts }); break
      case 'acknowledge_done': scheduler.dispatch({ type: 'acknowledge_done', now: ts }); break
      case 'skip_break': scheduler.dispatch({ type: 'skip_break', now: ts }); break
      case 'pause': scheduler.dispatch({ type: 'pause', now: ts }); break
      case 'resume': scheduler.dispatch({ type: 'resume', now: ts }); break
    }
  })

  await listen<string>('digi:pet-menu-action', (event) => {
    dispatchPetMenuAction(event.payload)
  })

  await listen<{ scale: number }>('digi:scale-change', (event) => {
    const { scale } = event.payload
    const size = Math.round(BASE_PX * scale)
    mover.updateDims({ width: size, height: size })
    void invoke('resize_pet_window', { width: size, height: size })
    config.ui.petScale = scale
  })

  await listen<{ lang: Lang }>('digi:lang-change', (event) => {
    lang = event.payload.lang
  })

  await listen<AppConfig>('digi:config-changed', (event) => {
    config = event.payload
    scheduler.setTunables({
      ...DEFAULT_TUNABLES,
      FOCUS_DURATION_SEC: config.pomodoro.focusMinutes * 60,
      BREAK_DURATION_SEC: config.pomodoro.breakMinutes * 60,
    })
  })

  await listen<{ fresh: PetState }>('digi:reset-pet', (event) => {
    scheduler.resetPet(event.payload.fresh)
    mover.setActive(false)
    mover.pause(true)
  })

  await listen<{ newActive: PetState }>('digi:box-swap', (event) => {
    scheduler.resetPet(event.payload.newActive)
    mover.setActive(false)
    mover.pause(true)
  })
}

async function boot(): Promise<void> {
  const rules = await invoke<EvolutionRule[]>('load_evolution_rules')
  const lineage = await invoke<Record<string, string>>('load_egg_lineage')
  setEggLineage(lineage)

  let state: PetState
  try {
    state = await invoke<PetState>('load_state')
  } catch {
    state = initialState({
      now: Math.floor(Date.now() / 1000),
      petId: `pet_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`,
      seedEggVariant: 1 + Math.floor(Math.random() * 11),
      personality: (['calm', 'gentle', 'holy', 'mischief', 'savage'] as const)[
        Math.floor(Math.random() * 5)
      ]!,
    })
    await invoke('save_state', { state })
  }

  try {
    config = await invoke<AppConfig>('load_config')
  } catch {
    config = DEFAULT_CONFIG
    await invoke('save_config', { config })
  }
  lang = config.ui.language

  const petScale = config.ui.petScale
  const petSize = Math.round(BASE_PX * petScale)
  await invoke('resize_pet_window', { width: petSize, height: petSize })

  const workW = window.screen.availWidth
  const workH = window.screen.availHeight

  mover = new PetMover(
    { width: workW, height: workH },
    { width: petSize, height: petSize },
  )
  mover.setOnFacingChange(setFacing)

  const tunables = {
    ...DEFAULT_TUNABLES,
    FOCUS_DURATION_SEC: config.pomodoro.focusMinutes * 60,
    BREAK_DURATION_SEC: config.pomodoro.breakMinutes * 60,
  }

  scheduler = new Scheduler(state, rules, {
    onChange(snap: Snapshot) {
      void refreshSprite(snap.state.digimonId, snap.state.seedEggVariant)
      document.body.classList.toggle('is-rip', Boolean(snap.state.rip))

      mover.setActive(snap.phase.kind === 'focus')

      if (snap.state.stage === 'egg' || snap.state.rip || snap.phase.kind === 'paused') {
        mover.pause(true)
      } else {
        mover.pause(false)
      }

      broadcastSnapshot(snap)
      void invoke('update_tray', { title: formatTrayTitle(snap), phaseInfo: snap.phase.kind }).catch(() => {})
    },
    onEvolve(from: string, to: string) {
      showBubble(`${from} \u2192 ${to}`, 6000, {
        label: t('boxOpen', lang),
        onClick: () => {
          void invoke('show_control_window').catch(() => {})
          void emit('digi:focus-box', {})
        },
      })
      void emit('digi:evolve', { from, to })
      if (config.notifications.onEvolve) void notify(t('notifyEvolveTitle', lang), `${from} \u2192 ${to}`)
    },
    onForkComplete(slot: string) {
      showBubble(t('bubbleForkAdded', lang, { slot: t('slot_' + slot, lang) }))
      void emit('digi:fork-complete', { slot })
      if (config.notifications.onForkComplete) void notify(t('notifyForkCompleteTitle', lang), t('notifyForkCompleteBody', lang))
    },
    onBreakEnd() {
      showBubble(t('bubbleBreakOver', lang), 2500)
      void emit('digi:break-end', {})
      if (config.notifications.onBreakEnd) void notify(t('notifyBreakEndTitle', lang), t('notifyBreakEndBody', lang))
    },
    onRip() {
      showBubble(t('bubbleRip', lang), 4000)
      mover.pause(true)
      void emit('digi:rip', {})
      void notify(t('notifyRipTitle', lang), t('notifyRipBody', lang))
    },
  })

  await registerActionListener()

  if (state.stage === 'egg' || state.rip) mover.pause(true)
  scheduler.setTunables(tunables)
  mover.start()
  scheduler.start()

  void refreshSprite(state.digimonId, state.seedEggVariant)
  setFacing(mover.currentFacing())
}

function formatTrayTitle(snap: Snapshot): string {
  if (snap.state.rip) return ' \u{1FAA6}'
  if (snap.phase.kind === 'done') return ' \u{1F389}'
  if (snap.phase.kind === 'idle') return ''
  const mm = String(Math.floor(snap.remainingSec / 60)).padStart(2, '0')
  const ss = String(snap.remainingSec % 60).padStart(2, '0')
  const paused = snap.phase.kind === 'paused' ? ' \u23F8' : ''
  return ` ${mm}:${ss}${paused}`
}

boot().catch(() => {})
