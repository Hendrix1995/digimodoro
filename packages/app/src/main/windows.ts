import { BrowserWindow, screen } from 'electron'
import * as path from 'node:path'

export const PET_BASE = { width: 96, height: 96 }
export const PET_SCALES = [0.5, 0.75, 1.0, 1.5, 2.0] as const
export type PetScale = (typeof PET_SCALES)[number]

export function scaledDims(scale: number): { width: number; height: number } {
  return {
    width: Math.round(PET_BASE.width * scale),
    height: Math.round(PET_BASE.height * scale),
  }
}

// The pet window is a transparent click-through surface covering ONE
// display's work area at a time. To move to another monitor the caller
// drags the cursor onto it; the main process responds by re-bounding the
// window to that display.
export function createPetWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const { x: ax, y: ay, width: aw, height: ah } = display.workArea

  const win = new BrowserWindow({
    width: aw,
    height: ah,
    x: ax,
    y: ay,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    show: true,
    focusable: true,
    roundedCorners: false,
    // Fullscreen transparent click-through windows are large enough that the
    // small-window NSWindow alpha bug doesn't trigger. We also skip vibrancy
    // entirely — vibrancy paints its own backdrop and we want pure transparency.
    webPreferences: {
      preload: path.join(__dirname, '../preload/pet.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  })

  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setBackgroundColor('#00000000')

  win.loadFile(path.join(__dirname, '../renderer/pet/index.html'))
  win.webContents.on('did-finish-load', () => {
    win.setBackgroundColor('#00000000')
    win.show()
    win.moveTop()
    console.log('[pet] loaded; bounds=', win.getBounds())
    // Click-through everywhere by default; renderer toggles off when cursor
    // is over the sprite. Apply AFTER load so initial paint isn't suppressed.
    win.setIgnoreMouseEvents(true, { forward: true })
  })

  return win
}

export function createControlWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 380,
    height: 560,
    show: false,
    title: 'DigiModoro',
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, '../preload/control.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  win.setMenuBarVisibility(false)
  win.loadFile(path.join(__dirname, '../renderer/control/index.html'))
  win.on('close', (e) => {
    if (!(win as unknown as { __reallyClose?: boolean }).__reallyClose) {
      e.preventDefault()
      win.hide()
    }
  })
  return win
}

export function reallyClose(win: BrowserWindow): void {
  ;(win as unknown as { __reallyClose: boolean }).__reallyClose = true
  win.close()
}
