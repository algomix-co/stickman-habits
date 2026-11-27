#!/usr/bin/env python3
"""Batch-level variety check (owner feedback 2026-11-27: "most of the videos have the same animation format,
the comparisons and topics look blunt"). A batch that fails does not render (tools/render_batch.sh runs this).
usage: tools/batch_check.py specs/batch-NN
Checks, across the specs in one batch folder:
  1. keyword spread: each Short's FIRST keyword is its main topic. No main topic in more than 2 Shorts, and at
     least 60 % of the Shorts have a different main topic (20 Shorts -> 12+ topics).
  2. no keyword used by more than 30 % of the Shorts at all (batch 1 had "discipline" in 13 of 20).
  3. the owner's priority topics appear: money, top 1%, comfort, ego, overthinking, procrastination, social,
     luck, failure, choices (at least half of them in a batch of 20, scaled for smaller batches).
  4. openers differ: no two Shorts share the first two words of their first caption (batch 1: 16 x "SAME ...").
  5. no single scene or format in more than 25 % of the batch.
"""
import json, glob, os, sys, collections
d = sys.argv[1]; specs = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(d, '*.json')))]
n = len(specs); errs = []
if not n: print('no specs in', d); sys.exit(1)
main = collections.Counter((s.get('keywords') or ['?'])[0] for s in specs)
anyk = collections.Counter(k for s in specs for k in set(s.get('keywords') or []))
for k, c in main.items():
    if c > 2: errs.append(f'main topic "{k}" in {c} Shorts (max 2)')
if len(main) < round(0.6 * n): errs.append(f'only {len(main)} different main topics across {n} Shorts (need {round(0.6 * n)})')
for k, c in anyk.items():
    if c > max(2, round(0.3 * n)): errs.append(f'keyword "{k}" used in {c} of {n} Shorts (max {max(2, round(0.3 * n))})')
PRIORITY = ['money', 'top 1%', 'comfort', 'ego', 'overthinking', 'procrastination', 'social', 'luck', 'failure', 'choices']
need = min(len(PRIORITY), max(1, round(len(PRIORITY) * n / 40)))
have = [k for k in PRIORITY if anyk.get(k)]
if len(have) < need: errs.append(f'priority topics covered: {len(have)} ({", ".join(have) or "none"}), need {need} of: {", ".join(PRIORITY)}')
op = collections.Counter(' '.join(((s.get('beats') or [{}])[0].get('caption') or '').upper().replace('.', ' ').split()[:2]) for s in specs)
for k, c in op.items():
    if k and c > 1: errs.append(f'{c} Shorts open with "{k} ..." (each opener must differ)')
w1 = collections.Counter((((s.get('beats') or [{}])[0].get('caption') or '').upper().split() or [''])[0].strip('.,:') for s in specs)
for k, c in w1.items():
    if k and c > 2: errs.append(f'{c} Shorts open with the word "{k}" (max 2; batch 1 had 16 x "SAME ...")')
fmt = collections.Counter(s.get('format') or s.get('scene') for s in specs)
for k, c in fmt.items():
    if n >= 4 and c > max(1, n // 4): errs.append(f'scene/format "{k}" in {c} of {n} Shorts (max {max(1, n // 4)})')
if errs:
    print(f'BATCH CHECK FAIL ({d}, {n} Shorts):'); [print('  -', e) for e in errs]; sys.exit(1)
print(f'BATCH CHECK OK ({d}, {n} Shorts, {len(main)} main topics)')
