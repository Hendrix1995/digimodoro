import { screen, type BrowserWindow } from 'electron'
import type { PetMover } from './mover.js'

// Drag updates the mover's logical (x, y). The pet window covers ONE display
// at a time — when the cursor crosses onto another display we move (re-bound)
// the window so the pet can hop monitors.
let dragTimer: ReturnType<typeof setInterval> | undefined
let dragOffset: { x: number; y: number } | undefined
let dragMover: PetMover | undefined
let dragWin: BrowserWindow | undefined

export type DragLifecycle = {
  onStart?: () => void
  onEnd?: () => void
}

export function startPetDrag(
  mover: PetMover,
  win: BrowserWindow,
  lifecycle?: DragLifecycle,
): void {
  if (dragTimer) return
  const cursor = screen.getCursorScreenPoint()
  const bounds = win.getBounds()
  const pos = mover.position()
  // Cursor → window-local coords (window's top-left is bounds.x, bounds.y).
  const cursorRel = { x: cursor.x - bounds.x, y: cursor.y - bounds.y }
  dragOffset = { x: cursorRel.x - pos.x, y: cursorRel.y - pos.y }
  dragMover = mover
  dragWin = win
  lifecycle?.onStart?.()

  dragTimer = setInterval(() => {
    if (!dragMover || !dragWin || dragWin.isDestroyed()) {
      stopPetDrag(lifecycle)
      return
    }
    const c = screen.getCursorScreenPoint()
    const targetDisplay = screen.getDisplayNearestPoint(c)
    const b = dragWin.getBounds()
    // If the cursor wandered onto a different display, hop the window over.
    if (
      b.x !== targetDisplay.workArea.x ||
      b.y !== targetDisplay.workArea.y ||
      b.width !== targetDisplay.workArea.width ||
      b.height !== targetDisplay.workArea.height
    ) {
      dragWin.setBounds(targetDisplay.workArea)
      dragMover.updateWorkArea({
        width: targetDisplay.workArea.width,
        height: targetDisplay.workArea.height,
      })
    }
    const rel = { x: c.x - targetDisplay.workArea.x, y: c.y - targetDisplay.workArea.y }
    dragMover.setPosition(rel.x - dragOffset!.x, rel.y - dragOffset!.y)
  }, 16)
}

export function stopPetDrag(lifecycle?: DragLifecycle): void {
  if (dragTimer) clearInterval(dragTimer)
  dragTimer = undefined
  dragOffset = undefined
  dragMover = undefined
  dragWin = undefined
  lifecycle?.onEnd?.()
}
