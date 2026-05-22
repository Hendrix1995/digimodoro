/// <reference path="../api.d.ts" />
import { t, type Lang } from '@digimodoro/core'

const api = window.digimodoro
let lang: Lang = 'ko'

const sprite = document.getElementById('sprite') as HTMLImageElement
const bubble = document.getElementById('bubble') as HTMLDivElement

let spriteBase = ''
let lastDigi = ''
let lastVariant: number | undefined
// Start at a visible default (bottom-center of viewport) so the sprite is
// never invisible even if the very first position broadcast from the main
// process is lost — which is the recurring Windows symptom. The mover's
// next tick (~16 ms) overwrites this with the real coordinate.
let petX = Math.round((typeof window !== 'undefined' ? window.innerWidth : 800) / 2)
let petY = Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 600) - 80)
let petScale = 1
let bubbleVisible = false
let firstPositionReceived = false

const BASE_PX = 96 // base sprite size at scale=1

function spriteUrl(digimonId: string, variant: number | undefined): string {
  if (digimonId === 'egg') {
    const v = variant ?? 1
    const key = 'v' + String(v).padStart(2, '0')
    return `${spriteBase}egg/${key}.png`
  }
  return `${spriteBase}${digimonId}/idle.gif`
}

function refreshSprite(digimonId: string, variant: number | undefined): void {
  if (digimonId === lastDigi && variant === lastVariant) return
  lastDigi = digimonId
  lastVariant = variant
  sprite.src = spriteUrl(digimonId, variant)
  // Force position re-apply once the image actually loads, in case the
  // window's transparent compositor on Windows skipped the earlier paint.
  sprite.addEventListener('load', () => applyPosition(), { once: true })
  sprite.addEventListener('error', () => {
    console.error('[pet] failed to load sprite:', sprite.src)
  }, { once: true })
}

// Most raw sprites face LEFT by default. The ones listed below face right.
// Source: manual inspection of packages/data/sprites/_raw/.
const SPRITE_DEFAULT_FACING: Record<string, 'left' | 'right'> = {
  hanumon: 'right',
  chocomon: 'right',
  damemon: 'right',
  darkdramon: 'right',
  darktyranomon: 'right',
  gaogamon: 'right',
  dracumon: 'right',
  ebidramon: 'right',
  exogrimmon: 'right',
  geremon: 'right',
  gizamon: 'right',
  greymon: 'right',
  knightchessmonwhite: 'right',
  kunemon: 'right',
  reppamon: 'right',
  metaletemon: 'right',
  metalgarurumon: 'right',
  metalgreymon: 'right',
  numemon: 'right',
}

function setFacing(dir: 'left' | 'right'): void {
  const def = SPRITE_DEFAULT_FACING[lastDigi] ?? 'left'
  // No flip when walk dir matches the sprite's natural facing.
  const flip = dir === def ? 1 : -1
  sprite.style.setProperty('--facing', String(flip))
}

function applyPosition(): void {
  const size = BASE_PX * petScale
  sprite.style.width = `${size}px`
  sprite.style.height = `${size}px`
  sprite.style.left = `${petX}px`
  sprite.style.top = `${petY}px`
  if (bubbleVisible) {
    bubble.style.left = `${petX}px`
    bubble.style.top = `${petY - size}px`
  }
}

let bubbleTimer: ReturnType<typeof setTimeout> | undefined
function showBubble(text: string, ms = 2200): void {
  bubble.textContent = text
  bubble.hidden = false
  bubbleVisible = true
  applyPosition()
  if (bubbleTimer) clearTimeout(bubbleTimer)
  bubbleTimer = setTimeout(() => {
    bubble.hidden = true
    bubbleVisible = false
  }, ms)
}

// ── Sprite hit-test → toggle window click-through ─────────────────────────
// We watch mouseover/mouseout on the sprite. When the cursor is on the
// sprite, main flips the window out of click-through mode so click/drag/
// context-menu land here. When the cursor leaves, click-through resumes so
// the desktop and other apps stay reachable.
sprite.addEventListener('mouseenter', () => {
  void api.setHover(true)
})
sprite.addEventListener('mouseleave', () => {
  void api.setHover(false)
})

window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  void api.showPetMenu({ x: e.x, y: e.y })
})

sprite.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return
  if (e.ctrlKey) return // allow ctrl+click for context menu on macOS
  e.preventDefault()
  void api.dragStart()
  const onUp = (): void => {
    void api.dragEnd()
    window.removeEventListener('mouseup', onUp, true)
    window.removeEventListener('blur', onUp, true)
  }
  window.addEventListener('mouseup', onUp, true)
  window.addEventListener('blur', onUp, true)
})

// Register IPC listeners synchronously BEFORE awaiting anything so a fast
// main-process broadcast (initial position, snapshot push) doesn't get
// dropped while we're still awaiting handshake replies. This was the
// recurring Windows symptom: the egg stayed at the off-screen sentinel
// position because the very first onPetPos broadcasts fired before the
// renderer registered its handler.
function registerListeners(): void {
  api.onSnapshot((s) => {
    refreshSprite(s.state.digimonId, s.state.seedEggVariant)
    document.body.classList.toggle('is-focus', s.phase.kind === 'focus')
    document.body.classList.toggle('is-rip', Boolean(s.state.rip))
  })

  api.onPetFacing((dir) => setFacing(dir))

  api.onPetPos((p) => {
    petX = p.x
    petY = p.y
    petScale = p.scale
    firstPositionReceived = true
    applyPosition()
  })

  api.onForkComplete(({ slot }) => {
    showBubble(t('bubbleForkAdded', lang, { slot: t('slot_' + slot, lang) }))
  })

  api.onEvolve(({ from, to }) => showBubble(`${from} → ${to}`, 3500))
  api.onBreakEnd(() => showBubble(t('bubbleBreakOver', lang), 2500))
  api.onRip(() => showBubble(t('bubbleRip', lang), 4000))
  api.onLang((l) => {
    lang = l
  })
}

async function boot(): Promise<void> {
  registerListeners()

  spriteBase = await api.getSpriteBase()
  const snap = await api.getSnapshot()
  refreshSprite(snap.state.digimonId, snap.state.seedEggVariant)
  if (snap.phase.kind === 'focus') document.body.classList.add('is-focus')
  if (snap.state.rip) document.body.classList.add('is-rip')

  // Force apply now — the JS defaults are already visible coordinates; this
  // makes sure the sprite is positioned and sized before any potential paint
  // suppression by the Windows compositor.
  applyPosition()

  // If the main process never broadcasts a position (very unlikely but the
  // Windows transparent-window stack has been known to lose early IPC),
  // schedule a one-off forced re-application after the first paint. Without
  // this, the sprite would silently sit at its JS default and the user would
  // see nothing if the load event also failed.
  requestAnimationFrame(() => {
    if (!firstPositionReceived) {
      applyPosition()
    }
  })

  // Sync language: load from config once and follow further changes.
  try {
    const cfg = (await api.getConfig()) as { ui?: { language?: Lang } }
    if (cfg?.ui?.language) lang = cfg.ui.language
  } catch {
    // ignore — fallback to default 'ko'
  }
}

void boot()
