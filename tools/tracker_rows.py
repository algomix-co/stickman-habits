#!/usr/bin/env python3
"""Build tracker rows (one JSON file per video) for the Mind the Gap tracker page.
usage: tools/tracker_rows.py <out_dir> <status> <id> [<id> ...]
Reads out/<id>/launch.json (or the spec's upload block), tracker/assets.json (id -> uploaded video/thumbnail
urls and version) and writes <out_dir>/<id>.json, ready for ArtifactData batch writes (collection "videos")."""
import json, os, sys, time, glob
ROOT = os.path.join(os.path.dirname(__file__), '..')
out_dir, status, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
assets = json.load(open(os.path.join(ROOT, 'tracker/assets.json')))
os.makedirs(out_dir, exist_ok=True)
def spec_of(i):
    for p in [f'specs/{i}.json', f'specs/batch-01/{i}.json'] + glob.glob(f'specs/batch-*/{i}.json'):
        fp = os.path.join(ROOT, p)
        if os.path.exists(fp): return json.load(open(fp))
for i in ids:
    s = spec_of(i); lp = os.path.join(ROOT, f'out/{i}/launch.json'); L = json.load(open(lp)) if os.path.exists(lp) else {}
    u = s.get('upload', {}); a = assets.get(i, {}) if status == 'rendering' else assets[i]   # a row can be listed before its video exists
    row = {'batch': s.get('batch', 0), 'idx': s.get('batchIndex', 0), 'title': L.get('title') or u.get('title'), 'scene': s['scene'],
           'twist': L.get('twist') or s.get('twist', ''), 'duration': L.get('duration') or a.get('duration'), 'version': a.get('version', 1),
           'status': status, 'video': a.get('video', '') if status != 'rendering' else '', 'thumb': a.get('thumb', '') if status != 'rendering' else '',
           'launch': {'description': L.get('description') or u.get('description', ''), 'hashtags': L.get('hashtags') or [h.lstrip('#') for h in u.get('hashtags', [])],
                      'tags': list(dict.fromkeys(L.get('tags') or u.get('tags', []))), 'pinned': L.get('pinned') or u.get('pinned') or 'Which one are you? A, B, C or D 👇'},
           'feedback': '', 'history': a.get('history', [{'v': a.get('version', 1), 'note': 'First render'}]), 'updatedAt': int(time.time() * 1000)}
    json.dump(row, open(os.path.join(out_dir, i + '.json'), 'w'), ensure_ascii=False)
    print(i, row['status'], row['title'])
