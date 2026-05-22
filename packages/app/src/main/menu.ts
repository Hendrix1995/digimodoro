import { Menu, MenuItem, app, type MenuItemConstructorOptions } from 'electron'
import { t, type Lang } from '@digimodoro/core'
import type { Snapshot } from './scheduler.js'

export type PetMenuActions = {
  startFocus: () => void
  pause: () => void
  resume: () => void
  abortFocus: () => void
  ackDone: () => void
  skipBreak: () => void
  showControl: () => void
  resetPet: () => void
  setScale: (scale: number) => void
  setLang: (lang: Lang) => void
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

const SIZE_OPTIONS: Array<{ label: string; scale: number }> = [
  { label: 'XS (50%)', scale: 0.5 },
  { label: 'S (75%)', scale: 0.75 },
  { label: 'M (100%)', scale: 1.0 },
  { label: 'L (150%)', scale: 1.5 },
  { label: 'XL (200%)', scale: 2.0 },
]

export function buildContextMenu(
  snap: Snapshot,
  actions: PetMenuActions,
  currentScale: number,
  lang: Lang,
): Menu {
  const items: MenuItemConstructorOptions[] = []
  const phase = snap.phase
  const tr = (k: string, p?: Record<string, string | number>) => t(k, lang, p)

  items.push({ label: `${snap.state.digimonId} · ${snap.state.stage}`, enabled: false })
  items.push({ type: 'separator' })

  if (snap.state.rip) {
    items.push({ label: tr('ripLabel'), enabled: false })
    items.push({ label: tr('hatchNew'), click: actions.resetPet })
  } else if (phase.kind === 'idle') {
    items.push({ label: tr('startFocus'), click: actions.startFocus })
  } else if (phase.kind === 'focus') {
    items.push({ label: `${tr('phaseFocus')}: ${fmtTime(snap.remainingSec)}`, enabled: false })
    items.push({ label: tr('pause'), click: actions.pause })
    items.push({ label: tr('abort'), click: actions.abortFocus })
  } else if (phase.kind === 'break') {
    items.push({ label: `${tr('phaseBreak')}: ${fmtTime(snap.remainingSec)}`, enabled: false })
    items.push({ label: tr('pause'), click: actions.pause })
    items.push({ label: tr('skipBreak'), click: actions.skipBreak })
  } else if (phase.kind === 'paused') {
    items.push({ label: `${tr('phasePaused')}: ${fmtTime(snap.remainingSec)}`, enabled: false })
    items.push({ label: tr('resume'), click: actions.resume })
    items.push({ label: tr('abort'), click: actions.abortFocus })
  } else if (phase.kind === 'done') {
    items.push({ label: tr('startBreak'), click: actions.ackDone })
    items.push({ label: tr('skipBreak'), click: actions.skipBreak })
  }

  items.push({ type: 'separator' })
  items.push({
    label: `${tr('forksThisStage')}: ${snap.state.xp.inStageForks}`,
    enabled: false,
  })
  items.push({
    label: `${tr('streakMiss')}: ${snap.state.streak.missDays}${tr('daySuffix')}`,
    enabled: false,
  })
  items.push({ type: 'separator' })

  items.push({
    label: tr('petSize'),
    submenu: SIZE_OPTIONS.map(
      (o): MenuItemConstructorOptions => ({
        label: o.label,
        type: 'radio',
        checked: Math.abs(currentScale - o.scale) < 1e-6,
        click: () => actions.setScale(o.scale),
      }),
    ),
  })
  items.push({
    label: tr('language'),
    submenu: [
      {
        label: '한국어',
        type: 'radio',
        checked: lang === 'ko',
        click: () => actions.setLang('ko'),
      },
      {
        label: 'English',
        type: 'radio',
        checked: lang === 'en',
        click: () => actions.setLang('en'),
      },
    ],
  })

  items.push({ label: `${tr('showStatus')}`, click: actions.showControl })
  if (!snap.state.rip) {
    items.push({ label: tr('reset'), click: actions.resetPet })
  }
  items.push({ type: 'separator' })
  items.push({ label: tr('quit'), click: () => app.quit() })

  return Menu.buildFromTemplate(items as unknown as MenuItem[])
}
