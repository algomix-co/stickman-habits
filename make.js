#!/usr/bin/env node
// Shorts Factory pipeline v2
//   node make.js --preview specs/a.json            approval sheet (one still per beat) + chosen style
//   node make.js specs/a.json [more.json]          full render -> out/<id>/<id>.mp4, records style in brand history
//   node make.js --sheet brands/x.json             character model sheet for a brand
//   node make.js --check specs/a.json              run every frame (15 fps) through the layout checks, no video
//   node make.js --review specs/a.json             reviewer: measure + auto-fix in a loop, writes review.json + review-strip.jpg
//                                                  (a full render always runs the reviewer first and stops if it fails; --skip-review / --force to override)
//   flags: --brand brands/x.json (default: spec.brand or brands/default.json)  --restyle  --keep-frames  --workers N  --fps 30|60 (default 60)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const flag = f => args.includes(f), opt = f => (args.indexOf(f) >= 0 ? args[args.indexOf(f) + 1] : null);
const CHECK = flag('--check'), REVIEW = flag('--review'), SKIP_REVIEW = flag('--skip-review'), FORCE = flag('--force'), PREVIEW = flag('--preview') || CHECK || REVIEW, KEEP = flag('--keep-frames'), RESTYLE = flag('--restyle'), SHEET = opt('--sheet');
const WORKERS = +(opt('--workers') || 4) || 4;
const specs = args.filter(a => a.endsWith('.json') && a !== opt('--brand') && a !== SHEET);
const FPS = +(opt('--fps') || 60) || 60, ROOT = __dirname, PAGE = 'file://' + path.join(ROOT, 'engine', 'page.html');
const SCENES = ['towers', 'race', 'climb', 'pullup', 'lift', 'dig', 'bricks', 'buckets', 'swords', 'doors'];
const STATES = ['active', 'idle', 'boast', 'win', 'quit', 'sad', 'shock', 'fall', 'throw', 'cheer', 'stand', 'sit'];
const EVENTS = ['crash', 'shake', 'marker', 'burst', 'rain', 'fling', 'flash'];

// ---------------------------------------------------------------- variation ("smart" style picker)
const DIMS = {
  theme: ['void', 'dusk', 'navy', 'grid'],
  captionStyle: ['tracked', 'bold', 'boxed'],
  transition: ['fade', 'slide', 'cut', 'dayzoom'],
  labels: ['above', 'board'],
  hook: ['straight', 'flashforward'],
  speed: ['none', 'slowmo'],
  outro: ['question', 'endcard', 'loop'],
  instrument: ['piano', 'pluck', 'musicbox', 'epiano', 'lofi'],
  impact: ['boom', 'tapestop', 'glitch', 'snap', 'sub'],
  root: [57, 55, 52, 50, 53, 54, 59],
  bpm: [72, 76, 80, 84, 90],
  music: ['drive', 'calm', 'first'],   // first: the generation-1 score (piano, thunder hit, risers, heartbeat)   // drive: rhythmic, escalating score; calm: the older ambient bed
};
function seededRand(str) { let h = crypto.createHash('sha1').update(str).digest().readUInt32LE(0); return () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ h >>> 15, 1 | h); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function compatible(dim, v, spec, brand) {
  const n = spec.characters.length, hasBurst = spec.beats.some(b => (b.events || []).some(e => e.type === 'burst'));
  if (dim === 'labels' && v === 'board') return spec.showValues !== false && !['towers'].includes(spec.scene) && !(spec.scene === 'climb' && n > 3);
  if (dim === 'hook' && v === 'flashforward') return hasBurst && !spec.question;   // a flashforward would reveal the open-loop answer
  if (dim === 'outro' && v === 'endcard') return !!brand.endcard;
  return true;
}
function pickStyle(spec, brand, history) {
  const rnd = seededRand(spec.id + ':' + history.length), recent = history.slice(-6).reverse(), style = {}, why = {};
  for (const dim of Object.keys(DIMS)) {
    if (spec.style && spec.style[dim] != null) { style[dim] = spec.style[dim]; why[dim] = 'spec'; continue; }
    if (brand.fixed && brand.fixed[dim] != null) { style[dim] = brand.fixed[dim]; why[dim] = 'brand'; continue; }
    let opts = ((brand.allow && brand.allow[dim]) || DIMS[dim]).filter(v => compatible(dim, v, spec, brand));
    if (!opts.length) opts = [DIMS[dim][0]];
    // 5 characters: prefer the leaderboard (bonus inside score)
    const score = v => recent.reduce((acc, h, j) => acc + (h.style && h.style[dim] === v ? (6 - j) : 0), 0) + rnd() * 1.5 + (dim === 'labels' && spec.characters.length >= 5 && v === 'board' ? -8 : 0);
    style[dim] = opts.map(v => [score(v), v]).sort((a, b) => a[0] - b[0])[0][1]; why[dim] = 'picked';
  }
  if (style.labels === 'board' && style.transition === 'dayzoom') style.transition = 'cut';   // the zooming counter would cross the leaderboard
  // a hard rule on top of the soft penalties: differ from the previous video in at least half the dimensions
  const last = recent[0] && recent[0].style;
  if (last) {
    const same = Object.keys(DIMS).filter(d => why[d] === 'picked' && style[d] === last[d]);
    for (const d of same.slice(0, Math.max(0, same.length - 2))) { const alt = ((brand.allow && brand.allow[d]) || DIMS[d]).filter(v => v !== last[d] && compatible(d, v, spec, brand)); if (alt.length) style[d] = alt[Math.floor(rnd() * alt.length)]; }
  }
  return style;
}

// ---------------------------------------------------------------- validation
function validate(s, brand = {}) {
  const E = [], Wn = [], need = (c, m) => { if (!c) E.push(m); };
  need(s.id && /^[a-z0-9-]+$/.test(s.id), 'id must be lowercase-kebab');
  need(SCENES.includes(s.scene), `scene must be one of ${SCENES.join(', ')}`);
  const minC = (brand.rules && brand.rules.minCharacters) || 2;
  need(Array.isArray(s.characters) && s.characters.length >= minC && s.characters.length <= 5, `${minC}-5 characters (LEARNINGS.md)`);
  const names = (s.characters || []).map(c => c.name);
  names.forEach(n => { need(typeof n === 'string' && n.length <= 12, `character name "${n}" must be <= 12 chars`); if (n !== n.toUpperCase()) Wn.push(`name "${n}" is not uppercase`); });
  need(new Set(names).size === names.length, 'character names must be unique');
  need(s.metric && typeof s.metric === 'object', 'metric required');
  need(s.counter && typeof s.counter.start === 'number', 'counter {label,start} required');
  need(Array.isArray(s.beats) && s.beats.length >= 4, 'at least 4 beats');
  (s.beats || []).forEach((b, k) => {
    const at = `beat ${k + 1}`;
    need(b.dur >= 1.5 && b.dur <= 7, `${at}: dur must be 1.5-7s`);
    need(typeof b.caption === 'string' && b.caption.length <= 40, `${at}: caption required, <= 40 chars`);
    if (k === 0 && brand.storyRules && brand.storyRules.question) need(s.question && s.question.length <= 30, 'question (the open loop at the top) required, <= 30 chars');
    if (b.caption && b.caption !== b.caption.toUpperCase()) Wn.push(`${at}: caption should be ALL CAPS`);
    for (const obj of [b.values, b.states, b.curves, b.tags]) if (obj) for (const n in obj) need(names.includes(n), `${at}: unknown character "${n}"`);
    if (b.values) for (const n in b.values) need(typeof b.values[n] === 'number' && b.values[n] >= 0, `${at}: value for ${n} must be >= 0`);
    if (b.states) for (const n in b.states) need(STATES.includes(b.states[n]), `${at}: state "${b.states[n]}" not in ${STATES.join('|')}`);
    for (const bb of b.bubbles || []) { need(names.includes(bb.who), `${at}: bubble who "${bb.who}"`); need(bb.text && bb.text.length <= 24, `${at}: bubble "${bb.text}" must be <= 24 chars`); }
    for (const e of b.events || []) { need(EVENTS.includes(e.type), `${at}: event type "${e.type}"`); if (e.who) need(names.includes(e.who), `${at}: event who "${e.who}"`); }
  });
  const last = (s.beats || [])[s.beats.length - 1];
  if (last && last.style !== 'question' && last.style !== 'closing') Wn.push('last beat is not style:"question" or "closing"');
  if (brand.rules && brand.rules.storyTagline) need(s.endcard && s.endcard.tagline && s.endcard.tagline.length <= 40, 'endcard.tagline required (written for this story, <= 40 chars)');
  need(s.upload && s.upload.title && s.upload.title.length <= 100, 'upload.title required (<= 100 chars)');
  if (s.upload && s.upload.title && brand.titleMaxWords) { const words = s.upload.title.split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length; need(words <= brand.titleMaxWords, `title "${s.upload.title}" has ${words} words; the ${brand.name} brand allows ${brand.titleMaxWords}`); }
  // brand rules learned from owner feedback (LEARNINGS.md): banned title shapes, the title ledger, keywords
  const BR = brand.rules || {}, T0 = (s.upload && s.upload.title) || '';
  for (const pat of BR.titleBan || []) need(!new RegExp(pat, 'i').test(T0), `title "${T0}" matches banned pattern /${pat}/ (see LEARNINGS.md)`);
  if (BR.ledger && T0) { let L = {}; try { L = JSON.parse(fs.readFileSync(path.join(ROOT, BR.ledger))); } catch (e) {}
    const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'you', 'your', 'of', 'to', 'it', 'and', 'or', 'not', 'in', 'on', 'for', 'never', 'always']);
    const words = t => new Set(t.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9% ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)));
    const mine = words(T0), own = (L.approved || []).concat(L.used || []).map(x => x.title || x).filter(t => s.upload.approved !== true || t.toLowerCase() !== T0.toLowerCase());
    for (const e of (L.rejected || []).map(x => x.title || x)) { const w = words(e), inter = [...mine].filter(x => w.has(x)).length; need(e.toLowerCase() !== T0.toLowerCase() && inter / Math.max(1, Math.min(mine.size, w.size)) < 0.6, `title "${T0}" repeats rejected title "${e}" (ledger)`); }
    for (const e of (L.used || []).map(x => x.title || x)) need(e.toLowerCase() !== T0.toLowerCase() || s.upload.rerender === true, `title "${T0}" was already used (ledger)`); }
  /* owner feedback (round 3): every video needs a hook (a flash-forward of the climax or an open-loop question), and every character starts working in beat 1 */
  if (BR.hook) need(s.question || (s.beats || []).some(b => (b.events || []).some(e => e.type === 'burst')), 'hook required: an open-loop "question" or a burst the flash-forward hook can show (LEARNINGS.md)');
  if (BR.actionFromStart && s.beats && s.beats[0]) { const b0 = s.beats[0].values || {}; for (const n of names) need(b0[n] != null && b0[n] !== ((s.start || {})[n] || 0), `beat 1: ${n} must already be doing the activity (value changes in beat 1)`); }
  if (BR.keywords) { const kw = (s.keywords || []).map(k => String(k).toLowerCase()); need(kw.some(k => BR.keywords.includes(k)), `"keywords" must include at least one of the brand keywords (${BR.keywords.slice(0, 6).join(', ')}, ...)`); }
  // brand story rules ("mirror cast"): who viewers can see themselves in
  const R = brand.storyRules || {};
  if (R.roles) {
    const roles = (s.characters || []).map(c => c.role), ROLES = ['default', 'extreme', 'alternative', 'winner'];
    (s.characters || []).forEach(c => need(ROLES.includes(c.role), `character ${c.name}: role must be one of ${ROLES.join(', ')}`));
    need(roles.filter(r => r === 'winner').length === 1, 'cast needs exactly one winner (the one-change character)');
    need(roles[0] === 'default', 'the Default (what most viewers do today) must be listed first, so it is option A');
    const burst = (s.beats || []).flatMap(b => b.events || []).find(e => e.type === 'burst'), win = (s.characters || []).find(c => c.role === 'winner');
    need(burst && win && burst.who === win.name, 'the climax (burst) must belong to the winner');
  }
  const caps = (s.beats || []).map(b => (b.caption || '').toUpperCase());
  if (R.nameEffect) need(caps.some(c => c.startsWith("THAT'S ")), 'one caption must name the effect ("THAT\'S ANCHORING.")');
  if (R.oneChange) need(caps.some(c => c.startsWith('ONE CHANGE:')), 'one caption must state the single change ("ONE CHANGE: ...")');
  return { errors: E, warnings: Wn };
}
const readJSON = p => JSON.parse(fs.readFileSync(p, 'utf8'));
// story pacing: beats where nothing happens in the first second (no event, bubble, value change or state change)
function paceLint(spec) {
  const out = []; let t = 0, prev = Object.fromEntries(spec.characters.map(c => [c.name, (spec.start || {})[c.name] || 0]));
  const mx = Math.max(1, ...spec.beats.flatMap(b => Object.values(b.values || {})), ...Object.values(prev));
  spec.beats.forEach((b, k) => {
    const early = (b.events || []).some(e => (e.at != null ? e.at : (e.type === 'burst' ? 0 : 0.07 * b.dur)) <= 1.0)
      || (b.bubbles || []).some((bb, j) => (bb.at != null ? bb.at : 0.4 + j * (b.dur - 0.4) / b.bubbles.length) <= 1.0)
      || Object.entries(b.values || {}).some(([n, v]) => Math.abs(v - prev[n]) > 0.03 * mx)
      || Object.keys(b.states || {}).some(n => ((b.stateAt || {})[n] || 0) <= 1.0);
    if (k > 0 && b.style !== 'question' && !early) out.push({ beat: k + 1, t0: t });
    Object.assign(prev, b.values || {}); t += b.dur;
  });
  return out;
}
// reviewer: render every frame in memory, measure defects, apply automatic fixes, repeat
async function reviewLoop(page, spec, brand, style0, out) {
  const style = { ...style0, boost: [...(style0.boost || [])] }, log = []; let pass = false, last = null;
  for (const p of paceLint(spec)) { style.boost.push([p.t0, p.t0 + 1.2]); log.push({ iteration: 0, issues: [`beat ${p.beat}: nothing happens in its first second`], fixes: ['energy boost'] }); console.log(`  review 0: beat ${p.beat} has nothing in its first second -> fix: energy boost`); }
  for (let it = 1; it <= 5; it++) {
    await page.evaluate(([s, b, st]) => window.loadSpec(s, b, st), [spec, brand, style]);
    const st = await page.evaluate(() => window.reviewRun(15)); last = st;
    const issues = [], fixes = [];
    const early = st.motion.map((m, k) => [k, m]).filter(([k, m]) => m < 0.6 && k < st.realDur * 0.6);   // stricter than the post-render 0.35: video encoding smooths small motion
    if (early.length) { issues.push(`quiet seconds ${early.map(e => e[0] + 's').join(',')}`); for (const [k] of early) { const a = await page.evaluate(r => window.__storyAt(r), Math.max(0, k - 0.3)), b = await page.evaluate(r => window.__storyAt(r), k + 1.3); style.boost.push([Math.min(a, b), Math.max(a, b)]); } fixes.push('energy boost'); }
    const crowd = st.warnings.filter(w => /overlap|out of frame|too small|covers its own/.test(w)), edge = st.warnings.filter(w => /off-screen|Shorts like|bottom overlay/.test(w));
    if (crowd.length || edge.length) {
      issues.push(...crowd.concat(edge).slice(0, 3));
      if (crowd.length && style.labels !== 'board' && compatible('labels', 'board', spec, brand) && !(brand.allow && brand.allow.labels && !brand.allow.labels.includes('board'))) { style.labels = 'board'; if (style.transition === 'dayzoom') style.transition = 'cut'; fixes.push('leaderboard labels'); }
      else if (edge.length && !crowd.some(w => /too small/.test(w)) && (style.labelScale || 1) > 0.85) { style.labelScale = +((style.labelScale || 1) * 0.94).toFixed(3); fixes.push('labels -6%'); }
      // "too small" is never fixed by shrinking; if the leaderboard is already on, a human has to shorten names/tags
    }
    const other = st.warnings.filter(w => !crowd.includes(w) && !edge.includes(w));   // anything without an automatic fix still fails the review
    if (other.length) issues.push(...other.slice(0, 4));
    const washed = st.washed.filter(w => w.frac > 0.3);
    if (washed.length) { issues.push('washed out: ' + washed.map(w => `${w.name} ${(w.frac * 100).toFixed(0)}%`).join(', ')); if ((style.glow != null ? style.glow : 1) > 0.3) { style.glow = +((style.glow != null ? style.glow : 1) * 0.7).toFixed(3); fixes.push('glow -30%'); } }
    if (st.bgLum > 28) { issues.push(`background too bright (${st.bgLum.toFixed(1)})`); if (style.theme !== 'void') { style.theme = 'void'; fixes.push('darker theme'); } else if ((style.glow != null ? style.glow : 1) > 0.3) { style.glow = +((style.glow != null ? style.glow : 1) * 0.8).toFixed(3); fixes.push('glow -20%'); } }
    log.push({ iteration: it, issues, fixes, quietEarly: early.length, bgLum: +st.bgLum.toFixed(1), action: st.action });
    console.log('  action: ' + st.action.map(a => a.name + ' ' + Math.round(a.frac * 100) + '%').join(' · '));
    console.log(`  review ${it}: ${issues.length ? issues.join('; ') : 'clean'}${fixes.length ? ' -> fix: ' + fixes.join(', ') : ''}`);
    if (!issues.length) { pass = true; break; }
    if (!fixes.length) break;
  }
  fs.writeFileSync(path.join(out, 'review.json'), JSON.stringify({ pass, style, log, final: last && { motion: last.motion.map(v => +v.toFixed(2)), washed: last.washed, bgLum: last.bgLum, action: last.action, warnings: last.warnings } }, null, 1));
  return { style, pass };
}
const hashOf = (...objs) => crypto.createHash('sha1').update(JSON.stringify(objs)).digest('hex').slice(0, 12);

async function sheet(page, times, cols) {
  return page.evaluate(({ times, cols }) => {
    const w = 270, h = 480, rows = Math.ceil(times.length / cols), s = document.createElement('canvas');
    s.width = w * cols; s.height = (h + 26) * rows; const c = s.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, s.width, s.height);
    times.forEach(([r, label], k) => { window.render(r); const x = (k % cols) * w, y = Math.floor(k / cols) * (h + 26); c.drawImage(document.getElementById('c'), x, y + 26, w, h); c.fillStyle = '#000'; c.font = '14px Inter'; c.fillText(label, x + 6, y + 18); });
    return s.toDataURL('image/jpeg', 0.88);
  }, { times, cols });
}

(async () => {
  const browser = await chromium.launch();
  if (SHEET) {
    const brand = readJSON(SHEET), p = await browser.newPage(); await p.goto(PAGE); await p.evaluate(() => window.ready);
    const d = await p.evaluate(b => window.brandSheet(b), brand), out = path.join(ROOT, 'out', 'brand-' + path.basename(SHEET, '.json'));
    fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'model-sheet.jpg'), Buffer.from(d.split(',')[1], 'base64'));
    console.log('model sheet ->', path.relative(ROOT, path.join(out, 'model-sheet.jpg'))); await browser.close(); return;
  }
  let failed = 0; const session = [];
  for (const file of specs) {
    const spec = readJSON(file);
    const brandPath = opt('--brand') || (spec.brand ? path.join(ROOT, 'brands', spec.brand + '.json') : path.join(ROOT, 'brands', 'default.json'));
    const brand = fs.existsSync(brandPath) ? readJSON(brandPath) : {};
    const histPath = brandPath.replace(/\.json$/, '.history.json'), history = (fs.existsSync(histPath) ? readJSON(histPath) : []).concat(session.filter(h => h.brand === brandPath));
    const v = validate(spec, brand);
    console.log(`\n== ${spec.id || file} (${spec.scene}, brand: ${brand.name || 'none'})`);
    if (v.errors.length) { v.errors.forEach(e => console.log('  ERROR:', e)); failed++; continue; }
    const out = path.join(ROOT, 'out', spec.id); fs.mkdirSync(out, { recursive: true });
    const stylePath = path.join(out, 'style.json'), key = hashOf(spec, brand);
    let style;
    if (!RESTYLE && fs.existsSync(stylePath) && readJSON(stylePath).key === key) style = readJSON(stylePath).style;
    else { style = pickStyle(spec, brand, history.filter(h => h.id !== spec.id)); fs.writeFileSync(stylePath, JSON.stringify({ key, style }, null, 1)); }
    session.push({ id: spec.id, brand: brandPath, style });
    console.log('  style:', Object.entries(style).map(([k, x]) => `${k}=${x}`).join(' '));
    const pages = await Promise.all([...Array(PREVIEW ? 1 : WORKERS)].map(async () => { const p = await browser.newPage(); await p.goto(PAGE); await p.evaluate(() => window.ready); return p; }));
    let info;
    try { for (const p of pages) info = await p.evaluate(([s, b, st]) => window.loadSpec(s, b, st), [spec, brand, style]); } catch (e) { console.log('  ERROR:', e.message); failed++; await Promise.all(pages.map(p => p.close())); continue; }
    console.log(`  duration: story ${info.dur.toFixed(1)}s -> video ${info.realDur.toFixed(1)}s`);
    [...v.warnings].forEach(w => console.log('  warn:', w));
    if (info.tail > 7.5) console.log(`  warn: ${info.tail.toFixed(1)}s of story after the climax; viewers drop off on a long static ending (aim <= 7s)`);
    if (info.realDur > 59.5) { console.log('  ERROR: video longer than 59.5s after hook/slow-motion/end card; trim beats'); failed++; continue; }
    if (REVIEW || (!PREVIEW && !SKIP_REVIEW)) {
      const rv = await reviewLoop(pages[0], spec, brand, style, out);
      style = rv.style; fs.writeFileSync(stylePath, JSON.stringify({ key, style }, null, 1)); session[session.length - 1].style = style;
      for (const p of pages) info = await p.evaluate(([s, b, st]) => window.loadSpec(s, b, st), [spec, brand, style]);
      console.log(`  review: ${rv.pass ? 'PASS' : 'FAIL'} -> ${path.relative(ROOT, path.join(out, 'review.json'))}`);
      if (REVIEW) { const step = info.realDur / 32, times = [...Array(32)].map((_, k) => [k * step + step / 2, `${(k * step + step / 2).toFixed(1)}s`]); fs.writeFileSync(path.join(out, 'review-strip.jpg'), Buffer.from((await sheet(pages[0], times, 8)).split(',')[1], 'base64')); }
      if (!rv.pass && !FORCE && !REVIEW) { console.log('  STOP: review failed; fix the spec (or --force)'); failed++; await Promise.all(pages.map(p => p.close())); continue; }
    }
    // one still per beat (mid-beat, in real time) + hook/endcard if present
    const marks = await pages[0].evaluate(() => { const T2 = window.__T(); const m = T2.beats.map(B => [window.__realOf(B.t0 + (B.t1 - B.t0) * 0.72), `beat ${B.bi + 1}`]); for (const g of T2.segs) { if (g.kind === 'hook') m.unshift([0.7, 'hook']); if (g.kind === 'rewind') m.splice(1, 0, [g.r0 + 0.3, 'rewind']); if (g.kind === 'endcard') m.push([g.r1 - 0.3, 'end card']); } return m; });
    fs.writeFileSync(path.join(out, 'sheet.jpg'), Buffer.from((await sheet(pages[0], marks.map(([r, l]) => [r, `${l} · ${r.toFixed(1)}s`]), 6)).split(',')[1], 'base64'));
    if (CHECK) { const n = Math.round(info.realDur * 15); for (let f = 0; f < n; f++) await pages[0].evaluate(r => window.render(r), f / 15); }
    if (PREVIEW) { (await pages[0].evaluate(() => window.warnings())).forEach(x => console.log('  warn:', x)); if (CHECK) console.log('  check: every frame tested');  console.log('  preview ->', path.relative(ROOT, path.join(out, 'sheet.jpg'))); await Promise.all(pages.map(p => p.close())); continue; }

    const frames = path.join(out, 'frames'); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames);
    const total = Math.round(info.realDur * FPS); let next = 0; const t0 = Date.now();
    await Promise.all(pages.map(async p => { while (next < total) { const f = next++; const d = await p.evaluate(r => { window.render(r); return document.getElementById('c').toDataURL('image/png'); }, f / FPS); fs.writeFileSync(path.join(frames, String(f).padStart(5, '0') + '.png'), Buffer.from(d.split(',')[1], 'base64')); } }));
    const warns = new Set(); for (const p of pages) (await p.evaluate(() => window.warnings())).forEach(w => warns.add(w));
    fs.writeFileSync(path.join(out, 'cues.json'), JSON.stringify(await pages[0].evaluate(() => window.cues()), null, 1));
    await Promise.all(pages.map(p => p.close()));
    console.log(`  frames: ${total} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    console.log('  ' + execFileSync('python3', ['-I', path.join(ROOT, 'engine', style.music === 'first' ? 'audio_first.py' : 'audio.py'), path.join(out, 'cues.json'), path.join(out, 'audio.wav')]).toString().trim());
    const mp4 = path.join(out, spec.id + '.mp4');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(frames, '%05d.png'), '-i', path.join(out, 'audio.wav'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4]);
    if (!KEEP) fs.rmSync(frames, { recursive: true, force: true });
    const u = spec.upload; fs.writeFileSync(path.join(out, 'upload.txt'), `TITLE:\n${u.title}\n\nDESCRIPTION:\n${u.description || ''}\n\n${(u.hashtags || []).map(h => '#' + h.replace(/^#/, '')).join(' ')}\n`);
    // motion check: no quiet second allowed in the first 60% of the video (a planned breather later is fine)
    const mot = JSON.parse(execFileSync('python3', ['-I', path.join(ROOT, 'tools_motion.py'), mp4, '--json']).toString());
    const quiet = mot.per_second.map((v, k) => [k, v]).filter(([k, v]) => v < 0.35);
    const early = quiet.filter(([k]) => k < info.realDur * 0.6).map(([k]) => k + 's');
    if (early.length) warns.add(`quiet seconds in the first 60% of the video: ${early.join(', ')}`);
    console.log(`  motion: mean ${mot.mean} | quiet seconds: ${quiet.map(([k]) => k + 's').join(' ') || 'none'}`);
    const qa = { id: spec.id, scene: spec.scene, brand: brand.name || null, duration: info.realDur, fps: FPS, frames: total, style, motion: mot, warnings: [...v.warnings, ...warns] };
    fs.writeFileSync(path.join(out, 'qa.json'), JSON.stringify(qa, null, 2)); qa.warnings.forEach(w => console.log('  warn:', w));
    const hist = history.filter(h => h.id !== spec.id && !h.brand); hist.push({ id: spec.id, scene: spec.scene, date: new Date().toISOString(), style }); fs.writeFileSync(histPath, JSON.stringify(hist, null, 1));
    console.log('  done ->', path.relative(ROOT, mp4));
  }
  await browser.close(); process.exit(failed ? 1 : 0);
})();
