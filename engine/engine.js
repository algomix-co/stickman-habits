// Shorts Factory engine v2: spec + brand + style -> frames. Every frame is a pure function of real time r.
'use strict';
const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const easeIO = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const easeOut = u => 1 - Math.pow(1 - clamp(u), 3);
const easeBack = u => { u = clamp(u); const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const PALETTE = ['#ff5a6e', '#b98cff', '#5ec8ff', '#e8edf2', '#ffc53d', '#5dffb0'];
const RED = '#ff4d5e', GOLD = '#ffc53d', INK = '#0d0f12';
function mixWhite(hex, k) { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, n >> 8 & 255, n & 255].map(v => Math.round(v + (255 - v) * k)); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const [scene, sc] = mk(W, H), [g1, g1c] = mk(W / 4, H / 4), [g2, g2c] = mk(W / 8, H / 8);
const WARN = new Set();
let T = null;

// =====================================================================================  character design
const BODIES = {
  stick: { limb: 9, torso: 9, head: 1.0, shape: 'circle' },
  bean: { limb: 11, torso: 26, head: 1.6, shape: 'circle' },
  noodle: { limb: 6, torso: 6, head: 1.8, shape: 'circle' },
  block: { limb: 12, torso: 22, head: 1.6, shape: 'square' },
};
const DEFAULT_LOOK = { body: 'stick', face: false, lineStyle: 'neon', accessory: null, accent: '#ffffff', winnerCrown: false };
function lookOf(ch) { const L = { ...DEFAULT_LOOK, ...((T && T.brand && T.brand.character) || {}), ...(ch.look || {}) }; if (ch.accessory !== undefined) L.accessory = ch.accessory; return { ...(BODIES[L.body] || BODIES.stick), ...L }; }
const EXPR = { active: 'determined', idle: 'neutral', stand: 'neutral', boast: 'smug', throw: 'smug', win: 'joy', cheer: 'joy', quit: 'sad', sit: 'sad', sad: 'sad', shock: 'shock', fall: 'panic' };

const POSES = {
  stand: { la: [-0.18, -0.08], ra: [0.18, 0.08], ll: [-0.14, -0.08], rl: [0.14, 0.08], lean: 0, drop: 0 },
  cheer: { la: [-2.5, -2.85], ra: [2.5, 2.85], ll: [-0.2, -0.12], rl: [0.2, 0.12], lean: 0, drop: -0.3 },
  throw: { la: [-0.35, -0.15], ra: [2.2, 2.75], ll: [-0.22, -0.1], rl: [0.2, 0.12], lean: -0.06, drop: 0 },
  sad: { la: [-0.04, 0.02], ra: [0.04, -0.02], ll: [-0.1, -0.06], rl: [0.1, 0.06], lean: 0.12, drop: 1 },
  fall: { la: [-2.2, -1.5], ra: [2.0, 2.6], ll: [-0.7, 0.3], rl: [0.6, -0.2], lean: -0.35, drop: -0.5 },
  sit: { la: [0.9, 1.5], ra: [1.0, 1.7], ll: [2.2, 0.3], rl: [2.35, 0.4], lean: 0.25, drop: 1 },
  shock: { la: [-2.3, 2.7], ra: [2.3, -2.7], ll: [-0.16, -0.08], rl: [0.16, 0.08], lean: -0.08, drop: -0.2 },
};
function blendPose(a, b, u) {
  if (u <= 0) return a; if (u >= 1) return b;
  const o = {}; for (const k of ['la', 'ra', 'll', 'rl']) o[k] = [lerp(a[k][0], b[k][0], u), lerp(a[k][1], b[k][1], u)];
  o.lean = lerp(a.lean, b.lean, u); o.drop = lerp(a.drop, b.drop, u); return o;
}
const R = 17, TORSO = 52, UA = 30, FA = 28, TH = 34, SH = 34;
function rig(p, t, phase, hr) {
  const br = 0.085 * Math.sin(2.4 * t + phase);
  const up = [Math.sin(p.lean), -Math.cos(p.lean)];
  const hip = [0, 0], neck = [up[0] * TORSO, up[1] * TORSO], sh = [up[0] * TORSO * .86, up[1] * TORSO * .86];
  const hd = p.lean + p.drop * 0.55, head = [neck[0] + Math.sin(hd) * (hr + 5), neck[1] - Math.cos(hd) * (hr + 5)];
  const limb = (o, a0, a1, l0, l1) => { const j = [o[0] + Math.sin(a0) * l0, o[1] + Math.cos(a0) * l0]; return [o, j, [j[0] + Math.sin(a1) * l1, j[1] + Math.cos(a1) * l1]]; };
  const la = limb(sh, p.la[0] - br, p.la[1] - br, UA, FA), ra = limb(sh, p.ra[0] + br, p.ra[1] + br, UA, FA);
  const ll = limb(hip, p.ll[0], p.ll[1], TH, SH), rl = limb(hip, p.rl[0], p.rl[1], TH, SH);
  const low = Math.max(ll[2][1], rl[2][1], ll[1][1], rl[1][1], 6) + 4.5;
  return { hip, neck, head, la, ra, ll, rl, low };
}
const figH = () => 160 + (lookOf(T.chars[0]).head - 1) * 2 * R;

function drawFace(c, x, y, r, expr, fx) {
  c.save(); c.fillStyle = INK; c.strokeStyle = INK; c.lineCap = 'round'; c.lineWidth = Math.max(1.6, r * 0.12);
  const cx = x + fx * 0.3 * r, ey = y - 0.06 * r, dx = fx ? 0.24 * r : 0.33 * r, eyes = [cx - dx, cx + dx], er = 0.12 * r;
  for (const e of eyes) {
    c.beginPath();
    if (expr === 'joy') { c.arc(e, ey + 0.06 * r, 0.13 * r, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
    else if (expr === 'panic') { const k = 0.1 * r; c.moveTo(e - k, ey - k); c.lineTo(e + k, ey + k); c.moveTo(e + k, ey - k); c.lineTo(e - k, ey + k); c.stroke(); }
    else if (expr === 'sad') { c.arc(e, ey + 0.03 * r, er * 0.85, 0, 7); c.fill(); }
    else if (expr === 'shock') { c.arc(e, ey, er * 1.25, 0, 7); c.fill(); }
    else { c.arc(e, ey, er, 0, 7); c.fill(); }
  }
  const by = ey - 0.3 * r, bw = 0.16 * r;
  const brow = (e, inner, outer) => { const s = e < cx ? 1 : -1; c.beginPath(); c.moveTo(e - s * bw, by + outer); c.lineTo(e + s * bw, by + inner); c.stroke(); };
  if (expr === 'determined') eyes.forEach(e => brow(e, 0.08 * r, -0.05 * r));
  if (expr === 'sad') eyes.forEach(e => brow(e, -0.07 * r, 0.05 * r));
  if (expr === 'shock' || expr === 'panic') eyes.forEach(e => brow(e, -0.1 * r, -0.1 * r));
  if (expr === 'smug') brow(eyes[1], -0.08 * r, -0.08 * r);
  const my = y + 0.34 * r; c.beginPath();
  if (expr === 'joy') { c.arc(cx, my - 0.06 * r, 0.22 * r, 0, Math.PI); c.closePath(); c.fill(); }
  else if (expr === 'smug') { c.moveTo(cx - 0.18 * r, my); c.quadraticCurveTo(cx + 0.05 * r, my + 0.12 * r, cx + 0.22 * r, my - 0.08 * r); c.stroke(); }
  else if (expr === 'sad') { c.arc(cx, my + 0.12 * r, 0.16 * r, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
  else if (expr === 'shock' || expr === 'panic') { c.ellipse(cx, my, 0.1 * r, 0.14 * r, 0, 0, 7); c.fill(); }
  else if (expr === 'determined') { c.moveTo(cx - 0.14 * r, my); c.lineTo(cx + 0.14 * r, my - 0.02 * r); c.stroke(); }
  else { c.moveTo(cx - 0.15 * r, my); c.quadraticCurveTo(cx, my + 0.08 * r, cx + 0.15 * r, my); c.stroke(); }
  c.restore();
}
function drawAccessory(c, kind, x, y, r, fx, t, color) {
  if (!kind) return;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = color; c.fillStyle = color;
  if (kind === 'headband') {
    c.lineWidth = 0.26 * r; c.beginPath(); c.arc(x, y, r * 0.97, Math.PI * 1.12, Math.PI * 1.88); c.stroke();
    const bx = x - (fx ? 0.95 : 0.85) * r, by = y - 0.42 * r; c.lineWidth = 0.14 * r;
    for (const k of [0, 1]) { c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx - 0.45 * r, by + (0.1 + 0.15 * k) * r + 0.1 * r * Math.sin(t * 9 + k), bx - 0.9 * r, by + (0.25 + 0.2 * k) * r); c.stroke(); }
  } else if (kind === 'cap') {
    c.beginPath(); c.arc(x, y - 0.08 * r, r * 1.03, Math.PI, Math.PI * 2); c.closePath(); c.fill();
    c.lineWidth = 0.18 * r; c.beginPath();
    if (fx) { c.moveTo(x + 0.2 * r, y - 0.1 * r); c.lineTo(x + 1.55 * r, y - 0.04 * r); } else { c.ellipse(x, y - 0.1 * r, 1.25 * r, 0.12 * r, 0, 0, 7); }
    c.stroke();
  } else if (kind === 'beanie') {
    c.beginPath(); c.arc(x, y - 0.12 * r, r * 1.04, Math.PI, Math.PI * 2); c.closePath(); c.fill();
    c.fillRect(x - 1.06 * r, y - 0.22 * r, 2.12 * r, 0.24 * r); c.beginPath(); c.arc(x, y - 1.2 * r, 0.22 * r, 0, 7); c.fill();
  } else if (kind === 'glasses') {
    c.strokeStyle = INK; c.lineWidth = 0.09 * r; const cx = x + fx * 0.3 * r, dx = fx ? 0.24 * r : 0.33 * r;
    for (const e of [cx - dx, cx + dx]) { c.beginPath(); c.arc(e, y - 0.06 * r, 0.21 * r, 0, 7); c.stroke(); }
    c.beginPath(); c.moveTo(cx - dx + 0.21 * r, y - 0.08 * r); c.lineTo(cx + dx - 0.21 * r, y - 0.08 * r); c.stroke();
  } else if (kind === 'headphones') {
    c.lineWidth = 0.15 * r; c.beginPath(); c.arc(x, y, r * 1.14, Math.PI * 1.06, Math.PI * 1.94); c.stroke();
    for (const s of [-1, 1]) { c.beginPath(); c.roundRect(x + s * 1.1 * r - 0.17 * r, y - 0.3 * r, 0.34 * r, 0.58 * r, 0.12 * r); c.fill(); }
  } else if (kind === 'crown') {
    c.fillStyle = GOLD; c.beginPath(); const b = y - 0.82 * r, w = 0.62 * r;
    c.moveTo(x - w, b); c.lineTo(x - w, b - 0.42 * r); c.lineTo(x - w / 2, b - 0.2 * r); c.lineTo(x, b - 0.55 * r); c.lineTo(x + w / 2, b - 0.2 * r); c.lineTo(x + w, b - 0.42 * r); c.lineTo(x + w, b); c.closePath(); c.fill();
  }
  c.restore();
}
// anchor: {mode:'feet'|'hip'|'hands', x, y}
function drawFigure(c, ch, anchor, p, t, alpha, s = 1, opt = {}) {
  const L = lookOf(ch), hr = R * L.head, r = rig(p, t, ch.i * 1.7, hr);
  let ox = 0, oy = 0;
  if (anchor.mode === 'feet') oy = -r.low;
  else if (anchor.mode === 'hands') { ox = -(r.la[2][0] + r.ra[2][0]) / 2; oy = -(r.la[2][1] + r.ra[2][1]) / 2; }
  const ca = Math.cos(opt.rot || 0), sa = Math.sin(opt.rot || 0), cy0 = -40;
  const P = q => { let x = q[0], y = q[1]; if (opt.rot) { const yy = y - cy0; x = q[0] * ca - yy * sa; y = q[0] * sa + yy * ca + cy0; } return [anchor.x + (x + ox) * s, anchor.y + (y + oy) * s]; };
  const neon = L.lineStyle !== 'flat';
  c.save(); c.globalAlpha = alpha; c.lineCap = 'round'; c.lineJoin = 'round';
  const poly = (pts, lw, color) => { c.strokeStyle = color; c.lineWidth = lw * s; c.beginPath(); pts.forEach((q, k) => { const [a, b] = P(q); k ? c.lineTo(a, b) : c.moveTo(a, b); }); c.stroke(); };
  const head = (rad, color) => { const [hx, hy] = P(r.head); c.fillStyle = color; c.beginPath(); if (L.shape === 'square') c.roundRect(hx - rad * s, hy - rad * s, 2 * rad * s, 2 * rad * s, rad * 0.45 * s); else c.arc(hx, hy, rad * s, 0, 7); c.fill(); };
  const body = (dl, col) => { poly(r.ll, L.limb + dl, col); poly(r.rl, L.limb + dl, col); poly([r.hip, r.neck], L.torso + dl, col); poly(r.la, L.limb + dl, col); poly(r.ra, L.limb + dl, col); };
  if (!opt.ghost) { body(neon ? 4 : 5, 'rgba(0,0,0,0.6)'); head(hr + (neon ? 2 : 2.5), 'rgba(0,0,0,0.6)'); }
  body(0, ch.color);
  if (neon && !opt.ghost) {   // thin bright centre line instead of a white core, so the character keeps its colour
    const cw = Math.max(2, L.limb * 0.28); poly(r.ll, cw, ch.core); poly(r.rl, cw, ch.core); poly([[r.hip[0] + (r.neck[0] - r.hip[0]) * 0.1, r.hip[1] + (r.neck[1] - r.hip[1]) * 0.1], [r.hip[0] + (r.neck[0] - r.hip[0]) * 0.72, r.hip[1] + (r.neck[1] - r.hip[1]) * 0.72]], Math.max(2, L.torso * 0.22), ch.core); poly(r.la, cw, ch.core); poly(r.ra, cw, ch.core);
  }
  if (!opt.ghost) head(hr + (neon ? 2 : 2.5), 'rgba(0,0,0,0.6)');   // head outline over the limbs that pass behind it
  head(hr, ch.color);
  if (neon && !opt.ghost) {
    if (!L.face) head(hr * 0.5, ch.core);
    else { const [hx0, hy0] = P(r.head); c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(hx0 - hr * 0.42 * s, hy0 - hr * 0.45 * s, hr * 0.22 * s, hr * 0.14 * s, -0.6, 0, 7); c.fill(); }
  }
  const [hx, hy] = P(r.head), fx = (opt.facing || (T && T.scene && T.scene.facing)) === 'right' ? 1 : 0;
  if (L.face && !opt.ghost) drawFace(c, hx, hy, hr * s, opt.expr || EXPR[stateAt(ch.i, t).state] || 'neutral', fx);
  if (!opt.ghost) {
    const acc = (L.winnerCrown && stateAt(ch.i, t).state === 'win') ? 'crown' : L.accessory;
    drawAccessory(c, acc, hx, hy, hr * s, fx, t, L.accent);
  }
  c.restore();
  if (!opt.ghost && T && T.__joints && ch.i != null) { const hp = P(r.hip), nk = P(r.neck); const lh = P(r.la[2]), rh = P(r.ra[2]), hc = P(r.head), lf = P(r.ll[2]), rf = P(r.rl[2]); T.__joints[ch.i] = { feet: [lf, rf], hip: hp, neck: nk, x: (hp[0] + nk[0]) / 2, y: (hp[1] + nk[1]) / 2, off: L.torso * 0.32 * s, torso: L.torso, head: hc, hr: hr * s, hands: [lh, rh], minY: Math.min(hc[1] - hr * s, lh[1] - 6 * s, rh[1] - 6 * s) }; }
  return { head: [hx, hy], hr: hr * s, hip: P(r.hip), lhand: P(r.la[2]), rhand: P(r.ra[2]), lelbow: P(r.la[1]), relbow: P(r.ra[1]), top: hy - hr * s };
}
// character with optional motion trail + sweat; anchorFn(tt) -> anchor
// energy: full for the first ~65%, a deliberate breather around 70-82%, full again into the climax
function energyAt(t) { const x = t / T.dur; let e = 1 - 0.65 * ss(0.64, 0.7, x) * (1 - ss(0.82, 0.88, x)); if (T.burst && t > T.burst.t - 1.6) e = 1; return e; }
const bump = (a, b, t) => (t > a && t < b) ? Math.sin(Math.PI * (t - a) / (b - a)) : 0;
function rollPop(i, t) {   // first beat: introduce the cast one by one
  const B0 = T.beats[0], n = T.chars.length, start = 0.55, slot = Math.min(0.55, (B0.t1 - start - 0.15) / n);
  return slot > 0.2 ? bump(start + i * slot, start + (i + 1) * slot + 0.15, t) : 0;
}
function reactionAt(i, t) {   // others flinch at a crash, clap at the climax
  let shock = 0, clap = 0;
  for (const e of T.events) { if (e.i === i) continue; if (e.type === 'crash' || e.type === 'shake') shock = Math.max(shock, bump(e.t + 0.05, e.t + 1.0, t)); if (e.type === 'burst') clap = Math.max(clap, ss(e.t + 0.1, e.t + 0.3, t) * (1 - ss(e.t + 1.6, e.t + 2.0, t))); }
  return { shock, clap };
}
const GEST = ['pump', 'look', 'shrug', 'wave', 'clap'];
function fidgetAt(i, t) { const per = 1.35, ph = t + i * 0.57, k = Math.floor(ph / per), u = (ph % per) / per; return { kind: GEST[(k + i * 2) % GEST.length], w: u < 0.45 ? Math.sin(Math.PI * u / 0.45) : 0 }; }
function gesturePose(kind, t) {
  const sw = Math.sin(t * 15);
  if (kind === 'pump') return { la: [-0.2, -0.1], ra: [2.5, 3.05 + 0.25 * sw], lean: 0, drop: -0.25 };
  if (kind === 'look') return { la: [-0.3, -0.1], ra: [0.3, 0.1], lean: 0.12 * Math.sign(sw + 0.01), drop: -0.35 };
  if (kind === 'shrug') return { la: [-0.95, 0.9], ra: [0.95, -0.9], lean: 0, drop: 0.25 };
  if (kind === 'wave') return { la: [-0.2, -0.1], ra: [2.3, 2.6 + 0.6 * sw], lean: -0.05, drop: -0.2 };
  if (kind === 'clap') return { la: [-0.7, 1.1 + 0.35 * sw], ra: [0.7, -1.1 - 0.35 * sw], lean: 0, drop: -0.2 };
  if (kind === 'shock') return { la: [-2.3, 2.7], ra: [2.3, -2.7], lean: -0.12, drop: -0.25 };
  return null;
}
function blendUpper(p, g, w) { if (!g || w <= 0) return p; const o = { ...p }; for (const k of ['la', 'ra']) o[k] = [lerp(p[k][0], g[k][0], w), lerp(p[k][1], g[k][1], w)]; o.lean = lerp(p.lean, g.lean, w); o.drop = lerp(p.drop, g.drop, w); return o; }
function blendLegs(p, w, t) { if (w <= 0) return p; const k = Math.sin(t * 9); return { ...p, ll: [lerp(p.ll[0], -0.6 + 0.3 * k, w), lerp(p.ll[1], 0.9, w)], rl: [lerp(p.rl[0], 0.6 + 0.3 * k, w), lerp(p.rl[1], -0.9, w)] }; }
function gestureLayer(i, t, p) {
  const st = stateAt(i, t).state; if (!['active', 'idle', 'sad'].includes(st)) return p;
  const free = T.scene.freeUpper ? T.scene.freeUpper(i, t) : T.scene.upperBodyFree !== false, en = energyAt(t), still = 1 - moving(i, t, 0.004, 0.04);
  const rc = reactionAt(i, t), rp = rollPop(i, t), fd = fidgetAt(i, t);
  const fw = st === 'sad' ? fd.w * deadAir(t) * en * 0.6 : fd.w * en * still * (0.9 + 0.1 * deadAir(t));
  if (!free) return blendLegs(p, Math.max(rp, rc.shock, rc.clap * 0.6, fw), t);
  let q = blendUpper(p, gesturePose(fd.kind, t), fw);
  q = blendUpper(q, gesturePose('wave', t), rp);
  if (st !== 'sad') q = blendUpper(q, gesturePose('clap', t), rc.clap);
  return blendUpper(q, gesturePose('shock', t), rc.shock);
}
// 1 when nothing is happening on screen (no one moving, nobody speaking, no event close by)
function deadAir(t) {
  if ((T.style.boost || []).some(([a, b]) => t >= a && t <= b)) return 1;   // reviewer-requested energy
  if (T.chars.some((_, i) => Math.abs(fracRate(i, t)) > 0.012)) return 0;
  if (T.bubbles.some(b => t > b.t0 - 0.2 && t < b.t1)) return 0;
  if (T.events.some(e => Math.abs(e.t - t) < 0.8) || T.milestones.some(m => t > m.t && t < m.t + 0.8)) return 0;
  return 1;
}
function hopAt(i, t) {
  const st = stateAt(i, t); let h = 0;
  if (['active', 'idle'].includes(st.state)) { const rc = reactionAt(i, t), fd = fidgetAt(i, t); h += rollPop(i, t) * 55 + rc.shock * 22 + rc.clap * Math.abs(Math.sin(t * 8)) * 14 + (fd.kind === 'pump' ? fd.w * 16 * energyAt(t) * (1 - moving(i, t, 0.004, 0.04)) : 0) + fd.w * 34 * deadAir(t) * energyAt(t); }
  if (st.state === 'win' || st.state === 'boast') h += Math.abs(Math.sin((t - st.since) * 6.5 + i)) * 38 * ss(st.since, st.since + 0.3, t);
  const pk = pickTurn(i, t); h += pk * 70;
  const ue = (t + 0.25 - i * 0.14) / 0.55; if (ue > 0 && ue < 1) h += Math.sin(Math.PI * ue) * 75;   // entrance: jump in one after another
  return h;
}
function pickTurn(i, t) {   // "which one are you?" - each character gets a turn to jump forward
  const Q = T.question; if (!Q || t < Q.t0 + 0.25) return 0;
  const n = T.chars.length, slot = Math.min(0.6, (Q.t1 - Q.t0 - 0.3) / n), k = Math.floor((t - Q.t0 - 0.25) / slot), u = ((t - Q.t0 - 0.25) % slot) / slot;
  return k % n === i ? Math.sin(Math.PI * u) : 0;
}
function anchorWithMotion(i, t, an, s) {
  if (an.mode === 'hands') return an;
  const st = stateAt(i, t).state, bob = (st === 'idle' || st === 'active' || st === 'sad') ? 3.5 * Math.sin(t * 2.6 + i * 1.9) : 0;
  return { ...an, y: an.y - (hopAt(i, t) + bob) * s };
}
function drawChar(c, i, t, anchorFn0, opt = {}) {
  const ch = T.chars[i], s = opt.s || 1, sp = opt.speed || 0, a = Math.max(alphaAt(i, t), pickTurn(i, t));
  const anchorFn = tt => anchorWithMotion(i, tt, anchorFn0(tt), s);
  const stn = stateAt(i, t); if (stn.state === 'fall') opt = { ...opt, rot: (t - stn.since) * 11 * (i % 2 ? 1 : -1) };
  if (sp > 0.05) for (let k = 3; k >= 1; k--) { const tt = t - k * 0.05; drawFigure(c, ch, anchorFn(tt), poseAt(i, tt), tt, a * sp * (0.34 - 0.09 * k), s, { ...opt, ghost: true }); }
  const J = drawFigure(c, ch, anchorFn(t), poseAt(i, t), t, a, s, opt);
  if ((opt.sweat || 0) > 0.1) for (let k = 0; k < 3; k++) {
    const ph = ((t * 1.7 + k / 3 + i * 0.37) % 1 + 1) % 1, side = k % 2 ? 1 : -1;
    c.globalAlpha = (1 - ph) * opt.sweat * a; c.fillStyle = '#a9dcff';
    c.beginPath(); c.arc(J.head[0] + side * (J.hr * 0.9 + 34 * ph * s), J.head[1] - J.hr * 0.3 + (70 * ph * ph - 30 * ph) * s, 3.2 * s, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
  return J;
}

// =====================================================================================  text
function spaced(c, text, x, y, font, color, spacing, alpha, glow, check, outline = true) {
  if (!text || alpha <= 0) return;
  c.save(); c.font = font; c.letterSpacing = spacing + 'px'; c.textAlign = 'center';
  c.globalAlpha = Math.min(1, alpha); c.fillStyle = color;
  if (c === sc && outline) { const px = parseFloat((font.match(/([0-9.]+)px/) || [0, 20])[1]); c.lineJoin = 'round'; c.strokeStyle = 'rgba(4,6,9,0.85)'; c.lineWidth = Math.max(3, px * 0.2); c.strokeText(text, x + spacing / 2, y); }
  if (glow) { c.shadowColor = color; c.shadowBlur = glow; }
  c.fillText(text, x + spacing / 2, y);
  if (check && alpha > 0.5) {
    const w = c.measureText(text).width, fpx = parseFloat((font.match(/([0-9.]+)px/) || [0, 99])[1]);
    if (fpx < 26) WARN.add(`text too small: "${String(text).replace(/[0-9][0-9,.]*/g, '#').slice(0, 40)}" (${fpx.toFixed(0)}px)`);
    const shape = String(text).replace(/[0-9][0-9,.]*/g, '#');   // group "$5,678" / "$6,225" into one warning
    if (x - w / 2 < 12 || x + w / 2 > W - 12) WARN.add(`text off-screen: "${shape}"`);
    else if (x + w / 2 > 985 && y > 900 && y < 1650) WARN.add(`text under the Shorts like/comment buttons: "${shape}"`);
  }
  c.restore();
}
function wrapText(text, font, spacing, maxW) {
  if (text.includes('|')) return text.split('|');
  ctx.save(); ctx.font = font; ctx.letterSpacing = spacing + 'px'; const w = ctx.measureText(text).width; ctx.restore();
  if (w <= maxW) return [text];
  const words = text.split(' '); let best = null;
  for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(' '), b = words.slice(k).join(' '); const score = Math.abs(a.length - b.length) - (/[.,:]$/.test(a) ? 6 : 0); if (!best || score < best[0]) best = [score, a, b]; }
  return [best[1], best[2]];
}

// =====================================================================================  compile
const CURVES = { ease: easeIO, linear: u => u, accel: u => Math.pow(u, 1.8), decel: u => 1 - (1 - u) * (1 - u), snap: u => u > 0 ? 1 : 0, late: u => ss(0.55, 1, u), early: u => ss(0, 0.35, u) };
const DEFAULT_STYLE = { glow: 1, labelScale: 1, boost: [], theme: 'void', captionStyle: 'tracked', transition: 'fade', camera: 'static', labels: 'above', hook: 'straight', speed: 'none', outro: 'question', instrument: 'piano', impact: 'boom', root: 57, bpm: 80 };
function compile(spec, brand, style) {
  const chars = spec.characters.map((c, i) => { const color = c.color || PALETTE[i % PALETTE.length]; return { ...c, i, color, core: mixWhite(color, 0.72) }; });
  const idx = name => { const i = chars.findIndex(c => c.name === name); if (i < 0) throw new Error(`unknown character "${name}"`); return i; };
  const n = chars.length;
  const T = { spec, brand: brand || {}, style: { ...DEFAULT_STYLE, ...(style || {}) }, chars, idx, beats: [], events: [], bubbles: [], stateTL: chars.map(() => [[0, 'active']]), tagTL: chars.map(() => [[0, null]]), dimTL: chars.map(() => 1e9) };
  const asArr = (obj, fb) => chars.map((c, i) => obj && obj[c.name] != null ? obj[c.name] : fb[i]);
  let prev = asArr(spec.start, Array(n).fill(0)), cnt = spec.counter.start, t = 0;
  spec.beats.forEach((b, bi) => {
    const t0 = t, t1 = t + b.dur, to = asArr(b.values, prev);
    const curves = chars.map(c => (b.curves && b.curves[c.name]) || b.curve || 'ease'), crashAt = Array(n).fill(null);
    for (const e of b.events || []) {
      const ev = { ...e, beat: bi, t: t0 + (e.at != null ? e.at : (e.type === 'burst' ? 0 : 0.07 * b.dur)) };
      if (e.who) ev.i = idx(e.who);
      T.events.push(ev);
      if (e.type === 'crash') { crashAt[ev.i] = ev.t; curves[ev.i] = 'crash'; T.stateTL[ev.i].push([ev.t, 'fall']); if (!(b.states && b.states[e.who])) T.stateTL[ev.i].push([ev.t + 0.6, 'quit']); }
    }
    if (b.states) for (const name in b.states) { const i = idx(name); const at = crashAt[i] != null ? crashAt[i] + 0.6 : t0 + ((b.stateAt && b.stateAt[name]) || 0); T.stateTL[i].push([at, b.states[name]]); }
    if (b.tags) for (const name in b.tags) { const v = b.tags[name], i = idx(name); T.tagTL[i].push([t0 + (crashAt[i] != null ? 1.2 : 0.3), v == null ? null : (typeof v === 'string' ? { text: v, color: RED } : v)]); }
    for (const name of b.dim || []) T.dimTL[idx(name)] = Math.min(T.dimTL[idx(name)], t0);
    const bubs = b.bubbles || [];
    bubs.forEach((bb, k) => { const slot = (b.dur - 0.4) / bubs.length, s0 = t0 + (bb.at != null ? bb.at : 0.4 + k * slot); T.bubbles.push({ i: idx(bb.who), text: bb.text, t0: s0, t1: bb.dur != null ? s0 + bb.dur : Math.min(t1 - 0.1, s0 + slot - 0.15) }); });
    T.beats.push({ bi, t0, t1, b, from: prev.slice(), to, curves, crashAt, c0: cnt, c1: b.counter != null ? b.counter : cnt, mood: b.mood || ((b.events || []).some(e => e.type === 'burst') ? 'climax' : b.style === 'question' ? 'end' : (b.events || []).some(e => e.type === 'crash') ? 'crash' : b.curve === 'accel' ? 'build' : 'normal') });
    prev = to; if (b.counter != null) cnt = b.counter; t = t1;
  });
  T.dur = t;
  let mx = 0; T.beats.forEach(B => B.from.concat(B.to).forEach(v => { mx = Math.max(mx, v); }));
  T.maxV = spec.metric.max || mx || 1; T.pow = spec.metric.scale != null ? spec.metric.scale : 0.7;
  for (const tl of T.stateTL) tl.sort((a, b) => a[0] - b[0]);
  T.burst = T.events.find(e => e.type === 'burst');
  const bq = T.beats.find(B => B.b.style === 'question'); T.question = bq ? { t0: bq.t0, t1: bq.t1 } : null;
  if (T.burst) { const after = T.beats.find(B => B.t0 >= T.burst.t - 1e-6 && B.b.style !== 'question'); if (after && !after.b.focus) after.recap = true; }
  T.milestones = [];
  { const mx2 = spec.metric.max || mx || 1, steps = []; for (let k = Math.floor(Math.log10(mx2)) - 2; k <= Math.floor(Math.log10(mx2)); k++) for (const m of [1, 2, 5]) { const v = m * Math.pow(10, k); if (v >= mx2 * 0.04 && v <= mx2 * 1.0001 && v >= 1) steps.push(v); }
    T.chars.forEach((_, i) => { let last = -9; let prevV = null;
      for (let tt = 0; tt <= T.dur; tt += 0.02) { const v = (() => { const B = T.beats.find(B => tt < B.t1) || T.beats[T.beats.length - 1]; const u = clamp((tt - B.t0) / (B.t1 - B.t0)); return lerp(B.from[i], B.to[i], (CURVES[B.curves[i]] || easeIO)(u)); })();
        if (prevV != null) for (const th of steps) if (prevV < th && v >= th && tt - last > 1.1 && !T.events.some(e => e.i === i && Math.abs(e.t - tt) < 0.7)) { T.milestones.push({ i, t: tt, v: th }); last = tt; }
        prevV = v; } });
    T.milestones.sort((a, b) => a.t - b.t); }
  T.scene = SCENES[spec.scene]; if (!T.scene) throw new Error(`unknown scene "${spec.scene}". Options: ${Object.keys(SCENES).join(', ')}`);
  return T;
}
// ---- time map: real seconds -> story seconds (hook hold, rewind, slow-motion ramps, end card)
function buildTimeMap() {
  const st = T.style, D = T.dur, segs = []; let r = 0;
  if (st.hook === 'flashforward') {
    const h0 = T.burst ? Math.max(0, T.burst.t - 0.35) : D - 1.3, h1 = Math.min(D - 0.05, h0 + 1.3);
    segs.push({ r0: 0, r1: 1.3, s0: h0, s1: h1, kind: 'hook' }); segs.push({ r0: 1.3, r1: 1.95, s0: h1, s1: 0, kind: 'rewind' }); r = 1.95;
  }
  let wins = st.speed === 'slowmo' ? T.events.filter(e => e.type === 'crash' || e.type === 'burst').map(e => [Math.max(0, e.t - 0.15), Math.min(D, e.t + 0.55)]) : [];
  wins.sort((a, b) => a[0] - b[0]); const merged = []; for (const w of wins) { if (merged.length && w[0] <= merged[merged.length - 1][1]) merged[merged.length - 1][1] = w[1]; else merged.push(w.slice()); }
  let s = 0; const RATE = 0.38;
  for (const [a, b] of merged) { if (a > s) { segs.push({ r0: r, r1: r + a - s, s0: s, s1: a, kind: 'play' }); r += a - s; } segs.push({ r0: r, r1: r + (b - a) / RATE, s0: a, s1: b, kind: 'slow' }); r += (b - a) / RATE; s = b; }
  segs.push({ r0: r, r1: r + D - s, s0: s, s1: D, kind: 'play' }); r += D - s;
  if (st.outro === 'endcard' && T.brand.endcard) { segs.push({ r0: r, r1: r + 1.6, s0: D - 0.001, s1: D - 0.001, kind: 'endcard' }); r += 1.6; }
  if (st.outro === 'loop') { segs.push({ r0: r, r1: r + 0.7, s0: D - 0.001, s1: 0, kind: 'rewind' }); r += 0.7; }
  T.segs = segs; T.realDur = r;
}
function storyAt(r) { for (const g of T.segs) if (r < g.r1 || g === T.segs[T.segs.length - 1]) { const u = clamp((r - g.r0) / (g.r1 - g.r0)); return { s: lerp(g.s0, g.s1, g.kind === 'rewind' ? easeIO(u) : u), kind: g.kind, u, g }; } }
function realOf(s) { for (const g of T.segs) if ((g.kind === 'play' || g.kind === 'slow') && s >= g.s0 - 1e-6 && s <= g.s1 + 1e-6) return g.r0 + (s - g.s0) / Math.max(1e-6, g.s1 - g.s0) * (g.r1 - g.r0); return s; }

function beatAt(t) { for (const B of T.beats) if (t < B.t1) return B; return T.beats[T.beats.length - 1]; }
function value(i, t) {
  const B = beatAt(t), u = clamp((t - B.t0) / (B.t1 - B.t0)), c = B.curves[i];
  const e = c === 'crash' ? ss(B.crashAt[i] != null ? B.crashAt[i] : B.t0, (B.crashAt[i] != null ? B.crashAt[i] : B.t0) + 0.5, t) : (CURVES[c] || easeIO)(u);
  let v = lerp(B.from[i], B.to[i], e);
  if (T.chars[i].volatile && B.from[i] !== B.to[i] && c !== 'crash') v *= 1 + 0.08 * Math.sin(t * 9 + i * 2);
  return Math.max(0, v);
}
const frac = v => Math.pow(clamp(v / T.maxV), T.pow);
const fracAt = (i, t) => frac(value(i, Math.max(0, t)));
const fracRate = (i, t) => (fracAt(i, t + 0.04) - fracAt(i, t - 0.04)) / 0.08;
// integrated motion phase (cycles): speed follows progress rate, scaled by the character's tempo
function phaseInt(i, t, k, idle = 0, cap = 3.2) { let acc = 0; const dt = 0.05, tempo = T.chars[i].tempo || 1; for (let tt = 0; tt < t; tt += dt) acc += clamp((idle + k * Math.abs(fracRate(i, tt))) * tempo, 0, cap) * Math.min(dt, t - tt); return acc; }
const speedFx = (i, t, lo, hi) => ss(lo, hi, Math.abs(fracRate(i, t)) * (T.chars[i].tempo || 1));
function counterAt(t) { const B = beatAt(t), u = clamp((t - B.t0) / (B.t1 - B.t0)); const e = (B.b.counterCurve ? CURVES[B.b.counterCurve] : (B.b.curve === 'accel' ? CURVES.accel : easeIO))(u); return lerp(B.c0, B.c1, e); }
function stateAt(i, t) { const tl = T.stateTL[i]; let s = tl[0]; for (const e of tl) if (e[0] <= t) s = e; return { state: s[1], since: s[0] }; }
function poseOf(state, i, t) {
  if (state === 'active') return T.scene.activePose ? T.scene.activePose(i, t) : POSES.stand;
  if (state === 'idle') return T.scene.idlePose ? T.scene.idlePose(i, t) : POSES.stand;
  if (state === 'boast' || state === 'win') return (T.scene.winPose && T.scene.winPose(i, t)) || cheerAnim(t, i);
  if (state === 'quit') return (T.scene.quitPose && T.scene.quitPose(i, t)) || POSES.sit;
  return POSES[state] || POSES.stand;
}
function cheerAnim(t, i) { const k = Math.sin(t * 7 + i * 1.3), up = Math.max(0, k); return { la: [-2.45 + 0.4 * k, -2.85 + 0.35 * k], ra: [2.45 - 0.4 * k, 2.85 - 0.35 * k], ll: [-0.3, -0.1 - 0.5 * up], rl: [0.3, 0.1 + 0.5 * up], lean: 0, drop: -0.35 }; }
function poseAt(i, t) { const tl = T.stateTL[i]; let p = poseOf(tl[0][1], i, t); for (let k = 1; k < tl.length; k++) { const [tk, st] = tl[k]; if (t < tk) break; p = blendPose(p, poseOf(st, i, t), ss(tk, tk + (st === 'fall' ? 0.15 : 0.35), t)); } return gestureLayer(i, t, p); }
const moving = (i, t, lo = 0.002, hi = 0.02) => ss(lo, hi, Math.abs(fracRate(i, t)));
const alphaAt = (i, t) => (T.question && t >= T.question.t0 + 0.2) ? 1 : 1 - 0.62 * ss(T.dimTL[i], T.dimTL[i] + 1, t);
function tagAt(i, t) { let cur = null; for (const [tk, v] of T.tagTL[i]) if (tk <= t) cur = { v, tk }; return cur && cur.v ? { ...cur.v, a: ss(cur.tk, cur.tk + 0.4, t) } : null; }
function fmt(v) { const m = T.spec.metric, d = m.decimals || 0, crowded = T.chars.length >= 5 && m.compact !== false; v = Math.max(0, v); let s; if ((m.compact || crowded) && v >= 1e6) s = (v / 1e6).toFixed(2) + 'M'; else if ((m.compact || crowded) && v >= 1e4) s = Math.round(v / 1000) + 'K'; else if (crowded && v >= 1000) s = (v / 1000).toFixed(1) + 'K'; else s = d ? v.toFixed(d) : Math.round(v).toLocaleString('en-US'); return (m.prefix || '') + s + (m.suffix || ''); }
// columns stay left of the Shorts like/comment button strip on the right edge
function colsX(n, max = 240, total = 860) { const sp = Math.min(max, total / n); return [...Array(n)].map((_, i) => 515 + (i - (n - 1) / 2) * sp); }
function flyingCoin(c, color, x, y, spin, alpha, s = 1) { c.save(); c.globalAlpha = alpha; c.strokeStyle = color; c.fillStyle = color + '40'; c.lineWidth = 2.5 * s; c.beginPath(); c.ellipse(x, y, (3 + 11 * Math.abs(Math.cos(spin))) * s, 13 * s, 0, 0, 7); c.fill(); c.stroke(); c.restore(); }

// =====================================================================================  look & feel
const RD = rng(5), DUST = [...Array(70)].map(() => ({ x: RD() * W, y: RD() * H, s: .8 + RD() * 2, v: 8 + RD() * 22, p: RD() * 6.28, a: .12 + RD() * .3 }));
const STARS = (() => { const r = rng(17); return [...Array(140)].map(() => ({ x: r() * W, y: r() * H * 0.8, s: 0.6 + r() * 1.6, p: r() * 6.28 })); })();
function particlesFor(seed, n) { const r = rng(seed); return [...Array(n)].map(() => ({ a: r(), b: r(), c: r(), d: r(), e: r() })); }
const DEBRIS = particlesFor(11, 34), FLING = particlesFor(7, 16), SPARK = particlesFor(9, 80);
const THEMES = {
  void: { top: '#060709', bot: '#0a0b0e', dust: '#cfd8e3' },
  dusk: { top: '#120a08', bot: '#080607', dust: '#ffd2b0', spot: 'rgba(255,140,70,0.06)' },
  navy: { top: '#080d1f', bot: '#04050a', dust: null, stars: true, spot: 'rgba(90,130,255,0.05)' },
  grid: { top: '#05070a', bot: '#080a0e', dust: '#bcd0ff', grid: true },
};
const MOODTINT = { crash: [255, 40, 60, 0.05], tense: [70, 120, 255, 0.035], build: [255, 170, 60, 0.025], climax: [255, 185, 60, 0.03], normal: [0, 0, 0, 0], end: [0, 0, 0, 0] };
function moodTint(t) {
  const B = beatAt(t), prevB = T.beats[Math.max(0, B.bi - 1)], k = ss(B.t0, B.t0 + 0.6, t);
  const a = MOODTINT[prevB.mood] || MOODTINT.normal, b = MOODTINT[B.mood] || MOODTINT.normal;
  return [0, 1, 2, 3].map(j => lerp(a[j], b[j], k));
}
function drawBackground(t, FY, warm, wx) {
  const th = THEMES[T.style.theme] || THEMES.void;
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, th.top); bg.addColorStop(1, th.bot); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (th.spot) { const rg = ctx.createRadialGradient(540, 420, 0, 540, 420, 1000); rg.addColorStop(0, th.spot); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); }
  if (th.stars) for (const s of STARS) { ctx.globalAlpha = 0.12 + 0.12 * Math.sin(t * 1.3 + s.p); ctx.fillStyle = '#dfe8ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (th.grid) {
    ctx.strokeStyle = 'rgba(120,160,255,0.07)'; ctx.lineWidth = 1.5; ctx.beginPath();
    const fy = FY || 1560, vy = fy - 520;
    for (let k = -12; k <= 12; k++) { ctx.moveTo(540 + k * 40, vy + 520 * 0.0 + 0); ctx.moveTo(540, vy); ctx.lineTo(540 + k * 260, H); }
    for (let k = 1; k < 14; k++) { const y = fy + Math.pow(k / 14, 1.8) * (H - fy); ctx.moveTo(0, y); ctx.lineTo(W, y); }
    for (let x = 0; x <= W; x += 90) { ctx.moveTo(x, 0); ctx.lineTo(x, fy - 40); }
    ctx.stroke();
  }
  const mt = moodTint(t); if (mt[3] > 0.001) { ctx.fillStyle = `rgba(${mt[0]},${mt[1]},${mt[2]},${mt[3]})`; ctx.fillRect(0, 0, W, H); }
  if (warm > 0) { const rg = ctx.createRadialGradient(wx, 700, 0, wx, 700, 950); rg.addColorStop(0, `rgba(255,185,60,${0.07 * warm})`); rg.addColorStop(1, 'rgba(255,185,60,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); }
}
// ---- camera director: every beat gets "shots" (who to frame, how tight); highest priority wins, then smoothed
function buildShots() {
  const shots = [], esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mention = B => { const cap = (B.b.caption || '').toUpperCase(); const hits = T.chars.filter(c => new RegExp('(^|[^A-Z])' + esc(c.name) + '([^A-Z]|$)').test(cap)); return hits.length === 1 ? hits[0].i : -1; };
  for (const B of T.beats) {
    const d = B.t1 - B.t0;
    if (B.b.focus) { shots.push({ t0: B.t0, t1: B.t1, i: B.b.focus === 'all' ? -1 : T.idx(B.b.focus), z: 1.3, p: 8 }); continue; }
    if (B.b.style === 'question') { shots.push({ t0: B.t0, t1: B.t1, i: -1, z: 1, p: 9 }); continue; }
    if (B.recap) { const start = Math.max(B.t0, T.burst ? T.burst.t + 0.8 : B.t0), order = T.chars.map(c => c.i).sort((a, b) => B.to[a] - B.to[b]), slot = (B.t1 - start) / (order.length + 0.5); shots.push({ t0: B.t0, t1: start, i: -1, z: 1, p: 9 }); order.forEach((ci, k) => shots.push({ t0: start + k * slot, t1: start + (k + 1) * slot + (k === order.length - 1 ? 0.5 * slot : 0), i: ci, z: 1.42, p: 9 })); continue; }
    const m = mention(B); shots.push({ t0: B.t0, t1: B.t1, i: m, z: m >= 0 ? 1.28 : (B.bi === 0 ? 1.14 : 1), p: 1 });
  }
  for (const bb of T.bubbles) shots.push({ t0: bb.t0 - 0.15, t1: bb.t1, i: bb.i, z: 1.22, p: 2 });
  for (const e of T.events) {
    if (e.type === 'shake') shots.push({ t0: e.t - 0.4, t1: e.t + 1.3, i: e.i, z: 1.3, p: 4 });
    if (e.type === 'fling') shots.push({ t0: e.t - 0.4, t1: e.t + 1.2, i: e.i, z: 1.25, p: 4 });
    if (e.type === 'crash') shots.push({ t0: e.t - 0.9, t1: e.t + 1.3, i: e.i, z: 1.38, p: 5 });
    if (e.type === 'burst') { shots.push({ t0: e.t - 2.0, t1: e.t + 0.15, i: e.i, z: 1.35, p: 6 }); shots.push({ t0: e.t + 0.15, t1: e.t + 0.8, i: -1, z: 1, p: 6 }); }
  }
  T.shots = shots;
}
function shotAt(t) { let best = null; for (const s of T.shots) if (t >= s.t0 && t < s.t1 && (!best || s.p > best.p || (s.p === best.p && s.t0 >= best.t0))) best = s; return best || { i: -1, z: 1 }; }
// bounding box of one character incl. its labels, in world coords
function charBox(i, t) {
  const p = T.scene.place(i, Math.max(0, t)), s = p.s, ch = T.chars[i];
  const half = Math.max(80 * s, fmt(value(i, t)).length * 19, ch.name.length * 13.5 + 10);
  const bottom = Math.max(p.floor != null ? p.floor : 0, p.top + figH() * s) + 14;
  return { x0: p.x - half, x1: p.x + half, y0: p.top - 420, y1: bottom, cx: p.x, cy: p.top + 85 * s };
}
function frameFor(t, safeTop, focus, zWant) {
  const b = T.scene.extent ? { ...T.scene.extent(t) } : { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
  T.chars.forEach((_, i) => { const c = charBox(i, t); b.x0 = Math.min(b.x0, c.x0); b.x1 = Math.max(b.x1, c.x1); b.y0 = Math.min(b.y0, c.y0); b.y1 = Math.max(b.y1, c.y1); });
  const SX0 = 40, SX1 = 950, SY0 = safeTop, SY1 = 1520, bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  const z = clamp(Math.min(zWant, (SX1 - SX0) / bw, (SY1 - SY0) / bh), 0.6, 1.6);
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  let dx = (SX0 + SX1) / 2 - 540 - (cx - 540) * z, dy = (SY0 + SY1) / 2 - 960 - (cy - 960) * z;
  if (focus >= 0) {   // lean toward the focus character, but only as far as everyone still fits
    const c = charBox(focus, t), slx = Math.max(0, ((SX1 - SX0) - bw * z) / 2), sly = Math.max(0, ((SY1 - SY0) - bh * z) / 2);
    dx -= clamp((c.cx - cx) * z, -slx, slx); dy -= clamp((c.cy - cy) * z, -sly, sly);
  }
  return { z, dx, dy };
}
function directorAt(t, safeTop) {
  if (T.scene.steadyCam) { let z = 0, dx = 0, dy = 0, ws = 0; for (let k = 0; k < 12; k++) { const q = frameFor(Math.max(0, t - k * 0.17), safeTop, -1, 1.3), w = 12 - k; z += q.z * w; dx += q.dx * w; dy += q.dy * w; ws += w; } return { z: z / ws, dx: dx / ws, dy: dy / ws }; }   // steady: no focus jumps, slow 2s reframe
  let z = 0, dx = 0, dy = 0, wsum = 0;
  for (let k = 0; k < 10; k++) { const tt = Math.max(0, t - k * 0.055), sh = shotAt(tt), q = frameFor(tt, safeTop, sh.i, sh.i >= 0 ? 1.35 : 1.12), w = 10 - k; z += q.z * w; dx += q.dx * w; dy += q.dy * w; wsum += w; }
  return { z: z / wsum, dx: dx / wsum, dy: dy / wsum };
}
// how much each character is "in focus" right now (0..1), smoothed - drives spotlight + label emphasis
function focusWeights(t) { const w = T.chars.map(() => 0); for (let k = 0; k < 8; k++) { const sh = shotAt(Math.max(0, t - k * 0.05)); if (sh.i >= 0) w[sh.i] += 1 / 8; } return w; }
function fixedCamera() {   // computed once: widest frame that keeps every character, label and badge in view all video long
  if (T.__fixed) return T.__fixed;
  let top = 0; for (let tt = 0; tt <= T.dur; tt += 0.25) top = Math.max(top, captionBlock(tt, { kind: 'play', u: 0 }, scratchC));
  const safeTop = (T.style.labels === 'board' ? top + 56 + T.chars.length * 60 : top) + 30;
  let best = null; for (let tt = 0; tt <= T.dur; tt += 0.25) { const q = frameFor(tt, safeTop, -1, 1.25); if (!best || q.z < best.z) best = q; }
  T.__fixed = { ...best, safeTop }; return T.__fixed;
}
function cameraAt(t, tm, safeTop) { const f = fixedCamera(); return { z: f.z, dx: f.dx, dy: f.dy }; }
function cameraAtOld(t, tm, safeTop) {
  const st = T.style, B = beatAt(t), dir = tm.kind === 'hook' && T.burst ? frameFor(t, safeTop, T.burst.i, 1.35) : directorAt(t, safeTop); let z = dir.z, dx = dir.dx, dy = dir.dy;
  const fz = z;   // style flavours stay small so they can never push anyone out of frame
  const steady = !!T.scene.steadyCam;
  if (st.camera === 'push' && !steady) z *= 1 + 0.025 * easeIO(clamp((t - B.t0) / (B.t1 - B.t0)));
  else if (!steady) z *= 1 + 0.028 * energyAt(t) * ss(0.65, 0.6, t / T.dur) * easeIO(clamp((t - B.t0) / (B.t1 - B.t0)));
  if (st.camera === 'drift' && !steady) { dx += 8 * Math.sin(t * 0.35); dy += 6 * Math.cos(t * 0.27); }
  if ((st.transition === 'cut' || st.transition === 'dayzoom') && B.bi > 0) z *= 1 + 0.03 * (1 - ss(B.t0, B.t0 + 0.32, t));
  if (tm.kind === 'hook') z *= 1 + 0.03 * tm.u;
  for (const e of T.events) if (e.type === 'burst' && t > e.t) z *= 1 + 0.03 * (1 - ss(e.t, e.t + 0.5, t));
  const k = z / fz, cxs = 503, cys = (safeTop + 1850) / 2;   // style zooms scale about the framed centre
  return { z, dx: cxs + (540 + dx - cxs) * k - 540, dy: cys + (960 + dy - cys) * k - 960 };
}
function shakeAt(t, tm) { return [0, 0]; }   // the world never shakes; impacts are carried by the text (textShake)
function textShake(t) {
  let s = 0;
  for (const e of T.events) {
    if (e.type === 'crash') s += (t > e.t && t < e.t + 0.9) ? (1 - ss(e.t, e.t + 0.9, t)) * 16 : 0;
    if (e.type === 'shake') s += (t > e.t && t < e.t + 0.6) ? (1 - ss(e.t, e.t + 0.6, t)) * (e.strength || 6) : 0;
    if (e.type === 'burst') s += (t > e.t && t < e.t + 0.4) ? (1 - ss(e.t, e.t + 0.4, t)) * 5 : 0;
  }
  return s * Math.sin(t * 93);
}
function drawEffects(c, t, P) {
  for (const e of T.events) {
    const dt = t - e.t; if (dt < 0) continue;
    if (e.type === 'crash' && dt < 2.4) {
      const span = T.scene.debrisSpan ? T.scene.debrisSpan(e.i, e.t) : (() => { const p = T.scene.place(e.i, e.t); return { x: p.x, y0: p.top, y1: p.top + 160 * p.s, floor: p.floor }; })();
      const floorNow = T.scene.place(e.i, t).floor || span.floor, dy0 = floorNow - span.floor, coins = T.scene.debris === 'coins';
      for (const d of DEBRIS) {
        const tt = dt - d.e * 0.25; if (tt < 0) continue;
        const x = span.x + (d.a - .5) * 900 * tt, y = Math.min(floorNow - (coins ? 13 : 3), dy0 + lerp(span.y1, span.y0, d.b) - (150 + d.c * 650) * tt + 1400 * tt * tt);
        const landed = y >= floorNow - (coins ? 14 : 4), al = 1 - ss(1.2, 2.2, tt);
        if (coins) flyingCoin(c, T.chars[e.i].color, x, y, landed ? 1.57 : tt * (4 + 12 * d.d), al);
        else { const an = landed ? 0 : tt * (6 + 14 * d.d), L = 8 + 14 * d.c; c.save(); c.globalAlpha = al; c.strokeStyle = T.chars[e.i].color; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - Math.cos(an) * L / 2, y - Math.sin(an) * L / 2); c.lineTo(x + Math.cos(an) * L / 2, y + Math.sin(an) * L / 2); c.stroke(); c.restore(); }
      }
    }
    if (e.type === 'fling' && dt < 2.6) { const p = P[e.i]; FLING.forEach((f, k) => { const tt = dt - k * 0.07; if (tt < 0 || tt > 2) return; flyingCoin(c, T.chars[e.i].color, p.x + (k % 2 ? 1 : -1) * (30 + 90 * f.a) * tt * p.s, Math.min((p.floor || 1500) - 10, p.top + 120 * p.s - (200 + f.b * 180) * tt + 1400 * tt * tt), tt * (6 + 10 * f.c), 1 - ss(1.0, 1.8, tt), p.s); }); }
    if (e.type === 'burst') { const p = P[e.i], bu = clamp(dt / 0.9); if (bu < 1) for (const k of [0, 0.18]) { const u = clamp(bu - k); if (u <= 0) continue; c.strokeStyle = `rgba(255,205,90,${(1 - u) * 0.9})`; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.top + 70 * p.s, 40 + 300 * u, 0, 7); c.stroke(); } }
  }
  if (T.burst) {
    const e = T.burst, p = P[e.i], floor = p.floor || 1600;
    for (const s of SPARK) { const ts = e.t - 4 + s.a * 14, dt = t - ts; if (dt < 0 || dt > 2.2) continue; c.globalAlpha = Math.sin(Math.PI * dt / 2.2) * 0.9; c.fillStyle = '#ffd97a'; c.beginPath(); c.arc(p.x + (s.b - .5) * 260, floor - s.c * (floor - p.top) - (60 + s.d * 160) * dt, 1.5 + 2.5 * s.e, 0, 7); c.fill(); }
    c.globalAlpha = 1;
  }
}

const CONF = particlesFor(31, 150);
function drawConfetti(c, t) {
  const waves = []; if (T.burst) waves.push([T.burst.t, 1]); if (T.question) waves.push([T.question.t0 + 0.1, 0.45]);
  const cols = T.burst ? [T.chars[T.burst.i].color, GOLD, '#ffffff', T.chars[T.burst.i].core] : [GOLD, '#ffffff'];
  for (const [t0, frac] of waves) CONF.forEach((q, k) => {
    if (k / CONF.length > frac) return;
    const dt = t - t0 - q.e * 0.5; if (dt < 0 || dt > 3.6) return;
    const x = q.a * W + 60 * Math.sin(dt * (2 + q.d * 3) + k), y = -30 - q.b * 400 + (380 + q.c * 420) * dt + 60 * dt * dt;
    if (y > H + 20) return;
    c.save(); c.globalAlpha = 1 - ss(2.8, 3.6, dt); c.translate(x, y); c.rotate(dt * (4 + 6 * q.d)); c.scale(1, Math.cos(dt * (5 + 5 * q.c)));
    c.fillStyle = cols[k % cols.length]; c.fillRect(-5, -8, 10, 16); c.restore();
  });
}

// =====================================================================================  captions / labels
const CAPRECTS = [];
function drawWords(C, line, cx, y, font, spacing, color, a, glow, tStart, t, wordBase, box) {
  C.save(); C.font = font; C.letterSpacing = spacing + 'px'; C.textAlign = 'center';
  if (C === scratchC) { const px = parseFloat(font.match(/([0-9.]+)px/)[1]), w = C.measureText(line).width; CAPRECTS.push({ x0: cx - w / 2, x1: cx + w / 2, y0: y - px * 0.8, y1: y + px * 0.2, text: line }); }
  const words = line.split(' '), sp = C.measureText(' ').width, ws = words.map(w => C.measureText(w).width);
  let x = cx - (ws.reduce((m, n) => m + n, 0) + sp * (words.length - 1)) / 2;
  const up = line.toUpperCase(), names = T.chars.filter(c => up.includes(c.name)).map(c => ({ parts: c.name.split(' '), color: c.color }));
  words.forEach((w, k) => {
    const key = w.replace(/[^A-Za-z0-9$%]/g, '').toUpperCase(), hit = names.find(n => n.parts.includes(key));
    const accent = !box && ((up.startsWith("THAT'S ") && k > 0) || (up.startsWith('ONE CHANGE:') && k < 2)) ? '#36e0c8' : (!box && /[0-9$%]/.test(w) ? GOLD : null);
    const dt = t - (tStart + (wordBase + k) * 0.075), u = clamp(dt / 0.28);
    if (u > 0) {
      C.save(); C.translate(x + ws[k] / 2, y); const sc2 = lerp(1.22, 1, easeBack(u)); C.scale(sc2, sc2); C.globalAlpha = a * clamp(dt / 0.1);
      if (box && hit) { C.fillStyle = hit.color; C.beginPath(); C.roundRect(-ws[k] / 2 - 8, -box * 0.8, ws[k] + 16, box * 1.06, 8); C.fill(); }
      C.fillStyle = hit && !box ? hit.color : (accent && color !== RED ? accent : color); if (glow || accent) { C.shadowColor = C.fillStyle; C.shadowBlur = glow || 10; }
      C.fillText(w, spacing / 2, 0); C.restore();
    }
    x += ws[k] + sp;
  });
  C.restore(); return words.length;
}
function captionBlock(t, tm, C = ctx) {
  if (C === scratchC) CAPRECTS.length = 0;
  const st = T.style, B = beatAt(t), last = B.bi === T.beats.length - 1, q = B.b.style === 'question';
  let text = B.b.caption || '';
  if (tm.kind === 'hook') text = T.spec.hook || 'HOW DID THIS HAPPEN?';
  if (tm.kind === 'rewind') text = '';
  let a = (B.bi === 0 || tm.kind !== 'play' && tm.kind !== 'slow') ? 1 : ss(B.t0, B.t0 + .05, t);
  if (st.transition === 'cut') a = 1;
  let xoff = 0; if (st.transition === 'slide' && tm.kind !== 'hook') xoff = (1 - ss(B.t0, B.t0 + .35, t)) * 160 * (B.bi ? 1 : 0) - (last ? 0 : ss(B.t1 - .22, B.t1, t) * 160);
  const gold = q || tm.kind === 'hook', color = gold ? GOLD : '#dfe4e9';
  const counter = T.spec.counter.label ? T.spec.counter.label + ' ' + Math.round(counterAt(t)) + (T.spec.counter.suffix || '') : '';
  const clock = tm.kind === 'hook' ? tm.u * 1.3 : t, tStart = tm.kind === 'hook' ? 0 : (B.bi === 0 ? -0.3 : B.t0);
  // open loop: a question at the top from the first frame, answered at the climax
  const qs = T.spec.question, ans = T.spec.answer || (T.burst ? `IT'S ${String.fromCharCode(65 + T.burst.i)}: ${T.chars[T.burst.i].name}` : ''), rv = T.burst ? T.burst.t + 0.15 : 1e9;
  const showQ = qs && tm.kind !== 'rewind' && !(T.question && t >= T.question.t0), yo = qs ? 58 : 0;
  if (showQ) { const isAns = t >= rv && tm.kind !== 'hook', txt = isAns ? ans : qs, pop = isAns ? lerp(1.35, 1, easeBack(clamp((t - rv) / 0.35))) : 1;
    C.save(); C.translate(W / 2, 140); C.scale(pop, pop); if (isAns) { C.font = '800 34px Inter'; C.letterSpacing = '2px'; const pw = C.measureText(txt).width + 44; C.fillStyle = 'rgba(5,7,11,0.85)'; C.beginPath(); C.roundRect(-pw / 2, -40, pw, 56, 28); C.fill(); C.strokeStyle = 'rgba(54,224,200,0.55)'; C.lineWidth = 2; C.stroke(); C.letterSpacing = '0px'; } spaced(C, txt, 0, 0, '800 34px Inter', isAns ? '#36e0c8' : GOLD, 2, 1, 14, false); C.restore();
    if (C === scratchC) { C.font = '800 34px Inter'; const w = C.measureText(txt).width * pop; CAPRECTS.push({ x0: 540 - w / 2, x1: 540 + w / 2, y0: 140 - 28, y1: 140 + 8, text: txt }); } }
  // text impacts: the caption shakes and flashes red on a crash, glows gold at the climax
  xoff += textShake(t);
  const crashHit = T.events.some(e => (e.type === 'crash' || e.type === 'shake') && t > e.t && t < e.t + 0.45), burstHit = T.burst && t > T.burst.t && t < T.burst.t + 0.8;
  const capColor = c0 => crashHit ? RED : burstHit ? GOLD : c0;
  let bottom, wb = 0;
  if (st.captionStyle === 'bold') {
    const pz = (st.transition === 'dayzoom' || st.transition === 'cut') && B.bi > 0 ? 1 + 0.35 * (1 - easeOut(clamp((t - B.t0) / 0.4))) : 1;
    if (counter && tm.kind !== 'rewind') { C.save(); C.translate(W / 2, 150 + yo); C.scale(pz, pz); spaced(C, counter, 0, 0, '700 40px Inter', '#9aa6b2', 6, 1, 0, false); C.restore(); }
    const lines = text ? wrapText(text, '800 54px Inter', 1, 800) : [];
    lines.forEach((ln, k) => { wb += drawWords(C, ln, W / 2 + xoff, 228 + yo + k * 62, '800 54px Inter', 3, capColor(gold ? GOLD : '#c9d0d8'), a, gold || burstHit ? 14 : 0, tStart, clock, wb); });
    bottom = 228 + yo + Math.max(0, lines.length - 1) * 62 + 18;
  } else if (st.captionStyle === 'boxed') {
    const lines = text ? wrapText(text, '800 46px Inter', 1, 740) : [];
    if (lines.length && a > 0) {
      C.save(); C.font = '800 46px Inter'; C.letterSpacing = '1px'; const w = Math.max(...lines.map(l => C.measureText(l).width)) + 60, h = lines.length * 60 + 30;
      C.globalAlpha = a; C.fillStyle = crashHit ? '#ffd5da' : (gold || burstHit) ? GOLD : '#f4f6f8'; C.beginPath(); C.roundRect(W / 2 - w / 2 + xoff, 160 + yo, w, h, 22); C.fill(); C.restore();
      lines.forEach((ln, k) => { wb += drawWords(C, ln, W / 2 + xoff, 160 + yo + 60 + k * 60, '800 46px Inter', 1, INK, a, 0, tStart, clock, wb, 46); });
    }
    const by = 160 + yo + Math.max(1, lines.length) * 60 + 30;
    if (counter && tm.kind !== 'hook' && tm.kind !== 'rewind') spaced(C, counter, W / 2, by + 46, '700 32px Inter', '#9aa3ad', 5, 1, 0, true);
    bottom = by + 46;
  } else {
    const lines = text ? wrapText(text, '700 50px Inter', 4, 800) : [];
    lines.forEach((ln, k) => { wb += drawWords(C, ln, W / 2 + xoff, 210 + yo + k * 62, '700 50px Inter', 4, capColor(color), a, gold || burstHit ? 16 : 4, tStart, clock, wb); });
    const n = Math.max(1, lines.length);
    if (counter && tm.kind !== 'rewind') spaced(C, counter, W / 2, 210 + yo + n * 62 - 2, '700 32px Inter', '#9aa3ad', 6, a, 0, true);
    bottom = 210 + yo + n * 62;
  }
  if (st.transition === 'dayzoom' && st.captionStyle !== 'bold' && B.bi > 0 && counter && tm.kind !== 'hook') {
    const du = (t - B.t0) / 0.45;
    if (du >= 0 && du < 1) { const sc2 = lerp(2.0, 1, easeOut(du)), y = lerp(470, 240 + yo, easeIO(du)); C.save(); C.translate(W / 2, y); C.scale(sc2, sc2); spaced(C, counter, 0, 0, '800 64px Inter', '#ffffff', 2, 1 - ss(0.6, 1, du), 24); C.restore(); }
  }
  if (q && tm.kind !== 'endcard') { const L = T.chars.map((_, k) => String.fromCharCode(65 + k)).join(' · '); spaced(C, 'COMMENT ' + L, W / 2, bottom + 42, '800 32px Inter', '#ffffff', 4, ss(B.t0 + 0.4, B.t0 + 0.8, t)); if (C === scratchC) CAPRECTS.push({ x0: 300, x1: 780, y0: bottom + 42 - 26, y1: bottom + 48, text: 'COMMENT' }); bottom += 42; }
  if (T.spec.footnote) { const ft = T.beats[Math.max(0, T.beats.length - 2)].t0; const fl = wrapText(T.spec.footnote.toUpperCase(), '700 28px Inter', 1, 860); fl.forEach((ln, k) => { spaced(C, ln, W / 2, bottom + 40 + k * 34, '700 28px Inter', '#9aa3ad', 1, ss(ft + .2, ft + 1, t), 0, true); if (C === scratchC && t > ft + .4) { C.font = '700 28px Inter'; const w = C.measureText(ln).width; CAPRECTS.push({ x0: 540 - w / 2, x1: 540 + w / 2, y0: bottom + 40 + k * 34 - 22, y1: bottom + 40 + k * 34 + 6, text: ln }); } }); bottom += 40 + (fl.length - 1) * 34; }
  return bottom;
}
const RECTS = [];
function rectOf(owner, text, x, y, font, sp) { sc.font = font; sc.letterSpacing = sp + 'px'; const w = sc.measureText(text).width, h = parseFloat(font.match(/([0-9.]+)px/)[1]); RECTS.push({ owner, text, x0: x - w / 2, x1: x + w / 2, y0: y - h * 0.78, y1: y + h * 0.1 }); }
const ownerName = o => o >= 300 ? 'LEADERBOARD' : (T.chars[o % 100] || { name: '?' }).name + (o >= 200 ? ' marker' : o >= 100 ? ' badge' : '');
function qaLayout(t, P) {
  for (let a = 0; a < RECTS.length; a++) for (let b = a + 1; b < RECTS.length; b++) {
    const A = RECTS[a], B = RECTS[b]; if (A.owner === B.owner || (A.owner >= 300 && B.owner >= 300)) continue;
    const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), oy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
    if (ox > 3 && oy > 3) WARN.add(`labels overlap: ${ownerName(A.owner)} "${String(A.text).replace(/[0-9][0-9,.]*/g, '#')}" / ${ownerName(B.owner)} "${String(B.text).replace(/[0-9][0-9,.]*/g, '#')}"`);
  }
  P.forEach((p, i) => { if (p.x < 10 || p.x > W - 10 || p.top < 0 || p.top > H - 60) WARN.add(`character out of frame: ${T.chars[i].name}`); });
  for (const A of RECTS) {
    if (A.owner >= 300) continue;
    if ((A.y1 - A.y0) / 0.88 < 27) WARN.add(`text too small: "${String(A.text).replace(/[0-9][0-9,.]*/g, '#')}"`);
    const nm = A.owner >= 200 ? T.chars[A.owner - 200].name : A.owner >= 100 ? T.chars[A.owner - 100].name : T.chars[A.owner].name;
    if (A.y1 > 1525) WARN.add(`text in the Shorts bottom overlay: ${nm} "${String(A.text).replace(/[0-9][0-9,.]*/g, '#')}"`);
    if (A.owner < 100) { const j = T.__joints[A.owner]; if (!j) continue;
      const pts = [[T.__X(j.head[0]), T.__Y(j.head[1]), j.hr * (T.__z || 1)], ...j.hands.map(h => [T.__X(h[0]), T.__Y(h[1]), 6])];
      if (pts.some(([x, y, r]) => x + r > A.x0 + 2 && x - r < A.x1 - 2 && y + r > A.y0 + 2 && y - r < A.y1 - 2)) WARN.add(`character covers its own label: ${nm} "${String(A.text).replace(/[0-9][0-9,.]*/g, '#')}"`); }
  }
  for (const A of RECTS) { if (A.owner >= 300) continue; const own = A.owner % 100; T.chars.forEach((ch, i) => { if (i === own) return; if (hitBox(bodyBox(i, -4), A.x0, A.x1, A.y0, A.y1)) WARN.add(`label covers another character: ${ownerName(A.owner)} "${String(A.text).replace(/[0-9][0-9,.]*/g, '#')}" / ${ch.name}`); }); }
  T.chars.forEach((ch, i) => { const j = T.__joints[i]; if (j && T.__Y(j.head[1]) > 1560) WARN.add(`character in the Shorts bottom overlay: ${ch.name}`); });
  for (const A of RECTS) { for (const C of CAPRECTS) if (Math.min(A.x1, C.x1) - Math.max(A.x0, C.x0) > 2 && Math.min(A.y1, C.y1) - Math.max(A.y0, C.y0) > 2) WARN.add(`label overlaps the caption block: ${ownerName(A.owner)} "${String(A.text).replace(/[0-9][0-9,.]*/g, '#')}" / "${String(C.text).slice(0, 24)}"`); }
  for (const pr of (T.__props || [])) { const j = T.__joints[pr.i]; if (!j || !pr.held) continue; const tol = 14 * (j.hr / 27); if (j.hands.some(h => Math.abs(h[1] - pr.y0) > tol || h[0] < pr.x0 - tol || h[0] > pr.x1 + tol)) WARN.add(`prop not held by the hands: ${T.chars[pr.i].name}`); }
  for (const ln of (T.__lines || [])) { const y = T.__Y(ln.y), x0 = T.__X(ln.x0), x1 = T.__X(ln.x1); for (const A of RECTS) { if (A.owner >= 300 || A.plated) continue; if (y > A.y0 + 3 && y < A.y1 - 3 && Math.min(A.x1, x1) - Math.max(A.x0, x0) > 4) WARN.add(`scenery line strikes through text: ${ownerName(A.owner)} "${String(A.text).replace(/[0-9][0-9,.]*/g, '#')}"`); } }
  for (const pr of (T.__props || [])) { const j = T.__joints[pr.i]; if (!j) continue; const hx = j.head[0], hy = j.head[1], r = j.hr * 0.95, dx = pr.x1 - pr.x0, dy = pr.y1 - pr.y0, L2 = dx * dx + dy * dy || 1, u = clamp(((hx - pr.x0) * dx + (hy - pr.y0) * dy) / L2), px = pr.x0 + u * dx, py = pr.y0 + u * dy; if (Math.hypot(hx - px, hy - py) < r) WARN.add(`prop crosses a face: ${T.chars[pr.i].name}`); }
  RECTS.length = 0;
}
const tagY0 = (y0, board, s) => y0 - (board ? 50 : 108) * s;
// a character's whole body on screen (head, hands, feet), padded
function bodyBox(o, pad = 8) { const j = T.__joints[o]; if (!j) return null; const r = j.hr * (T.__z || 1), pts = [j.head, ...j.hands, ...(j.feet || []), ...(j.hip ? [j.hip, j.neck] : [])].map(q => [T.__X(q[0]), T.__Y(q[1])]), hx = T.__X(j.head[0]), hy = T.__Y(j.head[1]);
  return { x0: Math.min(hx - r, ...pts.map(q => q[0])) - pad, x1: Math.max(hx + r, ...pts.map(q => q[0])) + pad, y0: Math.min(hy - r, ...pts.map(q => q[1])) - pad, y1: Math.max(hy + r, ...pts.map(q => q[1])) + pad }; }
const hitBox = (b, x0, x1, y0, y1) => b && x1 > b.x0 && x0 < b.x1 && y1 > b.y0 && y0 < b.y1;
// badge goes above the label stack, unless that covers another character's head: then beside the name (left, else right)
const stackH = Z => ((Z.lines.length > 1 ? 72 : 38) + (T.style.labels === 'board' ? 0 : 60) + (Z.tagW ? 50 : 0)) * Z.s * Z.grow;
function badgeSpot(i, q, yAbove, r, yName, nameW, L) {
  const hits = (x, y) => T.chars.some((_, o) => o !== i && hitBox(bodyBox(o, 4), x - r, x + r, y - r, y + r))
    || L.some(o => { if (o.i === i) return false; const hw = o.w * o.f / 2 + 8, yb = o.top - o.lift + 8, yt = yb - stackH(o) - 30 - 2 * r; return x + r > o.x - hw && x - r < o.x + hw && y + r > yt && y - r < yb; });
  if (!hits(q.x, yAbove)) return [q.x, yAbove];
  const xl = q.x - nameW / 2 - 14 - r, xr = q.x + nameW / 2 + 14 + r;
  if (xl >= 40 + r && !hits(xl, yName)) return [xl, yName];
  if (xr <= 950 - r && !hits(xr, yName)) return [xr, yName];
  return [q.x, yAbove];
}
function drawLabels(t, P, boardTop) {
  RECTS.length = 0;
  const board = T.style.labels === 'board', fw = focusWeights(t);
  const meas = (text, font, sp) => { sc.font = font; sc.letterSpacing = sp + 'px'; return sc.measureText(text).width; };
  const L = T.chars.map((ch, i) => {
    const p = { ...P[i], s: clamp(T.__z || 1, 0.92, 1.08) * (T.style.labelScale || 1) }, s = p.s, rate = fracRate(i, t), grow = (1 + 0.16 * fw[i]) * (1 + 0.25 * clamp(Math.abs(rate) * 2.2)) * (1 + 0.35 * Math.max(0, ...T.milestones.filter(m => m.i === i).map(m => bump(m.t, m.t + 0.45, t)))) * (1 + 0.3 * rollPop(i, t));
    const numW = board ? 0 : meas(fmt(value(i, t)), `800 ${(60 * s * grow).toFixed(1)}px Inter`, 0);
    const nf0 = `800 ${(34 * s * grow).toFixed(1)}px Inter`, nameW = meas(ch.name, nf0, 2), words = ch.name.split(' ');
    let split = null; if (words.length > 1) { let best = null; for (let k = 1; k < words.length; k++) { if (/^[=&+]$/.test(words[k]) || /^[=&+]$/.test(words[k - 1])) continue; const l1 = words.slice(0, k).join(' '), l2 = words.slice(k).join(' '), w2 = Math.max(meas(l1, nf0, 2), meas(l2, nf0, 2)) + (Math.min(l1.length, l2.length) <= 2 ? 999 : 0); if (!best || w2 < best[0]) best = [w2, l1, l2]; } split = best && best[0] < 900 ? best : null; }
    const tg = tagAt(i, t), tagW = tg ? meas(tg.text, `800 ${(34 * s).toFixed(1)}px Inter`, 2) : 0;
    return { i, x: p.x, top: p.top, s, grow, rate, w: Math.max(numW, nameW, tagW), numW, tagW, split, lines: [ch.name], f: 1, lift: 0 };
  });
  const sorted = L.slice().sort((a, b) => a.x - b.x);
  if (!window.__disableSolver) for (let pass = 0; pass < 3; pass++) for (let k = 0; k < sorted.length - 1; k++) {
    const A = sorted[k], Bq = sorted[k + 1];
    const hOf = Z => ((Z.lines.length > 1 ? 72 : 38) + (board ? 0 : 60) + (Z.tagW ? 50 : 0)) * Z.s * Z.grow, aB = A.top - A.lift, bB = Bq.top - Bq.lift;   // real stack heights, not a fixed guess
    if (aB + 10 < bB - hOf(Bq) || bB + 10 < aB - hOf(A)) continue;
    const dx = Bq.x - A.x, GAP = 44; if ((A.w * A.f + Bq.w * Bq.f) / 2 + GAP <= dx) continue;
    for (const Z of [A, Bq]) if (Z.split && Z.lines.length === 1) { Z.lines = [Z.split[1], Z.split[2]]; Z.w = Math.max(Z.numW, Z.split[0], Z.tagW); }   // 1) wrap long names
    if ((A.w * A.f + Bq.w * Bq.f) / 2 + GAP <= dx) continue;
    const kf = clamp((dx - GAP) / ((A.w + Bq.w) / 2), 0.9, 1); A.f = Math.min(A.f, kf); Bq.f = Math.min(Bq.f, kf);   // 2) shrink a little
    if ((A.w * A.f + Bq.w * Bq.f) / 2 + GAP > dx) { const hi = aB <= bB ? A : Bq, lo = hi === A ? Bq : A; hi.lift += Math.max(20, (hi.top - hi.lift) - (lo.top - lo.lift) + hOf(lo) + 14); }   // 3) stagger: lift the higher stack clear of the other
  }
  for (const q of L) { const half = q.w * q.f / 2; q.x = clamp(q.x, half + 40, 950 - half); }
  if (!window.__disableSolver) for (const q of L) {   // a label never sits on another character's body: move it into the free gap beside them (wrap, then shrink <=15% if needed)
    const yb = q.top - q.lift + 8, yt = yb - stackH(q) - 8, blk = [];
    T.chars.forEach((_, o) => { if (o === q.i) return; const b = bodyBox(o, 10); if (b && !(yb < b.y0 || yt > b.y1)) blk.push([b.x0, b.x1]); });
    const half0 = q.w * q.f / 2; if (!blk.some(([u0, u1]) => q.x + half0 > u0 && q.x - half0 < u1)) continue;
    blk.sort((u, v) => u[0] - v[0]); const free = []; let cur = 40; for (const [u0, u1] of blk) { if (u0 > cur) free.push([cur, Math.min(u0, 950)]); cur = Math.max(cur, u1); } if (cur < 950) free.push([cur, 950]);
    const own = bodyBox(q.i, 0), cx = own ? (own.x0 + own.x1) / 2 : q.x;
    const fitW = () => q.w * q.f;
    const tryFit = () => { let best = null; for (const [f0, f1] of free) { if (f1 - f0 < fitW()) continue; const x = clamp(cx, f0 + fitW() / 2, f1 - fitW() / 2), d = Math.abs(x - cx); if (!best || d < best[0]) best = [d, x]; } return best; };
    let got = tryFit();
    if ((!got || got[0] > 160) && q.split && q.lines.length === 1) { const keep = [q.lines, q.w]; q.lines = [q.split[1], q.split[2]]; q.w = Math.max(q.numW, q.split[0], q.tagW); const g2 = tryFit(); if (g2 && (!got || g2[0] < got[0])) got = g2; else [q.lines, q.w] = keep; }
    if (!got) { const f0 = q.f; for (const [a0, a1] of free) { const k = (a1 - a0) / q.w; if (k >= 0.85 && k < q.f && Math.abs((a0 + a1) / 2 - cx) < 260) { q.f = Math.min(q.f, k); got = [0, (a0 + a1) / 2]; break; } } if (!got) q.f = f0; }
    if (got) q.x = got[1];
  }
  T.__labels = L;
  T.chars.forEach((ch, i) => {
    const q = L[i], s = q.s, f = q.f * q.grow, a = Math.max(alphaAt(i, t), pickTurn(i, t), 0.75, T.question && t >= T.question.t0 ? 1 : 0), y0 = q.top - q.lift, CAP = 0.73;   // options stay readable even when the character is dimmed
    const namePx = 34 * s * f, nameBase = y0 - 6 * s, mf = `800 ${namePx.toFixed(1)}px Inter`, lineH = namePx * 1.02;
    q.lines.slice().reverse().forEach((ln, k) => { spaced(sc, ln, q.x, nameBase - k * lineH, mf, board ? ch.color : '#eef1f4', 2, a, 0, true); if (a > 0.3) rectOf(i, ln, q.x, nameBase - k * lineH, mf, 2); });
    const nameTop = nameBase - (q.lines.length - 1) * lineH - CAP * namePx;
    let top = nameTop;
    if (!board) {
      const numPx = 60 * s * f, numBase = nameTop - 16 * s, nf = `800 ${numPx.toFixed(1)}px Inter`;
      spaced(sc, fmt(value(i, t)), q.x, numBase, nf, q.rate < -0.05 ? RED : ch.color, 0, a, q.rate > 0.1 || fw[i] > 0.5 ? 12 : 0, true); if (a > 0.3) rectOf(i, fmt(value(i, t)), q.x, numBase, nf, 0);
      top = numBase - CAP * numPx;
    }
    const tg = tagAt(i, t);
    if (tg) { const tagPx = 34 * s * q.f, tagBase = top - 10 * s, tf = `800 ${tagPx.toFixed(1)}px Inter`; spaced(sc, tg.text, q.x, tagBase, tf, tg.color || RED, 2, tg.a * Math.max(a, 0.8), 0, true); if (tg.a > 0.5) rectOf(i, tg.text, q.x, tagBase, tf, 2); top = tagBase - CAP * tagPx; }
    q.stackTop = top;
    if ((T.question && t >= T.question.t0) || (T.spec.question && t < T.beats[0].t1)) { const pk = pickTurn(i, t), bs = (1 + 0.35 * pk) * s * q.f, predict = !(T.question && t >= T.question.t0), [bx, by] = badgeSpot(i, q, top - 12 * s - 34 * bs - 10 * pk * s, 34 * bs, nameBase - (q.lines.length - 1) * lineH / 2 - CAP * namePx / 2, Math.max(...q.lines.map(ln => meas(ln, mf, 2))), L), qa = (T.question && t >= T.question.t0) ? ss(T.question.t0, T.question.t0 + 0.4, t) : (1 - ss(T.beats[0].t1 - 0.3, T.beats[0].t1, t)) ; sc.save(); sc.globalAlpha = qa; sc.fillStyle = ch.color; sc.shadowColor = ch.color; sc.shadowBlur = 20 * pk; sc.beginPath(); sc.arc(bx, by, 34 * bs, 0, 7); sc.fill(); sc.restore(); spaced(sc, String.fromCharCode(65 + i), bx, by + 14 * bs, `800 ${(40 * bs).toFixed(1)}px Inter`, INK, 0, qa, 0, false, false); if (qa > 0.3) RECTS.push({ owner: 100 + i, text: 'badge', x0: bx - 34 * bs, x1: bx + 34 * bs, y0: by - 34 * bs, y1: by + 34 * bs }); if (qa > 0.02 && by - 34 * bs - 4 < q.stackTop) q.stackTop = by - 34 * bs - 4; }   // bubbles and markers go above the badge
  });
  if (board && T.__kind !== 'rewind') {
    const rankAt = tt => { const order = T.chars.map((_, i) => i).sort((x, y) => value(y, tt) - value(x, tt)); const rk = []; order.forEach((ci, k) => { rk[ci] = k; }); return rk; };
    const pos = T.chars.map(() => 0); for (let k = 0; k < 4; k++) { const rk = rankAt(Math.max(0, t - k * 0.035)); rk.forEach((v, ci) => { pos[ci] += v / 4; }); }
    const x0 = 170, x1 = 910;
    sc.save(); sc.globalAlpha = 0.5; sc.fillStyle = 'rgba(255,255,255,0.05)'; sc.beginPath(); sc.roundRect(x0 - 24, boardTop - 42, x1 - x0 + 48, T.chars.length * 60 + 20, 18); sc.fill(); sc.restore();
    T.chars.forEach((ch, i) => {
      const near = Math.min(1, ...pos.map((pp, j) => j === i ? 1 : Math.abs(pp - pos[i]))), y = boardTop + pos[i] * 60, a = Math.max(alphaAt(i, t), 0.8) * (0.25 + 0.75 * clamp(near / 0.7));
      sc.save(); sc.globalAlpha = a; sc.fillStyle = ch.color; sc.fillRect(x0, y - 28, 8, 34);
      sc.font = '800 32px Inter'; sc.letterSpacing = '1px'; sc.textAlign = 'left'; sc.fillText(ch.name, x0 + 24, y); sc.textAlign = 'right'; sc.letterSpacing = '0px'; sc.font = '800 38px Inter'; sc.fillText(fmt(value(i, t)), x1, y + 2); RECTS.push({ owner: 300 + i, text: 'leaderboard ' + ch.name, x0: x0, x1: x1, y0: y - 32, y1: y + 8 }); sc.restore();
    });
  }
  for (const bb of T.bubbles) {
    if (t < bb.t0 || t > bb.t1) continue;
    const q = L[bb.i], s = q.s, a = ss(bb.t0, bb.t0 + .2, t) * (1 - ss(bb.t1 - .25, bb.t1, t));
    const y = q.stackTop - 14 * s - 6 * (1 - a);
    const gap = yTop => { const R0 = (y > 860 && y < 1720) ? 950 : W - 24, blk = [];
      for (const o of L) { if (o.i === bb.i) continue; const b = bodyBox(o.i, 10); if (b && !(y + 8 < b.y0 || yTop > b.y1)) blk.push([b.x0, b.x1]);
        const oy0 = o.stackTop - 4, oy1 = o.top - o.lift; if (!(y + 6 < oy0 || yTop > oy1)) blk.push([o.x - o.w * o.f / 2 - 12, o.x + o.w * o.f / 2 + 12]); }
      const own = bodyBox(bb.i, 0), cx = own ? (own.x0 + own.x1) / 2 : q.x; blk.sort((u, v) => u[0] - v[0]);
      const free = []; let cur = 24; for (const [u0, u1] of blk) { if (u0 > cur) free.push([cur, Math.min(u0, R0)]); cur = Math.max(cur, u1); } if (cur < R0) free.push([cur, R0]);
      let best = null; for (const f of free) { const d = cx < f[0] ? f[0] - cx : cx > f[1] ? cx - f[1] : 0, w = f[1] - f[0]; const sc0 = d - Math.min(w, 400) * 0.6; if (!best || sc0 < best[0]) best = [sc0, f]; }
      return best ? best[1] : [24, R0]; };
    let [left, right] = gap(y - 28 * s);
    const bf0 = `italic 700 ${(36 * s).toFixed(1)}px Inter`, w0 = meas(bb.text, bf0, 0);
    let lines = [bb.text], wl = w0;
    if (w0 * 0.85 > right - left && bb.text.includes(' ')) { [left, right] = gap(y - 28 * s - 38 * s); /* two lines: clear the taller box */ const ws = bb.text.split(' '); let best = null; for (let k = 1; k < ws.length; k++) { const a1 = ws.slice(0, k).join(' '), a2 = ws.slice(k).join(' '), m = Math.max(meas(a1, bf0, 0), meas(a2, bf0, 0)); if (!best || m < best[0]) best = [m, a1, a2]; } lines = [best[1], best[2]]; wl = best[0]; }   // too wide for the gap: two lines
    const kf = clamp((right - left) / wl, 0.85, 1), w = wl * kf, bf = `italic 700 ${(36 * s * kf).toFixed(1)}px Inter`, lh = 36 * s * kf * 1.05;
    const x = right - left >= w ? clamp(q.x, left + w / 2, right - w / 2) : (left + right) / 2;
    let shown = Math.ceil(bb.text.length * clamp((t - bb.t0) / 0.45));
    lines.forEach((ln, k) => { const yy = y - (lines.length - 1 - k) * lh, part = ln.slice(0, Math.max(0, shown)); shown -= ln.length + 1; spaced(sc, part, x, yy, bf, T.chars[bb.i].color, 0, a); if (a > 0.5) rectOf(bb.i, ln, x, yy, bf, 0); });
  }
  for (const e of T.events) if (e.type === 'marker') {
    const a = ss(e.t, e.t + .3, t) * (1 - ss(e.t + (e.dur || 2) - .3, e.t + (e.dur || 2), t)); if (a <= 0) continue;
    const p = P[e.i], mf = `800 ${(38 * clamp(T.__z || 1, 0.92, 1.08)).toFixed(1)}px Inter`, mw = (sc.font = mf, sc.letterSpacing = '0px', sc.measureText(e.text).width), mx = clamp(p.x + (e.dx != null ? e.dx : -110) * p.s, mw / 2 + 40, 950 - mw / 2), my0 = p.top + (e.dy != null ? e.dy : 120) * p.s, lab = (T.__labels || [])[e.i], my = (e.dy != null && e.dy < 0 && lab && lab.stackTop != null) ? Math.min(my0, lab.stackTop - 16) : my0; spaced(sc, e.text, mx, my, mf, e.color || RED, 0, a); if (a > 0.5) rectOf(200 + e.i, e.text, mx, my, mf, 0);
  }
}
function drawEndcard(u) {
  const ec = T.brand.endcard; if (!ec) return;
  const a = ss(0, 0.22, u);
  ctx.fillStyle = `rgba(6,8,14,${0.93 * a})`; ctx.fillRect(0, 0, W, H);
  const ma = ss(0.14, 0.3, u), pop = 0.75 + 0.25 * easeBack(ss(0.14, 0.4, u)), cx = 540, cy = 860 - Math.abs(Math.sin(u * Math.PI * 3)) * 40 * ss(0.3, 0.5, u), r = 150 * pop;
  ctx.save(); ctx.globalAlpha = ma;
  ctx.strokeStyle = 'rgba(160,190,255,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath();
  const pts = [...Array(18)].map((_, k) => { const an = k / 18 * 6.283 + u * 0.8; return [cx + Math.cos(an) * 250, cy + Math.sin(an) * 250]; });
  pts.forEach((q, k) => { k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(200,220,255,0.6)'; pts.forEach(q => { ctx.beginPath(); ctx.arc(q[0], q[1], 3, 0, 7); ctx.fill(); });
  const col = ec.color || GOLD, look = lookOf({ look: ec.look || {} });
  ctx.shadowColor = col; ctx.shadowBlur = 40; ctx.fillStyle = col; ctx.beginPath();
  if (look.shape === 'square') ctx.roundRect(cx - r, cy - r, 2 * r, 2 * r, r * 0.45); else ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); if (look.shape === 'square') ctx.roundRect(cx - r * 0.86, cy - r * 0.86, 1.72 * r, 1.72 * r, r * 0.38); else ctx.arc(cx, cy, r * 0.86, 0, 7); ctx.fill();
  drawFace(ctx, cx, cy, r * 0.86, ec.expression || 'joy', 0);
  drawAccessory(ctx, ec.accessory || look.accessory, cx, cy, r * 0.86, 0, u * 3, ec.accent || look.accent || col);
  ctx.restore();
  ctx.save(); ctx.translate(540, 1180); const tp = lerp(1.6, 1, easeBack(ss(0.15, 0.45, u))); ctx.scale(tp, tp); spaced(ctx, ec.title || '', 0, 0, '800 66px Inter', '#ffffff', 3, ss(0.15, 0.3, u), 10); ctx.restore();
  const pa = ss(0.4, 0.6, u), pp = 1 + 0.06 * Math.sin(u * 30); if (pa > 0) { ctx.save(); ctx.globalAlpha = pa; ctx.translate(540, 1320); ctx.scale(pp, pp); const cta = ec.cta || 'FOLLOW FOR MORE'; ctx.font = '800 26px Inter'; ctx.letterSpacing = '2px'; const pw = ctx.measureText(cta).width + 64; ctx.fillStyle = ec.color || GOLD; ctx.beginPath(); ctx.roundRect(-pw / 2, -34, pw, 64, 32); ctx.fill(); ctx.restore(); spaced(ctx, cta, 540, 1330, '800 26px Inter', INK, 2, pa); }
  spaced(ctx, ec.tagline || '', 540, 1236, '500 26px Inter', '#9aa7b8', 4, ss(0.25, 0.5, u));
}

// =====================================================================================  frame
// rough height of a character's label stack right now (screen px): name line(s), number, tag, bubble
function stackEstimate(i, t) { const board = T.style.labels === 'board', nm = T.chars[i].name; return 50 + (nm.includes(' ') ? 36 : 0) + (board ? 0 : 76) + (tagAt(i, t) ? 46 : 0) + (T.bubbles.some(b => b.i === i && t > b.t0 - 0.2 && t < b.t1) ? 58 : 0); }
function renderFrame(r) {
  const tm = storyAt(r), t = tm.s, st = T.style;
  const capCanvasBottom = captionBlock(t, tm, scratchC), boardOn = T.style.labels === 'board';
  const safeTop = (boardOn ? capCanvasBottom + 56 + T.chars.length * 60 : capCanvasBottom) + 30;
  const [shx, shy] = shakeAt(t, tm), cam = cameraAt(t, tm, safeTop), look = lookOf(T.chars[0]);
  const X = x => 540 + cam.dx + (x - 540) * cam.z + shx, Y = y => 960 + cam.dy + (y - 960) * cam.z + shy;
  T.__joints = {}; T.__props = []; T.__lines = []; T.__vlines = []; T.__X = X; T.__Y = Y; T.__z = cam.z; T.__kind = tm.kind;
  sc.clearRect(0, 0, W, H);
  sc.save(); sc.translate(540 + cam.dx + shx, 960 + cam.dy + shy); sc.scale(cam.z, cam.z); sc.translate(-540, -960);
  const th = THEMES[st.theme] || THEMES.void;
  if (th.dust) for (const d of DUST) { const y = ((d.y - d.v * t) % H + H) % H, x = d.x + 12 * Math.sin(t * .6 + d.p); sc.globalAlpha = d.a * (0.6 + 0.4 * Math.sin(t * 1.7 + d.p)); sc.fillStyle = th.dust; sc.beginPath(); sc.arc(x, y, d.s, 0, 7); sc.fill(); }
  sc.globalAlpha = 1;
  const P0 = T.scene.draw(sc, t);
  drawEffects(sc, t, P0);
  sc.restore();
  const P = P0.map((p, i) => { const j = T.__joints[i], top0 = j && !window.__disableLabelLift ? Math.min(p.top, j.minY - 24 * p.s) : p.top, top = T.scene.labelTop ? T.scene.labelTop(i, top0, t, stackEstimate(i, t) / p.s) : top0; return { ...p, x: X(p.x), top: Y(top), s: p.s * cam.z, floor: p.floor != null ? Y(p.floor) : null }; });
  drawConfetti(sc, t);
  const warm = T.burst ? ss(T.burst.t - 4, T.burst.t + 0.6, t) : 0;
  const FY = T.scene.floorY ? Y(T.scene.floorY(t)) : null;
  drawBackground(t, FY, warm, T.burst ? P[T.burst.i].x : 540);
  if (FY && FY < H - 40) {
    const RH = Math.min(FY, H - FY);
    ctx.save(); ctx.globalAlpha = 0.2; ctx.translate(0, 2 * FY); ctx.scale(1, -1); ctx.drawImage(scene, 0, FY - RH, W, RH, 0, FY - RH, W, RH); ctx.restore();
    const th2 = THEMES[st.theme] || THEMES.void, fade = ctx.createLinearGradient(0, FY + 2, 0, FY + (H - FY) * 0.85);
    fade.addColorStop(0, th2.bot + '00'); fade.addColorStop(1, th2.bot); ctx.fillStyle = fade; ctx.fillRect(0, FY + 2, W, H - FY);
  }
  const fw = focusWeights(t);
  P.forEach((p, i) => { if (fw[i] < 0.05) return; const g = ctx.createRadialGradient(p.x, p.top + 90 * p.s, 0, p.x, p.top + 90 * p.s, 300 * p.s); g.addColorStop(0, T.chars[i].color + Math.round(20 * fw[i]).toString(16).padStart(2, '0')); g.addColorStop(1, T.chars[i].color + '00'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
  ctx.drawImage(scene, 0, 0);
  const bloom = (look.lineStyle === 'flat' ? 0.35 : 1) * (T.style.glow != null ? T.style.glow : 1);
  g1c.imageSmoothingQuality = 'high'; g2c.imageSmoothingQuality = 'high';
  g1c.clearRect(0, 0, W / 4, H / 4); g1c.filter = 'blur(2px)'; g1c.drawImage(scene, 0, 0, W / 4, H / 4); g1c.filter = 'none';
  g2c.clearRect(0, 0, W / 8, H / 8); g2c.filter = 'blur(4px)'; g2c.drawImage(scene, 0, 0, W / 8, H / 8); g2c.filter = 'none';
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.32 * bloom; ctx.drawImage(g1, 0, 0, W, H); ctx.globalAlpha = (0.22 + 0.2 * warm) * bloom; ctx.drawImage(g2, 0, 0, W, H); ctx.restore();
  // UI layer (numbers, names, tags, bubbles) drawn after the glow so text stays sharp
  sc.clearRect(0, 0, W, H);
  drawLabels(t, P, capCanvasBottom + 56);
  for (const ln of (T.__lines || [])) { const y = T.__Y(ln.y), x0 = T.__X(ln.x0), x1 = T.__X(ln.x1);   // text crossed by a scenery line gets a dark plate behind it
    for (const A of RECTS) { if (A.owner >= 300 || !(y > A.y0 - 6 && y < A.y1 + 6 && Math.min(A.x1, x1) - Math.max(A.x0, x0) > 0)) continue;
      ctx.save(); ctx.fillStyle = 'rgba(5,7,11,0.92)'; ctx.beginPath(); ctx.roundRect(A.x0 - 12, A.y0 - 8, A.x1 - A.x0 + 24, A.y1 - A.y0 + 14, 10); ctx.fill(); ctx.restore(); A.plated = true; } }
  for (const vl of (T.__vlines || [])) { const x = T.__X(vl.x), y0 = T.__Y(vl.y0), y1 = T.__Y(vl.y1);   // ropes/poles crossing text: same dark plate
    for (const A of RECTS) { if (A.owner >= 300 || A.plated || !(x > A.x0 - 4 && x < A.x1 + 4 && Math.min(A.y1, y1) - Math.max(A.y0, y0) > 0)) continue;
      ctx.save(); ctx.fillStyle = 'rgba(5,7,11,0.92)'; ctx.beginPath(); ctx.roundRect(A.x0 - 12, A.y0 - 8, A.x1 - A.x0 + 24, A.y1 - A.y0 + 14, 10); ctx.fill(); ctx.restore(); A.plated = true; } }
  if (tm.kind === 'play' || tm.kind === 'slow' || tm.kind === 'hook') qaLayout(t, P); else RECTS.length = 0;
  ctx.drawImage(scene, 0, 0);
  captionBlock(t, tm);
  // crash flash / cut flash
  for (const e of T.events) if (e.type === 'crash' || e.type === 'flash') { const f = t > e.t ? 1 - ss(e.t, e.t + 0.8, t) : 0; if (f <= 0) continue; const rf = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1100); rf.addColorStop(0, 'rgba(255,40,60,0)'); rf.addColorStop(1, `rgba(255,40,60,${0.28 * f})`); ctx.fillStyle = rf; ctx.fillRect(0, 0, W, H); }
  if (st.transition === 'cut') { const B = beatAt(t); if (B.bi > 0) { const f = 1 - ss(B.t0, B.t0 + 0.12, t); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${0.18 * f})`; ctx.fillRect(0, 0, W, H); } } }
  if (tm.kind === 'slow') { ctx.fillStyle = 'rgba(255,255,255,0.03)'; for (let y = 0; y < H; y += 7) ctx.fillRect(0, y, W, 1); }
  if (tm.kind === 'rewind') {
    ctx.fillStyle = 'rgba(40,90,255,0.10)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; for (let y = (r * 900) % 6; y < H; y += 6) ctx.fillRect(0, y, W, 2);
    spaced(ctx, '◀◀  REWIND', 540, 250, '800 56px Inter', '#ffffff', 6, 0.9, 12);
  }
  const vg = ctx.createRadialGradient(W / 2, H * .45, 450, W / 2, H * .45, 1250); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (tm.kind === 'endcard') drawEndcard(tm.u);
}
// scratch context used to measure the caption block height
const [scratch, scratchC] = mk(W, 400);

// =====================================================================================  brand model sheet
function drawBrandSheet(brand) {
  T = compile({ id: 'sheet', scene: 'towers', characters: (brand.sheetCharacters || [{ name: 'A', color: '#ffc53d' }, { name: 'B', color: '#5ec8ff' }, { name: 'C', color: '#ff5a6e' }]), metric: {}, counter: { start: 0 }, beats: [{ dur: 2, caption: '' }] }, brand, {});
  buildTimeMap(); buildShots();
  ctx.fillStyle = '#0a0c10'; ctx.fillRect(0, 0, W, H);
  spaced(ctx, (brand.name || 'BRAND').toUpperCase(), 540, 110, '800 48px Inter', '#ffffff', 4, 1);
  spaced(ctx, 'CHARACTER MODEL SHEET', 540, 150, '600 20px Inter', '#8d96a0', 6, 1);
  const exprs = [['neutral', 'stand'], ['determined', 'stand'], ['smug', 'cheer'], ['joy', 'cheer'], ['sad', 'sad'], ['shock', 'shock'], ['panic', 'fall']];
  const rowY = [470, 830, 1190];
  T.chars.forEach((ch, row) => exprs.forEach(([ex, pose], k) => {
    const x = 90 + k * 150, y = rowY[row];
    drawFigure(ctx, ch, { mode: 'feet', x, y }, POSES[pose], 0.4, 1, 0.85, { expr: ex });
    if (row === 0) spaced(ctx, ex.toUpperCase(), x, 250, '600 15px Inter', '#8d96a0', 2, 1);
  }));
  const accs = ['headband', 'cap', 'beanie', 'glasses', 'headphones', 'crown'];
  spaced(ctx, 'ACCESSORIES', 540, 1290, '600 20px Inter', '#8d96a0', 6, 1);
  accs.forEach((a, k) => { const x = 110 + k * 172; drawFigure(ctx, { ...T.chars[0], accessory: a, look: { ...(T.chars[0].look || {}), accessory: a } }, { mode: 'feet', x, y: 1500 }, POSES.stand, 0.4, 1, 1, { expr: 'joy' }); spaced(ctx, a.toUpperCase(), x, 1540, '600 15px Inter', '#8d96a0', 2, 1); });
  if (brand.endcard) { ctx.save(); ctx.beginPath(); ctx.rect(340, 1580, 400, 320); ctx.clip(); ctx.translate(540, 1740); ctx.scale(0.3, 0.3); ctx.translate(-540, -1000); drawEndcard(1); ctx.restore(); spaced(ctx, 'END CARD', 540, 1575, '600 15px Inter', '#8d96a0', 2, 1); }
  return cv.toDataURL('image/jpeg', 0.9);
}

// =====================================================================================  audio cue sheet
function buildCues() {
  const R2 = s => realOf(s);
  const out = { dur: T.realDur, style: T.style, motif: (T.brand.music && T.brand.music.motif) || null, music: T.spec.music || {}, beats: [], crash: [], shake: [], burst: [], fling: [], pops: T.bubbles.map(b => [R2(b.t0), b.i, T.chars.length]), whoosh: T.beats.slice(1).map(B => R2(B.t0)), rain: [], question: null, slow: [], hook: null, rewind: [], endcard: null };
  for (const B of T.beats) { out.beats.push({ t0: R2(B.t0), t1: R2(B.t1 - 1e-4), mood: B.mood }); if (B.b.style === 'question') out.question = R2(B.t0); }
  for (const e of T.events) { const rt = R2(e.t); if (e.type === 'crash') out.crash.push(rt); if (e.type === 'shake') out.shake.push(rt); if (e.type === 'burst') out.burst.push(rt); if (e.type === 'fling') out.fling.push(rt); }
  for (const g of T.segs) { if (g.kind === 'slow') out.slow.push([g.r0, g.r1]); if (g.kind === 'hook') out.hook = [g.r0, g.r1]; if (g.kind === 'rewind') out.rewind.push([g.r0, g.r1]); if (g.kind === 'endcard') out.endcard = g.r0; }
  out.milestones = T.milestones.map(m => [R2(m.t), m.i, T.chars.length]);
  if (T.scene.rainCues) out.rain = T.scene.rainCues().map(([t, ci, n]) => [R2(t), ci, n]);
  return out;
}
const SCENES = {};
window.loadSpec = (spec, brand, style) => { WARN.clear(); T = compile(spec, brand, style); T.__fixed = null; if (T.scene.setup) T.scene.setup(T); buildTimeMap(); buildShots(); fixedCamera(); CAPRECTS.length = 0; return { dur: T.dur, realDur: T.realDur, tail: T.burst ? T.dur - T.burst.t : 0, warnings: [...WARN] }; };
window.render = r => renderFrame(r);
window.cues = () => buildCues();
window.warnings = () => [...WARN];
window.brandSheet = b => drawBrandSheet(b);
window.__T = () => T;
window.__storyAt = r => storyAt(r).s;
function hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; return { l, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)) }; }
window.reviewRun = (fps = 15) => {
  WARN.clear();
  const n = Math.floor(T.realDur * fps), [, smc] = mk(108, 192), diffs = [], wash = T.chars.map(() => [0, 0]), bg = [], haze = [], meanL = [];
  let prev = null;
  for (let f = 0; f < n; f++) {
    const r = f / fps; renderFrame(r);
    smc.drawImage(cv, 0, 0, 108, 192); const d = smc.getImageData(0, 0, 108, 192).data, g = new Float32Array(108 * 192);
    for (let k = 0; k < g.length; k++) g[k] = 0.299 * d[4 * k] + 0.587 * d[4 * k + 1] + 0.114 * d[4 * k + 2];
    if (prev) { let sm = 0; for (let k = 0; k < g.length; k++) sm += Math.abs(g[k] - prev[k]); diffs.push(sm / g.length); }
    prev = g;
    if (f % 5 === 0) {
      const sorted = Array.from(g).sort((a, b) => a - b); bg.push(sorted[Math.floor(sorted.length * 0.2)]); haze.push(sorted[Math.floor(sorted.length * 0.6)]); meanL.push(g.reduce((x, y) => x + y, 0) / g.length);
      const tm = storyAt(r);
      if (tm.kind === 'play' || tm.kind === 'slow') T.chars.forEach((ch, i) => {
        const j = T.__joints[i], want = hsl(...[1, 3, 5].map(o => parseInt(ch.color.slice(o, o + 2), 16)));
        if (!j || j.torso < 14 || want.s < 0.35 || alphaAt(i, tm.s) < 0.9) return;
        const x = Math.round(T.__X(j.x + j.off)), y = Math.round(T.__Y(j.y)); if (x < 3 || y < 3 || x > W - 4 || y > H - 4) return;
        const px = ctx.getImageData(x - 2, y - 2, 5, 5).data; let R2 = 0, G2 = 0, B2 = 0; for (let k = 0; k < px.length; k += 4) { R2 += px[k]; G2 += px[k + 1]; B2 += px[k + 2]; }
        const got = hsl(R2 / 25, G2 / 25, B2 / 25); wash[i][1]++; if (got.s < 0.25 && got.l > 0.8) wash[i][0]++;
      });
    }
  }
  const perSecond = []; diffs.forEach((v, k) => { const sec = Math.floor((k + 1) / fps); (perSecond[sec] = perSecond[sec] || []).push(v); });
  return { motion: perSecond.map(a => a.reduce((x, y) => x + y, 0) / a.length), washed: T.chars.map((ch, i) => ({ name: ch.name, frac: wash[i][1] ? wash[i][0] / wash[i][1] : 0 })), bgLum: bg.reduce((x, y) => x + y, 0) / Math.max(1, bg.length), haze: haze.reduce((x, y) => x + y, 0) / Math.max(1, haze.length), meanLum: meanL.reduce((x, y) => x + y, 0) / Math.max(1, meanL.length), warnings: [...WARN], realDur: T.realDur };
};
window.__realOf = s => realOf(s);
window.ready = Promise.all(['300 44px Inter', '700 40px Inter', '600 17px Inter', 'italic 600 25px Inter', '500 20px Inter', '800 92px Inter', '600 34px Inter'].map(f => document.fonts.load(f)));
