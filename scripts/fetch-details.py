#!/usr/bin/env python3
import json, sys, time, urllib.request, os

OUT = 'scripts/digi-api-details.json'

with open('scripts/matched.json') as f:
    matched = json.load(f)

cache = {}
if os.path.exists(OUT):
    with open(OUT) as f:
        cache = json.load(f)

def fetch(did):
    url = f"https://digi-api.com/api/v1/digimon/{did}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 DigiModoro'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

todo = [m for m in matched if str(m['api_id']) not in cache]
print(f"to fetch: {len(todo)} (already cached: {len(cache)})", file=sys.stderr)
for i, m in enumerate(todo):
    did = m['api_id']
    try:
        data = fetch(did)
        cache[str(did)] = {
            'id': did,
            'name': data.get('name'),
            'levels': [lv.get('level') for lv in (data.get('levels') or [])],
            'priorEvolutions': [{'id': p.get('id'), 'name': p.get('digimon')} for p in (data.get('priorEvolutions') or [])],
            'nextEvolutions': [{'id': p.get('id'), 'name': p.get('digimon')} for p in (data.get('nextEvolutions') or [])],
        }
        if (i + 1) % 25 == 0:
            print(f"  {i+1}/{len(todo)}", file=sys.stderr)
            with open(OUT, 'w') as f:
                json.dump(cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"  error on {did} ({m['raw_name']}): {e}", file=sys.stderr)
    time.sleep(0.05)
with open(OUT, 'w') as f:
    json.dump(cache, f, indent=2, ensure_ascii=False)
print(f"saved {len(cache)} details to {OUT}")
