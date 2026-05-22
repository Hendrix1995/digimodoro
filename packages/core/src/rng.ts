// FNV-1a-based seeded RNG. Same seed string → same [0, 1) value, so any
// decision keyed off `${petId}:something:${index}` is deterministic for the
// life of a single pet. Lets the reducer stay pure and removes any "test
// tunable" escape hatch — each pet's luck is its own fixed fate.
export function seededRandom(seed: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h / 0x100000000
}
