#!/usr/bin/env python3
"""After uploading a finished video + thumbnail to the tracker: record them and write row updates.
usage: tools/tracker_publish.py <out_dir> <id>=<videoAssetId>,<thumbAssetId> [...]
Updates tracker/assets.json and writes <out_dir>/<id>.json with {status: review, video, thumb, version, duration,
history, doneAt}: ready for an ArtifactData batch "update" (pin if_version to the row's current version)."""
import json, os, sys, time
ROOT = os.path.join(os.path.dirname(__file__), '..'); out_dir = sys.argv[1]; os.makedirs(out_dir, exist_ok=True)
ap = os.path.join(ROOT, 'tracker/assets.json'); A = json.load(open(ap)); now = int(time.time() * 1000)
for arg in sys.argv[2:]:
    i, ids = arg.split('='); v, t = ids.split(',')
    prev = A.get(i, {}); ver = prev.get('version', 1) if prev.get('pending') or not prev.get('video') else prev.get('version', 1)
    L = json.load(open(os.path.join(ROOT, f'out/{i}/launch.json')))
    hist = prev.get('history') or [{'v': ver, 'note': 'First render (after the independent review fixes)', 'at': now}]
    A[i] = {'video': '/_blob/' + v, 'thumb': '/_blob/' + t, 'version': ver, 'duration': L.get('duration'), 'history': hist}
    json.dump({'status': 'review', 'video': A[i]['video'], 'thumb': A[i]['thumb'], 'version': ver, 'duration': L.get('duration'), 'history': hist, 'doneAt': now, 'updatedAt': now}, open(os.path.join(out_dir, i + '.json'), 'w'))
    print(i, 'v%d' % ver)
json.dump(A, open(ap, 'w'), indent=1, ensure_ascii=False)
