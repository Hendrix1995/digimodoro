import { invoke } from '@tauri-apps/api/core'

export const SPRITE_DEFAULT_FACING: Record<string, 'left' | 'right'> = {
  hanumon: 'right',
  chocomon: 'right',
  damemon: 'right',
  darkdramon: 'right',
  darktyranomon: 'right',
  dondokomon: 'right',
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
  puttimon: 'right',
}

// Loads a sprite via Rust (reads file → returns data:image/...;base64,... URL)
// No asset protocol, no path encoding issues.
export async function loadSprite(digimonId: string, variant?: number): Promise<string> {
  let relativePath: string
  if (digimonId === 'egg') {
    const v = variant ?? 1
    const key = 'v' + String(v).padStart(2, '0')
    relativePath = `egg/${key}.png`
  } else {
    relativePath = `${digimonId}/idle.gif`
  }
  return invoke<string>('load_sprite', { relativePath })
}
