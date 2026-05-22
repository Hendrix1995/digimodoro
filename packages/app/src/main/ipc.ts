import { ipcMain, type BrowserWindow } from 'electron'
import type { Scheduler, Snapshot } from './scheduler.js'

export const IPC = {
  GET_SNAPSHOT: 'digi:get-snapshot',
  GET_SPRITE_BASE: 'digi:get-sprite-base',
  START_FOCUS: 'digi:start-focus',
  ABORT_FOCUS: 'digi:abort-focus',
  ACK_DONE: 'digi:ack-done',
  SKIP_BREAK: 'digi:skip-break',
  RESET_PET: 'digi:reset-pet',
  SHOW_PET_MENU: 'digi:show-pet-menu',
  SHOW_CONTROL: 'digi:show-control',
  DRAG_START: 'digi:drag-start',
  DRAG_END: 'digi:drag-end',
  SET_HOVER: 'digi:set-hover',
  PAUSE: 'digi:pause',
  RESUME: 'digi:resume',
  GET_CONFIG: 'digi:get-config',
  SAVE_CONFIG: 'digi:save-config',
  SET_SCALE: 'digi:set-scale',
  GET_GRAVEYARD: 'digi:get-graveyard',

  ON_SNAPSHOT: 'digi:on-snapshot',
  ON_PET_FACING: 'digi:on-pet-facing',
  ON_PET_JUMP: 'digi:on-pet-jump',
  ON_PET_POS: 'digi:on-pet-pos',
  ON_EVOLVE: 'digi:on-evolve',
  ON_FORK_COMPLETE: 'digi:on-fork-complete',
  ON_BREAK_END: 'digi:on-break-end',
  ON_RIP: 'digi:on-rip',
  ON_LANG: 'digi:on-lang',
} as const

export type IpcWiring = {
  scheduler: Scheduler
  spriteBaseUrl: string
  showPetMenu: () => void
  showControl: () => void
  resetPet: () => void
  dragStart: () => void
  dragEnd: () => void
  setHover: (hover: boolean) => void
  pause: () => void
  resume: () => void
  getConfig: () => unknown
  saveConfig: (cfg: unknown) => void
  setScale: (scale: number) => void
  getGraveyard: () => unknown
}

export function registerIpc(w: IpcWiring): void {
  const nowSec = () => Math.floor(Date.now() / 1000)

  ipcMain.handle(IPC.GET_SNAPSHOT, (): Snapshot => w.scheduler.snapshot())
  ipcMain.handle(IPC.GET_SPRITE_BASE, (): string => w.spriteBaseUrl)
  ipcMain.handle(IPC.START_FOCUS, () => {
    w.scheduler.dispatch({ type: 'start_focus', now: nowSec() })
  })
  ipcMain.handle(IPC.ABORT_FOCUS, () => {
    w.scheduler.dispatch({ type: 'abort', now: nowSec() })
  })
  ipcMain.handle(IPC.ACK_DONE, () => {
    w.scheduler.dispatch({ type: 'acknowledge_done', now: nowSec() })
  })
  ipcMain.handle(IPC.SKIP_BREAK, () => {
    w.scheduler.dispatch({ type: 'skip_break', now: nowSec() })
  })
  ipcMain.handle(IPC.RESET_PET, () => {
    w.resetPet()
  })
  ipcMain.handle(IPC.SHOW_PET_MENU, () => {
    w.showPetMenu()
  })
  ipcMain.handle(IPC.SHOW_CONTROL, () => {
    w.showControl()
  })
  ipcMain.handle(IPC.DRAG_START, () => {
    w.dragStart()
  })
  ipcMain.handle(IPC.DRAG_END, () => {
    w.dragEnd()
  })
  ipcMain.handle(IPC.SET_HOVER, (_e, hover: boolean) => {
    w.setHover(Boolean(hover))
  })
  ipcMain.handle(IPC.PAUSE, () => w.pause())
  ipcMain.handle(IPC.RESUME, () => w.resume())
  ipcMain.handle(IPC.GET_CONFIG, () => w.getConfig())
  ipcMain.handle(IPC.SAVE_CONFIG, (_e, cfg: unknown) => w.saveConfig(cfg))
  ipcMain.handle(IPC.SET_SCALE, (_e, scale: number) => w.setScale(scale))
  ipcMain.handle(IPC.GET_GRAVEYARD, () => w.getGraveyard())
}

export function broadcast(
  windows: BrowserWindow[],
  channel: string,
  payload?: unknown,
): void {
  for (const win of windows) {
    if (win.isDestroyed()) continue
    win.webContents.send(channel, payload)
  }
}
