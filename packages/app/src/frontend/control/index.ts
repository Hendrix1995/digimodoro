import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { t, type Lang } from '@digimodoro/core'
import type { Snapshot, AppConfig, GraveyardEntry } from '../shared/types'
import { DEFAULT_CONFIG } from '../shared/types'
import { SPRITE_DEFAULT_FACING, spriteUrl } from '../shared/sprite-utils'
import { PetCanvas } from './pet-canvas'

const defaultFacing = (id: string): 'left' | 'right' =>
  SPRITE_DEFAULT_FACING[id] ?? 'left'

const $ = <T extends HTMLElement = HTMLElement>(id: string) => {
  const el = document.getElementById(id)
  if (!el) throw new Error('missing #' + id)
  return el as T
}

const els = {
  brand: $('brand'),
  petStage: $('pet-stage'),
  petSprite: $<HTMLImageElement>('pet-sprite'),
  petName: $('pet-name'),
  petMeta: $('pet-meta'),
  slotPill: $('slot-pill'),
  timerDigits: $('timer-digits'),
  timerPhase: $('timer-phase'),
  btnPrimary: $<HTMLButtonElement>('btn-primary'),
  btnSecondary: $<HTMLButtonElement>('btn-secondary'),
  statsTitle: $('stats-title'),
  lblNextEvo: $('lbl-next-evo'),
  statNextEvo: $('stat-next-evo'),
  statNextEvoBar: $('stat-next-evo-bar'),
  lblForksStage: $('lbl-forks-stage'),
  lblForksTotal: $('lbl-forks-total'),
  lblStreak: $('lbl-streak'),
  lblRipCountdown: $('lbl-rip-countdown'),
  lblEvoCount: $('lbl-evo-count'),
  statForksStage: $('stat-forks-stage'),
  statForksTotal: $('stat-forks-total'),
  statStreak: $('stat-streak'),
  statRipCountdown: $('stat-rip-countdown'),
  statEvoCount: $('stat-evo-count'),
  slotsRow: $('slots-row'),
  settingsTitle: $('settings-title'),
  lblLanguage: $('lbl-language'),
  segLang: $('seg-lang'),
  lblPetSize: $('lbl-pet-size'),
  segSize: $('seg-size'),
  lblFocusLen: $('lbl-focus-len'),
  inpFocus: $<HTMLInputElement>('inp-focus'),
  unitMinFocus: $('unit-min-focus'),
  lblBreakLen: $('lbl-break-len'),
  inpBreak: $<HTMLInputElement>('inp-break'),
  unitMinBreak: $('unit-min-break'),
  lblNotifications: $('lbl-notifications'),
  togFork: $<HTMLInputElement>('tog-fork'),
  lblTogFork: $('lbl-tog-fork'),
  togEvolve: $<HTMLInputElement>('tog-evolve'),
  lblTogEvolve: $('lbl-tog-evolve'),
  togBreak: $<HTMLInputElement>('tog-break'),
  lblTogBreak: $('lbl-tog-break'),
  historyTitle: $('history-title'),
  evoList: $('evo-list'),
  graveyardTitle: $('graveyard-title'),
  graveList: $('grave-list'),
  btnReset: $<HTMLButtonElement>('btn-reset'),
}

let spriteBase = ''
let snap: Snapshot | undefined
let cfg: AppConfig | undefined
let lang: Lang = 'ko'
let pet: PetCanvas | undefined
let lastPetId: string | undefined
let graveyard: GraveyardEntry[] = []

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return mm + ':' + ss
}

function evoThumbUrl(digimonId: string, eggVariant: number): string {
  return spriteUrl(spriteBase, digimonId, digimonId === 'egg' ? eggVariant : undefined)
}

function makeEvoThumb(src: string): HTMLImageElement {
  const img = document.createElement('img')
  img.className = 'evo-thumb'
  img.alt = ''
  img.src = src
  img.addEventListener('error', () => { img.style.visibility = 'hidden' })
  return img
}

function fmtDate(unixSec: number): string {
  const d = new Date(unixSec * 1000)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function fmtLifespan(bornAt: number, endAt: number): string {
  const sec = Math.max(0, endAt - bornAt)
  const days = Math.floor(sec / 86400)
  const hours = Math.floor((sec % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((sec % 3600) / 60)
  return `${hours}h ${mins}m`
}

let expandedPetId: string | undefined

function renderGraveyard(): void {
  // Clear existing content safely
  while (els.graveList.firstChild) els.graveList.removeChild(els.graveList.firstChild)
  if (graveyard.length === 0) {
    const li = document.createElement('li')
    li.className = 'grave-empty'
    li.textContent = t('graveyardEmpty', lang)
    els.graveList.appendChild(li)
    return
  }
  for (const entry of [...graveyard].reverse()) {
    const li = document.createElement('li')
    li.className = 'grave-item'
    if (expandedPetId === entry.petId) li.classList.add('is-expanded')

    const row = document.createElement('div')
    row.className = 'grave-row'

    const thumb = document.createElement('img')
    thumb.className = 'grave-thumb'
    thumb.alt = ''
    thumb.src = spriteUrl(spriteBase, entry.digimonId, entry.seedEggVariant)
    thumb.addEventListener('error', () => { thumb.style.visibility = 'hidden' })

    const body = document.createElement('div')
    body.className = 'grave-body'

    const top = document.createElement('div')
    top.className = 'grave-top'
    const name = document.createElement('span')
    name.className = 'grave-name'
    name.textContent = entry.digimonId
    const cause = document.createElement('span')
    cause.className = 'grave-cause' + (entry.rip ? ' grave-cause-rip' : '')
    cause.textContent = entry.rip ? t('graveyardRipCause', lang) : t('graveyardReset', lang)
    top.append(name, cause)

    const meta = document.createElement('div')
    meta.className = 'grave-meta'
    const endAt = entry.rip?.at ?? entry.streak.lastForkAt ?? entry.bornAt
    const lifespan = fmtLifespan(entry.bornAt, endAt)
    const evoCount = entry.evolutionHistory.length
    const forks = entry.xp.totalForks
    meta.textContent =
      `${fmtDate(entry.bornAt)} \u00B7 ${t('graveyardLifespan', lang)} ${lifespan}` +
      ` \u00B7 ${evoCount} ${t('graveyardEvoCount', lang)} \u00B7 ${forks} ${t('graveyardForks', lang)}`

    body.append(top, meta)
    row.append(thumb, body)
    li.appendChild(row)
    li.appendChild(buildGraveTree(entry))

    row.addEventListener('click', () => {
      expandedPetId = expandedPetId === entry.petId ? undefined : entry.petId
      renderGraveyard()
    })

    els.graveList.appendChild(li)
  }
}

function buildGraveTree(entry: GraveyardEntry): HTMLElement {
  const tree = document.createElement('div')
  tree.className = 'grave-tree'
  const eggVariant = entry.seedEggVariant ?? 1
  const ids: string[] = []
  if (entry.evolutionHistory.length === 0) {
    ids.push(entry.digimonId)
  } else {
    ids.push(entry.evolutionHistory[0]!.from)
    for (const h of entry.evolutionHistory) ids.push(h.to)
  }
  ids.forEach((id, i) => {
    if (i > 0) {
      const arrow = document.createElement('span')
      arrow.className = 'tree-arrow'
      arrow.textContent = '\u2192'
      tree.appendChild(arrow)
    }
    const node = document.createElement('div')
    node.className = 'tree-node'
    const img = document.createElement('img')
    img.className = 'tree-thumb'
    img.alt = ''
    img.src = spriteUrl(spriteBase, id, id === 'egg' ? eggVariant : undefined)
    img.addEventListener('error', () => { img.style.visibility = 'hidden' })
    const label = document.createElement('span')
    label.className = 'tree-name'
    label.textContent = id
    const slot = document.createElement('span')
    slot.className = 'tree-slot'
    if (i > 0) {
      const h = entry.evolutionHistory[i - 1]
      if (h) slot.textContent = t('slot_' + h.dominantSlot, lang)
    }
    node.append(img, label, slot)
    tree.appendChild(node)
  })
  return tree
}

async function refreshGraveyard(): Promise<void> {
  try {
    graveyard = await invoke<GraveyardEntry[]>('load_graveyard')
  } catch {
    graveyard = []
  }
  renderGraveyard()
}

function applyLangTexts(): void {
  els.brand.textContent = t('appName', lang)
  els.statsTitle.textContent = t('statsTitle', lang)
  els.lblNextEvo.textContent = t('nextEvolution', lang)
  els.lblForksStage.textContent = t('forksThisStage', lang)
  els.lblForksTotal.textContent = t('forksTotal', lang)
  els.lblStreak.textContent = t('streakMiss', lang)
  els.lblRipCountdown.textContent = t('daysUntilRip', lang)
  els.lblEvoCount.textContent = t('evoHistory', lang) + ' #'
  els.settingsTitle.textContent = t('settingsTitle', lang)
  els.lblLanguage.textContent = t('language', lang)
  els.lblPetSize.textContent = t('petSize', lang)
  els.lblFocusLen.textContent = t('focusLength', lang)
  els.lblBreakLen.textContent = t('breakLength', lang)
  els.unitMinFocus.textContent = t('minutes', lang)
  els.unitMinBreak.textContent = t('minutes', lang)
  els.lblNotifications.textContent = t('notifications', lang)
  els.lblTogFork.textContent = t('notifyForkComplete', lang)
  els.lblTogEvolve.textContent = t('notifyEvolve', lang)
  els.lblTogBreak.textContent = t('notifyBreakEnd', lang)
  els.historyTitle.textContent = t('evoHistory', lang)
  els.graveyardTitle.textContent = t('graveyardTitle', lang)
  els.btnReset.textContent = t('reset', lang)
  if (snap) applyTimerLabels()
  renderGraveyard()
}

function applyTimerLabels(): void {
  if (!snap) return
  const phase = snap.phase
  if (phase.kind === 'idle') {
    els.timerPhase.textContent = t('phaseIdle', lang)
    els.btnPrimary.textContent = t('startFocus', lang)
    els.btnPrimary.dataset.action = 'start'
    els.btnSecondary.hidden = true
  } else if (phase.kind === 'focus') {
    els.timerPhase.textContent = t('phaseFocus', lang)
    els.btnPrimary.textContent = t('pause', lang)
    els.btnPrimary.dataset.action = 'pause'
    els.btnSecondary.hidden = false
    els.btnSecondary.textContent = t('abort', lang)
    els.btnSecondary.dataset.action = 'abort'
  } else if (phase.kind === 'paused') {
    els.timerPhase.textContent = t('phasePaused', lang)
    els.btnPrimary.textContent = t('resume', lang)
    els.btnPrimary.dataset.action = 'resume'
    els.btnSecondary.hidden = false
    els.btnSecondary.textContent = t('abort', lang)
    els.btnSecondary.dataset.action = 'abort'
  } else if (phase.kind === 'done') {
    els.timerPhase.textContent = t('phaseDone', lang)
    els.btnPrimary.textContent = t('startBreak', lang)
    els.btnPrimary.dataset.action = 'ack-done'
    els.btnSecondary.hidden = false
    els.btnSecondary.textContent = t('skipBreak', lang)
    els.btnSecondary.dataset.action = 'skip-break'
  } else if (phase.kind === 'break') {
    els.timerPhase.textContent = t('phaseBreak', lang)
    els.btnPrimary.textContent = t('pause', lang)
    els.btnPrimary.dataset.action = 'pause'
    els.btnSecondary.hidden = false
    els.btnSecondary.textContent = t('skipBreak', lang)
    els.btnSecondary.dataset.action = 'skip-break'
  }
  if (snap.state.rip) {
    els.timerPhase.textContent = 'R.I.P.'
    els.btnPrimary.textContent = t('hatchNew', lang)
    els.btnPrimary.dataset.action = 'reset'
    els.btnSecondary.hidden = true
  }
}

function applySnapshot(s: Snapshot): void {
  snap = s
  els.petName.textContent = s.state.digimonId
  els.petMeta.textContent =
    t('stage_' + s.state.stage, lang) +
    (s.state.personality ? ' \u00B7 ' + t('personality_' + s.state.personality, lang) : '')
  const isEgg = s.state.digimonId === 'egg' || s.state.stage === 'egg'
  document.body.classList.toggle('is-egg', isEgg)
  pet?.setDigimon(s.state.digimonId, s.state.seedEggVariant)
  if (lastPetId !== undefined && lastPetId !== s.state.petId) {
    void refreshGraveyard()
  }
  lastPetId = s.state.petId

  els.timerDigits.textContent = fmtTime(s.remainingSec)
  applyTimerLabels()

  const inStage = s.state.xp.inStageForks
  const req = s.nextStageForksRequired
  if (req == null) {
    els.statNextEvo.textContent = t('ripStageMaxValue', lang)
    els.lblNextEvo.textContent = t('ripStageMax', lang)
    ;(els.statNextEvoBar as HTMLElement).style.width = '100%'
    ;(els.statNextEvoBar as HTMLElement).classList.add('is-max')
  } else {
    const capped = Math.min(inStage, req)
    els.statNextEvo.textContent = `${capped}/${req}`
    els.lblNextEvo.textContent = t('nextEvolution', lang)
    const pct = req > 0 ? Math.min(100, Math.round((capped / req) * 100)) : 0
    ;(els.statNextEvoBar as HTMLElement).style.width = pct + '%'
    ;(els.statNextEvoBar as HTMLElement).classList.remove('is-max')
  }
  els.statForksStage.textContent = String(inStage)
  els.statForksTotal.textContent = String(s.state.xp.totalForks)
  els.statStreak.textContent = s.state.streak.missDays + t('daySuffix', lang)
  const days = s.daysUntilRip
  els.statRipCountdown.textContent = days + t('daySuffix', lang)
  els.statRipCountdown.classList.toggle('danger', days <= 1)
  els.statRipCountdown.classList.toggle('warning', days === 2)
  els.statEvoCount.textContent = String(s.state.evolutionHistory.length)

  // Clear and rebuild slots row safely
  while (els.slotsRow.firstChild) els.slotsRow.removeChild(els.slotsRow.firstChild)
  const counts = s.state.inStageSlotForks
  for (const slot of ['morning', 'forenoon', 'midday', 'evening', 'night'] as const) {
    const chip = document.createElement('div')
    chip.className = 'slot-chip' + (counts[slot] > 0 ? ' has' : '')
    const strong = document.createElement('strong')
    strong.textContent = String(counts[slot])
    chip.appendChild(strong)
    chip.appendChild(document.createTextNode(t('slot_' + slot, lang)))
    els.slotsRow.appendChild(chip)
  }
  els.slotPill.textContent = currentSlotLabel(s.nowSec)

  // Evo history
  while (els.evoList.firstChild) els.evoList.removeChild(els.evoList.firstChild)
  if (s.state.evolutionHistory.length === 0) {
    const li = document.createElement('li')
    li.className = 'evo-empty'
    li.textContent = '-'
    els.evoList.appendChild(li)
  } else {
    const eggVariant = s.state.seedEggVariant ?? 1
    for (const e of [...s.state.evolutionHistory].reverse()) {
      const li = document.createElement('li')
      const pair = document.createElement('span')
      pair.className = 'evo-pair'
      const fromImg = makeEvoThumb(evoThumbUrl(e.from, eggVariant))
      const fromName = document.createElement('span')
      fromName.className = 'evo-name'
      fromName.textContent = e.from
      const arrow = document.createElement('span')
      arrow.className = 'evo-arrow'
      arrow.textContent = '\u2192'
      const toImg = makeEvoThumb(evoThumbUrl(e.to, eggVariant))
      const toName = document.createElement('span')
      toName.className = 'evo-name'
      toName.textContent = e.to
      pair.append(fromImg, fromName, arrow, toImg, toName)
      const slot = document.createElement('span')
      slot.className = 'evo-slot'
      slot.textContent = t('slot_' + e.dominantSlot, lang)
      li.append(pair, slot)
      els.evoList.appendChild(li)
    }
  }

  document.body.classList.toggle('is-rip', Boolean(s.state.rip))
}

function currentSlotLabel(nowSec: number): string {
  const h = new Date(nowSec * 1000).getHours()
  let key = 'night'
  if (h >= 5 && h < 9) key = 'morning'
  else if (h >= 9 && h < 12) key = 'forenoon'
  else if (h >= 12 && h < 17) key = 'midday'
  else if (h >= 17 && h < 21) key = 'evening'
  return t('slot_' + key, lang)
}

function setSegOn(container: HTMLElement, selector: string): void {
  for (const b of container.querySelectorAll('.seg-btn')) b.classList.remove('on')
  const el = container.querySelector(selector)
  if (el) el.classList.add('on')
}

function syncSettingsUi(): void {
  if (!cfg) return
  setSegOn(els.segLang, '[data-lang="' + cfg.ui.language + '"]')
  setSegOn(els.segSize, '[data-scale="' + cfg.ui.petScale + '"]')
  els.inpFocus.value = String(cfg.pomodoro.focusMinutes)
  els.inpBreak.value = String(cfg.pomodoro.breakMinutes)
  els.togFork.checked = cfg.notifications.onForkComplete
  els.togEvolve.checked = cfg.notifications.onEvolve
  els.togBreak.checked = cfg.notifications.onBreakEnd
}

async function persistCfg(): Promise<void> {
  if (!cfg) return
  await invoke('save_config', { config: cfg })
}

// --- Button wiring (emit actions to pet window) ---

function emitAction(type: string): void {
  void emit('digi:action', { type, now: Math.floor(Date.now() / 1000) })
}

// --- Custom confirm dialog ---

let confirmResolve: ((v: boolean) => void) | undefined
const confirmOverlay = document.createElement('div')
confirmOverlay.className = 'confirm-overlay hidden'
const confirmBox = document.createElement('div')
confirmBox.className = 'confirm-box'
const confirmMsg = document.createElement('div')
confirmMsg.className = 'confirm-msg'
const confirmBtns = document.createElement('div')
confirmBtns.className = 'confirm-btns'
const confirmYes = document.createElement('button')
confirmYes.className = 'btn confirm-yes'
const confirmNo = document.createElement('button')
confirmNo.className = 'btn confirm-no'
confirmBtns.append(confirmNo, confirmYes)
confirmBox.append(confirmMsg, confirmBtns)
confirmOverlay.appendChild(confirmBox)
document.body.appendChild(confirmOverlay)

confirmYes.addEventListener('click', () => {
  confirmOverlay.classList.add('hidden')
  confirmResolve?.(true)
})
confirmNo.addEventListener('click', () => {
  confirmOverlay.classList.add('hidden')
  confirmResolve?.(false)
})

function showConfirm(msg: string): Promise<boolean> {
  confirmMsg.textContent = msg
  confirmYes.textContent = t('confirmYes', lang)
  confirmNo.textContent = lang === 'ko' ? '\uCDE8\uC18C' : 'Cancel'
  confirmOverlay.classList.remove('hidden')
  return new Promise((resolve) => { confirmResolve = resolve })
}

async function doReset(): Promise<void> {
  const { initialState } = await import('@digimodoro/core')
  const fresh = initialState({
    now: Math.floor(Date.now() / 1000),
    petId: `pet_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`,
    seedEggVariant: 1 + Math.floor(Math.random() * 11),
    personality: (['calm', 'gentle', 'holy', 'mischief', 'savage'] as const)[
      Math.floor(Math.random() * 5)
    ],
  })
  await invoke('reset_pet', { newState: fresh })
  void emit('digi:reset-pet', { fresh })
}

els.btnPrimary.addEventListener('click', async () => {
  const a = els.btnPrimary.dataset.action
  if (a === 'start') emitAction('start_focus')
  else if (a === 'pause') emitAction('pause')
  else if (a === 'resume') emitAction('resume')
  else if (a === 'abort') {
    if (await showConfirm(t('confirmAbort', lang))) emitAction('abort')
  }
  else if (a === 'ack-done') emitAction('acknowledge_done')
  else if (a === 'skip-break') emitAction('skip_break')
  else if (a === 'reset') {
    if (await showConfirm(t('confirmReset', lang))) void doReset()
  }
})
els.btnSecondary.addEventListener('click', async () => {
  const a = els.btnSecondary.dataset.action
  if (a === 'skip-break') emitAction('skip_break')
  else if (a === 'abort') {
    if (await showConfirm(t('confirmAbort', lang))) emitAction('abort')
  }
})
els.btnReset.addEventListener('click', async () => {
  if (await showConfirm(t('confirmReset', lang))) void doReset()
})

els.segLang.addEventListener('click', async (e) => {
  const target = (e.target as HTMLElement).closest('.seg-btn') as HTMLElement | null
  if (!target || !cfg) return
  const l = target.dataset.lang as Lang
  cfg.ui.language = l
  lang = l
  setSegOn(els.segLang, '[data-lang="' + l + '"]')
  applyLangTexts()
  syncSettingsUi()
  if (snap) applySnapshot(snap)
  await persistCfg()
  void emit('digi:lang-change', { lang: l })
})
els.segSize.addEventListener('click', async (e) => {
  const target = (e.target as HTMLElement).closest('.seg-btn') as HTMLElement | null
  if (!target || !cfg) return
  const s = Number(target.dataset.scale)
  cfg.ui.petScale = s
  setSegOn(els.segSize, '[data-scale="' + s + '"]')
  await persistCfg()
  void emit('digi:scale-change', { scale: s })
})
els.inpFocus.addEventListener('change', async () => {
  if (!cfg) return
  cfg.pomodoro.focusMinutes = Math.max(1, Math.min(180, Number(els.inpFocus.value) || 50))
  els.inpFocus.value = String(cfg.pomodoro.focusMinutes)
  await persistCfg()
})
els.inpBreak.addEventListener('change', async () => {
  if (!cfg) return
  cfg.pomodoro.breakMinutes = Math.max(1, Math.min(60, Number(els.inpBreak.value) || 10))
  els.inpBreak.value = String(cfg.pomodoro.breakMinutes)
  await persistCfg()
})
for (const [el, key] of [
  [els.togFork, 'onForkComplete'],
  [els.togEvolve, 'onEvolve'],
  [els.togBreak, 'onBreakEnd'],
] as const) {
  el.addEventListener('change', async () => {
    if (!cfg) return
    ;(cfg.notifications as Record<string, boolean>)[key] = el.checked
    await persistCfg()
  })
}

// --- Boot ---

async function boot(): Promise<void> {
  spriteBase = await invoke<string>('get_sprite_base_path')
  try {
    cfg = await invoke<AppConfig>('load_config')
  } catch {
    cfg = DEFAULT_CONFIG
  }
  lang = cfg.ui.language
  applyLangTexts()
  syncSettingsUi()

  pet = new PetCanvas({
    spriteEl: els.petSprite,
    stageEl: els.petStage,
    spriteBase,
    defaultFacing,
  })
  pet.start()

  // Listen for snapshots from pet window
  await listen<Snapshot>('digi:snapshot', (event) => {
    applySnapshot(event.payload)
  })
  await listen<{ lang: Lang }>('digi:lang-change', (event) => {
    lang = event.payload.lang
    if (cfg) cfg.ui.language = lang
    applyLangTexts()
    syncSettingsUi()
    if (snap) applySnapshot(snap)
  })

  await refreshGraveyard()

  console.log('[control] booted')
}

void boot()
