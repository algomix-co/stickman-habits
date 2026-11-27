// Round 4 format ("montage"): one idea told through 3-6 mini-scenes, each a different visual metaphor.
// Loaded after engine.js (reuses drawFigure, POSES, spaced, wrapText, drawEndcard, mixWhite, fonts) and replaces
// its window API (loadSpec, render, cues, reviewRun ...) so make.js can review and render it the same way.
// Spec: { format: 'montage', scenes: [{ kind, dur, heading, left: {label}, right: {label}, ...params }], endcard }
// Each kind: draw(c, u, S, X) where u = seconds into the scene; optional act(u, side) -> 0..1 (is that side's
// figure physically doing something?), hits(S) -> impact times (s), burst(S) -> climax time (s), mood.
'use strict';
const MK = {};                                     // mini-scene kinds
const XL = 270, XR = 810, FY = 1200, FIG_S = 1.9;  // half centres, stage floor, figure scale
const WHITE = '#e9edf2', DIM = '#aeb6c0', GOLDC = '#ffc53d', REDC = '#ff5a6e', GREENC = '#7ee08a';
let MS = null;                                     // compiled montage

// ------------------------------------------------------------------ helpers
const ease = u => u * u * (3 - 2 * u), eo = u => 1 - (1 - u) * (1 - u), ei = u => u * u;
const seg = (u, a, b) => clamp((u - a) / (b - a));
const tri = x => 1 - Math.abs(((x % 2) + 2) % 2 - 1) * 2;          // triangle wave -1..1
const cyc = (u, per, ph = 0) => (((u / per + ph) % 1) + 1) % 1;     // 0..1 sawtooth
function glow(c, color, blur) { c.shadowColor = color; c.shadowBlur = blur; }
function line(c, pts, color, w, blur = 0, a = 1) { c.save(); c.globalAlpha *= a; c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; if (blur) glow(c, color, blur); c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.restore(); }
function rect(c, x, y, w, h, color, opt = {}) { c.save(); c.globalAlpha *= (opt.a == null ? 1 : opt.a); if (opt.blur) glow(c, opt.glowColor || color, opt.blur); c.beginPath(); c.roundRect(x, y, w, h, opt.r || 0); if (opt.stroke) { c.strokeStyle = color; c.lineWidth = opt.lw || 4; c.stroke(); } else { c.fillStyle = color; c.fill(); } c.restore(); }
function circ(c, x, y, r, color, opt = {}) { c.save(); c.globalAlpha *= (opt.a == null ? 1 : opt.a); if (opt.blur) glow(c, color, opt.blur); c.beginPath(); c.arc(x, y, r, 0, 7); if (opt.stroke) { c.strokeStyle = color; c.lineWidth = opt.lw || 4; c.stroke(); } else { c.fillStyle = color; c.fill(); } c.restore(); }
function label(c, text, x, y, size, color, a = 1, opt = {}) { spaced(c, text, x, y, `${opt.weight || 800} ${size}px Inter`, color, opt.sp == null ? 3 : opt.sp, a, opt.glow || 0, true, false); }
function floor(c, x0, x1, y = FY, a = 0.35) { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x0, y, x1 - x0, 3); }
function spot(c, x, y, r, color, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color.replace('A', a)); g.addColorStop(1, color.replace('A', 0)); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
const R0 = rng(7);
const JIT = [...Array(400)].map(() => [R0(), R0(), R0(), R0()]);

// ------------------------------------------------------------------ figures (right-facing poses; face:'left' mirrors)
const PZ = (la, ra, ll, rl, lean = 0, drop = 0) => ({ la, ra, ll, rl, lean, drop });
const POSE = {
  stand: POSES.stand, cheer: POSES.cheer, sad: POSES.sad, sit: POSES.sit, shock: POSES.shock,
  hold: PZ([1.15, 1.75], [1.25, 1.85], [-0.12, -0.08], [0.12, 0.08], 0.02),               // holding something in front
  empty: PZ([-0.9, -0.2], [0.9, 0.2], [-0.14, -0.08], [0.14, 0.08], 0, 0.6),               // palms out, nothing left
  kneel: PZ([0.9, 1.4], [1.1, 1.5], [1.4, 0.1], [-0.2, -1.5], 0.25, 0.3),
};
function cheerP(t) { const k = Math.sin(t * 9); return PZ([-2.1 - 0.35 * k, -2.4 - 0.3 * k], [2.1 + 0.35 * k, 2.4 + 0.3 * k], [-0.2, -0.12], [0.2, 0.12], 0, -0.3); }
const hop = t => 26 * Math.abs(Math.sin(t * 4.5));
function walkP(ph, amp = 0.5, lean = 0.06) { const s = Math.sin(ph); return PZ([-0.55 * s + 0.1, -0.55 * s + 0.6], [0.55 * s + 0.1, 0.55 * s + 0.6], [amp * s, amp * s - 0.45 * Math.max(0, Math.cos(ph))], [-amp * s, -amp * s - 0.45 * Math.max(0, -Math.cos(ph))], lean, 0); }
function runP(ph, lean = 0.28) { const s = Math.sin(ph); return PZ([-1.0 * s, -1.0 * s + 1.5], [1.0 * s, 1.0 * s + 1.5], [0.85 * s + 0.1, 0.85 * s - 0.9 * Math.max(0, Math.cos(ph)) - 0.2], [-0.85 * s + 0.1, -0.85 * s - 0.9 * Math.max(0, -Math.cos(ph)) - 0.2], lean, 0); }
function pushP(ph) { const s = Math.sin(ph); return PZ([1.45, 1.75], [1.55, 1.85], [-0.6 + 0.18 * s, -0.75 + 0.18 * s], [0.2 - 0.18 * s, -0.05 - 0.18 * s], 0.55, 0); }
function haulP(ph) { const s = Math.sin(ph); return PZ([-0.55, -0.85], [-0.45, -0.75], [0.45 + 0.15 * s, 0.1 + 0.15 * s], [-0.35 - 0.15 * s, -0.6 - 0.15 * s], 0.5, 0); }
function tossP(k) { return blendPose(PZ([0.4, 0.9], [1.2, 1.5], [-0.14, -0.08], [0.14, 0.08], 0.05), PZ([0.4, 0.9], [-2.3, -2.7], [-0.14, -0.08], [0.14, 0.08], -0.1), k); }
function feedP(k) { return blendPose(POSE.hold, PZ([1.15, 1.75], [1.0, 0.55], [-0.12, -0.08], [0.12, 0.08], 0.12), k); }
function digP(k) { return blendPose(PZ([1.3, 0.6], [1.5, 0.8], [-0.3, -0.1], [0.3, 0.1], 0.35, 0.1), PZ([2.2, 2.6], [2.35, 2.75], [-0.25, -0.1], [0.25, 0.1], 0.05, 0), k); }
function waterP(k) { return PZ([0.3, 0.6], [1.35 + 0.15 * k, 1.25 + 0.35 * k], [-0.14, -0.08], [0.14, 0.08], 0.08 + 0.05 * k); }
const CAST = {};
function castOf(side) { return CAST[side]; }
function fig(c, side, x, y, pose, t, o = {}) {
  const ch = castOf(side), s = o.s || FIG_S, flip = o.face === 'left';
  c.save(); if (flip) { c.translate(x, 0); c.scale(-1, 1); c.translate(-x, 0); }
  const r = drawFigure(c, ch, { x, y, mode: 'feet' }, pose, t, o.alpha == null ? 1 : o.alpha, s, { expr: o.expr || 'determined', facing: o.face === 'front' ? 'front' : 'right', rot: o.rot || 0 });
  c.restore();
  if (flip) for (const k of ['head', 'hip', 'lhand', 'rhand', 'lelbow', 'relbow']) r[k] = [2 * x - r[k][0], r[k][1]];
  return r;
}
function sweat(c, x, y, t, a = 1) { for (let k = 0; k < 2; k++) { const u = cyc(t, 0.7, k * 0.5); circ(c, x + (k ? 24 : -18) + u * (k ? 14 : -14), y - 10 + u * 40, 5, '#9fd8ff', { a: a * (1 - u) }); } }

// ------------------------------------------------------------------ props
function bill(c, x, y, rot, s = 1, a = 1) { c.save(); c.globalAlpha *= a; c.translate(x, y); c.rotate(rot); c.scale(s, s); rect(c, -26, -14, 52, 28, '#3f8f5a', { r: 4 }); rect(c, -22, -10, 44, 20, '#7ee08a', { r: 3, stroke: true, lw: 2 }); c.fillStyle = '#d8ffe0'; c.font = '800 16px Inter'; c.textAlign = 'center'; c.fillText('$', 0, 6); c.restore(); }
function bundle(c, x, y, k, s = 1) { if (k <= 0.02) return; const h = 8 + 40 * k; for (let j = 0; j < Math.ceil(h / 8); j++) bill(c, x, y - j * 7 * s, (j % 3 - 1) * 0.04, s); rect(c, x - 30 * s, y - h * 0.45 * s - 8, 60 * s, 10, '#e9edf2', { a: 0.8, r: 3 }); }
function coin(c, x, y, r = 13, spin = 0, a = 1, color = GOLDC) { c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(Math.max(0.18, Math.abs(Math.cos(spin))), 1); glow(c, color, 14); c.fillStyle = color; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.shadowBlur = 0; c.strokeStyle = '#9a6b00'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, r * 0.68, 0, 7); c.stroke(); c.restore(); }
function bag(c, x, y, s, color, a = 1) { c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s); rect(c, -34, -62, 68, 62, color, { r: 6 }); line(c, [[-16, -62], [-14, -84], [14, -84], [16, -62]], '#ffffff', 5); rect(c, -24, -44, 48, 6, 'rgba(255,255,255,0.35)', { r: 3 }); c.restore(); }
function jar(c, x, yBase, w, h, fill, color = GOLDC) {
  const x0 = x - w / 2, y0 = yBase - h;
  if (fill > 0) { const fh = (h - 16) * clamp(fill); c.save(); c.beginPath(); c.roundRect(x0 + 6, yBase - 6 - fh, w - 12, fh, 10); c.clip(); glow(c, color, 26); c.fillStyle = color; c.fillRect(x0, yBase - 6 - fh, w, fh); c.shadowBlur = 0;
    for (let k = 0; k < 18; k++) { const j = JIT[k]; c.strokeStyle = 'rgba(120,80,0,0.55)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x0 + 14 + j[0] * (w - 28), yBase - 14 - j[1] * fh, 12, 4, 0, 0, 7); c.stroke(); } c.restore(); }
  c.save(); c.strokeStyle = 'rgba(220,235,255,0.85)'; c.lineWidth = 5; glow(c, '#cfe6ff', 10); c.beginPath(); c.roundRect(x0, y0, w, h, 16); c.stroke(); c.fillStyle = 'rgba(220,235,255,0.07)'; c.fill(); rect(c, x0 - 8, y0 - 16, w + 16, 18, 'rgba(220,235,255,0.85)', { r: 6 }); c.restore();
}
function car(c, x, y, s, wheelRot, shine = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const body = new Path2D('M -150 -30 L -150 -70 Q -140 -82 -110 -84 L -70 -86 L -40 -128 Q -30 -138 -10 -138 L 70 -138 Q 92 -136 104 -120 L 128 -86 L 150 -80 Q 164 -76 164 -60 L 164 -30 Z');
  glow(c, '#ff5a6e', 22 * shine); c.fillStyle = '#d9304a'; c.fill(body); c.shadowBlur = 0; c.strokeStyle = '#ffb3be'; c.lineWidth = 4; c.stroke(body);
  c.fillStyle = 'rgba(190,225,255,0.85)'; c.beginPath(); c.moveTo(-30, -88); c.lineTo(-4, -126); c.lineTo(40, -126); c.lineTo(40, -88); c.closePath(); c.fill(); c.beginPath(); c.moveTo(52, -88); c.lineTo(52, -126); c.lineTo(84, -126); c.lineTo(108, -88); c.closePath(); c.fill();
  for (const wx of [-95, 108]) { c.fillStyle = '#15181d'; c.beginPath(); c.arc(wx, -28, 30, 0, 7); c.fill(); c.strokeStyle = '#c9d1db'; c.lineWidth = 6; c.stroke(); c.save(); c.translate(wx, -28); c.rotate(wheelRot); c.lineWidth = 4; for (let k = 0; k < 3; k++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-18, 0); c.lineTo(18, 0); c.stroke(); } c.restore(); }
  if (shine > 0.3) { c.globalAlpha = 0.6 * shine; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(-120, -66); c.lineTo(-60, -70); c.stroke(); }
  c.restore();
}
function chain(c, p0, p1, sag, t, a = 1) { const n = 12; for (let k = 0; k <= n; k++) { const u = k / n, x = lerp(p0[0], p1[0], u), y = lerp(p0[1], p1[1], u) + Math.sin(Math.PI * u) * sag; c.save(); c.globalAlpha *= a; c.strokeStyle = '#9aa3ad'; c.lineWidth = 4; c.beginPath(); c.ellipse(x, y, k % 2 ? 9 : 6, k % 2 ? 6 : 9, 0, 0, 7); c.stroke(); c.restore(); } }
function ironBall(c, x, y, r, text) { const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, '#8a929c'); g.addColorStop(1, '#2a2f36'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = '#c3cad3'; c.lineWidth = 3; c.stroke(); if (text) label(c, text, x, y + 11, 30, '#ffffff', 1, { sp: 2 }); }
function tree(c, x, y, k, t, opt = {}) {   // k: 0 seed .. 1 sapling .. 3 big; gold leaves and coin fruit with opt
  if (k <= 0) return; if (opt.scale && opt.scale !== 1) { c.save(); c.translate(x, y); c.scale(opt.scale, opt.scale); c.translate(-x, -y); tree(c, x, y, k, t, { ...opt, scale: 1 }); c.restore(); return; } const h = 40 + 150 * Math.min(k, 1) + 170 * Math.max(0, Math.min(k - 1, 2)) / 2, trunkW = 6 + 10 * Math.min(k, 3) / 1.5;
  line(c, [[x, y], [x + 4 * Math.sin(t), y - h]], '#a77b4f', trunkW);
  const bs = Math.max(0, k - 0.35); const crown = 30 + 70 * Math.min(bs, 1) + 120 * Math.max(0, Math.min(bs - 1, 2)) / 2;
  for (let b = 0; b < 3; b++) { const an = -0.9 + b * 0.9; line(c, [[x, y - h * 0.62], [x + Math.sin(an) * crown * 0.55, y - h * 0.62 - Math.cos(an) * crown * 0.45]], '#a77b4f', trunkW * 0.5, 0, clamp(bs * 2)); }
  if (bs > 0) { const col = opt.gold ? GOLDC : '#5fcf7a'; c.save(); glow(c, col, opt.gold ? 40 : 18); for (let k2 = 0; k2 < 9; k2++) { const j = JIT[40 + k2], cx = x + (j[0] - 0.5) * crown * 1.3, cy = y - h - (j[1] - 0.3) * crown * 0.7; c.fillStyle = k2 % 2 ? col : mixWhite(col.length === 7 ? col : '#5fcf7a', 0.15); c.globalAlpha = 0.92; c.beginPath(); c.arc(cx, cy, crown * (0.32 + 0.18 * j[2]) * clamp(bs), 0, 7); c.fill(); } c.restore(); }
  const fruit = opt.fruit || 0; for (let f = 0; f < Math.floor(fruit); f++) { const j = JIT[80 + f]; coin(c, x + (j[0] - 0.5) * crown * 1.2, y - h - (j[1] - 0.2) * crown * 0.6, 11 + 3 * Math.min(1, k / 2), t * 2 + f, clamp(fruit - f)); }
}
function wheel(c, x, y, r, rot, a = 1) {
  c.save(); c.globalAlpha *= a; c.strokeStyle = '#c9d1db'; c.lineWidth = 8; glow(c, '#9fb3c8', 12); c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.lineWidth = 3; c.beginPath(); c.arc(x, y, r - 14, 0, 7); c.stroke(); c.shadowBlur = 0;
  for (let k = 0; k < 16; k++) { const an = rot + k * Math.PI / 8; c.beginPath(); c.moveTo(x + Math.cos(an) * (r - 14), y + Math.sin(an) * (r - 14)); c.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); c.stroke(); }
  c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x - r * 0.55, y + r + 12); c.moveTo(x, y); c.lineTo(x + r * 0.55, y + r + 12); c.stroke(); circ(c, x, y, 10, '#c9d1db'); c.restore();
}
function can(c, x, y, k) { c.save(); c.translate(x, y); c.rotate(0.25 + 0.45 * k); rect(c, -26, -22, 52, 40, '#6fb7ff', { r: 6 }); line(c, [[24, -10], [58, -30]], '#6fb7ff', 7); c.restore(); }
function drops(c, x, y, t, n, a) { for (let k = 0; k < n; k++) { const u = cyc(t, 0.5, k / n); circ(c, x + k * 6 - 8, y + u * 70, 4, '#8fd0ff', { a: a * (1 - u) }); } }
function shovel(c, hand, ang, len = 110) { const ex = hand[0] + Math.sin(ang) * len, ey = hand[1] + Math.cos(ang) * len; line(c, [hand, [ex, ey]], '#c9a27a', 6); c.save(); c.translate(ex, ey); c.rotate(-ang); rect(c, -14, -2, 28, 30, '#c9d1db', { r: 6 }); c.restore(); return [ex, ey]; }
function confettiBurst(c, x, y, u, n = 60, colors = [GOLDC, '#ffffff', '#ffe08a']) { if (u <= 0 || u > 2.2) return; for (let k = 0; k < n; k++) { const j = JIT[120 + k], an = j[0] * 6.283, sp = 260 + 520 * j[1], px = x + Math.cos(an) * sp * eo(Math.min(1, u)), py = y + Math.sin(an) * sp * eo(Math.min(1, u)) + 260 * u * u; c.save(); c.globalAlpha = clamp(1 - u / 2.2); c.fillStyle = colors[k % colors.length]; c.translate(px, py); c.rotate(u * 8 * j[2]); c.fillRect(-6, -3, 12, 6); c.restore(); } }

function confettiRain(c, x0, x1, t, a = 1, n = 46) { if (a <= 0) return; const cols = [GOLDC, '#ffffff', '#ffe08a']; for (let k = 0; k < n; k++) { const j = JIT[330 + (k % 70)], f = cyc(t, 2.2 + j[1] * 1.6, j[0]); c.save(); c.globalAlpha = a * 0.9; c.fillStyle = cols[k % 3]; c.translate(x0 + j[2] * (x1 - x0) + 30 * Math.sin(t * 2 + k), lerp(560, FY + 20, f)); c.rotate(t * (3 + 4 * j[1]) + k); c.fillRect(-8, -4, 16, 8); c.restore(); } }

// ------------------------------------------------------------------ stage chrome
function splitStage(c, S, u, X) {
  const a = ease(seg(u, 0, 0.25)), lab = S.labels !== false;
  line(c, [[540, 730], [540, FY + 40]], 'rgba(255,255,255,0.16)', 3);
  floor(c, 20, 520); floor(c, 560, 1060);
  if (lab) { const L = (S.left || {}).label, Rt = (S.right || {}).label; if (L) label(c, L, XL, 690, 40, (S.left || {}).color || DIM, a); if (Rt) label(c, Rt, XR, 690, 40, (S.right || {}).color || GOLDC, a, { glow: 12 }); }
}
function heading(c, S, u) { if (!S.heading) return; const lines = wrapText(S.heading, '800 58px Inter', 4, 940); lines.forEach((ln, k) => { const a = ease(seg(u, 0.05 + k * 0.12, 0.45 + k * 0.12)); c.save(); c.translate(0, (1 - a) * 18); spaced(c, ln, 540, 470 + k * 70, '800 58px Inter', '#ffffff', 4, a, 0, true, false); c.restore(); }); }
function counter(c, text, x, y, color, a = 1, size = 52) { label(c, text, x, y, size, color, a, { sp: 1, glow: color === GOLDC ? 18 : 0 }); }

// ================================================================== kinds: "Pay Yourself First"
MK.payday = {   // SAME PAYCHECK: one tosses it over his shoulder (shopping bags pile up), one feeds a jar first
  mood: 'normal',
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    const drop = ei(seg(u, 0.1, 0.6)), D = S.dur, end = D - 1.2, pat = Math.sin(X.t * 9);
    // left: SPENDS FIRST
    const tossOn = u > 0.8 && u < end, k = tossOn ? Math.sin(Math.PI * cyc(u - 0.8, 0.55)) : 0, nTossed = Math.floor(Math.max(0, Math.min(u, end) - 0.8) / 0.55), leftK = clamp(1 - nTossed / 8);
    const lp = u >= end ? blendPose(tossP(0), PZ([-0.5 + 0.35 * pat, 0.3 + 0.5 * pat], [0.5 - 0.35 * pat, -0.3 - 0.5 * pat], [-0.14, -0.08], [0.14, 0.08], 0.05 * pat, 0.4), ease(seg(u, end, end + 0.3))) : u < 0.8 ? POSE.hold : tossP(k);
    const fl = fig(c, 'left', XL + 30, FY, lp, X.t, { expr: u >= end ? 'shock' : 'smug' });
    const bags = Math.min(7, nTossed); for (let b = 0; b < bags; b++) bag(c, 110 + (b % 4) * 34 - (b > 3 ? 14 : 0), FY - (b > 3 ? 58 : 0), 0.78, ['#ff8fa3', '#8fc7ff', '#ffd27a', '#c3a6ff'][b % 4]);
    if (tossOn) { const f = cyc(u - 0.8, 0.55); if (f > 0.35) bill(c, lerp(fl.rhand[0], 140, (f - 0.35) / 0.65), fl.rhand[1] - 150 * Math.sin(Math.PI * (f - 0.35) / 0.65) + 60 * (f - 0.35), f * 9, 1, 1 - (f - 0.35)); }
    if (u < 0.6) bundle(c, XL + 60, lerp(780, FY - 150, drop), 1); else if (u < end) bundle(c, (fl.lhand[0] + fl.rhand[0]) / 2 + 10, Math.min(fl.lhand[1], fl.rhand[1]) + 4, leftK);
    // right: SAVES FIRST
    const jx = 935, feedOn = u > 0.8, f2 = feedOn ? cyc(u - 0.8, 0.7) : 0, kk = feedOn ? Math.sin(Math.PI * f2) : 0, nFed = Math.floor(Math.max(0, u - 0.8) / 0.7);
    jar(c, jx, FY, 90, 150, Math.min(0.85, nFed * 0.11 + (feedOn ? kk * 0.02 : 0)));
    const fr = fig(c, 'right', XR - 20, FY, feedOn ? feedP(kk) : POSE.hold, X.t, { expr: u > end ? 'joy' : 'determined' });
    if (u < 0.6) bundle(c, XR - 10, lerp(780, FY - 150, drop), 1); else bundle(c, fr.lhand[0] + 8, fr.lhand[1] + 4, clamp(1 - nFed * 0.06));
    if (feedOn && f2 > 0.15 && f2 < 0.85) bill(c, lerp(fr.rhand[0], jx, ease((f2 - 0.15) / 0.7)), lerp(fr.rhand[1], FY - 165, ease((f2 - 0.15) / 0.7)) - 40 * Math.sin(Math.PI * (f2 - 0.15) / 0.7), 0.3, 0.8);
    if (u > end) spot(c, jx, FY - 80, 170, 'rgba(255,197,61,A)', 0.25 * ease(seg(u, end, end + 0.5)));
  },
  act(u, side) { return u > 0.8 && u < this.__D - 1.2 ? 1 : 0.5; },
};

MK.credit = {   // THE CAR ON CREDIT: a shiny car with a LOAN ball chained to it, hauled by hand; the other plants a coin
  mood: 'tense',
  hits(S) { return [1.5]; },
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    // left: car rolls in, LOAN ball drops at 1.5s, then he hauls car + ball (barely moves)
    const roll = eo(seg(u, 0, 1.2)), haul = Math.max(0, u - 2.0), tug = cyc(haul, 0.8), creep = (Math.floor(haul / 0.8) + ease(seg(tug, 0.15, 0.55))) * 16 * (u > 2 ? 1 : 0), cx = lerp(-200, 260, roll) + creep, wr = roll * 9 + creep / 30;
    car(c, cx, FY, 0.62, wr, 1 - 0.5 * seg(u, 3, 6));
    const bx = cx - 150, ballY = u < 1.5 ? lerp(760, FY - 52, ei(seg(u, 1.0, 1.5))) : FY - 52, rr = 52;
    if (u > 1.0) { chain(c, [cx - 93, FY - 26], [bx + rr * 0.7, ballY], u < 1.5 ? 0 : 30, X.t); ironBall(c, bx, ballY, rr, 'LOAN'); }
    if (u > 1.45 && u < 2.1) { const k = seg(u, 1.45, 2.1); for (let d = 0; d < 6; d++) circ(c, bx + (d - 2.5) * 22 * (1 + k), FY - 6 - 30 * Math.sin(Math.PI * k) * (0.5 + JIT[d][0]), 6, '#8a929c', { a: 1 - k }); }
    let fl;
    if (u < 1.9) fl = fig(c, 'left', cx + 25, FY - 92 * 0.62 + 2, POSE.sit, X.t, { expr: u < 1.5 ? 'smug' : 'shock', s: FIG_S * 0.6 });   // in the driver's seat
    else { const hx = cx + 205, lunge = Math.sin(Math.PI * seg(tug, 0.1, 0.6)); fl = fig(c, 'left', Math.min(470, hx), FY, blendPose(PZ([-0.2, -0.5], [-0.1, -0.4], [0.1, 0.0], [-0.1, -0.1], 0.1, 0), PZ([-0.75, -1.05], [-0.65, -0.95], [0.7, 0.3], [-0.55, -0.85], 0.75, 0), lunge), X.t, { expr: 'sad' }); for (let d = 0; d < 3; d++) { const f = cyc(X.t, 0.5, d / 3); circ(c, cx - 150 - 40 - f * 50, FY - 8 - 20 * f, 7 * (1 - f) + 2, '#8a929c', { a: 0.7 * (1 - f) }); } line(c, [fl.rhand, [cx + 100, FY - 50]], '#d9c49a', 5); sweat(c, fl.head[0] + 10, fl.head[1] - 20, X.t); }
    // right: kneels, plants a coin, a sapling springs up, then he waters it
    const kneel = u < 2.6, rx = XR - 30;
    if (kneel) { const dk = Math.sin(Math.PI * cyc(u, 0.55)); const fr = fig(c, 'right', rx, FY, digP(dk), X.t, {}); shovel(c, fr.rhand, lerp(0.35, 0.9, dk), 120); for (let d = 0; d < 4; d++) { const f = cyc(u, 0.55, d / 4); circ(c, rx + 105 + (d - 1.5) * 14 + f * 30 * (d % 2 ? 1 : -1), FY - 10 - 50 * Math.sin(Math.PI * f), 6, '#a77b4f', { a: 1 - f }); } if (u > 1.4) coin(c, rx + 105, lerp(fr.rhand[1], FY - 6, seg(u, 1.4, 1.9)), 12, X.t * 6); else coin(c, fr.rhand[0] + 6, fr.rhand[1], 12, X.t * 6); line(c, [[rx + 80, FY + 1], [rx + 130, FY + 1]], '#7a5a3a', 8); }
    else { const k = Math.sin(Math.PI * cyc(u, 0.9)) * 0.5 + 0.5; const fr = fig(c, 'right', rx - 20, FY, waterP(k), X.t, { expr: 'joy' }); can(c, fr.rhand[0] + 10, fr.rhand[1], k); drops(c, fr.rhand[0] + 62, fr.rhand[1] - 10, X.t, 4, 1); }
    tree(c, rx + 105, FY, ease(seg(u, 2.2, S.dur - 0.5)) * 1.0, X.t);
  },
};

MK.monthly = {   // EVERY MONTH: the hamster wheel of bills vs a tree that grows coins; SAVED counters
  mood: 'build',
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    const D = S.dur, months = Math.floor(lerp(1, 36, seg(u, 0.3, D - 0.6)));
    label(c, `MONTH ${months}`, 540, 600, 30, '#9aa3ad', 1, { weight: 700 });
    // left: running in a wheel; bills fly out each lap
    const wx = XL, wy = FY - 190, wr = 180, rot = -u * 3.2;
    wheel(c, wx, wy, wr, rot);
    fig(c, 'left', wx, wy + wr - 12, runP(X.t * 11), X.t, { expr: 'sad', s: FIG_S * 0.8 });
    const TAGS = ['RENT', 'CAR', 'CARDS', 'BILLS'];
    for (let k = 0; k < 4; k++) { const f = cyc(u, 1.1, k / 4), x = wx + 40 + f * 170, y = wy + 40 - 220 * f + 160 * f * f; if (u > 0.4) { bill(c, x, y, f * 6, 0.9, 1 - f); label(c, TAGS[k], x, y - 30, 26, REDC, (1 - f) * 0.9, { sp: 1 }); } }
    counter(c, 'SAVED $0', XL, 785, DIM, ease(seg(u, 0.2, 0.6)));
    // right: waters the tree; it grows and sprouts coin fruit
    const tk = lerp(1.0, 2.2, ease(seg(u, 0.2, D - 0.4))), tx = XR + 40;
    tree(c, tx, FY, tk, X.t, { fruit: lerp(0, 9, seg(u, 1.2, D - 0.4)), scale: 0.88 });
    const k = Math.sin(Math.PI * cyc(u, 0.9)) * 0.5 + 0.5, fr = fig(c, 'right', XR - 120, FY, waterP(k), X.t, { expr: 'determined' });
    can(c, fr.rhand[0] + 10, fr.rhand[1], k); drops(c, fr.rhand[0] + 62, fr.rhand[1] - 10, X.t, 4, 1);
    const saved = Math.round(lerp(0, S.saved || 14200, ei(seg(u, 0.4, D - 0.5))) / 100) * 100;
    counter(c, `SAVED $${saved.toLocaleString('en-US')}`, XR, 785, GOLDC, ease(seg(u, 0.2, 0.6)));
  },
};

MK.tenyears = {   // TEN YEARS LATER: still in the wheel; the tree turns gold and rains coins (the climax)
  mood: 'climax',
  burst(S) { return 2.6; },
  draw(c, u, S, X) {
    const D = S.dur, B = 2.6;
    splitStage(c, S, u, X);
    const wx = XL, wy = FY - 190, wr = 180;
    wheel(c, wx, wy, wr, -u * 2.2);
    fig(c, 'left', wx, wy + wr - 12, runP(X.t * 8, 0.36), X.t, { expr: 'sad', s: FIG_S * 0.8 });
    if (u > 0.6) label(c, 'STILL RUNNING', XL, 785, 34, DIM, ease(seg(u, 0.6, 1.0)), { sp: 2 });
    const tx = XR + 20, grow = lerp(2.2, 2.6, ease(seg(u, 0, B))), gold = u > B - 0.2;
    if (gold) spot(c, tx, FY - 300, 420, 'rgba(255,197,61,A)', 0.32 * ease(seg(u, B - 0.2, B + 0.6)));
    tree(c, tx, FY, grow, X.t, { gold, fruit: 9, scale: 0.85 });
    const cheer = u > B, fr = fig(c, 'right', XR - 130, FY - (cheer ? hop(X.t) : 0), cheer ? cheerP(X.t) : waterP(Math.sin(Math.PI * cyc(u, 0.9)) * 0.5 + 0.5), X.t, { expr: cheer ? 'joy' : 'determined' });
    if (!cheer) can(c, fr.rhand[0] + 10, fr.rhand[1], 0.5);
    if (u > B) { for (let k = 0; k < 40; k++) { const j = JIT[200 + k], f = cyc(u - B, 1.3 + j[1], j[0]); coin(c, 600 + j[2] * 360, lerp(FY - 400, FY - 10, f), 12, X.t * 5 + k, 1 - 0.3 * f); } confettiBurst(c, tx, FY - 380, u - B); confettiRain(c, 580, 1000, X.t, ease(seg(u, B + 0.8, B + 1.6))); }
    counter(c, `$${Math.round(lerp(14200, S.final || 186000, ei(seg(u, 0.2, B + 0.4))) / 100 * 100).toLocaleString('en-US')}`, XR, 785, GOLDC, ease(seg(u, 0.2, 0.6)), 56);
    if (S.line) { const a = ease(seg(u, B + 0.9, B + 1.5)); rect(c, 60, 1290, 960, 110, 'rgba(8,10,14,0.82)', { r: 24, a }); spaced(c, S.line, 540, 1365, '800 54px Inter', GOLDC, 4, a, 22, true, false); }
  },
};

// ================================================================== props for "Thinking Isn't Doing"
function bulb(c, x, y, on, a = 1) { c.save(); c.globalAlpha *= a; if (on > 0) spot(c, x, y, 120, 'rgba(255,214,110,A)', 0.45 * on); circ(c, x, y, 30, on > 0.5 ? '#ffe28a' : '#6b7480', { blur: on > 0.5 ? 30 : 0 }); rect(c, x - 14, y + 24, 28, 22, '#9aa3ad', { r: 4 }); line(c, [[x - 10, y + 32], [x + 10, y + 32]], '#5d646d', 3); c.restore(); }
function box(c, x, y, w, h, text, a = 1, rot = 0) { c.save(); c.globalAlpha *= a; c.translate(x, y); c.rotate(rot); rect(c, -w / 2, -h, w, h, '#2b313a', { r: 6 }); rect(c, -w / 2, -h, w, h, '#8d97a3', { r: 6, stroke: true, lw: 3 }); if (text) { c.fillStyle = '#e1e6ec'; c.font = '800 23px Inter'; c.textAlign = 'center'; c.fillText(text, 0, -h / 2 + 7); } c.restore(); }
function pages(c, x, yBase, n, t, wob = 0) { for (let k = 0; k < n; k++) { const j = JIT[260 + (k % 120)]; c.save(); c.translate(x + (j[0] - 0.5) * 10 + wob * k * k * 0.04, yBase - k * 9); c.rotate((j[1] - 0.5) * 0.12 + wob * k * 0.002); rect(c, -46, -8, 92, 9, k % 2 ? '#e9edf2' : '#cdd3da', { r: 2 }); c.restore(); } }
function desk(c, x, y) { rect(c, x - 70, y - 92, 140, 12, '#8a6a4a', { r: 3 }); line(c, [[x - 60, y - 80], [x - 60, y]], '#8a6a4a', 7); line(c, [[x + 60, y - 80], [x + 60, y]], '#8a6a4a', 7); }
function hammer(c, hand, ang) { const ex = hand[0] + Math.sin(ang) * 60, ey = hand[1] + Math.cos(ang) * 60; line(c, [hand, [ex, ey]], '#c9a27a', 6); c.save(); c.translate(ex, ey); c.rotate(-ang); rect(c, -20, -8, 40, 16, '#c9d1db', { r: 3 }); c.restore(); }
function water(c, x0, x1, y, t, a = 1) { c.save(); c.globalAlpha *= a; const g = c.createLinearGradient(0, y, 0, y + 180); g.addColorStop(0, 'rgba(70,150,230,0.55)'); g.addColorStop(1, 'rgba(20,50,90,0.1)'); c.fillStyle = g; c.beginPath(); c.moveTo(x0, y + 180); for (let x = x0; x <= x1; x += 12) c.lineTo(x, y + 6 * Math.sin(x * 0.03 + t * 3)); c.lineTo(x1, y + 180); c.closePath(); c.fill(); c.strokeStyle = 'rgba(160,210,255,0.8)'; c.lineWidth = 3; c.beginPath(); for (let x = x0; x <= x1; x += 12) { const yy = y + 6 * Math.sin(x * 0.03 + t * 3); x === x0 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); c.restore(); }
function boat(c, x, y, size, planks, tilt = 0, sail = 0) { c.save(); c.translate(x, y); c.rotate(tilt); c.scale(size, size); const n = Math.max(0, Math.min(5, planks)); for (let k = 0; k < Math.floor(n); k++) { const w = 150 - k * 18; rect(c, -w / 2, -k * 13 - 12, w, 12, k % 2 ? '#b98a5a' : '#a77b4f', { r: 4 }); } if (n > 0) { line(c, [[-80, -2], [-62, -60], [62, -60], [80, -2]], '#e0b27f', 4, 0, clamp(n - 4)); } if (sail > 0) { line(c, [[0, -60], [0, -60 - 190 * sail]], '#e9edf2', 6); c.save(); glow(c, GOLDC, 20); c.fillStyle = GOLDC; c.beginPath(); c.moveTo(6, -70 - 170 * sail); c.lineTo(6 + 110 * sail, -80); c.lineTo(6, -80); c.closePath(); c.fill(); c.restore(); } c.restore(); }
function sun(c, x, y, r, a) { if (a <= 0) return; spot(c, x, y, r * 4, 'rgba(255,190,90,A)', 0.35 * a); circ(c, x, y, r, '#ffcf6e', { a, blur: 40 }); }
function ground(c, x0, x1, y, off, a = 1) { for (let x = x0 - (off % 60); x < x1; x += 60) line(c, [[Math.max(x0, x), y + 14], [Math.min(x1, x + 28), y + 14]], 'rgba(255,255,255,0.35)', 4, 0, a); }

function plank(c, x, y, rot = 0) { c.save(); c.translate(x, y); c.rotate(rot); rect(c, -60, -7, 120, 14, '#b98a5a', { r: 4 }); c.restore(); }
// fetch-and-build loop: walk to the plank pile, carry a plank overhead to the hull, hammer it on. Returns planks placed.
function buildLoop(c, u, X, pileX, workX, per = 1.8) {
  const k = cyc(u, per), n = Math.floor(u / per); let fr;
  for (let j = 0; j < 3; j++) plank(c, pileX, FY - 8 - j * 14, 0);
  if (k < 0.3) { const x = lerp(workX, pileX + 40, ease(k / 0.3)); fr = fig(c, 'right', x, FY, walkP(X.t * 11, 0.6), X.t, { face: 'left' }); }
  else if (k < 0.4) { fr = fig(c, 'right', pileX + 40, FY, blendPose(POSE.stand, PZ([-1.1, -0.6], [-1.0, -0.5], [-0.3, -0.1], [0.4, 0.2], -0.55, 0.3), Math.sin(Math.PI * (k - 0.3) / 0.1)), X.t, { face: 'right' }); }
  else if (k < 0.72) { const x = lerp(pileX + 40, workX, ease((k - 0.4) / 0.32)); fr = fig(c, 'right', x, FY, { ...walkP(X.t * 11, 0.6), la: [2.9, 3.1], ra: [-2.9, -3.1] }, X.t, {}); plank(c, (fr.lhand[0] + fr.rhand[0]) / 2, Math.min(fr.lhand[1], fr.rhand[1]) - 8, 0.05 * Math.sin(X.t * 11)); }
  else { const h = cyc(k - 0.72, 0.09), sw = Math.sin(Math.PI * h); fr = fig(c, 'right', workX, FY, PZ([1.3, 1.6], [lerp(1.0, 2.9, sw), lerp(0.8, 3.1, sw)], [-0.3, -0.1], [0.4, 0.2], 0.3, 0.2), X.t, { expr: 'determined' }); hammer(c, fr.rhand, lerp(1.0, 2.9, sw)); if (sw < 0.15) for (let q = 0; q < 4; q++) circ(c, workX + 110 + (q - 1.5) * 16, FY - 50 - q * 5, 4, '#ffe28a', { a: 0.9 }); }
  return n + (k > 0.8 ? 1 : 0);
}

// ================================================================== kinds: "Thinking Isn't Doing"
MK.idea = {   // SAME IDEA: both light up; one is boxed in by WHAT IF? boxes, the other grabs the bulb and runs
  mood: 'normal',
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    const on = ease(seg(u, 0.2, 0.6));
    // left: the boxes fall around him one by one; he flinches and clutches his head
    const lx = XL, nb = Math.min(9, Math.floor(Math.max(0, u - 0.9) / 0.5)), SL = [[-150, 0], [150, 0], [-150, -70], [150, -70], [-150, -140], [150, -140], [-75, -210], [75, -210], [0, -210]];
    const flinch = Math.sin(X.t * 10) * 0.5 + 0.5, lp = u < 0.9 ? POSE.stand : PZ([-2.2 - 0.3 * flinch, -2.9], [2.2 + 0.3 * flinch, 2.9], [-0.18, -0.1], [0.18, 0.1], 0.06 * Math.sin(X.t * 7), 0.2);
    const fl = fig(c, 'left', lx, FY, lp, X.t, { expr: u < 0.9 ? 'joy' : 'shock', face: 'front' });
    bulb(c, fl.head[0], fl.head[1] - 120 - Math.min(0, 0), on * (u < 3 ? 1 : 0.4));
    for (let b = 0; b <= nb && b < 9; b++) { const tb = 0.9 + b * 0.5, f = b < nb ? 1 : ei(seg(u, tb, tb + 0.35)); const [dx, dy] = SL[b]; if (f > 0) box(c, lx + dx * 1.08, lerp(760, FY + dy * 1.08, f), 124, 76, 'WHAT IF?', 1, (1 - f) * 0.3); }
    // right: grabs the bulb and sprints; the ground streams past; START and DAY flags go by
    const run = u > 0.9, rx = XR - 20, ph = X.t * 12;
    const fr = fig(c, 'right', rx, FY, run ? runP(ph) : blendPose(POSE.stand, PZ([0.2, 0.4], [3.0, 3.1], [-0.14, -0.08], [0.14, 0.08], 0, 0), seg(u, 0.6, 0.9)), X.t, { expr: run ? 'joy' : 'joy' });
    bulb(c, run ? fr.rhand[0] + 10 : fr.head[0], run ? fr.rhand[1] - 40 : fr.head[1] - 120, on);
    const off = Math.max(0, u - 0.9) * 420; ground(c, 560, 1060, FY, off);
    [['START', 1.0], ['DAY 7', 2.4], ['DAY 30', 3.8], ['DAY 90', 5.2]].forEach(([tx, at]) => { const x = 1040 - (u - at) * 420; if (x > 560 && x < 1040 && u > at - 0.2) { line(c, [[x, FY], [x, FY - 150]], '#c9d1db', 5); rect(c, x, FY - 150, 96, 40, GOLDC, { r: 4 }); c.fillStyle = INK; c.font = '800 20px Inter'; c.textAlign = 'center'; c.fillText(tx, x + 48, FY - 123); } });
  },
};

MK.plan = {   // THE PLAN: pages pile into a tower vs planks hammered into a small boat
  mood: 'tense',
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    const lx = XL - 40, scrib = Math.sin(X.t * 16);
    desk(c, lx + 30, FY);
    fig(c, 'left', lx - 40, FY, PZ([0.9, 1.6], [1.2 + 0.12 * scrib, 1.75 + 0.15 * scrib], [2.2, 0.3], [2.35, 0.4], 0.22, 0.6), X.t, { expr: 'determined' });
    rect(c, lx - 85, FY - 60, 70, 10, '#8a6a4a', { r: 3 });   // stool
    const np = Math.floor(lerp(4, 40, seg(u, 0.2, S.dur - 0.3))); pages(c, lx + 150, FY, np, X.t); for (let q = 0; q < 2; q++) { const f = cyc(X.t, 0.5, q / 2); c.save(); c.translate(lerp(lx + 20, lx + 150, f), lerp(FY - 130, FY - np * 9 - 10, f) - 120 * Math.sin(Math.PI * f)); c.rotate(f * 5); rect(c, -40, -6, 80, 9, '#e9edf2', { r: 2 }); c.restore(); }
    label(c, `PLAN V${Math.max(1, Math.floor(np / 3))}`, lx + 150, FY - np * 9 - 30, 28, DIM, 1, { sp: 1 });
    // right: hammering planks into a hull at the water's edge
    water(c, 905, 1080, FY - 4, X.t, 0.9);
    const placed = buildLoop(c, u, X, 600, XR - 50, 1.6);
    boat(c, XR + 90, FY, 0.95, 1 + placed);
  },
};

MK.firsttry = {   // FIRST TRY: the boat sinks; he climbs out and builds a bigger one; the planner laughs and keeps writing
  mood: 'tense',
  hits(S) { return [1.6]; },
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    const lx = XL - 40, laugh = Math.sin(X.t * 12);
    pages(c, lx + 120, FY, 40 + Math.floor(u * 3), X.t);
    fig(c, 'left', lx - 30, FY, PZ([-0.4, -1.2 + 0.2 * laugh], [1.6, 1.6], [-0.18, -0.1], [0.18, 0.1], -0.12 + 0.05 * laugh, 0), X.t, { expr: 'smug' });
    if (u > 1.8 && u < 4.6) label(c, 'TOLD YOU.', lx - 20, FY - 420, 30, DIM, ease(seg(u, 1.8, 2.1)) * (1 - seg(u, 4.3, 4.6)), { sp: 2 });
    // right: sails, sinks at 1.6s, climbs out, hammers a bigger hull
    if (u < 2.6) water(c, 560, 1080, FY - 40, X.t); else water(c, 820, 1080, FY - 40, X.t);
    const sink = seg(u, 1.4, 2.6), bx = 820 + 60 * seg(u, 0, 1.4);
    if (u < 2.6) { boat(c, bx, FY - 40 + 140 * ei(sink), 0.9, 5, 0.5 * sink); if (u < 1.6) fig(c, 'right', bx - 10, FY - 70, POSE.cheer, X.t, { expr: 'joy', s: FIG_S * 0.8 }); else fig(c, 'right', bx - 20, FY - 40 + 120 * ei(seg(u, 1.6, 2.2)), POSES.fall, X.t, { expr: 'panic', s: FIG_S * 0.8 }); if (u > 1.6) for (let k = 0; k < 6; k++) { const f = cyc(u, 0.6, k / 6); circ(c, bx - 30 + k * 12, FY - 50 - 90 * f, 6 * (1 - f) + 2, '#a8d8ff', { a: 1 - f }); } }
    else { const placed = buildLoop(c, u - 2.6, X, 600, 760, 1.4); boat(c, 900, FY - 40, 1.1, 1 + placed); label(c, 'TRY 2', 900, FY - 170, 30, GOLDC, ease(seg(u, 2.8, 3.1)), { sp: 2 }); }
  },
};

MK.sailaway = {   // ONE YEAR LATER: the page tower topples onto the planner; the builder sails to the sunrise (climax)
  mood: 'climax',
  hits(S) { return [2.0]; },
  burst(S) { return 3.0; },
  draw(c, u, S, X) {
    const B = 3.0;
    splitStage(c, S, u, X);
    const lx = XL - 30, wob = u < 1.4 ? 0 : ei(seg(u, 1.4, 2.0)) * 40;
    if (u < 2.0) { pages(c, lx + 110, FY, 60, X.t, wob); fig(c, 'left', lx - 30, FY, PZ([0.9, 1.6], [1.2 + 0.12 * Math.sin(X.t * 16), 1.75], [2.2, 0.3], [2.35, 0.4], 0.22, 0.6), X.t, { expr: u < 1.4 ? 'determined' : 'shock' }); }
    else { for (let k = 0; k < 60; k++) { const j = JIT[300 + (k % 90)]; c.save(); c.translate(lx - 160 + j[0] * 330, FY - 8 - j[1] * 90 * (1 - seg(u, 2.0, 2.4) * 0.3)); c.rotate((j[2] - 0.5) * 1.5); rect(c, -46, -5, 92, 9, k % 2 ? '#e9edf2' : '#cdd3da', { r: 2 }); c.restore(); } const wave = Math.sin(X.t * 8); line(c, [[lx - 20, FY - 60], [lx - 20 + 20 * wave, FY - 140]], castOf('left').color, 11); circ(c, lx - 20 + 20 * wave, FY - 146, 11, castOf('left').color); }
    // right: sunrise, big sail, island
    sun(c, 960, FY - 300 + 120 * (1 - ease(seg(u, 0, B))), 70, ease(seg(u, 0, 1)));
    rect(c, 900, FY - 100, 180, 60, '#3d4a3a', { r: 30 }); line(c, [[990, FY - 100], [985, FY - 190]], '#a77b4f', 6); circ(c, 985, FY - 200, 34, '#5fcf7a', { blur: 10 });
    water(c, 560, 1080, FY - 40, X.t);
    const bx = lerp(620, 830, ease(seg(u, 0, B))); boat(c, bx, FY - 40, 1.15, 5, 0.04 * Math.sin(X.t * 2), ease(seg(u, 0.3, 1.2)));
    fig(c, 'right', bx - 30, FY - 104 - (u > B ? hop(X.t) * 0.6 : 0), u > B ? cheerP(X.t) : PZ([1.3, 1.6], [2.7, 2.9], [-0.14, -0.08], [0.14, 0.08], 0.05, 0), X.t, { expr: 'joy', s: FIG_S * 0.85 });
    if (u > B) { confettiBurst(c, bx, FY - 420, u - B); confettiRain(c, 580, 1000, X.t, ease(seg(u, B + 0.8, B + 1.6))); }
    if (S.line) { const a = ease(seg(u, B + 0.9, B + 1.5)); rect(c, 60, 1290, 960, 110, 'rgba(8,10,14,0.82)', { r: 24, a }); spaced(c, S.line, 540, 1365, '800 50px Inter', GOLDC, 3, a, 22, true, false); }
  },
};

// ================================================================== props for "Comfort Is A Slow Trap"
function bed(c, x, y, w = 300) { rect(c, x - w / 2, y - 60, w, 34, '#3a4250', { r: 8 }); rect(c, x - w / 2, y - 26, 16, 26, '#3a4250'); rect(c, x + w / 2 - 16, y - 26, 16, 26, '#3a4250'); rect(c, x - w / 2 - 6, y - 120, 18, 94, '#4a5363', { r: 6 }); rect(c, x - w / 2 + 16, y - 84, 70, 24, '#cfd6de', { r: 10 }); }
function phoneGlow(c, x, y, a = 1) { spot(c, x, y, 150, 'rgba(120,170,255,A)', 0.35 * a); rect(c, x - 14, y - 24, 28, 48, '#9cc4ff', { r: 6, blur: 18 }); }
function clockFace(c, x, y, r, hrs, mins) { circ(c, x, y, r, '#1c222b'); circ(c, x, y, r, '#c9d1db', { stroke: true, lw: 4 }); const ha = (hrs % 12 + mins / 60) / 12 * 6.283, ma = mins / 60 * 6.283; line(c, [[x, y], [x + Math.sin(ha) * r * 0.5, y - Math.cos(ha) * r * 0.5]], '#e9edf2', 6); line(c, [[x, y], [x + Math.sin(ma) * r * 0.8, y - Math.cos(ma) * r * 0.8]], REDC, 4); }
function gymBag(c, x, y, k) { rect(c, x - 60, y - 54, 120, 54, '#3b6fd8', { r: 18 }); line(c, [[x - 30, y - 54], [x - 20, y - 84], [x + 20, y - 84], [x + 30, y - 54]], '#9cc4ff', 5); rect(c, x - 40, y - 40, 80 * clamp(k), 8, '#9cc4ff', { r: 4 }); }
function shoe(c, x, y, a = 1) { rect(c, x - 26, y - 18, 52, 18, '#e9edf2', { r: 8, a }); rect(c, x - 26, y - 6, 56, 6, REDC, { r: 3, a }); }
function couch(c, x, y, sink) { c.save(); c.translate(0, sink); rect(c, x - 150, y - 70, 300, 50, '#7a4f9a', { r: 14 }); rect(c, x - 160, y - 120, 40, 100, '#6a4288', { r: 12 }); rect(c, x + 120, y - 120, 40, 100, '#6a4288', { r: 12 }); rect(c, x - 130, y - 150, 260, 70, '#6a4288', { r: 16 }); c.restore(); }
function sand(c, x0, x1, y, t) { const g = c.createLinearGradient(0, y, 0, y + 200); g.addColorStop(0, '#c9a066'); g.addColorStop(1, '#5e4526'); c.fillStyle = g; c.beginPath(); c.moveTo(x0, y + 220); for (let x = x0; x <= x1; x += 10) c.lineTo(x, y + 5 * Math.sin(x * 0.05 + t * 0.8)); c.lineTo(x1, y + 220); c.closePath(); c.fill(); for (let k = 0; k < 10; k++) { const j = JIT[k]; circ(c, x0 + j[0] * (x1 - x0), y + 20 + j[1] * 140, 3, 'rgba(255,240,200,0.4)'); } }
function rockWall(c, x0, x1, top, bot) { c.fillStyle = '#3a3f47'; c.beginPath(); c.moveTo(x0, bot); c.lineTo(x0 + 20, top + 40); c.lineTo(x0 + 70, top); c.lineTo(x1, top); c.lineTo(x1, bot); c.closePath(); c.fill(); c.strokeStyle = '#5c636d'; c.lineWidth = 3; c.stroke(); for (let k = 0; k < 9; k++) { const j = JIT[20 + k]; rect(c, x0 + 30 + j[0] * 60, top + 60 + k * ((bot - top - 80) / 9), 18, 10, '#8a929c', { r: 4 }); } }

// ================================================================== kinds: "Comfort Is A Slow Trap"
MK.night = {   // 11 PM: scrolling in bed until 2 AM vs packing the gym bag and setting out shoes
  mood: 'normal',
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    const D = S.dur, mins = 23 * 60 + lerp(0, 190, ei(seg(u, 0.3, D - 0.3))), hh = Math.floor(mins / 60) % 24, mm = Math.floor(mins % 60);
    bed(c, XL, FY, 330);
    const thumb = Math.sin(X.t * 14);
    const fl = fig(c, 'left', XL - 60, FY - 62, PZ([0.4, 2.9 + 0.08 * thumb], [0.7, 2.6], [1.65, 1.6], [1.75, 1.7], -1.2, 0), X.t, { expr: 'neutral', s: FIG_S * 0.9 });
    phoneGlow(c, fl.lhand[0] + 18, fl.lhand[1] - 10);
    clockFace(c, XL + 120, 860, 56, hh, mm);
    label(c, `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh >= 12 && hh < 24 ? 'PM' : 'AM'}`, XL + 120, 960, 30, hh >= 23 || hh < 1 ? DIM : REDC, 1, { sp: 1 });
    // right: walks between shelf and bag, packing; sets out shoes; sets the alarm
    const k = cyc(u, 1.3), n = Math.floor(u / 1.3), bx = XR + 110;
    gymBag(c, bx, FY, Math.min(1, n * 0.25));
    for (let q = 0; q < Math.min(2, Math.floor(u / 2.6)); q++) shoe(c, bx - 230 + q * 60, FY);
    let fr; if (k < 0.45) fr = fig(c, 'right', lerp(XR - 150, bx - 90, ease(k / 0.45)), FY, walkP(X.t * 10, 0.55), X.t, { expr: 'determined' });
    else if (k < 0.65) fr = fig(c, 'right', bx - 90, FY, blendPose(POSE.stand, PZ([1.3, 0.9], [1.4, 0.9], [-0.25, -0.1], [0.3, 0.15], 0.5, 0.3), Math.sin(Math.PI * (k - 0.45) / 0.2)), X.t, {});
    else fr = fig(c, 'right', lerp(bx - 90, XR - 150, ease((k - 0.65) / 0.35)), FY, walkP(X.t * 10, 0.55), X.t, { face: 'left' });
    clockFace(c, 935, 790, 50, hh, mm); if (u > D - 1.6) label(c, 'ALARM 6:00', 915, 880, 28, GOLDC, ease(seg(u, D - 1.6, D - 1.2)), { sp: 1 });
  },
};

MK.alarm = {   // 6 AM: snooze, snooze, snooze vs out of the door, running into the sunrise
  mood: 'tense',
  hits(S) { return [0.4]; },
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    bed(c, XL, FY, 330);
    const ring = cyc(u, 1.6), smack = ring > 0.55 && ring < 0.75, ringing = ring < 0.55;
    const bellX = XL + 140, shake = ringing ? Math.sin(X.t * 60) * 6 : 0;
    clockFace(c, bellX + shake, FY - 120, 40, 6, 0 + Math.floor(u / 1.6) * 9); if (ringing) for (let q = 0; q < 3; q++) line(c, [[bellX + 50 + q * 8, FY - 150 - q * 6], [bellX + 66 + q * 8, FY - 162 - q * 6]], GOLDC, 4);
    const arm = smack ? Math.sin(Math.PI * (ring - 0.55) / 0.2) : 0;
    fig(c, 'left', XL - 60, FY - 62, PZ([0.4, 0.9], [lerp(0.8, 2.0, arm), lerp(0.6, 1.4, arm)], [1.65, 1.6], [1.75, 1.7], -1.2 + 0.15 * arm, 0), X.t, { expr: ringing ? 'sad' : 'neutral', s: FIG_S * 0.9 });
    rect(c, XL - 140, FY - 110, 260, 52, '#5a6476', { r: 20, a: 0.95 });   // blanket over him
    label(c, `SNOOZE x${1 + Math.floor(u / 1.6)}`, XL, 785, 32, DIM, ease(seg(u, 0.3, 0.6)), { sp: 2 });
    // right: running, the sun coming up behind
    sun(c, 980, FY - 60 - 200 * ease(seg(u, 0, S.dur)), 60, 1);
    fig(c, 'right', XR - 40, FY, runP(X.t * 12), X.t, { expr: 'joy' });
    ground(c, 560, 1060, FY, u * 420);
    label(c, `${(u * 0.45).toFixed(1)} KM`, XR, 785, 34, GOLDC, ease(seg(u, 0.3, 0.6)), { sp: 1 });
  },
};

MK.sinking = {   // ONE YEAR: the couch sinks into the sand while he snacks and scrolls vs climbing a rock wall
  mood: 'build',
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    const D = S.dur, sink = lerp(20, 120, ease(seg(u, 0, D)));
    couch(c, XL, FY + 10, sink * 0.6);
    const munch = cyc(X.t, 0.8), hand = Math.sin(Math.PI * munch);
    const fl = fig(c, 'left', XL - 10, FY - 70 + sink * 0.6, PZ([lerp(0.9, 2.6, hand), lerp(1.4, 3.0, hand)], [0.7, 2.6], [2.0, 0.2], [2.1, 0.3], -0.25, 0.5), X.t, { expr: 'neutral' });
    phoneGlow(c, fl.rhand[0] + 10, fl.rhand[1] - 10, 0.8);
    if (hand < 0.3) circ(c, fl.lhand[0], fl.lhand[1], 8, '#ffcf6e');
    sand(c, 20, 520, FY - 70 + sink, X.t);
    label(c, 'COMFY.', XL, 785, 34, DIM, ease(seg(u, 0.3, 0.6)), { sp: 3 });
    // right: climbing out of a canyon
    rockWall(c, 700, 1060, 820, FY + 40);
    const climbY = lerp(FY - 40, 990, ease(seg(u, 0.2, D - 0.2))), ph = X.t * 7;
    fig(c, 'right', 800, climbY + 230, PZ([3.0 + 0.3 * Math.sin(ph), 2.9], [2.7 - 0.3 * Math.sin(ph), 3.0], [0.6 + 0.4 * Math.sin(ph), 0.0], [0.6 - 0.4 * Math.sin(ph), 0.1], 0.35, 0), X.t, { expr: 'determined' });
    label(c, `${Math.round(lerp(0, 72, seg(u, 0.2, D - 0.2)))}% UP`, XR + 60, 785, 34, GOLDC, ease(seg(u, 0.3, 0.6)), { sp: 1 });
  },
};

MK.theview = {   // FIVE YEARS: only a phone hand above the sand vs the summit at sunrise; he throws a rope down
  mood: 'climax',
  burst(S) { return 2.4; },
  draw(c, u, S, X) {
    const B = 2.4;
    splitStage(c, S, u, X);
    sand(c, 20, 520, FY - 200, X.t);
    const thumb = Math.sin(X.t * 14), reach = ease(seg(u, 3.9, 4.6)), hx = XL + 6 + 40 * reach + 6 * Math.sin(X.t * 5) * reach, hy = FY - 300 - 10 * reach; line(c, [[XL, FY - 190], [hx, hy]], castOf('left').color, 11); circ(c, hx - 4 + 4 * thumb * (1 - reach), hy - 18, 11, castOf('left').color); if (reach < 0.5) phoneGlow(c, XL + 20, FY - 330, 0.9 * (1 - 2 * reach));
    sun(c, 985, 900, 70, 1);
    rockWall(c, 700, 1060, 1060, FY + 40);
    const atTop = u > 1.2, ph = X.t * 7;
    if (!atTop) fig(c, 'right', 800, lerp(1300, 1060, ease(seg(u, 0, 1.2))) + 40, PZ([3.0 + 0.3 * Math.sin(ph), 2.9], [2.7 - 0.3 * Math.sin(ph), 3.0], [0.6, 0.0], [0.6, 0.1], 0.35, 0), X.t, { expr: 'determined' });
    else { const thr = u > B + 0.8, fr = fig(c, 'right', 820, 1060 - (u > B && !thr ? hop(X.t) * 0.6 : 0), u < B ? walkP(X.t * 8, 0.4) : thr ? PZ([-1.6 + 0.5 * Math.sin(X.t * 7), -1.9 + 0.5 * Math.sin(X.t * 7)], [-1.3 - 0.5 * Math.sin(X.t * 7), -1.6 - 0.5 * Math.sin(X.t * 7)], [-0.3, -0.1], [0.3, 0.1], -0.25, 0) : cheerP(X.t), X.t, { expr: 'joy', s: FIG_S * 0.8 });
      if (thr) { const f = ease(seg(u, B + 0.8, B + 1.8)); const end = [lerp(fr.lhand[0], XL + 40, f), lerp(fr.lhand[1], FY - 290, f)]; line(c, [fr.lhand, [lerp(fr.lhand[0], end[0], 0.5), Math.max(fr.lhand[1], end[1]) + 80 * f], end], '#d9c49a', 5); } }
    if (u > B) { confettiBurst(c, 820, 800, u - B); confettiRain(c, 580, 1000, X.t, ease(seg(u, B + 0.8, B + 1.6))); }
    if (S.line) { const a = ease(seg(u, B + 1.6, B + 2.2)); rect(c, 60, 1290, 960, 110, 'rgba(8,10,14,0.82)', { r: 24, a }); spaced(c, S.line, 540, 1365, '800 50px Inter', GOLDC, 3, a, 22, true, false); }
  },
};

// ================================================================== props for "Ego Pays Full Price"
const HELP = { name: 'H', i: 5, color: '#8f99a6', core: '#c9d1db', accessory: null };
function helper(c, x, y, pose, t, o = {}) { const s = o.s || FIG_S * 0.78, flip = o.face === 'left'; c.save(); if (flip) { c.translate(x, 0); c.scale(-1, 1); c.translate(-x, 0); } const r = drawFigure(c, HELP, { x, y, mode: 'feet' }, pose, t, o.alpha == null ? 1 : o.alpha, s, { expr: o.expr || 'neutral', facing: 'right' }); c.restore(); return r; }
function mud(c, x, y, w) { c.save(); c.fillStyle = '#4a3523'; c.beginPath(); c.ellipse(x, y + 6, w / 2, 22, 0, 0, 7); c.fill(); c.restore(); }
function arrowShot(c, x, y, ang, a = 1, txt) { c.save(); c.globalAlpha *= a; c.translate(x, y); c.rotate(ang); line(c, [[-70, 0], [20, 0]], '#e9edf2', 5); c.fillStyle = REDC; c.beginPath(); c.moveTo(34, 0); c.lineTo(14, -10); c.lineTo(14, 10); c.closePath(); c.fill(); line(c, [[-70, 0], [-82, -10]], REDC, 4); line(c, [[-70, 0], [-82, 10]], REDC, 4); c.restore(); if (txt) label(c, txt, clamp(x, 135, 935), y - 26, 28, REDC, a, { sp: 1 }); }
function shield(c, x, y, a = 1) { c.save(); c.globalAlpha *= a; c.fillStyle = '#7a8594'; c.strokeStyle = '#c9d1db'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y - 60); c.quadraticCurveTo(x + 50, y - 50, x + 46, y); c.quadraticCurveTo(x + 40, y + 50, x, y + 70); c.quadraticCurveTo(x - 40, y + 50, x - 46, y); c.quadraticCurveTo(x - 50, y - 50, x, y - 60); c.fill(); c.stroke(); c.restore(); }
function ladder(c, x, yBase, rungs, gap = 46) { const top = yBase - Math.max(1, rungs) * gap - 20; line(c, [[x - 34, yBase], [x - 34, top]], '#c9a27a', 6); line(c, [[x + 34, yBase], [x + 34, top]], '#c9a27a', 6); for (let k = 1; k <= rungs; k++) line(c, [[x - 34, yBase - k * gap], [x + 34, yBase - k * gap]], '#e9edf2', 5); return top; }
function rock(c, x, y, r, a = 1) { c.save(); c.globalAlpha *= a; c.fillStyle = '#7d8590'; c.strokeStyle = '#aeb6c0'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x - r * 0.8, y - r * 0.7); c.lineTo(x - r * 0.1, y - r); c.lineTo(x + r * 0.7, y - r * 0.75); c.lineTo(x + r, y); c.closePath(); c.fill(); c.stroke(); c.restore(); }
function stoneStairs(c, x0, yBase, n, w = 70, h = 46) { for (let k = 0; k < n; k++) for (let j = 0; j <= k; j++) rect(c, x0 + k * w, yBase - (j + 1) * h, w - 4, h - 4, j === k ? '#9aa3ad' : '#7d8590', { r: 6 }); return [x0 + (n - 1) * w + w / 2, yBase - n * h]; }
function trophy(c, x, y, shine = 1) { c.save(); glow(c, GOLDC, 16 * shine); c.fillStyle = GOLDC; c.beginPath(); c.moveTo(x - 26, y - 70); c.lineTo(x + 26, y - 70); c.quadraticCurveTo(x + 24, y - 30, x, y - 24); c.quadraticCurveTo(x - 24, y - 30, x - 26, y - 70); c.fill(); c.fillRect(x - 5, y - 26, 10, 16); c.fillRect(x - 18, y - 12, 36, 10); c.restore(); }

// ================================================================== kinds: "Ego Pays Full Price"
MK.stuckcar = {   // STUCK: pushes alone and waves helpers off vs asks; two helpers push with him and the car rolls out
  mood: 'tense',
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    const D = S.dur, ph = X.t * 6;
    // left: car in the mud, wheels spinning, he pushes from behind; a helper walks up, gets waved off, walks away
    mud(c, XL + 90, FY, 320); const spin = X.t * 14; car(c, XL + 110, FY + 4, 0.85, spin, 0.6);
    for (let k = 0; k < 8; k++) { const f = cyc(X.t, 0.35, k / 8), side = k % 2 ? 1 : -1; circ(c, XL + 110 + side * (90 + f * 110), FY - 20 - 90 * Math.sin(Math.PI * f), 8, '#6a4b30', { a: 1 - f }); }
    const wave = u > 2.0 && u < 3.0, wv = Math.sin(X.t * 14);
    fig(c, 'left', XL - 140, FY, wave ? PZ([1.45, 1.75], [2.4 + 0.4 * wv, 2.8 + 0.4 * wv], [-0.4, -0.6], [0.2, -0.05], 0.2, 0) : pushP(ph), X.t, { expr: wave ? 'smug' : 'determined' });
    if (u > 1.0 && u < 4.6) { const hx = u < 2.0 ? lerp(-60, 60, seg(u, 1.0, 2.0)) : u < 3.2 ? 60 : lerp(60, -80, seg(u, 3.2, 4.6)); helper(c, hx, FY, u < 2.0 || u > 3.2 ? walkP(X.t * 9) : PZ([-0.2, -0.1], [2.2, 2.6], [-0.14, -0.08], [0.14, 0.08], 0, 0), X.t, { face: u > 3.2 ? 'left' : 'right' }); }
    if (u > 2.0 && u < 3.2) label(c, 'I GOT THIS.', XL - 60, 785, 30, DIM, ease(seg(u, 2.0, 2.3)), { sp: 2 });
    if (u > 3.4) label(c, 'STILL STUCK', XL, 785, 30, REDC, ease(seg(u, 3.4, 3.8)), { sp: 2 });
    // right: asks ("HELP?"), two helpers join, the car rolls out at 3.6 s
    const out = ease(seg(u, 3.4, D - 0.4)), cx = XR + 30 + out * 25;
    mud(c, XR + 30, FY, 320); car(c, cx, FY + 4 - 6 * Math.sin(Math.PI * seg(u, 3.4, 3.9)), 0.85, X.t * 14 * (u > 3.4 ? 1 : 0.3), 0.8);
    if (u < 1.2) { const wv2 = Math.sin(X.t * 11); fig(c, 'right', XR - 190, FY - 10 * Math.abs(wv2), PZ([-2.3 - 0.5 * wv2, -2.8 - 0.4 * wv2], [2.3 + 0.5 * wv2, 2.8 + 0.4 * wv2], [-0.14, -0.08], [0.14, 0.08], 0, -0.2), X.t, { expr: 'neutral' }); label(c, 'HELP?', XR - 190, 785, 32, GOLDC, ease(seg(u, 0.2, 0.5)), { sp: 2 }); }
    else { const k = ease(seg(u, 1.2, 2.2)); for (let h = 0; h < 2; h++) helper(c, lerp(560, XR - 250 - h * 50 + out * 25, k), FY - 30 - h * 20, k < 1 ? walkP(X.t * 9 + h) : pushP(ph + h), X.t, { s: FIG_S * (0.68 - h * 0.06) }); fig(c, 'right', XR - 200 + out * 25, FY, pushP(ph + 1), X.t, { expr: 'determined' }); }
    if (u > 3.6) label(c, 'MOVING.', XR, 785, 32, GOLDC, ease(seg(u, 3.6, 3.9)), { sp: 2 });
  },
};

MK.feedback = {   // FEEDBACK: arrows bounce off his shield vs he catches them and nails them into a ladder, climbing
  mood: 'tense',
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    const per = 1.0, n = Math.floor(Math.max(0, u - 0.3) / per), f = cyc(u - 0.3, per);
    // left: shield up; each arrow hits and bounces off
    const up = f > 0.3 && f < 0.75, fl = fig(c, 'left', XL - 40, FY, up ? PZ([1.4, 2.6], [0.4, 0.8], [-0.3, -0.3], [0.3, 0.2], -0.08, 0) : POSE.stand, X.t, { expr: 'smug' });
    shield(c, XL + 30, FY - 230, up ? 1 : 0.6);
    if (u > 0.3) { if (f < 0.5) arrowShot(c, lerp(560, XL + 90, f / 0.5), FY - 240, Math.PI, 1, f < 0.4 ? "YOU'RE WRONG" : null); else arrowShot(c, XL + 90 + (f - 0.5) * 200, FY - 240 - (f - 0.5) * 320 + 500 * (f - 0.5) * (f - 0.5), Math.PI + (f - 0.5) * 9, 1 - (f - 0.5) * 2); }
    label(c, 'SAME PLACE', XL, 785, 30, DIM, ease(seg(u, 1.4, 1.8)), { sp: 2 });
    // right: catches the arrow, hammers it into the ladder as a rung, climbs one rung
    const rungs = Math.min(6, n), lx = XR + 80, top = ladder(c, lx, FY, Math.max(1, rungs), 34);
    const rise = Math.min(rungs, n) * 46 * ease(seg(f, 0.75, 1)) + Math.max(0, Math.min(rungs, n) - 1) * 0;
    const footY = FY - Math.max(0, rungs - 1) * 46 - (f > 0.75 && rungs < 6 ? 46 * ease((f - 0.75) / 0.25) : 0) * 0;
    const fy = FY - Math.min(5, n) * 34 - (f > 0.75 && n < 6 ? 34 * ease((f - 0.75) / 0.25) : 0);
    const catching = f > 0.3 && f < 0.55, nailing = f >= 0.55 && f < 0.75;
    const fr = fig(c, 'right', lx - 70, Math.min(FY, fy), catching ? PZ([-0.4, -0.2], [2.6, 2.9], [-0.14, -0.08], [0.14, 0.08], -0.05, 0) : nailing ? PZ([1.3, 1.6], [lerp(1.0, 2.8, Math.sin(Math.PI * cyc(f, 0.1))), 1.2], [-0.2, -0.1], [0.2, 0.1], 0.2, 0) : PZ([2.8, 3.0], [2.9, 3.1], [0.6 * Math.sin(X.t * 8), 0.0], [-0.6 * Math.sin(X.t * 8), 0.1], 0.1, 0), X.t, { expr: 'determined', s: FIG_S * 0.8 });
    if (u > 0.3 && f < 0.32) arrowShot(c, lerp(1060, fr.rhand[0] + 30, f / 0.32), FY - 290 - Math.min(5, n) * 34, Math.PI, 1, f < 0.25 ? "YOU'RE WRONG" : null);
    if (catching) arrowShot(c, fr.rhand[0] + 10, fr.rhand[1] - 10, -1.2, 1);
    label(c, `${rungs} RUNGS HIGHER`, XR, 1268, 30, GOLDC, ease(seg(u, 1.4, 1.8)), { sp: 1 });
  },
};

MK.trip = {   // MISTAKES: trips on the same rock again and again vs trips once, then picks the rock up and builds steps
  mood: 'build',
  draw(c, u, S, X) {
    splitStage(c, S, u, X);
    const per = 2.0, f = cyc(u, per), n = Math.floor(u / per);
    // left: walk, trip, get up, kick the rock (hop on one foot), walk back, repeat
    rock(c, XL + 60, FY, 38);
    let lp, lx = XL - 60, face = 'right', expr = 'smug';
    if (f < 0.35) { lx = lerp(XL - 200, XL - 10, f / 0.35); lp = walkP(X.t * 10); }
    else if (f < 0.55) { lx = XL + 20; lp = POSES.fall; expr = 'panic'; }
    else if (f < 0.75) { lx = XL - 10; lp = PZ([-0.3, -0.2], [0.3, 0.2], [1.4, 0.4], [-0.1, -0.05], 0.05, 0); expr = 'shock'; }
    else { lx = lerp(XL - 10, XL - 200, (f - 0.75) / 0.25); lp = walkP(X.t * 10); face = 'left'; expr = 'sad'; }
    fig(c, 'left', lx, FY - (f > 0.55 && f < 0.75 ? 20 * Math.abs(Math.sin(X.t * 14)) : 0), lp, X.t, { face, expr, rot: f > 0.35 && f < 0.55 ? 1.2 * ease((f - 0.35) / 0.2) : 0 });
    label(c, `TRIPPED x${n + (f > 0.4 ? 1 : 0)}`, XL, 785, 30, REDC, ease(seg(u, 0.6, 1.0)), { sp: 2 });
    // right: trips once, then carries rocks into steps
    const pf = cyc(u, 1.6), steps = Math.min(5, Math.floor(Math.max(0, u - 1.0) / 1.6));
    const [sx, sy] = stoneStairs(c, 700, FY, Math.max(0, steps)); for (let q = 0; q < 3; q++) rock(c, 1010 - q * 18, FY - q * 22, 26);
    if (u < 1.0) fig(c, 'right', 640, FY, u < 0.5 ? walkP(X.t * 10) : POSES.fall, X.t, { expr: u < 0.5 ? 'neutral' : 'panic', rot: u > 0.5 ? 0.9 * ease(seg(u, 0.5, 0.8)) : 0 });
    else { const go = pf < 0.5, x = go ? lerp(sx - 20, 980, ease(pf / 0.5)) : lerp(980, sx - 20, ease((pf - 0.5) / 0.5)); const fr = fig(c, 'right', Math.min(980, x), FY, { ...walkP(X.t * 11, 0.55), ...(go ? {} : { la: [2.9, 3.1], ra: [-2.9, -3.1] }) }, X.t, { face: go ? 'right' : 'left', expr: 'determined' }); if (!go) rock(c, fr.lhand[0] - (fr.lhand[0] - fr.rhand[0]) / 2, Math.min(fr.lhand[1], fr.rhand[1]) - 4, 24); }
    label(c, `${steps} STEPS UP`, XR, 1268, 30, GOLDC, ease(seg(u, 1.4, 1.8)), { sp: 2 });
  },
};

MK.summit = {   // ONE YEAR LATER: polishing a trophy alone at the bottom vs the top of a staircase of mistakes (climax)
  mood: 'climax',
  burst(S) { return 2.6; },
  draw(c, u, S, X) {
    const B = 2.6;
    splitStage(c, S, u, X);
    trophy(c, XL + 70, FY - 120, 1); rect(c, XL + 30, FY - 120, 80, 120, '#3a4250', { r: 6 });
    const pol = Math.sin(X.t * 12); fig(c, 'left', XL - 60, FY, PZ([1.3, 1.7], [1.3 + 0.25 * pol, 1.9 + 0.2 * pol], [-0.14, -0.08], [0.14, 0.08], 0.1, 0), X.t, { expr: 'smug' });
    label(c, 'ALONE', XL, 785, 30, DIM, ease(seg(u, 0.8, 1.2)), { sp: 3 });
    sun(c, 960, 980, 60, 1);
    const [sx, sy] = stoneStairs(c, 600, FY, 6, 64, 36);
    const climb = ease(seg(u, 0, B)), stepI = Math.min(5, Math.floor(climb * 6)), within = (climb * 6) % 1;
    const fx = 600 + 32 + stepI * 64 + 64 * within, fyy = FY - (stepI + 1) * 36 - 36 * Math.sin(Math.PI * within) * 0.3;
    const top = u > B, fr = fig(c, 'right', top ? sx : fx, top ? sy - hop(X.t) * 0.6 : fyy, top ? cheerP(X.t) : walkP(X.t * 10, 0.55, 0.15), X.t, { expr: 'joy', s: FIG_S * 0.66 });
    if (top) { line(c, [[sx + 40, sy], [sx + 40, sy - 150]], '#e9edf2', 5); rect(c, sx + 40, sy - 150, 60 * ease(seg(u, B, B + 0.4)), 40, GOLDC, { r: 4, blur: 14 }); confettiBurst(c, sx, sy - 300, u - B); confettiRain(c, 580, 1000, X.t, ease(seg(u, B + 0.8, B + 1.6))); }
    if (S.line) { const a = ease(seg(u, B + 1.0, B + 1.6)); rect(c, 60, 1290, 960, 110, 'rgba(8,10,14,0.82)', { r: 24, a }); spaced(c, S.line, 540, 1365, '800 52px Inter', GOLDC, 3, a, 22, true, false); }
  },
};

// ================================================================== compile / timeline
function compileMontage(spec, brand, style) {
  const scenes = []; let t = 0;
  for (const [k, S] of (spec.scenes || []).entries()) { const kind = MK[S.kind]; if (!kind) throw new Error(`scene ${k + 1}: unknown kind "${S.kind}" (known: ${Object.keys(MK).join(', ')})`); const D = S.dur; kind.__D = D; scenes.push({ k, S, kind, t0: t, t1: t + D, hits: (kind.hits ? kind.hits(S) : []).map(h => t + h), burst: kind.burst ? t + kind.burst(S) : null, mood: S.mood || kind.mood || 'normal' }); t += D; }
  const ed = brand.endcard ? 2.4 : 0;
  const cast = spec.cast || {};
  CAST.left = { name: 'L', i: 0, color: cast.left || '#dfe5ec', core: mixWhite(cast.left || '#dfe5ec', 0.72), accessory: cast.leftAccessory || null };
  CAST.right = { name: 'R', i: 1, color: cast.right || GOLDC, core: mixWhite(cast.right || GOLDC, 0.72), accessory: cast.rightAccessory || 'headband' };
  return { spec, brand, style, scenes, dur: t, realDur: t + ed, endcard: ed ? [t, t + ed] : null };
}
function sceneAt(r) { for (const s of MS.scenes) if (r < s.t1) return s; return MS.scenes[MS.scenes.length - 1]; }
function bgFill(c) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05070b'); g.addColorStop(0.55, '#0b0f16'); g.addColorStop(1, '#07090d'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function renderMontage(r) {
  const c = ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; bgFill(c);
  if (MS.endcard && r >= MS.endcard[0]) { const last = MS.scenes[MS.scenes.length - 1]; drawScene(c, last, last.S.dur - 0.001); drawEndcard((r - MS.endcard[0]) / (MS.endcard[1] - MS.endcard[0])); c.restore(); return; }
  const s = sceneAt(r), u = r - s.t0;
  drawScene(c, s, u);
  // cut: a quick dip in and out of black around every scene change, plus a bright line wipe
  const into = u, outOf = s.t1 - r;
  if (s.k > 0 && into < 0.22) { c.fillStyle = `rgba(0,0,0,${1 - ease(into / 0.22)})`; c.fillRect(0, 0, W, H); }
  if (outOf < 0.12 && s.k < MS.scenes.length - 1) { c.fillStyle = `rgba(0,0,0,${ease(1 - outOf / 0.12)})`; c.fillRect(0, 0, W, H); }
  c.restore();
}
function drawScene(c, s, u) {
  const X = { t: s.t0 + u, scene: s };
  c.save(); s.kind.draw(c, u, s.S, X); c.restore();
  heading(c, s.S, u);
  if (MS.spec.footnote && s.k === MS.scenes.length - 1) spaced(c, MS.spec.footnote.toUpperCase(), 540, 590, '700 26px Inter', '#9aa3ad', 2, ease(seg(u, 0.3, 0.8)), 0, true, false);
}
function montageCues() {
  const out = { dur: MS.realDur, style: MS.style, motif: (MS.brand.music && MS.brand.music.motif) || null, music: MS.spec.music || {}, beats: [], crash: [], shake: [], burst: [], fling: [], pops: [], whoosh: MS.scenes.slice(1).map(s => s.t0), rain: [], question: null, slow: [], hook: null, rewind: [], endcard: MS.endcard ? MS.endcard[0] : null, milestones: [], foley: { kind: null, active: [] } };
  for (const s of MS.scenes) { out.beats.push({ t0: s.t0, t1: s.t1 - 1e-4, mood: s.mood }); out.crash.push(...s.hits); if (s.burst != null) out.burst.push(s.burst); }
  if (MS.endcard) out.beats.push({ t0: MS.endcard[0], t1: MS.endcard[1], mood: 'end' });
  return out;
}

// ------------------------------------------------------------------ window API (same shape as engine.js)
window.loadSpec = (spec, brand, style) => {
  WARN.clear(); MS = compileMontage(spec, brand, { ...style });
  T = { spec, brand, style: MS.style, chars: [CAST.left, CAST.right], scene: { facing: 'right' }, __joints: {}, beats: MS.scenes.map(s => ({ bi: s.k, t0: s.t0, t1: s.t1, b: { style: s.k === MS.scenes.length - 1 ? 'closing' : null } })), segs: MS.endcard ? [{ kind: 'endcard', r0: MS.endcard[0], r1: MS.endcard[1] }] : [] };
  const b = MS.scenes.map(s => s.burst).filter(x => x != null).pop();
  return { dur: MS.dur, realDur: MS.realDur, tail: b != null ? MS.dur - b : 0, warnings: [...WARN] };
};
window.render = r => renderMontage(r);
window.cues = () => montageCues();
window.__T = () => T;
window.__storyAt = r => r;
window.__realOf = s => s;
window.reviewRun = (fps = 15) => {
  WARN.clear();
  const n = Math.floor(MS.realDur * fps), [, smc] = mk(108, 192), diffs = [], bg = [];
  let prev = null;
  for (let f = 0; f < n; f++) {
    const r = f / fps; renderMontage(r);
    smc.drawImage(cv, 0, 0, 108, 192); const d = smc.getImageData(0, 0, 108, 192).data, g = new Float32Array(108 * 192);
    for (let k = 0; k < g.length; k++) g[k] = 0.299 * d[4 * k] + 0.587 * d[4 * k + 1] + 0.114 * d[4 * k + 2];
    if (prev) { let sm = 0; for (let k = 0; k < g.length; k++) sm += Math.abs(g[k] - prev[k]); diffs.push(sm / g.length); }
    prev = g;
    if (f % 5 === 0) { const sorted = Array.from(g).sort((a, b) => a - b); bg.push(sorted[Math.floor(sorted.length * 0.2)]); const ml = g.reduce((x, y) => x + y, 0) / g.length; if (ml > 90 && !(MS.endcard && r >= MS.endcard[0])) WARN.add(`washed-out frame at ${r.toFixed(1)}s (mean luma ${ml.toFixed(0)})`); }
  }
  /* action: in every mini-scene both figures must be physically doing something most of the time (round 2 lesson) */
  const action = [];
  for (const s of MS.scenes) for (const side of ['left', 'right']) { if (!s.kind.act) continue; let on = 0, all = 0; for (let u = 0; u < s.S.dur; u += 0.1) { all++; if (s.kind.act(u, side) > 0.4) on++; } const fr = on / Math.max(1, all); action.push({ name: `${s.k + 1}${side[0].toUpperCase()}`, frac: +fr.toFixed(2) }); if (fr < 0.6) WARN.add(`idle figure: scene ${s.k + 1} (${s.S.kind}) ${side} acts only ${(fr * 100).toFixed(0)}% of the scene (needs 60%)`); }
  const perSecond = []; diffs.forEach((v, k) => { const sec = Math.floor((k + 1) / fps); (perSecond[sec] = perSecond[sec] || []).push(v); });
  return { motion: perSecond.map(a => a.reduce((x, y) => x + y, 0) / a.length), washed: [], bgLum: bg.reduce((x, y) => x + y, 0) / Math.max(1, bg.length), warnings: [...WARN], realDur: MS.realDur, action };
};
window.montageKinds = () => Object.keys(MK);
