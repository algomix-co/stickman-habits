# Generation-1 score: the very first music (Same Salary, Different Futures), restored by the owner in round 3.
# Only change from the original (commit fe9907f): no gaps at the hook, rewind or question (owner: the music never pauses).
"""Procedural score v2, driven by the engine's cue sheet (all times in real seconds).
Usage: python3 -I audio.py cues.json out.wav
style.instrument: piano | pluck | musicbox | epiano | lofi      (the melodic voice + its pad + drum feel)
style.impact:     boom | tapestop | glitch | snap | sub          (what crashes / climaxes sound like)
style.root / style.bpm: key and tempo.  cues.motif: the brand's sonic signature, played on the end card."""
import json, sys, wave, zlib
import numpy as np

cues = json.load(open(sys.argv[1]))
ST = cues.get('style', {})
SR = 44100
DUR = cues['dur']
N = int(SR * DUR) + 1
seed = zlib.crc32(json.dumps(ST, sort_keys=True).encode()) & 0xffff
rng = np.random.default_rng(seed)
music = np.zeros((N, 2)); fx = np.zeros((N, 2))
INST, IMPACT = ST.get('instrument', 'piano'), ST.get('impact', 'boom')
root = int(ST.get('root', 57)); bpm = float(ST.get('bpm', 80)); E8 = 30.0 / bpm

def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def tvec(d): return np.arange(int(max(d, 0) * SR)) / SR
def add(buf, start, sig, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= N or i + len(sig) <= 0 or len(sig) == 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[:N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(sig), 0] += sig * l * 1.41; buf[i:i + len(sig), 1] += sig * r * 1.41
def onepole(x, cutoff):
    cutoff = np.broadcast_to(np.asarray(cutoff, float), x.shape); a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x); s = 0.0
    for n in range(len(x)): s += a[n] * (x[n] - s); y[n] = s
    return y
def noise(d): return rng.standard_normal(len(tvec(d)))

# ---------------- voices ----------------
def v_piano(f, vel=1.0):
    t = tvec(1.8); s = sum((1 / k ** 1.4) * np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k)) * np.exp(-t * (1.3 + 0.9 * k)) for k in range(1, 7))
    return s * np.minimum(1, t / 0.004) * vel * 0.22
def v_pluck(f, vel=1.0):
    t = tvec(0.7); s = sum((1 / k) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (4 + 2.2 * k)) for k in range(1, 10))
    return s * np.minimum(1, t / 0.002) * vel * 0.2
def v_musicbox(f, vel=1.0):
    f *= 2; t = tvec(1.6); s = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.35 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 5) + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 8)
    return s * np.minimum(1, t / 0.002) * vel * 0.16
def v_epiano(f, vel=1.0):
    t = tvec(1.6); mod = 1.6 * np.exp(-t / 0.25) * np.sin(2 * np.pi * f * t)
    s = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 1.6) * (1 + 0.15 * np.sin(2 * np.pi * 5 * t))
    return s * np.minimum(1, t / 0.003) * vel * 0.22
VOICE = {'piano': v_piano, 'pluck': v_pluck, 'musicbox': v_musicbox, 'epiano': v_epiano, 'lofi': v_epiano}[INST]
def bell(f, dur=3.0, vel=1.0):
    t = tvec(dur); s = np.sin(2 * np.pi * f * t) * np.exp(-t * 1.1) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 2.5) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 4)
    return s * np.minimum(1, t / 0.003) * vel * 0.18
def pad(freqs, dur, vel=1.0, att=0.6, rel=0.8, bright=1.8):
    t = tvec(dur + rel); s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.0035, 0.0, 0.0035):
            ph = rng.uniform(0, 6.28); s += sum((1 / k ** bright) * np.sin(2 * np.pi * f * (1 + det) * k * t + ph * k) for k in range(1, 6))
    env = np.minimum(1, t / min(att, dur / 2 + 1e-3)) * np.where(t > dur, np.exp(-(t - dur) / (rel / 3)), 1)
    return s * env * vel * 0.03
PADCFG = {'piano': (1.0, 0.6, 1.8), 'pluck': (0.8, 0.3, 1.3), 'musicbox': (1.2, 1.2, 2.2), 'epiano': (0.9, 0.5, 2.0), 'lofi': (0.6, 0.8, 2.4)}[INST]
def kick(vel=1.0, low=45, dec=0.35):
    t = tvec(0.9); f = low + (150 - low) * np.exp(-t / 0.03); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec) * vel * 0.9
def hat(vel=0.25):
    n = np.diff(rng.standard_normal(int(0.08 * SR)), prepend=0); return n * np.exp(-np.arange(len(n)) / SR / 0.018) * vel
def snare(vel=0.3):
    t = tvec(0.25); return (onepole(rng.standard_normal(len(t)), 3500) * np.exp(-t / 0.06) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)) * vel
def ping(f, vel=0.12):
    t = tvec(0.25); return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t / 0.06) * vel
def riser(t0, t1, vol=0.45):
    L = int((t1 - t0) * SR)
    if L < SR * 0.3: return
    u = np.arange(L) / L
    add(fx, t0, onepole(rng.standard_normal(L), 300 + 6000 * u ** 2) * u ** 2 * vol + np.sin(2 * np.pi * np.cumsum(180 + 900 * u ** 2) / SR) * u ** 2 * 0.1)

# ---------------- harmony ----------------
PROGS = [[(0, 'm'), (8, 'M'), (3, 'M'), (10, 'M')], [(0, 'm'), (5, 'm'), (8, 'M'), (7, 'M')], [(0, 'm'), (8, 'M'), (5, 'm'), (7, 'M')], [(0, 'm'), (3, 'M'), (10, 'M'), (5, 'm')]]
prog = PROGS[seed % len(PROGS)]
def chord(deg, q, octave=0):
    base = root + deg + 12 * octave
    if base > root + 7 + 12 * octave: base -= 12
    return [base, base + (3 if q == 'm' else 4), base + 7]
crash_t, burst_t = cues['crash'], cues['burst']
k = 0
for b in cues['beats']:
    t0, t1, mood = b['t0'], b['t1'], b['mood']
    if mood == 'end': segs = [(t0, t1, (0, 'm'))]
    elif mood == 'build': n = 4; d = (t1 - t0) / n; segs = [(t0 + j * d, t0 + (j + 1) * d, prog[(k + j) % 4]) for j in range(n)]; k += n
    else: segs = [(t0, t1, prog[k % 4])]; k += 1
    for s0, s1, (deg, q) in segs:
        vel = {'build': 1.5, 'climax': 1.4, 'end': 1.1}.get(mood, 1.0) * PADCFG[0]
        add(music, s0, pad([midi(m) for m in chord(deg, q, -1)], s1 - s0, vel=vel, att=PADCFG[1], bright=PADCFG[2]))
        rt = tvec(s1 - s0 + .5); L = s1 - s0
        add(music, s0, np.sin(2 * np.pi * midi(root + deg - 24 - (12 if deg > 7 else 0)) * rt) * np.minimum(1, rt / .2) * np.where(rt > L, np.exp(-(rt - L) / .15), 1) * 0.10)
        if mood == 'end': continue
        step = {'build': E8 / 2, 'tense': E8 * 2}.get(mood, E8)
        tones = chord(deg, q, 0); tones = tones + [tones[0] + 12]
        PAT = [[0, 1, 2, 3, 2, 1], [0, 2, 1, 3, 1, 2], [3, 2, 1, 0, 1, 2]][seed % 3]; j = 0; t = s0
        while t < s1 - 0.01:
            if not any(c <= t < c + 1.4 for c in crash_t):
                swing = (E8 * 0.18 if INST == 'lofi' and j % 2 else 0)
                add(music, t + swing, VOICE(midi(tones[PAT[j % 6]] + (12 if mood == 'build' and j % 4 == 3 else 0)), vel=0.55 + 0.45 * min(1, t / max(1, DUR * 0.6))), pan=0.25 * np.sin(j))
            j += 1; t += step
    # drums
    if mood == 'build':
        t = t0
        while t < t1 - 0.05: add(fx, t, kick(0.75)); add(fx, t + E8 / 2, hat(0.12 + 0.12 * (t - t0) / (t1 - t0))); t += E8
    elif mood == 'tense':
        t = t0 + 0.3
        while t < t1 - 0.2: add(fx, t, kick(0.45, low=48, dec=0.2)); add(fx, t + 0.22, kick(0.3, low=48, dec=0.18)); t += 0.9
    elif INST == 'lofi' and mood == 'normal':
        t = t0; j = 0
        while t < t1 - 0.05:
            if j % 4 == 0: add(fx, t, kick(0.35, low=50, dec=0.18))
            if j % 4 == 2: add(fx, t, snare(0.18))
            add(fx, t + (E8 * 0.18 if j % 2 else 0), hat(0.05)); t += E8; j += 1

# ---------------- impacts ----------------
def impact(c, strong=True):
    g = 1.0 if strong else 0.6
    if IMPACT == 'boom':
        add(fx, c, kick(1.0 * g, low=32, dec=1.0)); add(fx, c, onepole(noise(1.5), 900) * np.exp(-tvec(1.5) / 0.35) * 0.6 * g)
    elif IMPACT == 'sub':
        t = tvec(1.4); f = 30 + 40 * np.exp(-t / 0.25); add(fx, c, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7) * 0.95 * g)
        add(fx, c, np.sin(2 * np.pi * 2500 * tvec(0.01)) * 0.2)
    elif IMPACT == 'snap':
        L = 0.9; u = tvec(L) / L; add(fx, c - L, onepole(rng.standard_normal(len(u)), 2000 + 9000 * u) * u ** 3 * 0.35 * g)   # reverse swell
        add(fx, c, onepole(noise(0.12), 7000) * np.exp(-tvec(0.12) / 0.025) * 0.9 * g)
        for d in (0.0, 0.012, 0.024): add(fx, c + d, snare(0.35 * g))
        t = tvec(0.6); add(fx, c, np.sin(2 * np.pi * np.cumsum(140 - 60 * t / 0.6) / SR) * np.exp(-t / 0.2) * 0.4 * g)
    elif IMPACT == 'glitch':
        sl = int(0.06 * SR); i0 = max(0, int(c * SR) - sl)
        seg = (music[i0:i0 + sl] + fx[i0:i0 + sl]).copy()
        for r in range(6): add(fx, c + r * 0.06, seg[:, 0] * (0.9 - r * 0.13) * g)
        for r in range(5): add(fx, c + 0.02 + r * 0.07, np.sign(np.sin(2 * np.pi * (900 + 600 * r) * tvec(0.03))) * 0.08 * g, pan=rng.uniform(-.6, .6))
        add(fx, c, kick(0.6 * g, low=40, dec=0.4))
    elif IMPACT == 'tapestop':
        i0 = int(c * SR); L = int(0.7 * SR)
        if i0 + L < N:
            src = music[i0:i0 + int(1.2 * SR)].copy(); rate = np.linspace(1, 0, L); pos = np.cumsum(rate); pos = np.clip(pos, 0, len(src) - 2)
            for ch in range(2): music[i0:i0 + L, ch] = np.interp(pos, np.arange(len(src)), src[:, ch]) * np.linspace(1, 0.2, L)
            music[i0 + L:i0 + int(1.4 * SR)] *= 0.05
        add(fx, c, kick(0.6 * g, low=36, dec=0.5))

starts = [b['t0'] for b in cues['beats']]
for c in crash_t:
    prev = max([s for s in starts if s < c - 0.5] or [0]); riser(max(prev, c - 3.0), c - 0.02)
    impact(c, True)
    for i in range(8): add(fx, c + 0.3 + i * 0.09 + 0.03 * rng.random(), ping(1200 + 500 * rng.random(), 0.04), pan=rng.uniform(-.5, .5))
for s in cues['shake']:
    impact(s, False); dt_ = tvec(0.7); add(fx, s, np.sin(2 * np.pi * np.cumsum(420 - 300 * dt_ / 0.7) / SR) * np.exp(-dt_ / 0.3) * 0.12, pan=0.4)
for bt in burst_t:
    riser(max(0, bt - 2.25), bt - 0.01); impact(bt, True)
    add(fx, bt, onepole(noise(2.5), 6000) * np.exp(-tvec(2.5) / 0.7) * 0.3)
    for i, m in enumerate([root + 24, root + 27, root + 31, root + 36]): add(music, bt + i * 0.09, bell(midi(m), vel=0.9), pan=-0.3 + 0.2 * i)
PENT = [2093.0, 2349.3, 2637.0, 3136.0, 3520.0, 4186.0]
for t, ci, n in cues.get('milestones', []):
    for j, m in enumerate([root + 36, root + 43]): add(fx, t + j * 0.07, ping(midi(m), 0.09), pan=-0.5 + ci / max(1, n - 1))
for t, ci, n in cues['rain']: add(fx, t, ping(PENT[ci % 6]), pan=-0.6 + 1.2 * ci / max(1, n - 1))
for f in cues['fling']:
    for i in range(16): add(fx, f + i * 0.07, ping(3000 - i * 60, 0.07), pan=-0.4)
for t, ci, n in cues['pops']:
    bt_ = tvec(0.07); add(fx, t, np.sin(2 * np.pi * (700 + 900 * bt_ / 0.07) * bt_) * np.exp(-bt_ / 0.02) * 0.12, pan=-0.6 + 1.2 * ci / max(1, n - 1))
for w in cues['whoosh']:
    L = tvec(0.45); add(fx, w - 0.15, onepole(rng.standard_normal(len(L)), 2500) * np.sin(np.pi * L / 0.45) ** 2 * 0.06)

# ---------------- hook / rewind / slow-mo / end card ----------------
if cues.get('hook'):
    h0, h1 = cues['hook']; _rw = cues.get('rewind') or []; _rw = [_rw] if _rw and not isinstance(_rw[0], list) else _rw
    h2 = max([h1] + [b for a, b in _rw if a <= h1 + 0.05]) + 0.2; t = tvec(h2 - h0)   # round 3: the hook bed runs through the rewind (no gap)
    add(music, h0, sum(np.sin(2 * np.pi * midi(root - 12 + d) * t) for d in (0, 7)) * np.minimum(1, t / 0.02) * np.clip((h2 - h0 - t) / 0.25, 0, 1) * 0.08)
    add(fx, h0 + 0.1, kick(0.5, low=46, dec=0.22)); add(fx, h0 + 0.32, kick(0.35, low=46, dec=0.2))
rw = cues.get('rewind') or []
rw = [rw] if rw and not isinstance(rw[0], list) else rw
for r0, r1 in rw:
    L = tvec(r1 - r0); u = L / max(L[-1], 1e-3)
    add(fx, r0, (np.sin(2 * np.pi * np.cumsum(300 + 2500 * u ** 1.5 + 200 * np.sin(2 * np.pi * 18 * L)) / SR) * 0.12 + onepole(rng.standard_normal(len(L)), 3000) * 0.08) * (0.45 + 0.55 * np.sin(np.pi * u) ** 0.5))   # round 3: never fades to silence
for s0, s1 in cues.get('slow', []):
    t = tvec(0.8); add(fx, s0, np.sin(2 * np.pi * np.cumsum(500 * np.exp(-t / 0.25) + 60) / SR) * np.exp(-t / 0.5) * 0.18)
if cues.get('endcard') is not None:
    e0 = cues['endcard']; motif = cues.get('motif') or [0, 7, 12]
    for j, d in enumerate(motif): add(music, e0 + 0.15 + j * 0.16, bell(midi(root + 24 + d), 2.5, 0.9), pan=-0.2 + 0.2 * j)
    add(music, e0, pad([midi(m) for m in chord(0, 'm', -1)], DUR - e0, vel=0.9))
q = cues.get('question')
if q is not None:
    add(fx, q, kick(0.5, low=40, dec=0.7)); add(music, q, bell(midi(root + 24), 3.4, 1.0), pan=-0.1); add(music, q + 0.45, bell(midi(root + 31), 3.0, 0.7), pan=0.2)

# ---------------- mix ----------------
def reverb(x, secs=2.4, s=1):
    r = np.random.default_rng(s); Mn = int(secs * SR); t = np.arange(Mn) / SR; out = np.zeros_like(x)
    for ch in range(2):
        ir = onepole(r.standard_normal(Mn) * np.exp(-t / (secs / 6.9)), 5000); ir /= np.sqrt(np.sum(ir ** 2))
        n = 1 << int(np.ceil(np.log2(len(x) + Mn))); out[:, ch] = np.fft.irfft(np.fft.rfft(x[:, ch], n) * np.fft.rfft(ir, n), n)[:len(x)]
    return out
wet = {'lofi': 0.18, 'musicbox': 0.4}.get(INST, 0.3)
mix = music + wet * reverb(music) + fx + 0.12 * reverb(fx, 1.5, 2)
if INST == 'lofi':
    cr = (rng.random(N) < 0.0009) * rng.uniform(-0.3, 0.3, N); mix[:, 0] += cr * 0.25; mix[:, 1] += cr * 0.25
    for ch in range(2): mix[:, ch] = onepole(mix[:, ch], 5200)
if cues.get('slow'):   # muffle everything during slow-motion
    cut = np.full(N, 18000.0)
    for s0, s1 in cues['slow']: a, b = int(s0 * SR), min(N, int(s1 * SR)); cut[a:b] = np.minimum(cut[a:b], 900 + 4000 * np.abs(np.linspace(-1, 1, b - a)) ** 2)
    for ch in range(2): mix[:, ch] = onepole(mix[:, ch], cut)
if q is not None:
    g = np.ones(N); a, b = int(max(0, q - 0.3) * SR), int(q * SR); g[a:b] = np.linspace(1, 0.6, b - a); mix *= g[:, None]
mix = np.tanh(1.4 * mix / (np.max(np.abs(mix)) + 1e-9)) / np.tanh(1.4) * 0.95
fl = int(0.25 * SR); mix[-fl:] *= np.linspace(1, 0, fl)[:, None]
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print(f'audio ok: {INST} / {IMPACT} / root {root} / {bpm:.0f} bpm / progression {seed % len(PROGS)}')
