import { convertFileSrc } from '@tauri-apps/api/core'

export const SPRITE_DEFAULT_FACING: Record<string, 'left' | 'right'> = {
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

// spriteBasePath is a native filesystem path (e.g. C:\Users\...\sprites on Windows)
// We detect the OS path separator from the base path and use it consistently
export function spriteUrl(spriteBasePath: string, digimonId: string, variant: number | undefined): string {
  const sep = spriteBasePath.includes('\\') ? '\\' : '/'
  const base = spriteBasePath.endsWith(sep) ? spriteBasePath : spriteBasePath + sep

  let relPath: string
  if (digimonId === 'egg') {
    const v = variant ?? 1
    const key = 'v' + String(v).padStart(2, '0')
    relPath = `egg${sep}${key}.png`
  } else {
    relPath = `${digimonId}${sep}idle.gif`
  }

  return convertFileSrc(base + relPath)
}
