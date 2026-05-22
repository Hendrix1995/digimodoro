import { invoke } from '@tauri-apps/api/core'

type State = 'idle' | 'walk' | 'jump' | 'land'

export type JumpEvent = {
  durationMs: number
}

export type PetPosition = {
  x: number // pet center x (screen coordinates)
  y: number // pet feet y (screen coordinates)
}

// In Tauri, the pet window IS the sprite. The mover moves the window itself
// across the screen instead of positioning a sprite inside a fullscreen
// transparent window. The physics logic is identical to the Electron version.
export class PetMover {
  private x: number
  private y: number
  private vx = 0
  private vy = 0
  private state: State = 'idle'
  private stateTicksLeft = 30
  private timer: ReturnType<typeof setInterval> | undefined
  private workW: number
  private workH: number
  private petW: number
  private petH: number
  private onFacingChange: ((dir: 'left' | 'right') => void) | undefined
  private onJump: ((e: JumpEvent) => void) | undefined
  private onPosition: ((p: PetPosition) => void) | undefined
  private facing: 'left' | 'right' = 'right'
  private paused = false
  private dragging = false
  private lastUserDragAt = 0
  private targetVx = 0
  private readonly ACCEL = 0.18
  private active = true
  private lookbackTicksLeft = 0

  constructor(
    work: { width: number; height: number },
    petDims: { width: number; height: number },
  ) {
    this.workW = work.width
    this.workH = work.height
    this.petW = petDims.width
    this.petH = petDims.height
    this.x = Math.floor(this.workW / 2)
    this.y = Math.floor(this.workH - 24)
  }

  updateWorkArea(work: { width: number; height: number }): void {
    this.workW = work.width
    this.workH = work.height
  }

  updateDims(dims: { width: number; height: number }): void {
    this.petW = dims.width
    this.petH = dims.height
  }

  setOnFacingChange(cb: (dir: 'left' | 'right') => void): void {
    this.onFacingChange = cb
  }
  setOnJump(cb: (e: JumpEvent) => void): void {
    this.onJump = cb
  }
  setOnPosition(cb: (p: PetPosition) => void): void {
    this.onPosition = cb
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), 16)
    this.emitPosition()
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }

  pause(p: boolean): void {
    this.paused = p
    if (p) this.emitPosition()
  }

  setDragging(d: boolean): void {
    this.dragging = d
    if (!d) this.lastUserDragAt = Date.now()
  }

  setPosition(x: number, y: number): void {
    this.x = x
    this.y = y
    this.emitPosition()
  }

  setActive(active: boolean): void {
    if (this.active === active) return
    this.active = active
    this.state = 'idle'
    this.targetVx = 0
    this.stateTicksLeft = active ? 10 : 30 + Math.floor(Math.random() * 60)
  }

  currentFacing(): 'left' | 'right' {
    return this.facing
  }

  position(): PetPosition {
    return { x: this.x, y: this.y }
  }

  private tick(): void {
    if (this.paused || this.dragging) {
      this.emitPosition()
      return
    }
    if (Date.now() - this.lastUserDragAt < 600) {
      this.emitPosition()
      return
    }

    if (this.stateTicksLeft-- <= 0) this.pickState()

    if (this.state !== 'jump') {
      this.vx = this.targetVx
    }

    if (this.state === 'jump') {
      this.vy += this.vy < 0 ? 0.55 : 1.45
    }

    if (this.lookbackTicksLeft > 0) {
      this.lookbackTicksLeft--
    } else if (
      this.active &&
      this.state === 'walk' &&
      Math.abs(this.vx) > 0.15 &&
      Math.random() < 0.0005
    ) {
      this.lookbackTicksLeft = 20 + Math.floor(Math.random() * 30)
    }

    if (Math.abs(this.vx) > 0.15) {
      const moveDir: 'left' | 'right' = this.vx < 0 ? 'left' : 'right'
      const facing: 'left' | 'right' =
        this.lookbackTicksLeft > 0
          ? moveDir === 'left'
            ? 'right'
            : 'left'
          : moveDir
      this.setFacing(facing)
    }

    this.x += this.vx
    this.y += this.vy

    // Bounds — keep pet inside the work area
    const left = this.petW / 2
    const right = this.workW - this.petW / 2
    if (this.x < left) {
      this.x = left
      this.vx = Math.abs(this.vx)
      this.setFacing('right')
    } else if (this.x > right) {
      this.x = right
      this.vx = -Math.abs(this.vx)
      this.setFacing('left')
    }

    const groundY = this.workH - 24
    if (this.y >= groundY) {
      this.y = groundY
      this.vy = 0
      if (this.state === 'jump') {
        this.state = 'land'
        this.targetVx = 0
        this.stateTicksLeft = 8 + Math.floor(Math.random() * 12)
      }
    }
    if (this.y < this.petH) this.y = this.petH

    this.emitPosition()
  }

  private pickState(): void {
    if (!this.active) {
      const r = Math.random()
      if (r < 0.22) {
        this.state = 'jump'
        const big = Math.random() < 0.3
        const absVy = big ? 6.5 + Math.random() * 1.5 : 4 + Math.random() * 2
        this.vy = -absVy
        this.vx = 0
        this.targetVx = 0
        this.stateTicksLeft = 240
        this.onJump?.({ durationMs: big ? 360 : 220 })
      } else {
        this.state = 'idle'
        this.targetVx = 0
        this.vy = 0
        this.stateTicksLeft = 90 + Math.floor(Math.random() * 240)
      }
      return
    }

    const r = Math.random()
    if (r < 0.6) {
      this.state = 'walk'
      const dir = Math.random() < 0.5 ? -1 : 1
      this.targetVx = dir * (0.3 + Math.random() * 0.3)
      this.vy = 0
      this.stateTicksLeft = 150 + Math.floor(Math.random() * 180)
    } else if (r < 0.85) {
      this.state = 'jump'
      const jr = Math.random()
      let absVy: number
      let absVx: number
      if (jr < 0.5) {
        absVy = 5 + Math.random() * 2.5
        absVx = 0.4 + Math.random() * 0.7
      } else if (jr < 0.8) {
        absVy = 7.5 + Math.random() * 2.5
        absVx = 0.8 + Math.random() * 0.8
      } else {
        absVy = 10 + Math.random() * 3
        absVx = 1.2 + Math.random() * 0.9
      }
      this.vy = -absVy
      const dir = Math.random() < 0.5 ? -1 : 1
      const jvx = dir * absVx
      this.vx = jvx
      this.targetVx = jvx
      this.stateTicksLeft = 240
      this.onJump?.({ durationMs: Math.round(200 + absVy * 28) })
    } else {
      this.state = 'idle'
      this.targetVx = 0
      this.vy = 0
      this.stateTicksLeft = 40 + Math.floor(Math.random() * 120)
    }
  }

  private setFacing(dir: 'left' | 'right'): void {
    if (this.facing === dir) return
    this.facing = dir
    this.onFacingChange?.(dir)
  }

  // Move the Tauri window to position the pet on screen.
  // The window's top-left is calculated from the pet's center-bottom position.
  private emitPosition(): void {
    const winX = Math.round(this.x - this.petW / 2)
    const winY = Math.round(this.y - this.petH)
    void invoke('move_pet_window', { x: winX, y: winY })
    this.onPosition?.({ x: this.x, y: this.y })
  }
}
