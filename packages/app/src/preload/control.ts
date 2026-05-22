import { contextBridge, ipcRenderer } from 'electron'

const IPC = {
  GET_SNAPSHOT: 'digi:get-snapshot',
  GET_SPRITE_BASE: 'digi:get-sprite-base',
  START_FOCUS: 'digi:start-focus',
  ABORT_FOCUS: 'digi:abort-focus',
  ACK_DONE: 'digi:ack-done',
  SKIP_BREAK: 'digi:skip-break',
  RESET_PET: 'digi:reset-pet',
  PAUSE: 'digi:pause',
  RESUME: 'digi:resume',
  GET_CONFIG: 'digi:get-config',
  SAVE_CONFIG: 'digi:save-config',
  SET_SCALE: 'digi:set-scale',
  GET_GRAVEYARD: 'digi:get-graveyard',

  ON_SNAPSHOT: 'digi:on-snapshot',
  ON_EVOLVE: 'digi:on-evolve',
  ON_FORK_COMPLETE: 'digi:on-fork-complete',
  ON_BREAK_END: 'digi:on-break-end',
  ON_RIP: 'digi:on-rip',
  ON_LANG: 'digi:on-lang',
} as const

const api = {
  getSnapshot: () => ipcRenderer.invoke(IPC.GET_SNAPSHOT),
  getSpriteBase: () => ipcRenderer.invoke(IPC.GET_SPRITE_BASE),
  startFocus: () => ipcRenderer.invoke(IPC.START_FOCUS),
  abortFocus: () => ipcRenderer.invoke(IPC.ABORT_FOCUS),
  ackDone: () => ipcRenderer.invoke(IPC.ACK_DONE),
  skipBreak: () => ipcRenderer.invoke(IPC.SKIP_BREAK),
  resetPet: () => ipcRenderer.invoke(IPC.RESET_PET),

  // pet-only surface; control window doesn't use these but the renderer
  // shares one union type
  showPetMenu: (_pos: { x: number; y: number }) => Promise.resolve(),
  showControl: () => Promise.resolve(),
  dragStart: () => Promise.resolve(),
  dragEnd: () => Promise.resolve(),
  setHover: (_hover: boolean) => Promise.resolve(),
  pause: () => ipcRenderer.invoke(IPC.PAUSE),
  resume: () => ipcRenderer.invoke(IPC.RESUME),
  getConfig: () => ipcRenderer.invoke(IPC.GET_CONFIG),
  saveConfig: (cfg: unknown) => ipcRenderer.invoke(IPC.SAVE_CONFIG, cfg),
  setScale: (scale: number) => ipcRenderer.invoke(IPC.SET_SCALE, scale),
  getGraveyard: () => ipcRenderer.invoke(IPC.GET_GRAVEYARD),
  onLang: (cb: (lang: 'ko' | 'en') => void) => {
    const l = (_: Electron.IpcRendererEvent, lang: 'ko' | 'en') => cb(lang)
    ipcRenderer.on(IPC.ON_LANG, l)
    return () => ipcRenderer.off(IPC.ON_LANG, l)
  },

  onSnapshot: (cb: (snap: unknown) => void) => {
    const l = (_: Electron.IpcRendererEvent, s: unknown) => cb(s)
    ipcRenderer.on(IPC.ON_SNAPSHOT, l)
    return () => ipcRenderer.off(IPC.ON_SNAPSHOT, l)
  },
  onPetFacing: (_cb: (dir: 'left' | 'right') => void) => () => {},
  onPetJump: (_cb: (e: { durationMs: number }) => void) => () => {},
  onPetPos: (_cb: (p: { x: number; y: number; scale: number }) => void) => () => {},
  onEvolve: (cb: (e: { from: string; to: string }) => void) => {
    const l = (_: Electron.IpcRendererEvent, p: { from: string; to: string }) => cb(p)
    ipcRenderer.on(IPC.ON_EVOLVE, l)
    return () => ipcRenderer.off(IPC.ON_EVOLVE, l)
  },
  onForkComplete: (cb: (e: { slot: string }) => void) => {
    const l = (_: Electron.IpcRendererEvent, p: { slot: string }) => cb(p)
    ipcRenderer.on(IPC.ON_FORK_COMPLETE, l)
    return () => ipcRenderer.off(IPC.ON_FORK_COMPLETE, l)
  },
  onBreakEnd: (cb: () => void) => {
    const l = () => cb()
    ipcRenderer.on(IPC.ON_BREAK_END, l)
    return () => ipcRenderer.off(IPC.ON_BREAK_END, l)
  },
  onRip: (cb: () => void) => {
    const l = () => cb()
    ipcRenderer.on(IPC.ON_RIP, l)
    return () => ipcRenderer.off(IPC.ON_RIP, l)
  },
}

contextBridge.exposeInMainWorld('digimodoro', api)
