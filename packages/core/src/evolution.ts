import { seededRandom } from './rng.js'
import {
  STAGES,
  TIME_SLOTS,
  type EvolutionBranch,
  type EvolutionRule,
  type Personality,
  type SlotForks,
  type Stage,
  type TimeSlot,
  type Tunables,
} from './types.js'

// Slot multipliers per personality. Anything not listed is 1.0 (neutral).
// Keep the spread modest — the user's actual focus pattern should dominate;
// personality just nudges ties and close calls.
const PERSONALITY_BIAS: Record<Personality, Partial<Record<TimeSlot, number>>> = {
  calm: {},
  gentle: { morning: 1.15, forenoon: 1.1 },
  holy: { morning: 1.2, forenoon: 1.2 },
  mischief: { midday: 1.15, evening: 1.15 },
  savage: { evening: 1.1, night: 1.25 },
}

export function applyPersonalityWeights(
  slotForks: SlotForks,
  personality: Personality | undefined,
): Record<TimeSlot, number> {
  const bias = personality ? (PERSONALITY_BIAS[personality] ?? {}) : {}
  const result = {} as Record<TimeSlot, number>
  for (const slot of TIME_SLOTS) {
    const w = bias[slot] ?? 1.0
    result[slot] = slotForks[slot] * w
  }
  return result
}

export function isReadyToEvolve(rule: EvolutionRule, inStageForks: number): boolean {
  return inStageForks >= rule.forksRequired
}

// Choose the dominant slot from weighted fork counts. Ties are broken by
// seededRandom so the result is stable for a given pet+evolution index.
export function dominantSlot(
  slotForks: SlotForks,
  personality: Personality | undefined,
  tieSeed: string,
): TimeSlot {
  const weighted = applyPersonalityWeights(slotForks, personality)

  let max = -Infinity
  let candidates: TimeSlot[] = []
  for (const slot of TIME_SLOTS) {
    const v = weighted[slot]
    if (v > max) {
      max = v
      candidates = [slot]
    } else if (v === max) {
      candidates.push(slot)
    }
  }

  if (candidates.length === 1) return candidates[0]!
  const idx = Math.floor(seededRandom(tieSeed) * candidates.length)
  return candidates[idx] ?? candidates[0]!
}

export type BranchPick = {
  branch: EvolutionBranch
  dominantSlot: TimeSlot
  luckySwerved: boolean
}

export function pickBranch(
  rule: EvolutionRule,
  slotForks: SlotForks,
  personality: Personality | undefined,
  petId: string,
  evoIndex: number,
  tunables: Tunables,
): BranchPick {
  const dominant = dominantSlot(slotForks, personality, `${petId}:tie:${evoIndex}`)

  // A parent may have multiple canonical children sharing the same slot. Filter
  // to that slot's pool first; if the dominant slot has no branches, fall back
  // to the full set (degenerate but keeps the pet moving forward).
  const slotPool = rule.branches.filter((b) => b.slot === dominant)
  const pool = slotPool.length > 0 ? slotPool : rule.branches
  const pickIdx = Math.floor(seededRandom(`${petId}:branch:${evoIndex}`) * pool.length)
  let branch = pool[pickIdx] ?? pool[0] ?? {
    slot: dominant,
    to: rule.from, // degenerate fallback — caller should ensure branches exist
  }

  // Lucky roll: 12% chance to swerve to a different `to`. Skip when every
  // branch shares the same `to` (no real alternative to pick).
  const alternatives = rule.branches.filter((b) => b.to !== branch.to)
  let luckySwerved = false
  if (alternatives.length > 0) {
    const roll = seededRandom(`${petId}:luck:${evoIndex}`)
    if (roll < tunables.LUCKY_ROLL_CHANCE) {
      const altIdx = Math.floor(
        seededRandom(`${petId}:luck-alt:${evoIndex}`) * alternatives.length,
      )
      branch = alternatives[altIdx] ?? branch
      luckySwerved = true
    }
  }

  return { branch, dominantSlot: dominant, luckySwerved }
}

export function nextStage(stage: Stage): Stage {
  const i = STAGES.indexOf(stage)
  if (i < 0 || i >= STAGES.length - 1) return stage
  return STAGES[i + 1]!
}

// Egg variant (1..11) → which Fresh-stage digimon hatches. The canonical
// table is kept in packages/data/egg-lineage.json (built by scripts/build-tree.py)
// and the app's main process passes it in via setEggLineage() at startup so we
// can change the fresh roster without recompiling core.
let EGG_LINEAGE: Record<string, string> = {
  // Sensible defaults that work with the current 6-fresh roster.
  '1': 'bommon',
  '2': 'botamon',
  '3': 'chicomon',
  '4': 'kuramon',
  '5': 'poyomon',
  '6': 'puttimon',
  '7': 'bommon',
  '8': 'botamon',
  '9': 'chicomon',
  '10': 'kuramon',
  '11': 'poyomon',
}

export function setEggLineage(lineage: Record<string, string>): void {
  EGG_LINEAGE = { ...lineage }
}

export function freshForEggVariant(variant: number | undefined): string | undefined {
  if (variant == null) return undefined
  return EGG_LINEAGE[String(variant)]
}
