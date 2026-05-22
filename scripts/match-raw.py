#!/usr/bin/env python3
"""Match raw filenames to digi-api entries. Combines:
  1) exact normalized match
  2) explicit Japanese↔English alias table (e.g. Centarumon ↔ Centalmon)
  3) suffix/prefix stripping for series modifiers (Savers, Black, Burst, …)
  4) fuzzy match (Levenshtein-ish) for the leftovers
"""
import json, os, re, sys
import difflib

with open('scripts/digi-api-all.json') as f:
    api = json.load(f)

def normalize(n):
    return re.sub(r'[^a-z0-9]', '', n.lower())

# Index: norm -> api entries
api_by_norm = {}
for a in api:
    api_by_norm.setdefault(a['norm'], []).append(a)
all_norms = list(api_by_norm.keys())

# 1. Known Japanese ↔ English aliases. Keys are *raw-style* names, values are
# digi-api canonical norms.
ALIAS = {
    # Confirmed via wikimon (Japanese ↔ English naming differences)
    'apemon': 'hanumon',
    'phantomon': 'fantomon',
    'diaboromon': 'diablomon',
    'chibomon': 'chicomon',
    'armageddemon': 'armagemon',
    'bantyoleomon': 'bancholeomon',
    'creepymon': 'demon',
    'deputymon': 'revolmon',
    'deramon': 'delumon',
    'dolphmon': 'rukamon',
    'grizzmon': 'gryzmon',
    'kapurimon': 'caprimon',
    'leppamon': 'reppamon',
    'megakabuterimonblue': 'atlurkabuterimonblue',
    'meteormon': 'insekimon',
    'mudfrigimon': 'tuchidarumon',
    'raramon': 'lalamon',
    'roachmon': 'gokimon',
    'rookchessmon': 'rookchessmonwhite',
    'shogungekomon': 'tonosamagekomon',
    'tortomon': 'tortamon',
    'weedmon': 'zassoumon',
    'bishopchessmon': 'bishopchessmonwhite',
    'cherubimon': 'cherubimonvirtue',
    'chronomon': 'chronomonholymode',
    'rapidmon': 'rapidmonperfect',
    'gryphonmon': 'griffomon',
    'herculeskabuterimon': 'heraklekabuterimon',
    'skullbarukimon': 'skullbaluchimon',
    'wargrowlmon': 'megalogrowmon',
    'blackwargrowlmon': 'blackmegalogrowmon',
    'justimon': 'justimonaccelarm',
    # Existing well-known mappings
    'biyomon': 'piyomon',
    'centarumon': 'centalmon',
    'darktyrannomon': 'darktyranomon',
    'metaltyrannomon': 'metaltyranomon',
    'xtyrannomon': 'xtyranomon',
    'ogremon': 'orgemon',
    'antiramon': 'andiramon',
    'anubismon': 'anubimon',
    'phoenixmon': 'hououmon',
    'magnadramon': 'holydramon',
    'ophanimon': 'ofanimon',
    'ophanimoncore': 'ofanimonfalldownmode',
    'sorcerymon': 'sorcermon',
    'venommyotismon': 'venomvamdemon',
    'myotismon': 'vamdemon',
    'piedmon': 'piemon',
    'puppetmon': 'pinochimon',
    'machinedramon': 'mugendramon',
    'blackagumon': 'agumonblack',
    'chronomondm': 'chronomondestroymode',
    'duftmon1': 'duftmon',
    'chaosmon1': 'chaosmon',
    'dukemoncm': 'dukemoncrimsonmode',
    'lucemonfdm': 'lucemonfalldownmode',
    'moonmilleniummon': 'moonmillenniummon',
    'milleniummon': 'millenniummon',
    'zeedmillenniummon': 'zeedmillenniummon',
    'cherubimonvirus': 'cherubimonvice',
    'imperialdramonfighter': 'imperialdramonfightermode',
    'imperialdramonpaladin': 'imperialdramonpaladinmode',
    'imperialdramondmblack': 'imperialdramondragonmodeblack',
    'imperialdramon': 'imperialdramondragonmode',
    'miragegaogamonburst': 'miragegaogamonburstmode',
    'ravemonburst': 'ravemonburstmode',
    'rosemonburst': 'rosemonburstmode',
    'shinegreymonburst': 'shinegreymonburstmode',
    'shinegreymonruin': 'shinegreymonruinmode',
    'beelzebumonblaster': 'beelzebumonblastermode',
    'beelzemonxros': 'beelzebumon',
    'argomonperfect': 'argomonultimate',
    'argomonultimate': 'argomonmega',
    'alturkabuterimonred': 'atlurkabuterimonred',
    'frigimon': 'yukidarumon',
    'snowgoblimon': 'snowgoburimon',
    'goblimon': 'goburimon',
    'jmojyamon': 'mojyamon',
    'minotarumon': 'minotaurumon',
    'guadromon': 'guardromon',
    'darklizardmon': 'darklizamon',
    'flarelizardmon': 'flarelizamon',
    'flamedramon': 'fladramon',
    'lilymon': 'lilimon',
    'piximon': 'piccolomon',
    'growlmon': 'growmon',
    'redveggiemon': 'redvegimon',
    'veggiemon': 'vegimon',
    'demidevimon': 'picodevimon',
    'marineangemon': 'marinangemon',
    'arachnemon': 'arukenimon',
    'belphemon': 'belphemonsleepmode',
    'aeroveedramon': 'aeroveedramon',
    'mammothmon': 'mammon',
    'cherrymon': 'jyureimon',
    'chimaeramon': 'kimeramon',
    'chimeramon': 'kimeramon',
    'octomon': 'octmon',
    'pumpmon': 'pumpkinmon',
    'seasarmon': 'shisamon',
    'tsukaimon': 'tsukaimon',
}

def candidates(raw_name: str):
    n = normalize(raw_name)
    cands = [n]
    # Suffix stripping
    for suf in ['Savers', 'Tamers', 'Adventure', 'X', 'XW', 'XWO', 'XO', 'CM', 'FDM',
                'DM', 'BM', 'B', 'Original', 'Mode']:
        if raw_name.endswith(suf):
            cands.append(normalize(raw_name[:-len(suf)]))
    # Color suffix / prefix
    for col in ['Black', 'Red', 'Blue', 'Green', 'White', 'Virus', 'Vaccine', 'Data']:
        if raw_name.endswith(col):
            stem = raw_name[:-len(col)]
            cands.append(normalize(stem))
            cands.append(normalize(stem) + col.lower())
        if raw_name.startswith(col):
            stem = raw_name[len(col):]
            cands.append(normalize(stem))
            cands.append(normalize(stem) + col.lower())
    # Common substitutions
    sub = n
    if 'nn' in sub: cands.append(sub.replace('nn', 'n'))
    if sub.endswith('mon'): pass
    # alias
    if n in ALIAS:
        cands.append(normalize(ALIAS[n]))
    return cands

raw_dir = 'packages/data/sprites/_raw'
raw_files = sorted([f for f in os.listdir(raw_dir) if f.endswith('.gif')])

matches, unmatched = [], []
for f in raw_files:
    m = re.match(r'^(\d+)_(.+)\.gif$', f)
    if not m: continue
    rawnum, name = m.groups()
    found = None
    for cand in candidates(name):
        if cand in api_by_norm:
            found = api_by_norm[cand][0]
            break
    if not found:
        # Fuzzy
        n = normalize(name)
        close = difflib.get_close_matches(n, all_norms, n=1, cutoff=0.88)
        if close:
            found = api_by_norm[close[0]][0]
    if found:
        matches.append({
            'raw_file': f, 'raw_num': rawnum, 'raw_name': name,
            'api_id': found['id'], 'api_name': found['name'],
        })
    else:
        unmatched.append({'raw_file': f, 'raw_name': name, 'norm': normalize(name)})

with open('scripts/matched.json', 'w') as f: json.dump(matches, f, indent=2, ensure_ascii=False)
with open('scripts/unmatched.json', 'w') as f: json.dump(unmatched, f, indent=2, ensure_ascii=False)
print(f"matched: {len(matches)} / {len(raw_files)}")
print(f"unmatched: {len(unmatched)}")
if unmatched:
    print("\n--- still unmatched ---")
    for u in unmatched: print(f"  {u['raw_name']} (norm={u['norm']})")
