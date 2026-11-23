#!/usr/bin/env node
// Record owner feedback so the next batch learns from it (see LEARNINGS.md).
//   node tools/feedback.js reject "Title" "why"     -> ledger.rejected + log
//   node tools/feedback.js approve "Title"          -> ledger.approved + log
//   node tools/feedback.js used "Title"             -> ledger.used (after publishing)
//   node tools/feedback.js do "rule"  |  dont "rule" |  note "text"   -> log (then file the rule under its section)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), [cmd, a, b] = process.argv.slice(2), today = new Date().toISOString().slice(0, 10);
const brand = JSON.parse(fs.readFileSync(path.join(ROOT, 'brands/mind-the-gap.json'))), LP = path.join(ROOT, (brand.rules || {}).ledger || 'brands/mind-the-gap.titles.json');
const L = fs.existsSync(LP) ? JSON.parse(fs.readFileSync(LP)) : { rejected: [], approved: [], used: [] };
const log = line => fs.appendFileSync(path.join(ROOT, 'LEARNINGS.md'), `- ${today}: ${line}\n`);
if (!cmd || !a) { console.log('usage: feedback.js reject|approve|used|do|dont|note "text" ["reason"]'); process.exit(1); }
if (cmd === 'reject') { L.rejected.push({ title: a, reason: b || '', date: today }); log(`rejected "${a}"${b ? ': ' + b : ''}`); }
else if (cmd === 'approve') { L.approved.push({ title: a, date: today }); log(`approved "${a}"`); }
else if (cmd === 'used') { L.used.push({ title: a, date: today }); }
else if (cmd === 'do' || cmd === 'dont' || cmd === 'note') log(`${cmd === 'note' ? '' : cmd === 'do' ? 'Do: ' : "Don't: "}${a}`);
else { console.log('unknown command ' + cmd); process.exit(1); }
fs.writeFileSync(LP, JSON.stringify(L, null, 1) + '\n'); console.log('recorded:', cmd, a);
