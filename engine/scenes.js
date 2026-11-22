// Visual metaphors. Each scene implements:
//   setup(T) layout · place(i,t) -> {x, top, s, floor} label anchor · draw(c,t) -> place() for all
//   activePose / idlePose / winPose / quitPose (optional) · floorY(t) (optional) · facing 'front'|'right'
//   noBoard / boardMax: whether the leaderboard label layout fits this scene
'use strict';
const charsDo = fn => T.chars.map((ch, i) => fn(ch, i));
function fallStart(i, t) { const st = stateAt(i, t); if (st.state !== 'quit' && st.state !== 'fall') return null; if (st.state === 'quit') { const pr = stateAt(i, st.since - 0.001); if (pr.state === 'fall') return pr.since; } return st.since; }
function floorLine(c, y, x0 = -200, x1 = W + 200, a = .22) { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x0, y, x1 - x0, 2); }

// ---------------------------------------------------------------- towers
SCENES.towers = {
  debris: 'coins', facing: 'front', noBoard: true,
  setup(T) { this.xs = colsX(T.chars.length, 200); },
  cam(t) { let m = 0; for (let k = 0; k < 10; k++) { const tk = Math.max(0, t - k * 0.1); m += Math.max(...T.chars.map((_, i) => 960 * fracAt(i, tk))); } const u = ss(120, 640, m / 10); return { z: lerp(1.12, 1.0, u), fy: lerp(1270, 1560, u) }; },
  floorY(t) { return this.cam(t).fy; },
  place(i, t) { const cam = this.cam(t), h = 960 * fracAt(i, t), y = cam.fy - h * cam.z; return { x: 540 + (this.xs[i] - 540) * cam.z, top: y - figH() * cam.z, s: cam.z, floor: cam.fy, footY: y }; },
  debrisSpan(i, tc) { const p = this.place(i, tc - 0.02); return { x: p.x, y0: p.footY, y1: p.floor, floor: p.floor }; },
  rainTimes() { const out = []; for (const e of T.events) if (e.type === 'rain') for (let ci = 0; ci < T.chars.length; ci++) for (let k = 0; k < (e.count || 9); k++) out.push({ ci, t0: e.t + k * (e.interval || 0.3) + ci * 0.07 }); return out; },
  rainCues() { return this.rainTimes().map(r => { let dt = 0; while (dt < 3) { if (320 + 1500 * dt * dt >= 1560 - 960 * fracAt(r.ci, r.t0 + dt)) break; dt += 1 / 240; } return [r.t0 + dt, r.ci, T.chars.length]; }); },
  draw(c, t) {
    const cam = this.cam(t);
    c.save(); c.translate(540, cam.fy); c.scale(cam.z, cam.z); c.translate(-540, -1560);
    floorLine(c, 1560);
    charsDo((ch, i) => {
      const h = 960 * fracAt(i, t), a = alphaAt(i, t), shake = T.events.some(e => e.type === 'shake' && e.i === i && t > e.t && t < e.t + 1.8) ? 2.5 * Math.sin(t * 60) : 0;
      const cw = 104, step = 15, n = Math.ceil(h / step), r2 = rng(i * 97 + 3);
      c.save(); c.globalAlpha = a;
      for (let k = 0; k < n; k++) { const off = (r2() - .5) * 7 + shake, top = Math.max(1560 - h, 1560 - (k + 1) * step + 3), bot = 1560 - k * step, hh = bot - top; if (hh <= .5) continue; c.beginPath(); c.roundRect(this.xs[i] - cw / 2 + off, top, cw, hh, Math.min(6, hh / 2)); c.fillStyle = ch.color + '30'; c.fill(); c.strokeStyle = ch.color; c.lineWidth = 2; c.stroke(); }
      c.restore();
    });
    for (const r of this.rainTimes()) { const dt = t - r.t0; if (dt < 0) continue; const y = 320 + 1500 * dt * dt; if (y < 1560 - 960 * fracAt(r.ci, t)) flyingCoin(c, T.chars[r.ci].color, this.xs[r.ci], y, dt * 9 + r.ci, 1); }
    c.restore();
    return charsDo((ch, i) => { const p = this.place(i, t); drawChar(c, i, t, tt => ({ mode: 'feet', x: p.x, y: this.place(i, tt).footY }), { s: p.s, speed: speedFx(i, t, 0.35, 0.8) }); return p; });
  },
};

// ---------------------------------------------------------------- race
function runPose(ph) {
  const leg = p => { const th = 0.85 * Math.sin(p); return [th, th - 0.3 - 1.35 * Math.max(0, Math.cos(p))]; };
  const arm = p => { const u = -1.05 * Math.sin(p); return [u, u + 1.6]; };
  return { la: arm(ph + Math.PI), ra: arm(ph), ll: leg(ph), rl: leg(ph + Math.PI), lean: 0.3, drop: -0.1 };
}
SCENES.race = {
  facing: 'right',
  setup(T) { const n = T.chars.length; this.gap = Math.min(330, 1080 / n); this.s = clamp(this.gap / 300, 0.8, 1.1); this.y0 = 1660 - (n - 1) * this.gap; this.x0 = 120; this.x1 = 850;
    const fin = T.beats[T.beats.length - 1].to; this.lane = []; T.chars.map((_, i) => i).sort((a, b) => fin[b] - fin[a]).forEach((ci, k) => { this.lane[ci] = k; }); },   // leader on the top lane
  laneY(i) { return this.y0 + this.lane[i] * this.gap; },
  extent() { return { x0: this.x0 - 40, x1: this.x1 + 60, y0: this.y0 - 230, y1: this.y0 + (T.chars.length - 1) * this.gap + 12 }; },
  xAt(i, t) { return this.x0 + fracAt(i, t) * (this.x1 - this.x0); },
  place(i, t) { const y = this.laneY(i); return { x: this.xAt(i, t), top: y - figH() * this.s, s: this.s, floor: y, footY: y }; },
  activePose(i, t) { return blendPose(POSES.stand, runPose(this.xAt(i, t) / 15), moving(i, t, 0.003, 0.03)); },
  draw(c, t) {
    const yTop = this.y0 - 200;
    c.save(); c.setLineDash([14, 12]); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 3; c.beginPath(); c.moveTo(this.x1 + 30, yTop); c.lineTo(this.x1 + 30, this.y0 + (T.chars.length - 1) * this.gap + 4); c.stroke(); c.restore();
    spaced(c, 'FINISH', this.x1 + 30, yTop - 14, '600 17px Inter', '#cfd6dd', 4, 0.9);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(this.x0 - 20, yTop, 2, (T.chars.length - 1) * this.gap + this.y0 - yTop);
    return charsDo((ch, i) => { const y = this.laneY(i); floorLine(c, y, 0, W, 0.16); const p = this.place(i, t); drawChar(c, i, t, tt => ({ mode: 'feet', x: this.xAt(i, tt), y }), { s: this.s, speed: speedFx(i, t, 0.12, 0.35), sweat: speedFx(i, t, 0.08, 0.2) }); return p; });
  },
};

// ---------------------------------------------------------------- climb
function climbPose(ph) { const s = Math.sin(ph); return { la: [-2.95 + 0.75 * Math.max(0, s), -3.05 + 0.5 * Math.max(0, s)], ra: [2.95 - 0.75 * Math.max(0, -s), 3.05 - 0.5 * Math.max(0, -s)], ll: [0.9 + 0.5 * s, -0.35], rl: [0.4 - 0.5 * s, -0.7], lean: 0.05, drop: -0.35 }; }
SCENES.climb = {
  facing: 'front', boardMax: 3, upperBodyFree: false,
  freeUpper(i, t) { return this.hip(i, t) > this.stand - 8; },   // standing on the floor: full gestures
  setup(T) { this.xs = colsX(T.chars.length, 230); this.BAR = T.style.labels === 'board' ? 600 : 470; this.F = 1650; this.stand = this.F - 72.5; this.high = this.BAR + 115; },
  floorY() { return this.F; },
  extent() { return { x0: this.xs[0] - 115, x1: this.xs[this.xs.length - 1] + 115, y0: this.BAR - 40, y1: this.F + 12 }; },
  hipAt(i, t) { return lerp(this.stand, this.high, fracAt(i, t)); },
  hip(i, t) { const since = fallStart(i, t); if (since != null) { const y0 = this.hipAt(i, since), u = clamp((t - since) / 0.6); return lerp(y0, this.F - 14, u * u); } return this.hipAt(i, t); },
  place(i, t) { const y = this.hip(i, t); return { x: this.xs[i], top: y - 105 - (figH() - 160), s: 1, floor: this.F }; },
  activePose(i, t) { const y = this.hip(i, t); return blendPose(POSES.stand, climbPose(y / 11 + t * 3.2 * energyAt(t)), ss(this.stand - 5, this.stand - 45, y)); },
  draw(c, t) {
    const x0 = this.xs[0] - 110, x1 = this.xs[this.xs.length - 1] + 110;
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(x0, this.BAR - 3, x1 - x0, 5); floorLine(c, this.F);
    charsDo((ch, i) => {
      const x = this.xs[i];
      c.strokeStyle = 'rgba(214,180,130,0.55)'; c.lineWidth = 5; c.beginPath(); c.moveTo(x, this.BAR); c.lineTo(x, this.F - 4); c.stroke();
      c.strokeStyle = 'rgba(255,230,190,0.35)'; c.lineWidth = 2; c.beginPath(); for (let y = this.BAR + 6; y < this.F - 8; y += 13) { c.moveTo(x - 3, y); c.lineTo(x + 3, y + 6); } c.stroke();
      c.strokeStyle = fracAt(i, t) > 0.985 ? GOLD : 'rgba(255,255,255,0.35)'; c.lineWidth = 3; c.beginPath(); c.arc(x, this.BAR - 20, 11, 0, 7); c.stroke();
    });
    return charsDo((ch, i) => { drawChar(c, i, t, tt => ({ mode: 'hip', x: this.xs[i] - 6, y: this.hip(i, tt) }), { speed: speedFx(i, t, 0.12, 0.4), sweat: speedFx(i, t, 0.06, 0.2) }); return this.place(i, t); });
  },
};

// ---------------------------------------------------------------- pullup
const HANG = { la: [-2.75, -2.85], ra: [2.75, 2.85], ll: [-0.06, 0.12], rl: [0.06, 0.18], lean: 0, drop: -0.2 };
const PULL = { la: [-1.15, -2.65], ra: [1.15, 2.65], ll: [-0.75, 0.55], rl: [0.75, -0.55], lean: 0, drop: -0.4 };
SCENES.pullup = {
  facing: 'front', upperBodyFree: false,
  setup(T) { this.xs = colsX(T.chars.length, 230); this.BAR = 860; this.F = 1640; },
  floorY() { return this.F; },
  extent() { return { x0: this.xs[0] - 145, x1: this.xs[this.xs.length - 1] + 145, y0: this.BAR - 10, y1: this.F + 12 }; },
  dropped(i, t) { const since = fallStart(i, t); return since == null ? null : clamp((t - since) / 0.55); },
  place(i, t) { const d = this.dropped(i, t), hx = figH() - 160; if (d == null) return { x: this.xs[i], top: this.BAR - 78 - hx, s: 1, floor: this.F }; const feet = lerp(this.BAR + 180 + hx, this.F, d * d); return { x: this.xs[i], top: lerp(this.BAR - 78 - hx, feet - 150 - hx, d), s: 1, floor: this.F, feet }; },
  activePose(i, t) { const p = 0.5 - 0.5 * Math.cos(2 * Math.PI * phaseInt(i, t, 5, 0.6, 2.6)); return blendPose(HANG, blendPose(HANG, PULL, p), Math.max(moving(i, t, 0.001, 0.01), 0.85 * energyAt(t))); },
  idlePose() { return HANG; },
  winPose() { return PULL; },
  draw(c, t) {
    const x0 = this.xs[0] - 140, x1 = this.xs[this.xs.length - 1] + 140;
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(x0, this.BAR - 3, x1 - x0, 6);
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(x0, this.BAR, 4, this.F - this.BAR); c.fillRect(x1 - 4, this.BAR, 4, this.F - this.BAR); floorLine(c, this.F);
    return charsDo((ch, i) => {
      const p = this.place(i, t), anchor = tt => { const d = this.dropped(i, tt), pp = this.place(i, tt); return d == null ? { mode: 'hands', x: this.xs[i], y: this.BAR } : { mode: 'feet', x: this.xs[i], y: pp.feet }; };
      drawChar(c, i, t, anchor, { sweat: speedFx(i, t, 0.05, 0.15) }); return p;
    });
  },
};

// ---------------------------------------------------------------- lift (front view: barbell and plates scale with the character)
const LIFT_DOWN = { la: [-0.16, -0.02], ra: [0.16, 0.02], ll: [-0.95, 0.3], rl: [0.95, -0.3], lean: 0, drop: 0.25 };
const LIFT_UP = { la: [-0.16, -0.06], ra: [0.16, 0.06], ll: [-0.12, -0.04], rl: [0.12, 0.04], lean: 0, drop: -0.1 };
const LIFT_OVER = { la: [-2.6, -2.95], ra: [2.6, 2.95], ll: [-0.2, -0.1], rl: [0.2, 0.1], lean: 0, drop: -0.35 };
SCENES.lift = {
  facing: 'front',
  setup(T) { const n = T.chars.length; this.sp = Math.min(300, 920 / n); this.xs = colsX(n, 300); this.s = clamp(this.sp / 215, 0.85, 1.4); this.F = 1420; },
  floorY() { return this.F; },
  extent() { const h = 100 * this.s; return { x0: this.xs[0] - h, x1: this.xs[this.xs.length - 1] + h, y0: this.F - 300 * this.s, y1: this.F + 12 }; },
  place(i, t) { return { x: this.xs[i], top: this.F - (figH() + 18) * this.s, s: this.s, floor: this.F }; },
  activePose(i, t) { const p = 0.5 - 0.5 * Math.cos(2 * Math.PI * phaseInt(i, t, 3.2, 0.45, 1.6)); return blendPose(LIFT_UP, blendPose(LIFT_DOWN, LIFT_UP, p), Math.max(moving(i, t), 0.8 * energyAt(t))); },
  idlePose() { return LIFT_UP; },
  winPose() { return LIFT_OVER; },
  plates(v) { const kg = Math.max(0, v - 20) / 2, out = []; let left = kg; for (const [w, rr] of [[25, 1], [20, 0.92], [15, 0.8], [10, 0.68], [5, 0.52], [2.5, 0.42]]) while (left >= w - 1e-6 && out.length < 6) { out.push(rr); left -= w; } return out; },
  draw(c, t) {
    floorLine(c, this.F);
    return charsDo((ch, i) => {
      const s = this.s, a = alphaAt(i, t), st = stateAt(i, t).state, down = st === 'quit' || st === 'fall';
      const J = drawChar(c, i, t, () => ({ mode: 'feet', x: this.xs[i], y: this.F }), { s, sweat: moving(i, t) * clamp(value(i, t) / T.maxV) });
      const plates = this.plates(value(i, t)), PR = 34 * s, sleeve = 9 * s, collar = 40 * s;
      const half = collar + Math.max(3, plates.length) * sleeve + 8 * s;
      const big = plates.length ? plates[0] * PR : 0.4 * PR;
      let cx = (J.lhand[0] + J.rhand[0]) / 2, by = (J.lhand[1] + J.rhand[1]) / 2;
      if (down) { cx = this.xs[i] + 8 * s; by = this.F - big; } else by = Math.min(by, this.F - big);
      if (T.__joints && T.__joints[i]) T.__joints[i].minY = Math.min(T.__joints[i].minY, by - big - 6 * s);
      c.save(); c.globalAlpha = a; c.lineCap = 'round';
      c.strokeStyle = '#d7dde4'; c.lineWidth = 5 * s; c.beginPath(); c.moveTo(cx - half, by); c.lineTo(cx + half, by); c.stroke();
      for (const side of [-1, 1]) {
        c.fillStyle = '#d7dde4'; c.fillRect(cx + side * collar - 3 * s, by - 9 * s, 6 * s, 18 * s);
        plates.forEach((rr, k) => { const px = cx + side * (collar + 6 * s + k * sleeve), h = rr * PR; c.fillStyle = ch.color + '55'; c.strokeStyle = ch.color; c.lineWidth = 2.5 * s; c.beginPath(); c.roundRect(px - 3.5 * s, by - h, 7 * s, 2 * h, 3 * s); c.fill(); c.stroke(); });
      }
      c.restore();
      return this.place(i, t);
    });
  },
};

// ---------------------------------------------------------------- dig
const DIG_UP = { la: [-2.6, -2.95], ra: [-2.35, -2.8], ll: [-0.3, -0.1], rl: [0.35, 0.15], lean: -0.12, drop: -0.2 };
const DIG_DOWN = { la: [1.2, 0.7], ra: [1.0, 0.55], ll: [-0.3, -0.1], rl: [0.35, 0.15], lean: 0.45, drop: 0.3 };
const ROCKS = (() => { const r = rng(21); return [...Array(90)].map(() => ({ x: r() * W, y: 660 + r() * 1200, s: 6 + r() * 16, k: r(), gem: r() < 0.12 })); })();
SCENES.dig = {
  facing: 'right',
  setup(T) { this.xs = colsX(T.chars.length, 230); this.G = T.style.labels === 'board' ? 780 : 620; this.D = 1700 - this.G; },
  foot(i, t) { return this.G + fracAt(i, t) * this.D; },
  extent(t) { return { x0: this.xs[0] - 80, x1: this.xs[this.xs.length - 1] + 80, y0: this.G - 40, y1: Math.max(...T.chars.map((_, i) => this.foot(i, t))) + 70 }; },
  place(i, t) { const y = this.foot(i, t); return { x: this.xs[i], top: y - figH(), s: 1, floor: y }; },
  cyc(i, t) { const u = ((phaseInt(i, t, 6, 0.7, 2) + i * 0.37) % 1 + 1) % 1; return u < 0.68 ? ss(0, 0.68, u) : 1 - ss(0.68, 0.82, u); },
  activePose(i, t) { return blendPose(POSES.stand, blendPose(DIG_DOWN, DIG_UP, this.cyc(i, t)), Math.max(moving(i, t), 0.8 * energyAt(t))); },
  draw(c, t) {
    c.fillStyle = 'rgba(70,58,48,0.22)'; c.fillRect(-200, this.G, W + 400, H - this.G + 200);
    for (const k of ROCKS) { c.strokeStyle = k.gem ? 'rgba(110,200,255,0.35)' : 'rgba(255,255,255,0.08)'; c.lineWidth = 2; c.beginPath(); for (let j = 0; j < 6; j++) { const an = j / 6 * 6.28 + k.k * 3, rr = k.s * (0.7 + 0.3 * Math.sin(j * 2.3 + k.k * 9)); const px = k.x + Math.cos(an) * rr, py = k.y + Math.sin(an) * rr * (k.gem ? 1.4 : 0.8); j ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.stroke(); }
    floorLine(c, this.G, -200, W + 200, 0.35);
    const goalY = this.G + this.D + 40;
    charsDo((ch, i) => {
      const x = this.xs[i], d = this.foot(i, t) - this.G, rr = rng(i * 31 + 7);
      c.fillStyle = '#08090b'; c.fillRect(x - 70, this.G + 1, 140, d); c.strokeStyle = ch.color + '55'; c.lineWidth = 2;
      for (const side of [-1, 1]) { c.beginPath(); c.moveTo(x + side * 70, this.G); for (let y = this.G; y < this.G + d; y += 22) c.lineTo(x + side * (70 + (rr() - .5) * 10), y); c.lineTo(x + side * 70, this.G + d); c.stroke(); }
      const reached = fracAt(i, t) > 0.985; c.save(); c.globalAlpha = reached ? 1 : 0.35; c.strokeStyle = GOLD; c.fillStyle = reached ? 'rgba(255,197,61,0.35)' : 'rgba(255,197,61,0.06)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x, goalY - 26); c.lineTo(x + 26, goalY); c.lineTo(x, goalY + 30); c.lineTo(x - 26, goalY); c.closePath(); c.fill(); c.stroke(); c.restore();
    });
    return charsDo((ch, i) => {
      const y = this.foot(i, t), a = alphaAt(i, t), st = stateAt(i, t).state, mv = moving(i, t);
      const J = drawChar(c, i, t, tt => ({ mode: 'feet', x: this.xs[i] - 14, y: this.foot(i, tt) }), { sweat: mv * 0.8 });
      if (st === 'active' || st === 'idle') {
        const dx = J.rhand[0] - J.relbow[0], dy = J.rhand[1] - J.relbow[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, ex = J.rhand[0] + ux * 40, ey = J.rhand[1] + uy * 40;
        c.save(); c.globalAlpha = a; c.strokeStyle = '#cfd6dd'; c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(J.rhand[0] - ux * 8, J.rhand[1] - uy * 8); c.lineTo(ex, ey); c.stroke();
        c.beginPath(); c.moveTo(ex - uy * 20 - ux * 6, ey + ux * 20 - uy * 6); c.quadraticCurveTo(ex + ux * 6, ey + uy * 6, ex + uy * 20 - ux * 6, ey - ux * 20 - uy * 6); c.stroke(); c.restore();
        if (mv > 0.3 && this.cyc(i, t) < 0.25) { const r3 = rng(Math.floor(t * 7) + i * 100); for (let q = 0; q < 6; q++) { c.globalAlpha = 0.8 * a; c.fillStyle = '#b9a58f'; c.beginPath(); c.arc(this.xs[i] + 20 + r3() * 70, y - 4 - r3() * 40, 2.5 + r3() * 2, 0, 7); c.fill(); } c.globalAlpha = 1; }
      }
      return this.place(i, t);
    });
  },
};
