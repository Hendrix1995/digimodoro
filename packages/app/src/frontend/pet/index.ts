import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'
import {
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

// ── Sprite rendering ────────────────────────────────────────────────────

async function refreshSprite(digimonId: string, variant: number | undefined): Promise<void> {
  if (digimonId === lastDigi && variant === lastVariant) return
  lastDigi = digimonId
  lastVariant = variant
  try {
    sprite.src = await loadSprite(digimonId, variant)
  } catch {
    // Sprite load failed — keep previous image
  }
}

function setFacing(dir: 'left' | 'right'): void {
  const def = SPRITE_DEFAULT_FACING[lastDigi] ?? 'left'
  const flip = dir === def ? 1 : -1
  sprite.style.setProperty('--facing', String(flip))
}

// ── Notifications ───────────────────────────────────────────────────────

async function notify(title: string, body: string): Promise<void> {
  try {
    let granted = await isPermissionGranted()
    if (!granted) {
      const perm = await requestPermission()
      granted = perm === 'granted'
    }
    if (granted) {
      sendNotification({ title, body })
    }
  } catch {
    // Notification not supported
  }
}

// ── Bubble ──────────────────────────────────────────────────────────────

let bubbleTimer: ReturnType<typeof setTimeout> | undefined
function showBubble(text: string, ms = 2200): void {
  bubble.textContent = text
  bubble.classList.remove('hidden')
  if (bubbleTimer) clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => {
    bubble.classList.add('hidden')
  }, ms)
}

// ── Drag handling ───────────────────────────────────────────────────────

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
    const newX = ev.screenX - dragOffsetX
    const newY = ev.screenY - dragOffsetY
    mover.setPosition(newX, newY)
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

// ── Context menu (right-click) ──────────────────────────────────────────

window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
})

// ── Cross-window communication ──────────────────────────────────────────

function broadcastSnapshot(snap: Snapshot): void {
  void emit('digi:snapshot', snap)
}

async function registerActionListener(): Promise<void> {
  await listen<{ type: string; now: number }>('digi:action', (event) => {
    const { type, now } = event.payload
    const ts = now ?? Math.floor(Date.now() / 1000)
    switch (type) {
      case 'start_focus':
        scheduler.dispatch({ type: 'start_focus', now: ts })
        break
      case 'abort':
        scheduler.dispatch({ type: 'abort', now: ts })
        break
      case 'acknowledge_done':
        scheduler.dispatch({ type: 'acknowledge_done', now: ts })
        break
      case 'skip_break':
        scheduler.dispatch({ type: 'skip_break', now: ts })
        break
      case 'pause':
        scheduler.dispatch({ type: 'pause', now: ts })
        break
      case 'resume':
        scheduler.dispatch({ type: 'resume', now: ts })
        break
    }
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

  await listen<{ fresh: PetState }>('digi:reset-pet', (event) => {
    scheduler.resetPet(event.payload.fresh)
    mover.setActive(false)
    mover.pause(true)
  })
}

// ── Boot ────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  // Debug: write resource paths and file existence to debug.log
  await invoke('debug_boot').catch(() => {})

  // Load bundled data
  const rules = await invoke<EvolutionRule[]>('load_evolution_rules')
  const lineage = await invoke<Record<string, string>>('load_egg_lineage')
  setEggLineage(lineage)

  // Load or create pet state
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
      ],
    })
    await invoke('save_state', { state })
  }

  // Load config
  try {
    config = await invoke<AppConfig>('load_config')
  } catch {
    config = DEFAULT_CONFIG
    await invoke('save_config', { config })
  }
  lang = config.ui.language

  // Set up pet window size
  const petScale = config.ui.petScale
  const petSize = Math.round(BASE_PX * petScale)
  await invoke('resize_pet_window', { width: petSize, height: petSize })

  // Get screen work area
  const workW = window.screen.availWidth
  const workH = window.screen.availHeight

  // Initialize mover — MUST start before sprite loading
  mover = new PetMover(
    { width: workW, height: workH },
    { width: petSize, height: petSize },
  )
  mover.setOnFacingChange(setFacing)

  // Initialize scheduler
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

      void invoke('update_tray', {
        title: formatTrayTitle(snap),
        phaseInfo: snap.phase.kind,
      }).catch(() => {})
    },
    onEvolve(from: string, to: string) {
      showBubble(`${from} \u2192 ${to}`, 3500)
      void emit('digi:evolve', { from, to })
      if (config.notifications.onEvolve) {
        void notify(t('notifyEvolveTitle', lang), `${from} \u2192 ${to}`)
      }
    },
    onForkComplete(slot: string) {
      showBubble(t('bubbleForkAdded', lang, { slot: t('slot_' + slot, lang) }))
      void emit('digi:fork-complete', { slot })
      if (config.notifications.onForkComplete) {
        void notify(t('notifyForkCompleteTitle', lang), t('notifyForkCompleteBody', lang))
      }
    },
    onBreakEnd() {
      showBubble(t('bubbleBreakOver', lang), 2500)
      void emit('digi:break-end', {})
      if (config.notifications.onBreakEnd) {
        void notify(t('notifyBreakEndTitle', lang), t('notifyBreakEndBody', lang))
      }
    },
    onRip() {
      showBubble(t('bubbleRip', lang), 4000)
      mover.pause(true)
      void emit('digi:rip', {})
      void notify(t('notifyRipTitle', lang), t('notifyRipBody', lang))
    },
  })

  // Register cross-window listeners
  await registerActionListener()

  // Start mover and scheduler
  if (state.stage === 'egg' || state.rip) {
    mover.pause(true)
  }
  mover.start()
  scheduler.start()

  // Load sprite async — doesn't block mover/scheduler
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
