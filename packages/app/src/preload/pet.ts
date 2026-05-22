import { contextBridge, ipcRenderer } from 'electron'

const IPC = {
  GET_SNAPSHOT: 'digi:get-snapshot',
  GET_SPRITE_BASE: 'digi:get-sprite-base',
  SHOW_PET_MENU: 'digi:show-pet-menu',
  SHOW_CONTROL: 'digi:show-control',
  DRAG_START: 'digi:drag-start',
  DRAG_END: 'digi:drag-end',
  SET_HOVER: 'digi:set-hover',

  ON_SNAPSHOT: 'digi:on-snapshot',
  ON_PET_FACING: 'digi:on-pet-facing',
  ON_PET_JUMP: 'digi:on-pet-jump',
  ON_PET_POS: 'digi:on-pet-pos',
  ON_EVOLVE: 'digi:on-evolve',
  ON_FORK_COMPLETE: 'digi:on-fork-complete',
  ON_BREAK_END: 'digi:on-break-end',
  ON_RIP: 'digi:on-rip',
  ON_LANG: 'digi:on-lang',
  GET_CONFIG: 'digi:get-config',
} as const

const api = {
  getSnapshot: () => ipcRenderer.invoke(IPC.GET_SNAPSHOT),
  getSpriteBase: () => ipcRenderer.invoke(IPC.GET_SPRITE_BASE),
  showPetMenu: (pos: { x: number; y: number }) => ipcRenderer.invoke(IPC.SHOW_PET_MENU, pos),
  showControl: () => ipcRenderer.invoke(IPC.SHOW_CONTROL),
  dragStart: () => ipcRenderer.invoke(IPC.DRAG_START),
  dragEnd: () => ipcRenderer.invoke(IPC.DRAG_END),
  setHover: (hover: boolean) => ipcRenderer.invoke(IPC.SET_HOVER, hover),

  onSnapshot: (cb: (snap: unknown) => void) => {
    const l = (_: Electron.IpcRendererEvent, s: unknown) => cb(s)
    ipcRenderer.on(IPC.ON_SNAPSHOT, l)
    return () => ipcRenderer.off(IPC.ON_SNAPSHOT, l)
  },
  onPetFacing: (cb: (dir: 'left' | 'right') => void) => {
    const l = (_: Electron.IpcRendererEvent, dir: 'left' | 'right') => cb(dir)
    ipcRenderer.on(IPC.ON_PET_FACING, l)
    return () => ipcRenderer.off(IPC.ON_PET_FACING, l)
  },
  onPetJump: (cb: (e: { durationMs: number }) => void) => {
    const l = (_: Electron.IpcRendererEvent, e: { durationMs: number }) => cb(e)
    ipcRenderer.on(IPC.ON_PET_JUMP, l)
    return () => ipcRenderer.off(IPC.ON_PET_JUMP, l)
  },
  onPetPos: (cb: (p: { x: number; y: number; scale: number }) => void) => {
    const l = (_: Electron.IpcRendererEvent, p: { x: number; y: number; scale: number }) => cb(p)
    ipcRenderer.on(IPC.ON_PET_POS, l)
    return () => ipcRenderer.off(IPC.ON_PET_POS, l)
  },
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

  // unused in pet but kept on the surface so the renderer types compile
  startFocus: () => Promise.resolve(),
  abortFocus: () => Promise.resolve(),
  ackDone: () => Promise.resolve(),
  skipBreak: () => Promise.resolve(),
  resetPet: () => Promise.resolve(),
  pause: () => Promise.resolve(),
  resume: () => Promise.resolve(),
  getConfig: () => ipcRenderer.invoke(IPC.GET_CONFIG),
  saveConfig: () => Promise.resolve(),
  setScale: () => Promise.resolve(),
  onLang: (cb: (lang: 'ko' | 'en') => void) => {
    const l = (_: Electron.IpcRendererEvent, lang: 'ko' | 'en') => cb(lang)
    ipcRenderer.on(IPC.ON_LANG, l)
    return () => ipcRenderer.off(IPC.ON_LANG, l)
  },
}

contextBridge.exposeInMainWorld('digimodoro', api)
