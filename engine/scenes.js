// Visual metaphors. Each scene implements:
//   setup(T) layout · place(i,t) -> {x, top, s, floor} label anchor · draw(c,t) -> place() for all
//   activePose / idlePose / winPose / quitPose (optional) · floorY(t) (optional) · facing 'front'|'right'
//   extent(t) scenery bounds the camera must keep in frame · noBoard / boardMax / steadyCam
// Layout rules: characters are drawn large (K ~1.4) and every floor sits at y <= 1470,
// clear of the YouTube Shorts bottom overlay.
'use strict';
const charsDo = fn => T.chars.map((ch, i) => fn(ch, i));
function fallStart(i, t) { const st = stateAt(i, t); if (st.state !== 'quit' && st.state !== 'fall') return null; if (st.state === 'quit') { const pr = stateAt(i, st.since - 0.001); if (pr.state === 'fall') return pr.since; } return st.since; }
function floorLine(c, y, x0 = -400, x1 = W + 400, a = .22) { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x0, y, x1 - x0, 2); }
const FLOOR_MAX = 1470;

// ---------------------------------------------------------------- towers
SCENES.towers = {
  debris: 'coins', facing: 'front', noBoard: true, K: 1.4, HMAX: 700,
  setup(T) { this.xs = colsX(T.chars.length, 230); },
  cam(t) { let m = 0; for (let k = 0; k < 10; k++) { const tk = Math.max(0, t - k * 0.1); m += Math.max(...T.chars.map((_, i) => this.HMAX * fracAt(i, tk))); } return { z: 1, fy: FLOOR_MAX }; },   // still camera: the towers scene no longer zooms as stacks grow
  floorY(t) { return this.cam(t).fy; },
  place(i, t) { const cam = this.cam(t), h = this.HMAX * fracAt(i, t), y = cam.fy - h * cam.z, s = cam.z * this.K; return { x: 540 + (this.xs[i] - 540) * cam.z, top: y - figH() * s, s, floor: cam.fy, footY: y }; },
  debrisSpan(i, tc) { const p = this.place(i, tc - 0.02); return { x: p.x, y0: p.footY, y1: p.floor, floor: p.floor }; },
  rainTimes() { const out = []; for (const e of T.events) if (e.type === 'rain') for (let ci = 0; ci < T.chars.length; ci++) for (let k = 0; k < (e.count || 9); k++) out.push({ ci, t0: e.t + k * (e.interval || 0.3) + ci * 0.07 }); return out; },
  rainCues() { return this.rainTimes().map(r => { let dt = 0; while (dt < 3) { if (320 + 1500 * dt * dt >= 1560 - this.HMAX * fracAt(r.ci, r.t0 + dt)) break; dt += 1 / 240; } return [r.t0 + dt, r.ci, T.chars.length]; }); },
  draw(c, t) {
    const cam = this.cam(t);
    c.save(); c.translate(540, cam.fy); c.scale(cam.z, cam.z); c.translate(-540, -1560);
    floorLine(c, 1560);
    charsDo((ch, i) => {
      const h = this.HMAX * fracAt(i, t), a = alphaAt(i, t), shake = T.events.some(e => e.type === 'shake' && e.i === i && t > e.t && t < e.t + 1.8) ? 2.5 * Math.sin(t * 60) : 0;
      const cw = 120, step = 15, n = Math.ceil(h / step), r2 = rng(i * 97 + 3);
      c.save(); c.globalAlpha = a;
      for (let k = 0; k < n; k++) { const off = (r2() - .5) * 7 + shake, top = Math.max(1560 - h, 1560 - (k + 1) * step + 3), bot = 1560 - k * step, hh = bot - top; if (hh <= .5) continue; c.beginPath(); c.roundRect(this.xs[i] - cw / 2 + off, top, cw, hh, Math.min(6, hh / 2)); c.fillStyle = ch.color + '30'; c.fill(); c.strokeStyle = ch.color; c.lineWidth = 2; c.stroke(); }
      c.restore();
    });
    for (const r of this.rainTimes()) { const dt = t - r.t0; if (dt < 0) continue; const y = 320 + 1500 * dt * dt; if (y < 1560 - this.HMAX * fracAt(r.ci, t)) flyingCoin(c, T.chars[r.ci].color, this.xs[r.ci], y, dt * 9 + r.ci, 1); }
    c.restore();
    return charsDo((ch, i) => { const p = this.place(i, t); drawChar(c, i, t, tt => ({ mode: 'feet', x: p.x, y: this.place(i, tt).footY }), { s: p.s, speed: speedFx(i, t, 0.35, 0.8) }); return p; });
  },
};

// ---------------------------------------------------------------- race (leader on the top lane)
function runPose(ph) {
  const leg = p => { const th = 0.85 * Math.sin(p); return [th, th - 0.3 - 1.35 * Math.max(0, Math.cos(p))]; };
  const arm = p => { const u = -1.05 * Math.sin(p); return [u, u + 1.6]; };
  return { la: arm(ph + Math.PI), ra: arm(ph), ll: leg(ph), rl: leg(ph + Math.PI), lean: 0.3, drop: -0.1 };
}
SCENES.race = {
  facing: 'right', sideLabels: true,
  setup(T) {
    const n = T.chars.length; this.gap = Math.min(380, 1100 / n); this.s = clamp((this.gap - 120) / 165, 0.85, 1.5);
    this.y0 = 1440 - (n - 1) * this.gap; this.x0 = 120; this.x1 = 800;
    const fin = T.beats[T.beats.length - 1].to; this.lane = []; T.chars.map((_, i) => i).sort((a, b) => fin[b] - fin[a]).forEach((ci, k) => { this.lane[ci] = k; });
  },
  laneY(i) { return this.y0 + this.lane[i] * this.gap; },
  extent() { return { x0: this.x0 - 50, x1: this.x1 + 90, y0: this.y0 - figH() * this.s - 90, y1: this.y0 + (T.chars.length - 1) * this.gap + 60 }; },
  xAt(i, t) { return this.x0 + fracAt(i, t) * (this.x1 - this.x0); },
  place(i, t) { const y = this.laneY(i); return { x: this.xAt(i, t), top: y - figH() * this.s, s: this.s, floor: y, footY: y }; },
  activePose(i, t) { return blendPose(POSES.stand, runPose(this.xAt(i, t) / (15 * this.s)), moving(i, t, 0.003, 0.03)); },
  draw(c, t) {
    const yTop = this.y0 - figH() * this.s - 20, yBot = this.y0 + (T.chars.length - 1) * this.gap, fx = this.x1 - 80;   // the winner ends past the line
    c.save(); c.setLineDash([14, 12]); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 3; c.beginPath(); c.moveTo(fx, yTop); c.lineTo(fx, yBot + 4); c.stroke(); c.restore();
    spaced(c, 'FINISH', fx - 110, yTop - 22, '800 44px Inter', '#dfe4e9', 3, 0.9); if (T.__vlines) T.__vlines.push({ x: fx, y0: yTop, y1: yBot + 4 });
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(this.x0 - 30, yTop, 2, yBot - yTop);
    return charsDo((ch, i) => { const y = this.laneY(i); floorLine(c, y, -200, W + 200, 0.16); const p = this.place(i, t); drawChar(c, i, t, tt => ({ mode: 'feet', x: this.xAt(i, tt), y }), { s: this.s, speed: speedFx(i, t, 0.12, 0.35), sweat: speedFx(i, t, 0.08, 0.2) }); return p; });
  },
};

// ---------------------------------------------------------------- climb
function climbPose(ph) { const s = Math.sin(ph); return { la: [-2.95 + 0.75 * Math.max(0, s), -3.05 + 0.5 * Math.max(0, s)], ra: [2.95 - 0.75 * Math.max(0, -s), 3.05 - 0.5 * Math.max(0, -s)], ll: [0.9 + 0.5 * s, -0.35], rl: [0.4 - 0.5 * s, -0.7], lean: 0.05, drop: -0.35 }; }
SCENES.climb = {
  facing: 'front', boardMax: 3, upperBodyFree: false, steadyCam: true, K: 1.35,
  freeUpper(i, t) { return this.hip(i, t) > this.stand - 8; },
  setup(T) { this.xs = colsX(T.chars.length, 380, 1300); this.BAR = T.style.labels === 'board' ? 660 : 560; this.F = FLOOR_MAX; this.stand = this.F - 72.5 * this.K; this.high = this.BAR + 115 * this.K; },
  floorY() { return this.F; },
  extent() { return { x0: this.xs[0] - 130, x1: this.xs[this.xs.length - 1] + 130, y0: this.BAR - 40, y1: this.F + 12 }; },
  hipAt(i, t) { return lerp(this.stand, this.high, fracAt(i, t)); },
  hip(i, t) { const since = fallStart(i, t); if (since != null) { const y0 = this.hipAt(i, since), u = clamp((t - since) / 0.6); return lerp(y0, this.F - 14 * this.K, u * u); } return this.hipAt(i, t); },
  place(i, t) { const y = this.hip(i, t); return { x: this.xs[i], top: y - (105 + figH() - 160) * this.K, s: this.K, floor: this.F }; },
  activePose(i, t) { const y = this.hip(i, t); return blendPose(POSES.stand, climbPose(y / (11 * this.K) + t * 3.2 * energyAt(t)), ss(this.stand - 5, this.stand - 45, y)); },
  draw(c, t) {
    const x0 = this.xs[0] - 125, x1 = this.xs[this.xs.length - 1] + 125;
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(x0, this.BAR - 3, x1 - x0, 6); floorLine(c, this.F); if (T.__lines) T.__lines.push({ y: this.BAR, x0, x1 });
    charsDo((ch, i) => {
      const x = this.xs[i];
      c.strokeStyle = 'rgba(214,180,130,0.55)'; c.lineWidth = 6; c.beginPath(); c.moveTo(x, this.BAR); c.lineTo(x, this.F - 4); c.stroke();
      c.strokeStyle = 'rgba(255,230,190,0.35)'; c.lineWidth = 2; c.beginPath(); for (let y = this.BAR + 6; y < this.F - 8; y += 14) { c.moveTo(x - 3, y); c.lineTo(x + 3, y + 6); } c.stroke();
      c.strokeStyle = fracAt(i, t) > 0.985 ? GOLD : 'rgba(255,255,255,0.35)'; c.lineWidth = 3; c.beginPath(); c.arc(x, this.BAR - 22, 13, 0, 7); c.stroke();
    });
    return charsDo((ch, i) => { drawChar(c, i, t, tt => ({ mode: 'hip', x: this.xs[i] - 6 * this.K, y: this.hip(i, tt) }), { s: this.K, speed: speedFx(i, t, 0.12, 0.4), sweat: speedFx(i, t, 0.06, 0.2) }); return this.place(i, t); });
  },
};

// ---------------------------------------------------------------- pullup
const HANG = { la: [-2.75, -2.85], ra: [2.75, 2.85], ll: [-0.06, 0.12], rl: [0.06, 0.18], lean: 0, drop: -0.2 };
const PULL = { la: [-1.15, -2.65], ra: [1.15, 2.65], ll: [-0.75, 0.55], rl: [0.75, -0.55], lean: 0, drop: -0.4 };
SCENES.pullup = {
  facing: 'front', upperBodyFree: false, K: 1.35,
  setup(T) { this.xs = colsX(T.chars.length, 360, 1250); this.BAR = 720; this.F = FLOOR_MAX; },
  floorY() { return this.F; },
  extent() { return { x0: this.xs[0] - 150, x1: this.xs[this.xs.length - 1] + 150, y0: this.BAR - 10, y1: this.F + 12 }; },
  dropped(i, t) { const since = fallStart(i, t); return since == null ? null : clamp((t - since) / 0.55); },
  place(i, t) { const d = this.dropped(i, t), hx = figH() - 160, K = this.K; if (d == null) return { x: this.xs[i], top: this.BAR - (78 + hx) * K, s: K, floor: this.F }; const feet = lerp(this.BAR + (180 + hx) * K, this.F, d * d); return { x: this.xs[i], top: lerp(this.BAR - (78 + hx) * K, feet - (150 + hx) * K, d), s: K, floor: this.F, feet }; },
  activePose(i, t) { const p = 0.5 - 0.5 * Math.cos(2 * Math.PI * phaseInt(i, t, 5, 0.6, 2.6)); return blendPose(HANG, blendPose(HANG, PULL, p), Math.max(moving(i, t, 0.001, 0.01), 0.85 * energyAt(t))); },
  idlePose() { return HANG; },
  winPose() { return PULL; },
  draw(c, t) {
    const x0 = this.xs[0] - 145, x1 = this.xs[this.xs.length - 1] + 145;
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(x0, this.BAR - 3, x1 - x0, 7); if (T.__lines) T.__lines.push({ y: this.BAR, x0, x1 });
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x0, this.BAR, 5, this.F - this.BAR); c.fillRect(x1 - 5, this.BAR, 5, this.F - this.BAR); floorLine(c, this.F);
    return charsDo((ch, i) => {
      const p = this.place(i, t), anchor = tt => { const d = this.dropped(i, tt), pp = this.place(i, tt); return d == null ? { mode: 'hands', x: this.xs[i], y: this.BAR } : { mode: 'feet', x: this.xs[i], y: pp.feet }; };
      drawChar(c, i, t, anchor, { s: this.K, sweat: speedFx(i, t, 0.05, 0.15) }); return p;
    });
  },
};

// ---------------------------------------------------------------- lift (front view: barbell and plates scale with the character)
const LIFT_DOWN = { la: [-0.16, -0.02], ra: [0.16, 0.02], ll: [-0.95, 0.3], rl: [0.95, -0.3], lean: 0, drop: 0.25 };
const LIFT_UP = { la: [-0.16, -0.06], ra: [0.16, 0.06], ll: [-0.12, -0.04], rl: [0.12, 0.04], lean: 0, drop: -0.1 };
const LIFT_RACK = { la: [-0.5, -2.7], ra: [0.5, 2.7], ll: [-0.2, -0.1], rl: [0.2, 0.1], lean: 0, drop: -0.35 };   // winner: bar held at chest, hands on the bar (an overhead bar would cross the big heads)
SCENES.lift = {
  facing: 'front', upperBodyFree: false,   // hands stay on the bar: reactions and fidgets use the legs
  setup(T) { const n = T.chars.length; this.sp = Math.min(300, 920 / n); this.xs = colsX(n, 300); this.s = clamp(this.sp / 165, 0.9, 1.8); this.F = 1450; },
  floorY() { return this.F; },
  extent() { const h = 90 * this.s; return { x0: this.xs[0] - h, x1: this.xs[this.xs.length - 1] + h, y0: this.F - 300 * this.s, y1: this.F + 12 }; },
  place(i, t) { return { x: this.xs[i], top: this.F - (figH() + 18) * this.s, s: this.s, floor: this.F }; },
  activePose(i, t) { const p = 0.5 - 0.5 * Math.cos(2 * Math.PI * phaseInt(i, t, 3.2, 0.45, 1.6)); return blendPose(LIFT_UP, blendPose(LIFT_DOWN, LIFT_UP, p), Math.max(moving(i, t), 0.8 * energyAt(t))); },
  idlePose() { return LIFT_UP; },
  winPose() { return LIFT_RACK; },
  plates(i, t) { const f = clamp(value(i, t) / T.maxV), n = Math.round(f * 4), out = []; for (let k = 0; k < n; k++) out.push([1, 0.92, 0.8, 0.68, 0.52, 0.42][k]); return out; },
  draw(c, t) {
    floorLine(c, this.F);
    return charsDo((ch, i) => {
      const s = this.s, a = alphaAt(i, t), st = stateAt(i, t).state, down = st === 'quit' || st === 'fall';
      const J = drawChar(c, i, t, () => ({ mode: 'feet', x: this.xs[i], y: this.F }), { s, sweat: moving(i, t) * clamp(value(i, t) / T.maxV) });
      const plates = this.plates(i, t), PR = 30 * s, sleeve = 6 * s, collar = 26 * s;
      const half = collar + Math.max(3, plates.length) * sleeve + 6 * s, big = plates.length ? plates[0] * PR : 0.4 * PR;
      let cx = (J.lhand[0] + J.rhand[0]) / 2, by = (J.lhand[1] + J.rhand[1]) / 2;
      if (down) { cx = this.xs[i] + 8 * s; by = this.F - big; } else by = Math.min(by, this.F - big);
      if (T.__props && !down) T.__props.push({ i, x0: cx - half, y0: by, x1: cx + half, y1: by, held: true });
      if (T.__joints && T.__joints[i]) T.__joints[i].minY = Math.min(T.__joints[i].minY, by - big - 6 * s);
      c.save(); c.globalAlpha = a; c.lineCap = 'round';
      c.strokeStyle = '#d7dde4'; c.lineWidth = 5 * s; c.beginPath(); c.moveTo(cx - half, by); c.lineTo(cx + half, by); c.stroke();
      for (const side of [-1, 1]) {
        c.fillStyle = '#d7dde4'; c.fillRect(cx + side * collar - 3 * s, by - 9 * s, 6 * s, 18 * s);
        plates.forEach((rr, k) => { const px = cx + side * (collar + 6 * s + k * sleeve), h = rr * PR; c.fillStyle = ch.color + '55'; c.strokeStyle = ch.color; c.lineWidth = 2.5 * s; c.beginPath(); c.roundRect(px - 3 * s, by - h, 6 * s, 2 * h, 3 * s); c.fill(); c.stroke(); });
      }
      c.restore();
      return this.place(i, t);
    });
  },
};

// ---------------------------------------------------------------- dig
const DIG_UP = { la: [-2.6, -2.95], ra: [-2.35, -2.8], ll: [-0.3, -0.1], rl: [0.35, 0.15], lean: -0.12, drop: -0.2 };
const DIG_DOWN = { la: [1.2, 0.7], ra: [1.0, 0.55], ll: [-0.3, -0.1], rl: [0.35, 0.15], lean: 0.45, drop: 0.3 };
const ROCKS = (() => { const r = rng(21); return [...Array(160)].map(() => ({ x: -500 + r() * (W + 1000), y: 600 + r() * 1600, s: 6 + r() * 16, k: r(), gem: r() < 0.12 })); })();
SCENES.dig = {
  facing: 'right', K: 1.35,
  setup(T) { this.xs = colsX(T.chars.length, 270); this.G = T.style.labels === 'board' ? 740 : 600; this.D = 1400 - this.G; this.HW = 70 * this.K; },
  foot(i, t) { return this.G + fracAt(i, t) * this.D; },
  extent(t) { return { x0: this.xs[0] - this.HW - 10, x1: this.xs[this.xs.length - 1] + this.HW + 10, y0: this.G - 40, y1: Math.max(...T.chars.map((_, i) => this.foot(i, t))) + 70 }; },
  place(i, t) { const y = this.foot(i, t); return { x: this.xs[i], top: y - figH() * this.K, s: this.K, floor: y }; },
  cyc(i, t) { const u = ((phaseInt(i, t, 6, 0.7, 2) + i * 0.37) % 1 + 1) % 1; return u < 0.68 ? ss(0, 0.68, u) : 1 - ss(0.68, 0.82, u); },
  activePose(i, t) { return blendPose(POSES.stand, blendPose(DIG_DOWN, DIG_UP, this.cyc(i, t)), Math.max(moving(i, t), 0.8 * energyAt(t))); },
  draw(c, t) {
    const K = this.K;
    c.fillStyle = 'rgba(70,58,48,0.22)'; c.fillRect(-3000, this.G, W + 6000, 6000);   // earth fills the frame at any zoom
    for (const k of ROCKS) { c.strokeStyle = k.gem ? 'rgba(110,200,255,0.35)' : 'rgba(255,255,255,0.08)'; c.lineWidth = 2; c.beginPath(); for (let j = 0; j < 6; j++) { const an = j / 6 * 6.28 + k.k * 3, rr = k.s * (0.7 + 0.3 * Math.sin(j * 2.3 + k.k * 9)); const px = k.x + Math.cos(an) * rr, py = k.y + Math.sin(an) * rr * (k.gem ? 1.4 : 0.8); j ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.stroke(); }
    floorLine(c, this.G, -3000, W + 3000, 0.35); if (T.__lines) T.__lines.push({ y: this.G, x0: -3000, x1: W + 3000 });
    const goalY = this.G + this.D + 34;
    charsDo((ch, i) => {
      const x = this.xs[i], d = this.foot(i, t) - this.G, rr = rng(i * 31 + 7), hw = this.HW;
      c.fillStyle = '#08090b'; c.fillRect(x - hw, this.G + 1, 2 * hw, d); c.strokeStyle = ch.color + '55'; c.lineWidth = 2;
      for (const side of [-1, 1]) { c.beginPath(); c.moveTo(x + side * hw, this.G); for (let y = this.G; y < this.G + d; y += 22) c.lineTo(x + side * (hw + (rr() - .5) * 10), y); c.lineTo(x + side * hw, this.G + d); c.stroke(); }
      const reached = fracAt(i, t) > 0.985; c.save(); c.globalAlpha = reached ? 1 : 0.35; c.strokeStyle = GOLD; c.fillStyle = reached ? 'rgba(255,197,61,0.35)' : 'rgba(255,197,61,0.06)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x, goalY - 26); c.lineTo(x + 26, goalY); c.lineTo(x, goalY + 30); c.lineTo(x - 26, goalY); c.closePath(); c.fill(); c.stroke(); c.restore();
    });
    return charsDo((ch, i) => {
      const y = this.foot(i, t), a = alphaAt(i, t), st = stateAt(i, t).state, mv = moving(i, t);
      const J = drawChar(c, i, t, tt => ({ mode: 'feet', x: this.xs[i] - 14 * K, y: this.foot(i, tt) }), { s: K, sweat: mv * 0.8 });
      if (st === 'active' || st === 'idle') {
        const dx = J.rhand[0] - J.relbow[0], dy = J.rhand[1] - J.relbow[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, ex = J.rhand[0] + ux * 40 * K, ey = J.rhand[1] + uy * 40 * K;
        c.save(); c.globalAlpha = a; c.strokeStyle = '#cfd6dd'; c.lineWidth = 4 * K; c.lineCap = 'round';
        c.beginPath(); c.moveTo(J.rhand[0] - ux * 8 * K, J.rhand[1] - uy * 8 * K); c.lineTo(ex, ey); c.stroke();
        const hx = 20 * K, hb = 6 * K; c.beginPath(); c.moveTo(ex - uy * hx - ux * hb, ey + ux * hx - uy * hb); c.quadraticCurveTo(ex + ux * hb, ey + uy * hb, ex + uy * hx - ux * hb, ey - ux * hx - uy * hb); c.stroke(); c.restore();
        if (mv > 0.3 && this.cyc(i, t) < 0.25) { const r3 = rng(Math.floor(t * 7) + i * 100); for (let q = 0; q < 6; q++) { c.globalAlpha = 0.8 * a; c.fillStyle = '#b9a58f'; c.beginPath(); c.arc(this.xs[i] + 20 * K + r3() * 70 * K, y - 4 - r3() * 40 * K, (2.5 + r3() * 2) * K, 0, 7); c.fill(); } c.globalAlpha = 1; }
      }
      return this.place(i, t);
    });
  },
};

// ---------------------------------------------------------------- bricks ("Pick Your Pain")
// Each character lays bricks and rises on their own wall. props: pack (backpack size 0..1.6, the pain of
// discipline) and regret (0..1, a boulder that hangs from the beam above their head and grows).
// A crash on someone with regret > 0.3 is the boulder dropping; a shake drops a small rock.
const BRICK_DOWN = { la: [-0.45, 0.35], ra: [0.45, -0.35], ll: [-0.75, 0.5], rl: [0.75, -0.5], lean: 0, drop: 0.35 };
const BRICK_UP = { la: [-1.55, -2.65], ra: [1.55, 2.65], ll: [-0.14, -0.08], rl: [0.14, 0.08], lean: 0, drop: -0.25 };
const PINNED = { la: [-2.35, -2.95], ra: [2.35, 2.95], ll: [-0.55, 0.3], rl: [0.55, -0.3], lean: 0, drop: 0.25 };   // holding the regret boulder up
SCENES.bricks = {
  facing: 'front', debris: 'bricks', foley: 'brick', K: 1.3, HMAX: 560,
  setup(T) { this.xs = colsX(T.chars.length, 235, 920); this.F = FLOOR_MAX; this.BEAM = this.F - this.HMAX - figH() * this.K - 175; },
  floorY() { return this.F; },
  h(i, t) { return this.HMAX * fracAt(i, t); },
  extent() { return { x0: this.xs[0] - 110, x1: this.xs[this.xs.length - 1] + 110, y0: this.BEAM - 30, y1: this.F + 12 }; },
  place(i, t) { const y = this.F - this.h(i, t); return { x: this.xs[i], top: y - figH() * this.K, s: this.K, floor: this.F, footY: y }; },
  debrisSpan(i, tc) { const h = this.h(i, tc - 0.02); if (h < 30) return null; return { x: this.xs[i], y0: this.F - h, y1: this.F, floor: this.F }; },
  cyc(i, t) { const u = ((phaseInt(i, t, 7, 0.55, 2.2) + i * 0.31) % 1 + 1) % 1; return 0.5 - 0.5 * Math.cos(2 * Math.PI * u); },
  activePose(i, t) { const pk = propAt(i, 'pack', t), w = Math.max(moving(i, t, 0.001, 0.01), 0.75 * energyAt(t)); const p = blendPose(POSES.stand, blendPose(BRICK_DOWN, BRICK_UP, this.cyc(i, t)), w); return { ...p, lean: p.lean + 0.1 * Math.max(0, pk - 0.9) * Math.sin(t * 3.1 + i) }; },
  idlePose(i, t) { return POSES.stand; },
  poseOverride(i, t, p) { const d = this.drop(i); if (!d || d.type !== 'crash' || t < d.t - 0.25) return p; const k = Math.sin(t * 23 + i) * 0.04; const q = blendPose(p, PINNED, ss(d.t - 0.25, d.t + 0.05, t)); return { ...q, lean: q.lean + k }; },
  noSpin(i, t) { const d = this.drop(i); return !!d && d.type === 'crash'; },
  drop(i) { return T.events.find(e => (e.type === 'crash' || e.type === 'shake') && e.i === i && propAt(i, 'regret', e.t - 0.05) > 0.08); },
  boulder(i, t) {   // where the regret boulder is: hanging, falling or landed
    const dd = this.drop(i), rg0 = propAt(i, 'regret', t), r = dd && dd.type === 'shake' ? 20 + 36 * rg0 : 22 + 66 * rg0, x = this.xs[i], p = this.place(i, t), labelRoom = 200;
    const hangY = Math.min(this.BEAM + 95 + r, p.top - labelRoom - r), d = this.drop(i);
    if (!d || t < d.t - 0.34) return { x, y: hangY, r, rope: true };
    const small = d.type === 'shake', J = T.__joints[i], handsY = J ? Math.min(J.hands[0][1], J.hands[1][1]) : p.top, ground = small ? p.footY - r : handsY - r * 0.8, u = clamp((t - (d.t - 0.34)) / 0.34), y = lerp(hangY, ground, u * u);
    return { x: small ? x + 70 - r * 0.7 : x, y: Math.min(y, ground), r, rope: false, landed: u >= 1 };
  },
  draw(c, t) {
    const K = this.K, BW = 128, BH = 20;
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(this.xs[0] - 120, this.BEAM - 4, this.xs[this.xs.length - 1] - this.xs[0] + 240, 8);   // the beam
    if (T.__lines) T.__lines.push({ y: this.BEAM, x0: this.xs[0] - 120, x1: this.xs[this.xs.length - 1] + 120 });
    floorLine(c, this.F);
    charsDo((ch, i) => {   // brick walls
      const h = this.h(i, t), n = Math.ceil(h / BH), a = alphaAt(i, t), x = this.xs[i];
      c.save(); c.globalAlpha = a;
      for (let k = 0; k < n; k++) { const top = Math.max(this.F - h, this.F - (k + 1) * BH), bot = this.F - k * BH, hh = bot - top; if (hh < 1) continue; const off = (k % 2) * BW / 4;
        for (let j = -1; j < 2; j++) { const bx0 = Math.max(x - BW / 2, x - BW / 2 + off + j * BW / 2), bx1 = Math.min(x + BW / 2, x - BW / 2 + off + (j + 1) * BW / 2); if (bx1 - bx0 < 2) continue; c.fillStyle = ch.color + '2e'; c.strokeStyle = ch.color + 'c0'; c.lineWidth = 2; c.beginPath(); c.roundRect(bx0 + 1.5, top + 1.5, bx1 - bx0 - 3, hh - 3, 3); c.fill(); c.stroke(); } }
      c.restore();
    });
    return charsDo((ch, i) => {
      const p = this.place(i, t), a = alphaAt(i, t), st = stateAt(i, t).state, pk = propAt(i, 'pack', t);
      const J = drawChar(c, i, t, tt => ({ mode: 'feet', x: this.xs[i], y: this.place(i, tt).footY }), { s: K, sweat: moving(i, t) * clamp(pk) });
      if (pk > 0.05 && st !== 'fall') {   // backpack behind the body, straps in front
        const j = T.__joints[i], nx = j.neck[0], ny = j.neck[1], hx = j.hip[0], hy = j.hip[1], w = (22 + 20 * pk) * K, hgt = (40 + 30 * pk) * K;
        c.save(); c.globalAlpha = a; c.globalCompositeOperation = 'destination-over'; c.fillStyle = ch.color; c.strokeStyle = mixWhite(ch.color, 0.5); c.lineWidth = 3;
        c.beginPath(); c.roundRect((nx + hx) / 2 - w, ny - 6 * K, 2 * w, hgt, 12 * K); c.fill(); c.stroke(); c.restore();
        c.save(); c.globalAlpha = a; c.strokeStyle = INK; c.lineWidth = 4 * K; c.beginPath(); c.moveTo(nx - 12 * K, ny + 2 * K); c.lineTo(hx - 8 * K, hy - 6 * K); c.moveTo(nx + 12 * K, ny + 2 * K); c.lineTo(hx + 8 * K, hy - 6 * K); c.stroke(); c.restore();
      }
      if (st === 'active' && moving(i, t) > 0.2) { const mx = (J.lhand[0] + J.rhand[0]) / 2, my = (J.lhand[1] + J.rhand[1]) / 2; c.save(); c.globalAlpha = a; c.fillStyle = ch.color + '55'; c.strokeStyle = ch.color; c.lineWidth = 2.5; c.beginPath(); c.roundRect(mx - 26, my - 9, 52, 18, 3); c.fill(); c.stroke(); c.restore(); }
      const rg = propAt(i, 'regret', t);
      if (rg > 0.02) {   // the regret boulder
        const b = this.boulder(i, t), rr = rng(i * 13 + 5);
        c.save();
        if (b.rope) { c.strokeStyle = 'rgba(214,180,130,0.8)'; c.lineWidth = 4; c.beginPath(); c.moveTo(b.x, this.BEAM); c.lineTo(b.x, b.y - b.r * 0.9); c.stroke();
          c.font = '800 38px Inter'; c.letterSpacing = '2px'; const sw = c.measureText('REGRET').width + 22, sy = this.BEAM + 44; c.fillStyle = 'rgba(12,14,18,0.95)'; c.strokeStyle = '#8b929c'; c.lineWidth = 3; c.beginPath(); c.roundRect(b.x - sw / 2, sy - 30, sw, 44, 8); c.fill(); c.stroke(); c.letterSpacing = '0px';
          spaced(c, 'REGRET', b.x, sy + 4, '800 38px Inter', '#d5dbe2', 2, 1, 0, false, false); }
        c.fillStyle = '#2a2d33'; c.strokeStyle = '#8b929c'; c.lineWidth = 4; c.beginPath();
        for (let k = 0; k < 11; k++) { const an = k / 11 * 6.283, q = b.r * (0.86 + 0.18 * rr()); k ? c.lineTo(b.x + Math.cos(an) * q, b.y + Math.sin(an) * q * 0.92) : c.moveTo(b.x + Math.cos(an) * q, b.y + Math.sin(an) * q * 0.92); }
        c.closePath(); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 3; c.beginPath(); c.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 3.6, 5.2); c.stroke();
        if (b.landed && T.__joints && T.__joints[i]) T.__joints[i].minY = Math.min(T.__joints[i].minY, b.y - b.r);   // labels go above a landed rock
        c.restore();
      }
      return p;
    });
  },
};

// ---------------------------------------------------------------- buckets ("Luck Needs A Bucket")
// value = how much container each character has built (0 = nothing). props: gold (fill, 0..1.4 of the
// container; above 1 it overflows), sky (on character 0: gold clouds gathering). A 'rain' event drops
// coins on everyone equally; containers catch them, empty hands don't.
const HAM_UP = { la: [-0.9, 1.5], ra: [2.3, 2.9], ll: [-0.18, -0.1], rl: [0.18, 0.1], lean: 0.05, drop: -0.1 };
const HAM_DOWN = { la: [-0.9, 1.5], ra: [1.25, 1.75], ll: [-0.22, -0.12], rl: [0.22, 0.12], lean: 0.1, drop: 0.1 };
SCENES.buckets = {
  facing: 'front', foley: 'hammer', K: 1.7, labelRoom: 250, debris: 'planks',
  setup(T) { this.xs = colsX(T.chars.length, 240, 940); this.F = FLOOR_MAX; this.SKY = this.F - 790; this.kS = this.K / 1.35; },
  debrisSpan(i, tc) { const d = this.dims(i, tc - 0.02); if (d.h < 20) return null; return { x: this.bx(i), y0: this.F - d.h, y1: this.F, floor: this.F }; },
  floorY() { return this.F; },
  cx(i) { return this.xs[i] - 52; }, bx(i) { return this.xs[i] + 50; },
  dims(i, t) { const f = clamp(value(i, t) / T.maxV), k = this.kS; return { f, h: f > 0.01 ? (28 + 150 * f) * k : 0, w: f > 0.01 ? (50 + 100 * f) * k : 0 }; },
  extent() { return { x0: this.xs[0] - 120, x1: this.xs[this.xs.length - 1] + 120, y0: this.SKY - 60, y1: this.F + 12 }; },
  place(i, t) { return { x: this.cx(i), top: this.F - figH() * this.K, s: this.K, floor: this.F }; },
  labelTop(i, top, t) { const d = this.dims(i, t); return Math.min(top, this.F - d.h - 30); },
  cyc(i, t) { const u = ((phaseInt(i, t, 9, 0.7, 2.6) + i * 0.29) % 1 + 1) % 1; return u < 0.6 ? ss(0, 0.6, u) : 1 - ss(0.6, 0.75, u); },
  activePose(i, t) { return blendPose(POSES.stand, blendPose(HAM_UP, HAM_DOWN, this.cyc(i, t)), Math.max(moving(i, t, 0.001, 0.01), 0.7 * energyAt(t))); },
  idlePose(i, t) { return POSES.stand; },
  winPose(i, t) { const k = Math.sin(t * 7 + i); return { la: [-2.05 + 0.15 * k, -2.35], ra: [2.05 - 0.15 * k, 2.35], ll: [-0.25, -0.1], rl: [0.25, 0.1], lean: 0, drop: -0.3 }; },
  rainTimes() { const out = []; for (const e of T.events) if (e.type === 'rain') for (let ci = 0; ci < T.chars.length; ci++) for (let k = 0; k < (e.count || 14); k++) out.push({ ci, t0: e.t + k * (e.interval || 0.16) + ((ci * 7 + k * 3) % 5) * 0.03, dx: ((k * 37 + ci * 11) % 9 - 4) * 9 }); return out; },
  coinY(r, t) { const dt = t - r.t0; return this.SKY + 40 + 1700 * dt * dt; },
  landY(r, t) { const d = this.dims(r.ci, t); return d.h > 0 ? this.F - d.h + 6 : this.F - 12; },
  rainCues() { return this.rainTimes().map(r => { let dt = 0; while (dt < 2) { if (this.coinY(r, r.t0 + dt) >= this.landY(r, r.t0 + dt)) break; dt += 1 / 240; } return [r.t0 + dt, r.ci, T.chars.length]; }); },
  draw(c, t) {
    const K = this.K, sky = propAt(0, 'sky', t);
    floorLine(c, this.F);
    if (sky > 0.01) {   // gold clouds of opportunity
      c.save(); c.globalAlpha = sky;
      for (let k = 0; k < 7; k++) { const x = this.xs[0] - 120 + k * (this.xs[this.xs.length - 1] - this.xs[0] + 240) / 6, y = this.SKY + 10 * Math.sin(t * 1.3 + k); const g = c.createRadialGradient(x, y, 10, x, y, 120); g.addColorStop(0, 'rgba(255,214,110,0.55)'); g.addColorStop(1, 'rgba(255,214,110,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, 140, 46, 0, 0, 7); c.fill(); }
      if (sky > 0.6) spaced(c, 'OPPORTUNITY', 540, this.SKY - 4, '800 50px Inter', '#fff1c9', 8, (sky - 0.6) / 0.4, 0, false, false);
      c.restore();
    }
    const rains = this.rainTimes();
    charsDo((ch, i) => {   // containers
      const d = this.dims(i, t), a = alphaAt(i, t), x = this.bx(i), gold = propAt(i, 'gold', t);
      if (d.h <= 0) return;
      const top = this.F - d.h, wt = d.w / 2, wb = d.w * 0.4;
      c.save(); c.globalAlpha = a;
      if (gold > 0.01) {   // gold inside
        const lvl = Math.min(1, gold), gy = this.F - d.h * lvl + 4, ww = lerp(wb, wt, lvl);
        const g = c.createLinearGradient(0, Math.max(gy, top), 0, this.F); g.addColorStop(0, 'rgba(255,212,90,0.95)'); g.addColorStop(1, 'rgba(210,150,40,0.85)');
        c.fillStyle = g; c.beginPath(); c.moveTo(x - ww, gy); c.lineTo(x + ww, gy); c.lineTo(x + wb, this.F - 3); c.lineTo(x - wb, this.F - 3); c.closePath(); c.fill();
        if (gold > 1) { c.shadowColor = GOLD; c.shadowBlur = 30 * Math.min(1, gold - 1); c.beginPath(); c.ellipse(x, top + 2, wt * 1.05, 14 + 30 * (gold - 1), 0, Math.PI, 2 * Math.PI); c.fill(); c.shadowBlur = 0; }
      }
      c.strokeStyle = ch.color; c.fillStyle = ch.color + '22'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(x - wt, top); c.lineTo(x + wt, top); c.lineTo(x + wb, this.F - 2); c.lineTo(x - wb, this.F - 2); c.closePath(); c.fill(); c.stroke();
      c.lineWidth = 4; c.strokeStyle = ch.color; c.beginPath(); c.ellipse(x, top, wt, Math.max(6, wt * 0.16), 0, 0, 2 * Math.PI); c.stroke();   // rim
      c.lineWidth = 3.5; c.beginPath(); c.ellipse(x, top - 2, wt * 0.92, wt * 0.62, 0, Math.PI * 1.04, Math.PI * 1.96); c.stroke();   // handle
      c.lineWidth = 2; c.strokeStyle = ch.color + '99';
      for (let k = 1; k < 4; k++) { const u = k / 4; c.beginPath(); c.moveTo(lerp(x - wt, x - wb, u), lerp(top, this.F, u)); c.lineTo(lerp(x + wt, x + wb, u), lerp(top, this.F, u)); c.stroke(); }   // hoops
      c.restore();
    });
    for (const r of rains) {   // falling coins: caught by containers, bouncing off empty hands
      const dt = t - r.t0; if (dt < 0) continue; const x = this.bx(r.ci) + r.dx * (this.dims(r.ci, t).h > 0 ? 0.6 : 1) - (this.dims(r.ci, t).h > 0 ? 0 : 60), y = this.coinY(r, t), land = this.landY(r, t);
      if (y < land) flyingCoin(c, GOLD, x, y, dt * 11 + r.ci, 1, 2.6);
      else if (this.dims(r.ci, t).h <= 0) { const bt = dt - Math.sqrt((land - this.SKY - 40) / 1700); if (bt < 0.6) flyingCoin(c, GOLD, x + 90 * bt, land - 160 * bt + 400 * bt * bt, 1.57, 1 - ss(0.3, 0.6, bt), 2.6); }
    }
    return charsDo((ch, i) => {
      const p = this.place(i, t), a = alphaAt(i, t), st = stateAt(i, t).state;
      if (st === 'sit') {   // deck chair
        c.save(); c.globalAlpha = a; c.strokeStyle = '#c9b48f'; c.lineWidth = 6; c.lineCap = 'round'; const x = this.cx(i);
        const k = this.kS; c.beginPath(); c.moveTo(x - 50 * k, this.F); c.lineTo(x + 30 * k, this.F - 95 * k); c.moveTo(x + 40 * k, this.F); c.lineTo(x - 30 * k, this.F - 60 * k); c.moveTo(x - 40 * k, this.F - 62 * k); c.lineTo(x + 35 * k, this.F - 60 * k); c.stroke(); c.restore();
      }
      const J = drawChar(c, i, t, () => ({ mode: 'feet', x: this.cx(i), y: st === 'sit' ? this.F - 40 * this.kS : this.F }), { s: K, sweat: moving(i, t) * 0.6 });
      if (st === 'active') {   // hammer
        const dx = J.rhand[0] - J.relbow[0], dy = J.rhand[1] - J.relbow[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, ex = J.rhand[0] + ux * 36 * K, ey = J.rhand[1] + uy * 36 * K;
        c.save(); c.globalAlpha = a; c.strokeStyle = '#c9b48f'; c.lineWidth = 5 * K; c.lineCap = 'round'; c.beginPath(); c.moveTo(J.rhand[0] - ux * 6, J.rhand[1] - uy * 6); c.lineTo(ex, ey); c.stroke();
        c.fillStyle = '#d7dde4'; c.save(); c.translate(ex, ey); c.rotate(Math.atan2(uy, ux)); c.fillRect(-6 * K, -13 * K, 12 * K, 26 * K); c.restore(); c.restore();
      }
      return p;
    });
  },
};

// ---------------------------------------------------------------- swords ("Talent Rusts Without Practice")
// Each character holds a blade. characters[].blade: gold | wood | steel | shiny. props: rust (0..1 on gold),
// mat (wood -> steel, 0..1), rock (0..1: the test boulder appears). Climax: each strikes their rock; the
// strike is the character's crash / shake / burst event (crash on gold = the blade snaps; crash on shiny =
// the sword slips out of their hands; shake = a chip; burst = the rock splits clean).
const SW_UP = { la: [-0.4, -0.2], ra: [1.95, 2.65], ll: [-0.25, -0.1], rl: [0.25, 0.1], lean: -0.05, drop: -0.25 };
const SW_DOWN = { la: [-0.4, -0.2], ra: [0.45, 0.7], ll: [-0.25, 0.05], rl: [0.25, -0.05], lean: 0.12, drop: 0.2 };
const SW_GUARD = { la: [-0.35, -0.15], ra: [0.45, 0.95], ll: [-0.3, -0.12], rl: [0.3, 0.12], lean: 0, drop: 0 };
SCENES.swords = {
  facing: 'front', foley: 'blade', K: 1.7, labelRoom: 250, upperBodyFree: false, legGestures: false,   // sword hand never waves or pumps toward a neighbour
  debrisSpan() { return null; },   // shards and chips are drawn by the scene itself
  setup(T) { this.xs = colsX(T.chars.length, 240, 940); this.F = FLOOR_MAX; this.kS = this.K / 1.35; },
  floorY() { return this.F; },
  extent() { return { x0: this.xs[0] - 125, x1: this.xs[this.xs.length - 1] + 125, y0: this.F - 420, y1: this.F + 12 }; },
  cx(i) { return this.xs[i] - 40; }, rx(i) { return this.xs[i] + 62; },
  place(i, t) { return { x: this.cx(i), top: this.F - figH() * this.K, s: this.K, floor: this.F }; },
  labelTop(i, top, t) { const st = stateAt(i, t).state; return ['sit', 'sad', 'quit', 'fall'].includes(st) ? top : Math.min(top, this.place(i, t).top - 50 * this.kS * 1.35); },   // room for a raised blade; a sitting character keeps its label close   // room for the overhead swing, so the label never jumps
  hit(i) { return T.events.find(e => e.i === i && ['crash', 'shake', 'burst'].includes(e.type) && propAt(i, 'rock', e.t) > 0.5); },
  cyc(i, t) { const u = ((phaseInt(i, t, 8, 0.6, 2.4) + i * 0.41) % 1 + 1) % 1; return u < 0.55 ? ss(0, 0.55, u) : 1 - ss(0.55, 0.7, u); },
  activePose(i, t) { return blendPose(SW_GUARD, blendPose(SW_UP, SW_DOWN, this.cyc(i, t)), Math.max(moving(i, t, 0.001, 0.01), 0.75 * energyAt(t))); },
  idlePose() { return SW_GUARD; },
  winPose(i, t) { const k = Math.sin(t * 6 + i); return { la: [-0.4, -0.2], ra: [1.6, 2.35 + 0.08 * k], ll: [-0.2, -0.1], rl: [0.2, 0.1], lean: 0, drop: -0.3 }; },   // blade raised out to the side, clear of the head
  poseOverride(i, t, p) { const h = this.hit(i); if (!h) return p; const w = ss(h.t - 0.55, h.t - 0.25, t) * (1 - ss(h.t + 0.5, h.t + 0.8, t)); if (w <= 0) return p; return blendPose(p, t < h.t ? SW_UP : SW_DOWN, t < h.t ? w : 1 - ss(h.t, h.t + 0.6, t) * 0.0); },
  bladeColor(ch, i, t) {
    const kind = ch.blade || 'steel', mix = (a, b, u) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); return '#' + [16, 8, 0].map(s => Math.round(lerp(A >> s & 255, B >> s & 255, clamp(u))).toString(16).padStart(2, '0')).join(''); };
    if (kind === 'gold') return mix('#ffd45a', '#a3421a', propAt(i, 'rust', t));
    if (kind === 'wood') return mix('#c9a26b', '#e4ecf3', propAt(i, 'mat', t));
    if (kind === 'shiny') return '#efeaff';
    return '#a7b0ba';
  },
  draw(c, t) {
    const K = this.K;
    floorLine(c, this.F);
    charsDo((ch, i) => {   // the test rocks
      const rk = propAt(i, 'rock', t); if (rk < 0.01) return;
      const h = this.hit(i), x = this.rx(i), r = 40 * K * easeBack(rk), rr = rng(i * 17 + 3), a = Math.min(1, rk * 2);
      const split = h && h.type === 'burst' && t > h.t ? easeOut((t - h.t) / 0.6) : 0;
      c.save(); c.globalAlpha = a;
      for (const side of split > 0 ? [-1, 1] : [0]) {
        c.save(); c.translate(x + side * 34 * split, this.F - r * 0.9); c.rotate(side * 0.35 * split);
        c.fillStyle = '#3a3f47'; c.strokeStyle = '#9aa2ac'; c.lineWidth = 4; c.beginPath();
        const a0 = side < 0 ? Math.PI / 2 : side > 0 ? -Math.PI / 2 : 0, a1 = side ? a0 + Math.PI : Math.PI * 2, rr2 = rng(i * 17 + 3);
        for (let k = 0; k <= 10; k++) { const an = a0 + (a1 - a0) * k / 10, q = r * (0.85 + 0.2 * rr2()); const px = Math.cos(an) * q, py = Math.sin(an) * q * 0.9; k ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.closePath(); c.fill(); c.stroke(); c.restore();
      }
      if (h && h.type === 'shake' && t > h.t && t < h.t + 1.2) for (let k = 0; k < 6; k++) { const dt = t - h.t, px = x - 20 + (rr() - 0.5) * 30 + 120 * dt * (rr() - 0.3), py = this.F - r * 1.5 - 300 * dt * rr() + 900 * dt * dt; c.fillStyle = '#9aa2ac'; c.fillRect(px, Math.min(py, this.F - 6), 8, 6); }
      c.restore();
      if (split > 0 && split < 1) { c.save(); c.globalAlpha = 1 - split; c.strokeStyle = GOLD; c.lineWidth = 5; c.beginPath(); c.moveTo(x, this.F - 2.1 * r); c.lineTo(x, this.F); c.stroke(); c.restore(); }
    });
    return charsDo((ch, i) => {
      const p = this.place(i, t), a = alphaAt(i, t), st = stateAt(i, t).state, h = this.hit(i);
      const J = drawChar(c, i, t, () => ({ mode: 'feet', x: this.cx(i), y: this.F }), { s: K, sweat: moving(i, t) * 0.7 });
      const col = this.bladeColor(ch, i, t), kind = ch.blade || 'steel';
      const dropped = h && h.type === 'crash' && kind !== 'gold' && t > h.t, snapped = h && h.type === 'crash' && kind === 'gold' && t > h.t;
      const lying = dropped || ((st === 'sit' || st === 'sad' || st === 'quit') && !snapped);
      let hx, hy, ux, uy;
      if (lying) { hx = this.cx(i) - 34 * K; hy = this.F - 6; ux = 0.998; uy = -0.06; }
      else { const dx = J.rhand[0] - J.relbow[0], dy = J.rhand[1] - J.relbow[1], L = Math.hypot(dx, dy) || 1; ux = dx / L; uy = dy / L; hx = J.rhand[0]; hy = J.rhand[1]; }
      let len = (kind === 'wood' ? 52 : 56) * K * (snapped ? 0.45 : 1) * (lying ? 0.75 : 1); const wid = (kind === 'wood' ? 9 : 7) * K;
      c.save(); c.globalAlpha = a; c.lineCap = 'round';
      c.strokeStyle = '#5b4632'; c.lineWidth = 7 * K; c.beginPath(); c.moveTo(hx - ux * 14 * K, hy - uy * 14 * K); c.lineTo(hx + ux * 8 * K, hy + uy * 8 * K); c.stroke();   // grip
      if (kind !== 'wood' || propAt(i, 'mat', t) > 0.35) { c.strokeStyle = kind === 'gold' ? '#ffd45a' : '#c9ced6'; c.lineWidth = 5 * K; c.beginPath(); c.moveTo(hx + ux * 8 * K - uy * 16 * K, hy + uy * 8 * K + ux * 16 * K); c.lineTo(hx + ux * 8 * K + uy * 16 * K, hy + uy * 8 * K - ux * 16 * K); c.stroke(); }   // guard
      const bx0 = hx + ux * 10 * K, by0 = hy + uy * 10 * K, bx1 = bx0 + ux * len, by1 = by0 + uy * len;
      c.strokeStyle = col; c.lineWidth = wid; if (kind === 'shiny' || (kind === 'wood' && propAt(i, 'mat', t) > 0.8) || (kind === 'gold' && propAt(i, 'rust', t) < 0.3)) { c.shadowColor = col; c.shadowBlur = 14; }
      c.beginPath(); c.moveTo(bx0, by0); c.lineTo(bx1, by1); c.stroke(); c.shadowBlur = 0;
      if (kind === 'gold' && propAt(i, 'rust', t) > 0.15) { c.strokeStyle = '#ffd45a'; c.lineWidth = wid * 0.5; c.beginPath(); c.moveTo(bx1 - ux * len * 0.12, by1 - uy * len * 0.12); c.lineTo(bx1, by1); c.stroke(); const rr = rng(i * 7 + 1), n = Math.round(12 * propAt(i, 'rust', t)); c.fillStyle = '#e07a2e'; for (let k = 0; k < n; k++) { const u = 0.15 + 0.8 * rr(); c.beginPath(); c.arc(bx0 + ux * len * u + (rr() - .5) * 4, by0 + uy * len * u + (rr() - .5) * 4, 2.5 + 3 * rr(), 0, 7); c.fill(); } }
      if (kind === 'shiny' && !lying) { const sp = (t * 1.7 + i) % 1; c.fillStyle = '#ffffff'; c.globalAlpha = a * Math.sin(Math.PI * sp); c.beginPath(); c.arc(bx0 + ux * len * sp, by0 + uy * len * sp, 5, 0, 7); c.fill(); }
      c.restore();
      if (snapped && t < h.t + 1.4) { const dt = t - h.t, fx = bx1 + 160 * dt, fy = by1 - 380 * dt + 1100 * dt * dt; if (fy < this.F) { c.save(); c.translate(fx, fy); c.rotate(dt * 14); c.strokeStyle = col; c.lineWidth = wid; c.beginPath(); c.moveTo(-len * 0.6, 0); c.lineTo(len * 0.6, 0); c.stroke(); c.restore(); } }
      else if (snapped) { c.save(); c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = wid; c.beginPath(); c.moveTo(this.rx(i) + 10, this.F - 5); c.lineTo(this.rx(i) + 10 + len * 1.1, this.F - 9); c.stroke(); c.restore(); }
      return p;
    });
  },
};

// ---------------------------------------------------------------- doors ("Big Ego, Small Door")
// Side view, one lane per character, a wall with a doorway at the end of each lane (NEXT LEVEL).
// value = how close they get to the door (100 = at the door). props: ego (0..1, inflates the head),
// through (0..1, walks through the doorway into the light). A head too big for the doorway hits the lintel.
const WALK = ph => { const leg = p => { const th = 0.55 * Math.sin(p); return [th, th - 0.15 - 0.7 * Math.max(0, Math.cos(p))]; }, arm = p => { const u = -0.6 * Math.sin(p); return [u, u + 0.9]; }; return { la: arm(ph + Math.PI), ra: arm(ph), ll: leg(ph), rl: leg(ph + Math.PI), lean: 0.12, drop: -0.05 }; };
SCENES.doors = {
  facing: 'right', sideLabels: true, labelSide: -1, foley: 'step', labelMaxX: 812, labelGap: 72,
  setup(T) {
    const n = T.chars.length; this.gap = Math.min(330, 1150 / n); this.s = clamp((this.gap - 110) / 175, 0.85, 1.25);
    this.y0 = 1450 - (n - 1) * this.gap; this.x0 = 520; this.DOOR = 840; this.DH = (figH() + 22) * this.s;
  },
  laneY(i) { return this.y0 + i * this.gap; },
  xAt(i, t) { return this.x0 + fracAt(i, t) * (this.DOOR - 70 - this.x0) + propAt(i, 'through', t) * 190; },
  head(i, t) { return 1 + 1.6 * propAt(i, 'ego', t); },
  beyond(i, t) { return propAt(i, 'through', t) > 0.55; },
  get lightX() { return this.DOOR + 23 + this.DH * 0.42 + 14; },
  extent() { return { x0: 40, x1: this.DOOR + 220, y0: this.y0 - this.gap * 0.95 - 140, y1: this.y0 + (T.chars.length - 1) * this.gap + 50 }; },
  place(i, t) { const y = this.laneY(i), hs = this.head(i, t), extra = (hs - 1) * 2 * 27 * this.s; return { x: this.xAt(i, t), top: y - figH() * this.s - extra, s: this.s, floor: y, footY: y }; },
  activePose(i, t) { const w = moving(i, t, 0.002, 0.02); return blendPose(POSES.stand, WALK(this.xAt(i, t) / (13 * this.s)), Math.max(w, 0)); },
  idlePose() { return POSES.stand; },
  stuckPose(i, t) { const k = Math.sin(t * 17 + i) * 1.4; return { la: [0.9, 1.9 + 0.2 * k], ra: [1.2, 2.2 - 0.2 * k], ll: [-0.35, -0.15], rl: [0.4, 0.2], lean: -0.25, drop: 0.1 }; },
  poseOverride(i, t, p) { const stuck = propAt(i, 'stuck', t); return stuck > 0.01 ? blendPose(p, this.stuckPose(i, t), stuck) : p; },
  draw(c, t) {
    const n = T.chars.length, top = this.y0 - this.gap * 0.95, bot = this.y0 + (n - 1) * this.gap + 6, D = this.DOOR;
    const g = c.createLinearGradient(D, 0, D + 260, 0); g.addColorStop(0, 'rgba(255,214,120,0.30)'); g.addColorStop(1, 'rgba(255,214,120,0)'); c.fillStyle = g; c.fillRect(D, top, 260, bot - top);   // light beyond the doors
    spaced(c, 'NEXT LEVEL', D + 40, top - 92, '800 44px Inter', '#ffe3a1', 6, 0.95, 10, false, false);
    charsDo((ch, i) => floorLine(c, this.laneY(i), -200, W + 200, 0.16));
    const P = charsDo((ch, i) => {
      const y = this.laneY(i), st = stateAt(i, t).state;
      drawChar(c, i, t, tt => ({ mode: 'feet', x: this.xAt(i, tt), y }), { s: this.s, headScale: this.head(i, t), speed: speedFx(i, t, 0.12, 0.35) * 0.6 });
      return this.place(i, t);
    });
    for (let i = 0; i < n; i++) {   // the wall: solid between lanes, one lit doorway per lane (the lintel is drawn over heads that don't fit)
      const y = this.laneY(i), ly = y - this.DH, nextTop = i > 0 ? this.laneY(i - 1) + 4 : top, WW = 46;
      c.fillStyle = '#2b3038'; c.fillRect(D - WW / 2, nextTop, WW, ly - nextTop);
      c.strokeStyle = 'rgba(255,255,255,0.10)'; c.lineWidth = 2; for (let yy = nextTop + 18; yy < ly - 4; yy += 18) { c.beginPath(); c.moveTo(D - WW / 2, yy); c.lineTo(D + WW / 2, yy); c.stroke(); }
      const lg = c.createLinearGradient(D - WW / 2, 0, D + WW / 2, 0); lg.addColorStop(0, 'rgba(255,220,130,0.25)'); lg.addColorStop(1, 'rgba(255,220,130,0.6)'); c.fillStyle = lg; c.fillRect(D - WW / 2, ly, WW, y - ly);
      c.strokeStyle = GOLD; c.lineWidth = 4; c.beginPath(); c.moveTo(D - WW / 2, y); c.lineTo(D - WW / 2, ly); c.lineTo(D + WW / 2, ly); c.lineTo(D + WW / 2, y); c.stroke();
      const dw = this.DH * 0.42; c.fillStyle = 'rgba(120,86,52,0.9)'; c.strokeStyle = '#d9b77e'; c.lineWidth = 3; c.beginPath(); c.moveTo(D + WW / 2, ly + 2); c.lineTo(D + WW / 2 + dw, ly + 18); c.lineTo(D + WW / 2 + dw, y - 6); c.lineTo(D + WW / 2, y); c.closePath(); c.fill(); c.stroke();   // the open door
      c.fillStyle = GOLD; c.beginPath(); c.arc(D + WW / 2 + dw * 0.82, (ly + y) / 2 + 6, 5, 0, 7); c.fill();
      if (T.__lines) T.__lines.push({ y: ly, x0: D - WW / 2, x1: D + WW / 2 });
    }
    if (T.__vlines) T.__vlines.push({ x: D, y0: top, y1: bot });
    return P;
  },
};
