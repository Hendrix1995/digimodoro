#!/usr/bin/env python3
"""Build evolution.json + roster.json from digi-api data.
Guarantee: every one of our 413 digimon is reachable from the egg.
Algorithm per stage:
  1. Start with real nextEvolutions in our set (the canonical lineage).
  2. Then round-robin-assign every child of the target stage to some parent
     so that no child is left unreachable.
  3. Pad each parent's 5 slots with random target-stage choices.
"""
import json, random, hashlib
random.seed(42)

with open('scripts/digimon-meta.json') as f: meta = json.load(f)
with open('scripts/matched.json') as f: matched = json.load(f)
apiid_to_ours = {str(m['api_id']): m['id'] for m in matched}

STAGES = ['fresh', 'baby', 'child', 'adult', 'perfect', 'mega']
NEXT_OF = {STAGES[i]: STAGES[i+1] if i+1 < len(STAGES) else None for i in range(len(STAGES))}
SLOTS = ['morning', 'forenoon', 'midday', 'evening', 'night']
FORKS_REQUIRED = {'egg': 1, 'fresh': 2, 'baby': 4, 'child': 8, 'adult': 16, 'perfect': 32}

by_stage = {s: [] for s in STAGES}
for id_, d in meta.items():
    if d.get('stage'): by_stage[d['stage']].append(id_)
for s in STAGES: by_stage[s].sort()

def real_children(d, target_stage):
    out, seen = [], set()
    for n in d.get('next', []):
        oid = apiid_to_ours.get(n)
        if oid and oid in meta and meta[oid]['stage'] == target_stage and oid not in seen:
            seen.add(oid); out.append(oid)
    return out

# Build branches stage-by-stage, ensuring every target-stage member is adopted.
parent_branches = {}  # id -> [child_id × 5]
for parent_stage in STAGES[:-1]:
    target_stage = NEXT_OF[parent_stage]
    parents = list(by_stage[parent_stage])
    targets = list(by_stage[target_stage])
    if not parents or not targets: continue
    pb = {p: [] for p in parents}
    # Phase 1 (priority): round-robin every target into some parent slot so
    # no child is left without an adopter. Each target gets at least one slot.
    targets_pool = list(targets)
    random.shuffle(targets_pool)
    pi = 0
    for t in targets_pool:
        attempts = 0
        while attempts < len(parents):
            p = parents[pi % len(parents)]; pi += 1; attempts += 1
            if len(pb[p]) < 5 and t not in pb[p]:
                pb[p].append(t); break
    # Phase 2: enrich with canonical real children where parent still has room
    for p in parents:
        for c in real_children(meta[p], target_stage):
            if len(pb[p]) < 5 and c not in pb[p]:
                pb[p].append(c)
    # Phase 3: pad to 5 slots with random target picks
    for p in parents:
        rng = random.Random(int(hashlib.md5(p.encode()).hexdigest()[:8], 16))
        candidates = [t for t in targets if t not in pb[p]]
        rng.shuffle(candidates)
        while len(pb[p]) < 5 and candidates:
            pb[p].append(candidates.pop())
        while len(pb[p]) < 5 and pb[p]:
            pb[p].append(pb[p][-1])
    parent_branches.update(pb)

# Egg → fresh: 5 slots filled across the fresh pool
fresh_pool = by_stage['fresh']
egg_branches = []
for i, slot in enumerate(SLOTS):
    egg_branches.append({'slot': slot, 'to': fresh_pool[i % len(fresh_pool)] if fresh_pool else 'botamon'})

rules = [{'from': 'egg', 'forksRequired': FORKS_REQUIRED['egg'], 'branches': egg_branches}]
for id_, d in meta.items():
    if not d.get('stage') or d['stage'] == 'mega': continue
    kids = parent_branches.get(id_, [])
    if not kids: continue
    branches = [{'slot': s, 'to': c} for s, c in zip(SLOTS, kids)]
    rules.append({
        'from': id_,
        'forksRequired': FORKS_REQUIRED.get(d['stage'], 8),
        'branches': branches,
    })

# Egg lineage: 11 egg variants → fresh pool (round-robin)
egg_lineage = {str(i): fresh_pool[(i - 1) % len(fresh_pool)] for i in range(1, 12)}

with open('packages/data/evolution.json', 'w') as f:
    json.dump(rules, f, indent=2, ensure_ascii=False)
print(f'evolution.json: {len(rules)} rules')

roster = [{'id': 'egg', 'name': 'Digi Egg', 'stage': 'egg', 'sprite': {'idle': 'egg/idle.png'}}]
for id_, d in meta.items():
    if not d.get('stage'): continue
    roster.append({'id': id_, 'name': d['name'], 'stage': d['stage'], 'sprite': {'idle': f'{id_}/idle.gif'}})
with open('packages/data/roster.json', 'w') as f:
    json.dump(roster, f, indent=2, ensure_ascii=False)
print(f'roster.json: {len(roster)} entries')

with open('packages/data/egg-lineage.json', 'w') as f:
    json.dump(egg_lineage, f, indent=2, ensure_ascii=False)
print(f'egg-lineage.json: 11 variants')

# Reachability
reachable = set(); stack = ['egg']
rule_by = {r['from']: r for r in rules}
while stack:
    cur = stack.pop()
    if cur in reachable: continue
    reachable.add(cur)
    r = rule_by.get(cur)
    if r:
        for b in r['branches']:
            stack.append(b['to'])
all_ids = set(meta.keys())
print(f'\nReachable from egg: {len(reachable & all_ids)}/{len(all_ids)}')
unreach = all_ids - reachable
if unreach: print(f'Unreachable: {len(unreach)} — examples: {sorted(unreach)[:5]}')
