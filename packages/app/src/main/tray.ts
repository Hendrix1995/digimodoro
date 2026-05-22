import { Tray, nativeImage } from 'electron'
import * as path from 'node:path'
import type { Lang } from '@digimodoro/core'
import { buildContextMenu, type PetMenuActions } from './menu.js'
import type { Snapshot } from './scheduler.js'

let tray: Tray | undefined

function trayIcon(): Electron.NativeImage {
  const iconPath = path.join(__dirname, '..', 'assets', 'trayIcon.png')
  const img = nativeImage.createFromPath(iconPath)
  if (img.isEmpty()) return nativeImage.createEmpty()
  img.setTemplateImage(false)
  return img
}

export function createTray(
  initial: Snapshot,
  actions: PetMenuActions,
  currentScale: number,
  lang: Lang,
): Tray {
  tray = new Tray(trayIcon())
  tray.setToolTip('DigiModoro')
  refreshTray(initial, actions, currentScale, lang)
  return tray
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function refreshTray(
  snap: Snapshot,
  actions: PetMenuActions,
  currentScale: number,
  lang: Lang,
): void {
  if (!tray) return
  const phase = snap.phase
  let title = ''
  if (phase.kind === 'focus') title = ` ${fmtTime(snap.remainingSec)}`
  else if (phase.kind === 'break') title = ` ${fmtTime(snap.remainingSec)}`
  else if (phase.kind === 'paused') title = ` ⏸ ${fmtTime(snap.remainingSec)}`
  else if (phase.kind === 'done') title = ' 🎉'
  else if (snap.state.rip) title = ' 🪦'
  tray.setTitle(title)
  tray.setContextMenu(buildContextMenu(snap, actions, currentScale, lang))
}

export function disposeTray(): void {
  tray?.destroy()
  tray = undefined
}
