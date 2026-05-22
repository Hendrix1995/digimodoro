import { BrowserWindow, Menu, app, dialog, screen } from 'electron'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { assertDataPresent, dataRoot } from './paths.js'
import {
  ensureDirs,
  loadConfig,
  loadEggLineage,
  loadEvolutionRules,
  loadGraveyard,
  loadState,
  resetPet,
  saveConfig,
} from './store.js'
import { DEFAULT_TUNABLES, setEggLineage, t, type Lang, type Tunables } from '@digimodoro/core'
import { Scheduler } from './scheduler.js'
import { IPC, registerIpc } from './ipc.js'
import { notify } from './notifications.js'
import { createTray, disposeTray, refreshTray } from './tray.js'
import {
  createControlWindow,
  createPetWindow,
  PET_SCALES,
  scaledDims,
  type PetScale,
} from './windows.js'
import { PetMover } from './mover.js'
import { buildContextMenu, type PetMenuActions } from './menu.js'
import { startPetDrag, stopPetDrag } from './drag.js'

let petWin: BrowserWindow | undefined
let controlWin: BrowserWindow | undefined
let scheduler: Scheduler | undefined
let mover: PetMover | undefined
let actions: PetMenuActions | undefined
let currentScale = 1.0
let currentLang: Lang = 'ko'
let lastEggPaused: boolean | undefined

function spriteBaseUrl(): string {
  const { spritesDir } = dataRoot()
  return pathToFileURL(spritesDir + path.sep).toString()
}

function withWins(): BrowserWindow[] {
  return [petWin, controlWin].filter((w): w is BrowserWindow => !!w && !w.isDestroyed())
}

function tunablesFromConfig(): Tunables {
  const cfg = loadConfig()
  return {
    ...DEFAULT_TUNABLES,
    FOCUS_DURATION_SEC: Math.max(60, Math.round(cfg.pomodoro.focusMinutes * 60)),
    BREAK_DURATION_SEC: Math.max(30, Math.round(cfg.pomodoro.breakMinutes * 60)),
  }
}

function showControlWindow(): void {
  if (!controlWin || controlWin.isDestroyed()) {
    controlWin = createControlWindow()
    controlWin.once('ready-to-show', () => controlWin?.show())
  } else {
    controlWin.show()
    controlWin.focus()
  }
}

function popupPetMenu(): void {
  if (!petWin || !scheduler || !actions) return
  const menu = buildContextMenu(scheduler.snapshot(), actions, currentScale, currentLang)
  menu.popup({
    window: petWin,
    callback: () => {
      if (petWin && !petWin.isDestroyed()) petWin.moveTop()
    },
  })
}

function setPetScale(scale: number): void {
  const allowed = PET_SCALES as readonly number[]
  if (!allowed.includes(scale)) return
  currentScale = scale as PetScale
  mover?.updateDims(scaledDims(scale))
  // Notify renderers about the scale change via position broadcast.
  if (petWin && !petWin.isDestroyed() && mover) {
    const p = mover.position()
    petWin.webContents.send(IPC.ON_PET_POS, { x: p.x, y: p.y, scale: currentScale })
  }
  const cfg = loadConfig()
  saveConfig({ ...cfg, ui: { ...cfg.ui, petScale: scale } })
  if (scheduler && actions) refreshTray(scheduler.snapshot(), actions, currentScale, currentLang)
}

function setLang(lang: Lang): void {
  currentLang = lang
  const cfg = loadConfig()
  saveConfig({ ...cfg, ui: { ...cfg.ui, language: lang } })
  if (scheduler && actions) refreshTray(scheduler.snapshot(), actions, currentScale, currentLang)
  // Push to renderers
  for (const w of withWins()) w.webContents.send(IPC.ON_LANG, lang)
}

async function handleReset(): Promise<void> {
  const target = controlWin && controlWin.isVisible() ? controlWin : petWin
  if (!target) return
  const res = await dialog.showMessageBox(target, {
    type: 'warning',
    buttons: [t('cancel', currentLang), t('reset', currentLang)],
    defaultId: 0,
    cancelId: 0,
    message: t('confirmReset', currentLang),
  })
  if (res.response === 1) {
    const fresh = resetPet()
    scheduler?.resetPet(fresh)
  }
}

app.whenReady().then(() => {
  ensureDirs()
  assertDataPresent()
  const cfg = loadConfig()
  currentScale = cfg.ui.petScale ?? 1.0
  currentLang = cfg.ui.language ?? 'ko'

  petWin = createPetWindow()
  const startDisplay = screen.getPrimaryDisplay()
  const work = { width: startDisplay.workArea.width, height: startDisplay.workArea.height }

  const state = loadState()
  const rules = loadEvolutionRules()
  setEggLineage(loadEggLineage())

  scheduler = new Scheduler(state, rules, {
    onChange: (snap) => {
      for (const w of withWins()) w.webContents.send(IPC.ON_SNAPSHOT, snap)
      if (actions) refreshTray(snap, actions, currentScale, currentLang)
      const isEgg = snap.state.stage === 'egg' || snap.state.digimonId === 'egg'
      if (isEgg !== lastEggPaused) {
        mover?.pause(isEgg)
        lastEggPaused = isEgg
      }
      const isActive =
        snap.phase.kind === 'focus' ||
        snap.phase.kind === 'break' ||
        snap.phase.kind === 'done'
      mover?.setActive(isActive)
      if (petWin && !petWin.isDestroyed() && !petWin.isVisible()) petWin.show()
    },
    onForkComplete: (slot) => {
      const c = loadConfig()
      if (c.notifications.onForkComplete) {
        notify(
          t('notifyForkCompleteTitle', currentLang),
          t('notifyForkCompleteBody', currentLang, {
            slot: t(`slot_${slot}`, currentLang),
          }),
        )
      }
      for (const w of withWins()) w.webContents.send(IPC.ON_FORK_COMPLETE, { slot })
    },
    onBreakEnd: () => {
      const c = loadConfig()
      if (c.notifications.onBreakEnd) {
        notify(t('notifyBreakEndTitle', currentLang), t('notifyBreakEndBody', currentLang))
      }
      for (const w of withWins()) w.webContents.send(IPC.ON_BREAK_END, {})
    },
    onEvolve: (from, to) => {
      const c = loadConfig()
      if (c.notifications.onEvolve) {
        notify(t('notifyEvolveTitle', currentLang), `${from} → ${to}`)
      }
      for (const w of withWins()) w.webContents.send(IPC.ON_EVOLVE, { from, to })
    },
    onRip: () => {
      notify(t('notifyRipTitle', currentLang), t('notifyRipBody', currentLang))
      for (const w of withWins()) w.webContents.send(IPC.ON_RIP, {})
    },
  })

  scheduler.setTunables(tunablesFromConfig())

  mover = new PetMover(work, scaledDims(currentScale))
  mover.setOnFacingChange((dir) => {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send(IPC.ON_PET_FACING, dir)
  })
  mover.setOnJump((e) => {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send(IPC.ON_PET_JUMP, e)
  })
  mover.setOnPosition((p) => {
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send(IPC.ON_PET_POS, { x: p.x, y: p.y, scale: currentScale })
    }
  })
  mover.start()

  const refreshDisplayBounds = (): void => {
    if (!petWin || petWin.isDestroyed()) return
    const b = petWin.getBounds()
    const d = screen.getDisplayMatching(b)
    petWin.setBounds(d.workArea)
    mover?.updateWorkArea({ width: d.workArea.width, height: d.workArea.height })
  }
  screen.on('display-metrics-changed', refreshDisplayBounds)
  screen.on('display-added', refreshDisplayBounds)
  screen.on('display-removed', refreshDisplayBounds)

  const now = () => Math.floor(Date.now() / 1000)
  actions = {
    startFocus: () => scheduler?.dispatch({ type: 'start_focus', now: now() }),
    pause: () => scheduler?.dispatch({ type: 'pause', now: now() }),
    resume: () => scheduler?.dispatch({ type: 'resume', now: now() }),
    abortFocus: () => scheduler?.dispatch({ type: 'abort', now: now() }),
    ackDone: () => scheduler?.dispatch({ type: 'acknowledge_done', now: now() }),
    skipBreak: () => scheduler?.dispatch({ type: 'skip_break', now: now() }),
    showControl: () => showControlWindow(),
    resetPet: () => void handleReset(),
    setScale: (s: number) => setPetScale(s),
    setLang: (l: Lang) => setLang(l),
  }

  registerIpc({
    scheduler,
    spriteBaseUrl: spriteBaseUrl(),
    showPetMenu: () => popupPetMenu(),
    showControl: () => showControlWindow(),
    resetPet: () => void handleReset(),
    dragStart: () => {
      if (!petWin || petWin.isDestroyed() || !mover) return
      startPetDrag(mover, petWin, {
        onStart: () => mover?.setDragging(true),
        onEnd: () => mover?.setDragging(false),
      })
    },
    dragEnd: () =>
      stopPetDrag({
        onStart: () => mover?.setDragging(true),
        onEnd: () => mover?.setDragging(false),
      }),
    setHover: (hover) => {
      if (!petWin || petWin.isDestroyed()) return
      petWin.setIgnoreMouseEvents(!hover, { forward: true })
    },
    pause: () => actions?.pause(),
    resume: () => actions?.resume(),
    getConfig: () => loadConfig(),
    saveConfig: (newCfg) => {
      saveConfig(newCfg as Parameters<typeof saveConfig>[0])
      // Apply config changes that affect runtime.
      const nc = loadConfig()
      if (nc.ui.language !== currentLang) setLang(nc.ui.language)
      scheduler?.setTunables(tunablesFromConfig())
    },
    setScale: (s) => setPetScale(s),
    getGraveyard: () => loadGraveyard(),
  })

  createTray(scheduler.snapshot(), actions, currentScale, currentLang)
  scheduler.start()
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null)

  app.on('activate', () => {
    if (!petWin || petWin.isDestroyed()) petWin = createPetWindow()
    else petWin.show()
  })
})

app.on('window-all-closed', (e: Event) => {
  e.preventDefault?.()
})

app.on('before-quit', () => {
  mover?.stop()
  scheduler?.stop()
  disposeTray()
})
