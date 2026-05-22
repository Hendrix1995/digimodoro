// Build sprites/{id}/idle.gif from each gif in _raw/.
// No explicit map any more — file name *is* the canonical identifier.
//   023_Agumon.gif → sprites/agumon/idle.gif
// Frames are coalesced + alpha-set so the gif animates without the white
// flash that disposal=Background produces.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const rawDir = path.join(root, 'sprites', '_raw')
const outRoot = path.join(root, 'sprites')

// Wipe any stale digimon folder (anything but _raw and egg) so we don't carry
// over old map-based sprites that no longer correspond to a raw file.
for (const entry of readdirSync(outRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  if (entry.name === '_raw' || entry.name === 'egg') continue
  rmSync(path.join(outRoot, entry.name), { recursive: true, force: true })
}

let done = 0
for (const f of readdirSync(rawDir)) {
  if (!f.endsWith('.gif')) continue
  const m = /^(\d+)_(.+)\.gif$/.exec(f)
  if (!m) continue
  const [, , canonical] = m
  // Strip "_<digits>" variant suffix so e.g. "Dinobeemon_2" → "dinobeemon".
  // Source dumps keep numeric variant suffixes for duplicates, but the
  // canonical id (used in evolution.json) is the unsuffixed name.
  const id = canonical.toLowerCase().replace(/_\d+$/, '')
  const outDir = path.join(outRoot, id)
  mkdirSync(outDir, { recursive: true })
  const dst = path.join(outDir, 'idle.gif')
  execFileSync('magick', [
    path.join(rawDir, f),
    '-coalesce',
    '-background', 'none',
    '-dispose', 'Previous',
    '-layers', 'Optimize',
    dst,
  ])
  done++
}
console.log(`Built ${done} animated sprites in sprites/.`)
