import { convertFileSrc } from '@tauri-apps/api/core'

type Vec = { x: number; y: number }

export type PetCanvasOptions = {
  spriteEl: HTMLImageElement
  stageEl: HTMLElement
  spriteBase: string
  defaultFacing: (digimonId: string) => 'left' | 'right'
}

const TICK_MS = 60

export class PetCanvas {
  private spriteEl: HTMLImageElement
  private stageEl: HTMLElement
  private spriteBase: string
  private defaultFacing: (id: string) => 'left' | 'right'

  private digimonId = ''
  private eggVariant: number | undefined

  private timer: ReturnType<typeof setInterval> | undefined
  private tickCount = 0
  private pos: Vec = { x: 0, y: 0 }
  private dir: 1 | -1 = 1
  private movement: 'idle' | 'walk' = 'idle'
  private stateTicksLeft = 30
  private jumpTicksLeft = 0
  private readonly JUMP_DURATION = 14
  private readonly JUMP_HEIGHT = 14
  private readonly WALK_SPEED = 0.8
  private facing: 'left' | 'right' = 'right'

  constructor(opts: PetCanvasOptions) {
    this.spriteEl = opts.spriteEl
    this.stageEl = opts.stageEl
    this.spriteBase = opts.spriteBase
    this.defaultFacing = opts.defaultFacing
  }

  setDigimon(digimonId: string, eggVariant: number | undefined): void {
    if (digimonId === this.digimonId && eggVariant === this.eggVariant) return
    this.digimonId = digimonId
    this.eggVariant = eggVariant
    this.spriteEl.src = this.spriteUrl()
    this.pos = { x: 0, y: 0 }
    this.dir = 1
    this.movement = 'idle'
    this.jumpTicksLeft = 0
    this.applyFacing()
    this.render()
  }

  private isEgg(): boolean {
    return this.digimonId === 'egg'
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }

  private tick(): void {
    this.tickCount++
    if (this.isEgg()) {
      this.movement = 'idle'
      this.pos = { x: 0, y: 0 }
      this.jumpTicksLeft = 0
      this.spriteEl.style.transform = 'translate(0px, 0px) scaleX(var(--facing, 1))'
      return
    }
    if (this.stateTicksLeft-- <= 0) this.pickState()
    if (this.movement === 'walk') this.advanceWalk()
    if (this.jumpTicksLeft > 0) this.jumpTicksLeft--
    else if (Math.random() < 0.012) this.jumpTicksLeft = this.JUMP_DURATION
    this.render()
  }

  private pickState(): void {
    const r = Math.random()
    if (r < 0.45) {
      this.movement = 'walk'
      this.dir = Math.random() < 0.5 ? -1 : 1
      this.stateTicksLeft = 20 + Math.floor(Math.random() * 40)
      this.applyFacing()
    } else {
      this.movement = 'idle'
      this.stateTicksLeft = 25 + Math.floor(Math.random() * 50)
    }
  }

  private advanceWalk(): void {
    this.pos.x += this.dir * this.WALK_SPEED
    const half = (this.stageEl.clientWidth - this.spriteEl.clientWidth) / 2
    if (this.pos.x > half) {
      this.pos.x = half
      this.dir = -1
      this.applyFacing()
    } else if (this.pos.x < -half) {
      this.pos.x = -half
      this.dir = 1
      this.applyFacing()
    }
  }

  private applyFacing(): void {
    const def = this.digimonId ? this.defaultFacing(this.digimonId) : 'right'
    const walkDir: 'left' | 'right' = this.dir === 1 ? 'right' : 'left'
    this.facing = walkDir
    const flip = walkDir === def ? 1 : -1
    this.spriteEl.style.setProperty('--facing', String(flip))
  }

  private render(): void {
    const bob = this.movement === 'idle' && this.tickCount % 8 < 4 ? -1 : 0
    let y = bob
    if (this.jumpTicksLeft > 0) {
      const t = 1 - this.jumpTicksLeft / this.JUMP_DURATION
      y -= Math.sin(t * Math.PI) * this.JUMP_HEIGHT
    }
    this.pos.y = y
    this.spriteEl.style.transform =
      `translate(${this.pos.x.toFixed(1)}px, ${y.toFixed(1)}px) scaleX(var(--facing, 1))`
  }

  private spriteUrl(): string {
    let path: string
    if (this.digimonId === 'egg') {
      const v = this.eggVariant ?? 1
      path = this.spriteBase + 'egg/v' + String(v).padStart(2, '0') + '.png'
    } else {
      path = this.spriteBase + this.digimonId + '/idle.gif'
    }
    return convertFileSrc(path)
  }
}
