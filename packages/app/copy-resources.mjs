import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../data')
const target = resolve(__dirname, 'src-tauri/resources')

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })

for (const file of ['evolution.json', 'roster.json', 'egg-lineage.json']) {
  cpSync(resolve(dataDir, file), resolve(target, file))
}

cpSync(resolve(dataDir, 'sprites'), resolve(target, 'sprites'), {
  recursive: true,
  filter: (src) => !src.includes('_raw'),
})
