#!/usr/bin/env python3
"""Build evolution.json + roster.json from digi-api data.

Two-pass branch construction:
  1. Canonical pass — every branch from the digimon's real nextEvolutions.
  2. Orphan-adoption pass — any next-stage digimon that no parent points to
     in the canonical pass gets attached to ALL same-stage parents. This is
     the design choice the user picked over strict canon: "최대한 다양하게."
     Result: every digimon in the roster becomes reachable from the egg.

- Number of branches per parent is uncapped (5-slot limit removed).
- Slots are assigned deterministically by hashing (parent_id, child_id), so
  the same child can land in different slots depending on which parent it
  comes from. This avoids the bias where an orphan adopted by every same-
  stage parent ends up dominating one slot across the entire stage.
"""
import json, hashlib

with open('scripts/digimon-meta.json') as f: meta = json.load(f)
with open('scripts/matched.json') as f: matched = json.load(f)
apiid_to_ours = {str(m['api_id']): m['id'] for m in matched}
try:
    with open('scripts/manual-evolutions.json') as f: manual = json.load(f)
except FileNotFoundError:
    manual = {'addChildren': {}, 'addParents': {}}

STAGES = ['fresh', 'baby', 'child', 'adult', 'perfect', 'mega', 'ultra']
NEXT_OF = {STAGES[i]: STAGES[i+1] if i+1 < len(STAGES) else None for i in range(len(STAGES))}
SLOTS = ['morning', 'forenoon', 'midday', 'evening', 'night']
FORKS_REQUIRED = {'egg': 1, 'fresh': 2, 'baby': 4, 'child': 8, 'adult': 16, 'perfect': 32, 'mega': 64}

# Apply stage overrides from manual-evolutions.json before any canonical
# processing. This is how we mark canon-verified Super Ultimate digimon as
# 'ultra' instead of 'mega'.
for did, new_stage in (manual.get('stageOverrides') or {}).items():
    if did in meta:
        meta[did]['stage'] = new_stage


def slot_for(parent_id: str, child_id: str) -> str:
    h = int(hashlib.md5(f'{parent_id}:{child_id}'.encode()).hexdigest()[:8], 16)
    return SLOTS[h % len(SLOTS)]


def real_children(d, target_stage):
    out, seen = [], set()
    for n in d.get('next', []):
        oid = apiid_to_ours.get(n)
        if oid and oid in meta and meta[oid]['stage'] == target_stage and oid not in seen:
            seen.add(oid); out.append(oid)
    return out


by_stage = {s: [] for s in STAGES}
for id_, d in meta.items():
    if d.get('stage'): by_stage[d['stage']].append(id_)
for s in STAGES: by_stage[s].sort()

# Pass 1: canonical branches per parent.
parent_branches = {}
no_canonical = {s: [] for s in STAGES[:-1]}
slot_dist_warnings = []  # parents whose canonical children all collide on <5 slots
for parent_stage in STAGES[:-1]:
    target_stage = NEXT_OF[parent_stage]
    for p in by_stage[parent_stage]:
        kids = real_children(meta[p], target_stage)
        if not kids:
            no_canonical[parent_stage].append(p)
            continue
        parent_branches[p] = kids
        # Diagnostic: how many distinct slots do these kids land in?
        slot_set = {slot_for(p, c) for c in kids}
        if len(kids) >= 5 and len(slot_set) < 5:
            slot_dist_warnings.append((p, len(kids), len(slot_set)))

# Pass 1.5: manual override — curated canon mappings from wikimon for cases
# where digi-api has empty evolution data. Three forms:
#   addChildren[parent_id] = [child_ids]  — append children to a parent.
#   addParents[orphan_id]  = [parent_ids] — register specific parents for a
#     digimon. When this is set, the digimon is RESTRICTED to these parents
#     only: it is removed from all other parents' branch lists (including
#     canonical/orphan-adoption) and added only to the listed ones.
#   stageOverrides[id]     = stage       — applied at load time above.
manual_applied = {'children': 0, 'parents': 0}
for parent_id, kids in (manual.get('addChildren') or {}).items():
    if parent_id not in meta: continue
    parent_stage_check = meta[parent_id].get('stage')
    target_stage = NEXT_OF.get(parent_stage_check)
    existing = parent_branches.get(parent_id, [])
    for c in kids:
        if c not in meta or meta[c].get('stage') != target_stage: continue
        if c not in existing:
            existing.append(c)
            manual_applied['children'] += 1
    if existing:
        parent_branches[parent_id] = existing
for orphan_id, parent_ids in (manual.get('addParents') or {}).items():
    if orphan_id not in meta: continue
    orphan_stage = meta[orphan_id].get('stage')
    # Restrictive mode: remove orphan_id from ALL other parents first.
    for p, kids in list(parent_branches.items()):
        if orphan_id in kids:
            kids.remove(orphan_id)
            if not kids:
                del parent_branches[p]
    # Then register only the specified parents.
    for p in parent_ids:
        if p not in meta: continue
        if meta[p].get('stage') is None: continue
        if NEXT_OF.get(meta[p]['stage']) != orphan_stage: continue
        existing = parent_branches.get(p, [])
        if orphan_id not in existing:
            existing.append(orphan_id)
            manual_applied['parents'] += 1
        if existing:
            parent_branches[p] = existing

# Pass 2: orphan adoption — any next-stage digimon not pointed to by any
# canonical parent gets adopted ONLY by dead-end parents (canonical children 0).
# This preserves canon: a parent with real canonical children does not get
# polluted with unrelated orphans. Reachability is maintained via dead-end
# parents acting as fallback routes.
orphans_by_stage = {}
for parent_stage in STAGES[:-1]:
    target_stage = NEXT_OF[parent_stage]
    parents = by_stage[parent_stage]
    targets = by_stage[target_stage]
    if not parents or not targets: continue
    pointed_to = set()
    for p in parents:
        for c in parent_branches.get(p, []):
            pointed_to.add(c)
    orphans = [t for t in targets if t not in pointed_to]
    orphans_by_stage[parent_stage] = orphans
    if not orphans: continue
    for p in parents:
        if parent_branches.get(p, []): continue  # has canonical children → skip
        parent_branches[p] = list(orphans)

# Pass 3: excludeParents — remove a digimon from specific parents' branch
# lists (child-centric: "this digimon cannot evolve from these parents").
for child_id, exclude_parents in (manual.get('excludeParents') or {}).items():
    for p in exclude_parents:
        if p in parent_branches and child_id in parent_branches[p]:
            parent_branches[p].remove(child_id)
            if not parent_branches[p]:
                del parent_branches[p]

# Pass 3.5: unreachable — remove a digimon from ALL parents' branch lists.
# Used to "cut the road" to undesired digimon entirely.
for child_id in (manual.get('unreachable') or []):
    for p in list(parent_branches.keys()):
        if child_id in parent_branches[p]:
            parent_branches[p].remove(child_id)
            if not parent_branches[p]:
                del parent_branches[p]

# Egg → fresh: artificial root, kept as round-robin over the fresh pool. The
# real picker is egg-lineage.json (overrides this in the reducer), so these
# branches act only as a fallback when seedEggVariant is unset.
fresh_pool = by_stage['fresh']
egg_branches = [
    {'slot': slot, 'to': fresh_pool[i % len(fresh_pool)] if fresh_pool else 'botamon'}
    for i, slot in enumerate(SLOTS)
]

rules = [{'from': 'egg', 'forksRequired': FORKS_REQUIRED['egg'], 'branches': egg_branches}]
for id_, d in meta.items():
    if not d.get('stage') or d['stage'] == 'ultra': continue
    kids = parent_branches.get(id_, [])
    if not kids: continue
    weights = (manual.get('branchWeights') or {}).get(id_, {})
    slot_overrides = (manual.get('slotOverrides') or {}).get(id_, {})
    global_weights = manual.get('childGlobalWeights') or {}
    branches = []
    for c in kids:
        override = slot_overrides.get(c)
        slots = override if isinstance(override, list) else [override or slot_for(id_, c)]
        for s in slots:
            b = {'slot': s, 'to': c}
            # Per-parent weight overrides global weight if both exist.
            if c in weights:
                b['weight'] = weights[c]
            elif c in global_weights:
                b['weight'] = global_weights[c]
            branches.append(b)
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
print(f'  manual overrides applied: +{manual_applied["children"]} children, +{manual_applied["parents"]} parent links')

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

# Diagnostic reports
print('\n=== Dead-end parents (0 canonical children in our set) ===')
for stage in STAGES[:-1]:
    bucket = no_canonical[stage]
    total = len(by_stage[stage])
    if bucket:
        print(f'{stage}: {len(bucket)}/{total} dead ends — {sorted(bucket)}')
    else:
        print(f'{stage}: 0/{total} dead ends')

print('\n=== Orphans adopted by all same-stage parents (pass 2) ===')
for stage in STAGES[:-1]:
    orphs = orphans_by_stage.get(stage, [])
    target = NEXT_OF[stage]
    if orphs:
        print(f'{stage}→{target}: {len(orphs)} orphans adopted by all {len(by_stage[stage])} parents')
        print(f'  {sorted(orphs)}')
    else:
        print(f'{stage}→{target}: 0 orphans (all canonically covered)')

# Reachability from egg via egg-lineage + branches
reachable = set()
rule_by = {r['from']: r for r in rules}
stack = ['egg'] + list(set(egg_lineage.values()))
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
if unreach:
    by_stage_unreach = {}
    for u in unreach:
        s = meta[u].get('stage', 'unknown')
        by_stage_unreach.setdefault(s, []).append(u)
    for s in STAGES:
        if s in by_stage_unreach:
            ids = sorted(by_stage_unreach[s])
            print(f'  Unreachable {s}: {len(ids)} — first 10: {ids[:10]}')

if slot_dist_warnings:
    print(f'\nParents whose canonical children collapse onto <5 slots (potential routing bias):')
    for p, kids_n, slots_n in slot_dist_warnings[:10]:
        print(f'  {p}: {kids_n} children spread over {slots_n} slot(s)')
    if len(slot_dist_warnings) > 10:
        print(f'  …and {len(slot_dist_warnings) - 10} more')
