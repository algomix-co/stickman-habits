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

def lerp(a, b, u): return a + (b - a) * u
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
MUSIC = ST.get('music', 'calm')
# ================= DRIVE: rhythmic score that escalates every few seconds (urgency, not relaxation) =================
# tempo accelerates toward the climax; layers stack in 4 stages; key lifts a semitone at the halfway mark;
# snare roll + one-beat drop-out before the climax; full drop after it; calms only for the closing line.
_saw_cache = {}
def saw(f, d, K, dec, att=0.004):
    key = (round(f, 2), round(d, 3), K, round(dec, 3))
    if key not in _saw_cache:
        t = tvec(d); s = np.zeros_like(t)
        for k_ in range(1, K + 1):
            if f * k_ > 15000: break
            s += np.sin(2 * np.pi * f * k_ * t) / k_
        _saw_cache[key] = s * np.minimum(1, t / att) * np.exp(-t / dec)
    return _saw_cache[key]
def lp(x, fc):   # zero-phase low-pass for short one-shots
    n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); return np.fft.irfft(X / (1 + (f / fc) ** 4), n)
_clap = {}
def clap(vel=0.3):
    if vel in _clap: return _clap[vel]
    n = rng.standard_normal(int(0.2 * SR)); e = np.zeros(len(n)); tt = np.arange(len(n)) / SR
    for d in (0, 0.011, 0.022): e += (tt >= d) * np.exp(-np.maximum(tt - d, 0) / 0.012)
    e += (tt >= 0.03) * np.exp(-np.maximum(tt - 0.03, 0) / 0.07) * 0.6
    _clap[vel] = lp(n * e, 3800) * vel * 1.3; return _clap[vel]
def tick(vel=0.05):
    t = tvec(0.03); return (np.sin(2 * np.pi * 3400 * t) + 0.5 * np.sin(2 * np.pi * 5100 * t)) * np.exp(-t / 0.006) * vel
def hp(x, fc):
    n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); return np.fft.irfft(X * (f / fc) ** 4 / (1 + (f / fc) ** 4), n)
_fol = {}
def foley(kind, vel=1.0):   # rhythmic work sounds that sit on the music grid
    if kind not in _fol:
        t = tvec(0.25)
        if kind == 'brick': s = lp(rng.standard_normal(len(t)), 2200) * np.exp(-t / 0.018) * 0.9 + np.sin(2 * np.pi * 170 * t) * np.exp(-t / 0.04) * 0.6
        elif kind == 'hammer': s = (np.sin(2 * np.pi * 1850 * t) + 0.6 * np.sin(2 * np.pi * 2730 * t)) * np.exp(-t / 0.035) * 0.5 + hp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.006) * 0.6
        elif kind == 'blade': s = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in ((2350, 0.12), (3710, 0.08), (5230, 0.05))) * 0.3 + hp(rng.standard_normal(len(t)), 5000) * np.exp(-t / 0.01) * 0.5
        elif kind == 'step': s = lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.03) * 0.8 + np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.05) * 0.7
        else: s = (np.sin(2 * np.pi * 2600 * t) + 0.4 * np.sin(2 * np.pi * 3900 * t)) * np.exp(-t / 0.05) * 0.4   # coin
        _fol[kind] = s * np.minimum(1, t / 0.002)
    return _fol[kind] * vel
def shaker(vel=0.03):
    t = tvec(0.06); return hp(rng.standard_normal(len(t)), 6000) * np.sin(np.pi * t / 0.06) ** 2 * vel
def tom(f, vel=0.4):
    t = tvec(0.35); ff = f * (1 + 0.6 * np.exp(-t / 0.02)); return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / 0.16) * vel
def cymbal(vel=0.18, dec=1.2):
    t = tvec(dec * 2); return hp(rng.standard_normal(len(t)), 5000) * np.exp(-t / dec) * vel
def swell(t0, t1, vol=0.16):   # reverse-cymbal swell that lands exactly on the next downbeat
    L = int((t1 - t0) * SR)
    if L < 200: return
    u = np.arange(L) / L; add(fx, t0, hp(rng.standard_normal(L), 3000) * u ** 2.5 * vol)
if MUSIC == 'drive':
    if IMPACT == 'tapestop': IMPACT = 'boom'   # never stop the music: a tape-stop leaves a hole
    climax = burst_t[0] if burst_t else DUR * 0.78
    calm_at = min([x for x in [cues.get('question'), cues.get('endcard')] if x is not None] or [DUR])
    closing = [b['t0'] for b in cues['beats'] if b['mood'] == 'end']; calm_at = min([calm_at] + closing)
    B0 = float(ST.get('driveBpm', 108 + (bpm - 72))); B1 = B0 + float(ST.get('driveRamp', 22))
    # grid locked to the story: every caption change is a downbeat; tempo rises beat by beat
    segs = [(b['t0'], b['t1']) for b in cues['beats']]
    if segs[-1][1] < DUR - 0.05: segs.append((segs[-1][1], DUR))
    grid = []   # (time, beat length, index in segment, segment length, segment start)
    for (a, b) in segs:
        mid = (a + b) / 2; tgt = B0 + (B1 - B0) * min(1.0, mid / climax) ** 1.2
        n = max(2, int(round((b - a) * tgt / 60 / 2)) * 2); d = (b - a) / n
        for k in range(n): grid.append((a + k * d, d, k, n, a))
    PROG = [[0, 8, 3, 10], [0, 10, 8, 7], [0, 5, 8, 10]][seed % 3]
    def stage(t):
        if t >= calm_at: return 6
        if t >= climax: return 5
        p = t / climax
        return 1 if p < 0.25 else 2 if p < 0.5 else 3 if p < 0.8 else 4
    fol = (cues.get('foley') or {}); fkind = fol.get('kind'); fwin = fol.get('active', [])
    working = lambda t: any(a0 - 0.05 <= t <= a1 + 0.05 for a0, a1 in fwin)
    seg_i = -1; bar_global = 0
    for gi, (t, beat, k, n, s0) in enumerate(grid):
        st = stage(t); p = min(1.0, t / climax); ramp = 0.55 + 0.45 * p
        if k == 0: seg_i += 1
        pos = k % 4; bar = seg_i * 4 + k // 4
        key = root + (1 if t >= climax * 0.5 else 0) + (2 if st >= 5 else 0)
        deg = PROG[bar % 4]; r = key + deg - (12 if deg > 7 else 0); fifth, oct_ = r + 7, r + 12
        calm = st == 6
        # --- drums: four on the floor all the way through (softer on the closing line, never silent)
        add(fx, t, kick((0.42 if calm else 0.5 if st == 1 else 0.68) * (1.1 if st == 5 else 1), low=44, dec=0.22 if st < 5 else 0.32))
        if (st >= 2 or calm) and pos in (1, 3): add(fx, t, clap(0.22 if calm else 0.26 + 0.1 * (st >= 3)), pan=0.05)
        div = 2 if (st <= 2 or calm) else 4
        for j in range(div): add(fx, t + j * beat / div, tick(0.022 + 0.015 * (j == 0) + 0.01 * (st >= 4)), pan=0.35 * (1 if j % 2 else -1))
        for j in range(4): add(fx, t + j * beat / 4, shaker(0.02 + 0.015 * (st >= 3) + 0.01 * (j % 2)), pan=0.5)   # continuous 16th shaker glue
        if st >= 3 and not calm: add(fx, t + beat / 2, lp(hat(0.07 + 0.03 * (st >= 4)), 9000), pan=-0.2)
        # --- fill into every caption change + a crash on the new downbeat (sections feel joined, not cut)
        if k == n - 1 and gi + 1 < len(grid):
            nxt = grid[gi + 1][0]
            if st >= 2 and not calm: [add(fx, t + j * beat / 4, tom(lerp(150, 260, j / 3), 0.22 + 0.06 * j), pan=-0.3 + 0.2 * j) for j in range(4)]
            else: [add(fx, t + j * beat / 4, snare(0.08 + 0.05 * j)) for j in range(4)]
            swell(t, nxt, 0.08 + 0.08 * (st >= 3))
        if k == 0 and t > 0.1: add(fx, t, cymbal(0.06 + 0.06 * (st >= 3) + 0.08 * (st == 5), 0.9 if st < 5 else 1.6), pan=0.2)
        # --- bass: legato 8ths (each note runs into the next), plus a sub that holds the bar
        for j in range(2):
            m = r - 24 + (12 if st >= 3 and j == 1 else 0)
            add(music, t + j * beat / 2, saw(midi(m), beat * 0.62, 5 + 3 * (st >= 3), beat * 0.5) * (0.13 if calm else 0.16 + 0.04 * (st >= 4)))
        if pos == 0 or k == 0: add(music, t, np.sin(2 * np.pi * midi(r - 24) * tvec(beat * 4.2)) * np.minimum(1, tvec(beat * 4.2) / 0.02) * np.exp(-tvec(beat * 4.2) / (beat * 6)) * 0.17)
        # --- string ostinato: 8ths then 16ths, longer tails so notes overlap; brightness grows with progress
        sub = 2 if (st == 1 or calm) else 4; pat = [m + 12 for m in (r, fifth, oct_, fifth, r + 3, fifth, oct_ + 3, fifth)]
        for j in range(sub):
            n_ = pat[(pos * sub + j) % 8]; K = 3 + int(9 * p) + (4 if st >= 5 else 0)
            add(music, t + j * beat / sub, saw(midi(n_), beat / sub * 1.8, K, beat / sub * 1.0) * ((0.12 if calm else 0.2 * ramp) + 0.06 * (st >= 5)), pan=0.3 * np.sin(gi * 1.7 + j))
        # --- brass stabs on the bar from stage 3, every beat in the drop
        if ((st >= 3 and pos == 0) or st == 5) and not calm:
            for m in (r, r + 3, fifth, oct_): add(music, t, saw(midi(m), beat * 0.7, 12, beat * 0.35, att=0.012) * (0.12 + 0.05 * (st == 5)), pan=-0.15)
        # --- pad: a new chord each bar, overlapping the last one
        if pos == 0: add(music, t, pad([midi(m) for m in (r - 12, r - 9, r - 5)], beat * 4.3, vel=1.0 + 0.7 * p, att=0.2, rel=0.6, bright=1.6))
        # --- filler foley on the grid while the characters work (bricks, hammers, blades, steps)
        if fkind and working(t) and not calm:
            if fkind in ('brick', 'step'): add(fx, t, foley(fkind, 0.5 + 0.2 * (st >= 3)), pan=-0.25)
            elif fkind == 'hammer':
                for j in range(2): add(fx, t + j * beat / 2, foley('hammer', 0.35 + 0.15 * (j == 0)), pan=0.25)
            elif fkind == 'blade':
                if pos in (1, 3): add(fx, t, foley('blade', 0.45), pan=0.2)
            else: add(fx, t + beat / 2, foley(fkind, 0.4), pan=0.3)
    # snare roll over the last 2 bars before the climax, crescendo; a swell lands on the climax itself (no gap)
    roll0 = max([g[0] for g in grid if g[0] < climax][-8:] or [max(0, climax - 2)])
    t = roll0
    while t < climax - 0.02:
        u = (t - roll0) / max(1e-3, climax - roll0); bt = 60 / B1; step = bt / 2 if u < 0.4 else bt / 4 if u < 0.75 else bt / 8
        add(fx, t, snare(0.08 + 0.3 * u ** 1.5)); t += step
    swell(max(0, climax - 1.2), climax, 0.25)
k = 0
for b in (cues['beats'] if MUSIC != 'drive' else []):
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
    h2 = max([h1] + [b for a, b in _rw if a <= h1 + 0.05]) + 0.2; t = tvec(h2 - h0)   # the hook bed runs through the rewind into the story: no gap
    add(music, h0, sum(np.sin(2 * np.pi * midi(root - 12 + d) * t) for d in (0, 7)) * np.minimum(1, t / 0.02) * np.clip((h2 - h0 - t) / 0.25, 0, 1) * 0.13)
    for k in range(int((h2 - h0) / 0.125)): add(fx, h0 + k * 0.125, tick(0.05 + 0.03 * (k % 2)))   # a running pulse under the hook and rewind
    for k in range(1, int((h2 - h0) / 0.5) + 1): add(fx, h0 + 0.1 + k * 0.5, kick(0.4, low=46, dec=0.2))   # four-on-the-floor under the hook: the first seconds hit as hard as the rest
    add(fx, h0 + 0.1, kick(0.5, low=46, dec=0.22)); add(fx, h0 + 0.32, kick(0.35, low=46, dec=0.2))
rw = cues.get('rewind') or []
rw = [rw] if rw and not isinstance(rw[0], list) else rw
for r0, r1 in rw:
    L = tvec(r1 - r0); u = L / max(L[-1], 1e-3)
    add(fx, r0, (np.sin(2 * np.pi * np.cumsum(300 + 2500 * u ** 1.5 + 200 * np.sin(2 * np.pi * 18 * L)) / SR) * 0.12 + onepole(rng.standard_normal(len(L)), 3000) * 0.08) * (0.45 + 0.55 * np.sin(np.pi * u) ** 0.5))   # never fades to silence at the cut
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
wet = 0.12 if MUSIC == 'drive' else {'lofi': 0.18, 'musicbox': 0.4}.get(INST, 0.3)
mix = music + wet * reverb(music) + fx + 0.12 * reverb(fx, 1.5, 2)
if INST == 'lofi' and MUSIC != 'drive':
    cr = (rng.random(N) < 0.0009) * rng.uniform(-0.3, 0.3, N); mix[:, 0] += cr * 0.25; mix[:, 1] += cr * 0.25
    for ch in range(2): mix[:, ch] = onepole(mix[:, ch], 5200)
if cues.get('slow'):   # muffle everything during slow-motion
    cut = np.full(N, 18000.0)
    for s0, s1 in cues['slow']: a, b = int(s0 * SR), min(N, int(s1 * SR)); cut[a:b] = np.minimum(cut[a:b], 900 + 4000 * np.abs(np.linspace(-1, 1, b - a)) ** 2)
    for ch in range(2): mix[:, ch] = onepole(mix[:, ch], cut)
if q is not None:
    g = np.ones(N); a, b = int(max(0, q - 0.3) * SR), int(q * SR); g[a:b] = np.linspace(1, 0.6, b - a); mix *= g[:, None]   # a short dip, never a pause (owner: no pause in the music)
mix = np.tanh(1.4 * mix / (np.max(np.abs(mix)) + 1e-9)) / np.tanh(1.4) * 0.95
fl = int(0.25 * SR); mix[-fl:] *= np.linspace(1, 0, fl)[:, None]
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print(f'audio ok: {MUSIC} / {INST} / {IMPACT} / root {root} / {bpm:.0f} bpm / progression {seed % len(PROGS)}')
