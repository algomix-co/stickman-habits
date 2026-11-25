# Mind the Gap Shorts factory: instructions for every session

This repo turns story specs (`specs/*.json`) into YouTube Shorts for the channel Mind the Gap (@mindDgap).

## Before writing any new story
1. Read `LEARNINGS.md` (the owner's do's and don'ts; it overrides everything else) and the title ledger
   `brands/mind-the-gap.titles.json`.
2. Read the drafting guide in `README.md`, especially **"On-screen logic"**. Every motion must mean what
   the number means:
   - totals only go up, so a restart is slow progress plus a bubble, never a falling number;
   - a setback needs a matching physical event (crash, slide, shake);
   - nobody moves backwards, floats out of a hole or teleports;
   - tags describe what the character is doing now;
   - bubbles match the motion;
   - nobody stands around.
3. Use the retention tools in README (near-miss, storm, stacked lanes, story titles); the evidence is in
   `research/reference-channel.md`.
4. Play each beat in your head with the sound off. If anything could look like a glitch to a viewer,
   change the story.

## Building
- `node make.js --review specs/<id>.json`: the validator plus the automatic reviewer (layout, action and
  motion checks). Fix every error; never weaken a rule to make a spec pass.
- `node make.js specs/<id>.json`: the full 60fps render; the reviewer runs first and blocks failures.
- After rendering, look at the frames yourself and run an independent review before sending.

## Feedback
Record every owner verdict with `node tools/feedback.js` (reject / approve / do / dont / note). When a
mistake reaches the owner, add the rule to `LEARNINGS.md` and, where a machine can check it, to the
validator in `make.js`, so it cannot happen again.
