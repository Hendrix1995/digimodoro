#!/usr/bin/env python3
import json, re, sys
import urllib.request

OUT = "scripts/digi-api-all.json"

def normalize(name: str) -> str:
    return re.sub(r'[^a-z0-9]', '', name.lower())

def fetch_page(page: int, page_size: int):
    url = f"https://digi-api.com/api/v1/digimon?page={page}&pageSize={page_size}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 DigiModoro'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

all_items = []
page = 0
while True:
    data = fetch_page(page, 50)
    content = data.get('content', [])
    if not content: break
    for c in content:
        all_items.append({
            'id': c.get('id'),
            'name': c.get('name'),
            'norm': normalize(c.get('name', '')),
            'href': c.get('href'),
        })
    info = data.get('pageable', {})
    total_pages = info.get('totalPages', 1)
    print(f"page {page+1}/{total_pages}", file=sys.stderr)
    page += 1
    if page >= total_pages: break

with open(OUT, 'w') as f:
    json.dump(all_items, f, indent=2, ensure_ascii=False)
print(f"saved {len(all_items)} to {OUT}")
