// Most raw sprites face LEFT by default. The ones listed below face right.
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

export function spriteUrl(spriteBase: string, digimonId: string, variant: number | undefined): string {
  if (digimonId === 'egg') {
    const v = variant ?? 1
    const key = 'v' + String(v).padStart(2, '0')
    return `${spriteBase}egg/${key}.png`
  }
  return `${spriteBase}${digimonId}/idle.gif`
}
