import { app } from 'electron'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import * as path from 'node:path'

// User data lives under the home directory in a hidden folder. Same shape as
// DigiCoda's ~/.digicoda — easy to inspect, easy to wipe.
export const USER_DIR = path.join(homedir(), '.digimodoro')

export const PATHS = {
  userDir: USER_DIR,
  state: path.join(USER_DIR, 'state.json'),
  config: path.join(USER_DIR, 'config.json'),
  sessions: path.join(USER_DIR, 'sessions.jsonl'),
  graveyard: path.join(USER_DIR, 'graveyard.jsonl'),
}

// Where evolution.json / roster.json / sprites live at runtime.
//   dev:  workspace-relative ../data
//   prod: app.asar.unpacked / resourcesPath / data + sprites (extraResources)
export function dataRoot(): { dataDir: string; spritesDir: string } {
  // app.isPackaged is false during `electron .`
  const packaged = app.isPackaged
  if (packaged) {
    const res = process.resourcesPath
    return {
      dataDir: path.join(res, 'data'),
      spritesDir: path.join(res, 'sprites'),
    }
  }
  // Dev: walk up from packages/app/dist/main/ → ../../../data
  const devData = path.resolve(__dirname, '../../..', 'data')
  return {
    dataDir: devData,
    spritesDir: path.join(devData, 'sprites'),
  }
}

export function assertDataPresent(): void {
  const { dataDir, spritesDir } = dataRoot()
  if (!existsSync(path.join(dataDir, 'evolution.json'))) {
    console.warn(`[paths] missing evolution.json at ${dataDir}`)
  }
  if (!existsSync(spritesDir)) {
    console.warn(`[paths] missing sprites dir at ${spritesDir}`)
  }
}
