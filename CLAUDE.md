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

## The launch tracker (owner feedback loop)
Tracker page: https://claude.ai/artifact/PZrHJGJHpy8NAUTzmv3nmE (source: `tracker/tracker.html`; publish it with
capabilities db, assets, user, downloads) (database collection `videos`, one document per
Short, id = spec id; fields: batch, idx, title, scene, twist, duration, version, status, video, thumb, launch
{description, hashtags, tags, pinned}, feedback, history).
- **Statuses:** `review` (waiting for the owner), `regenerate` (owner wrote feedback), `regenerating` (Claude
  picked it up: set `workStartedAt` and a one-line `workNote` FIRST, so the owner sees progress), `approved`,
  `published`, `rejected`. Claude sets `review` with `doneAt` after every new render.
- **Hourly check:** a scheduled task ("Mind the Gap tracker check", trig_01TWZ7sYnvmsnewSCCAfX9ub) wakes this
  session every hour to process `regenerate` rows; the owner can also say "check the tracker".
- **Publishing a batch:** write the stories (`tools/stories/batchNN.py`), review and render
  (`tools/render_batch.sh specs/batch-NN <log>`, resumable), check frames and run the independent review,
  upload each mp4 + `thumbnail.jpg` with the Artifact tool (`asset: true`, up to 25 files per call; re-encode
  any mp4 over 19 MB), record the returned urls in `tracker/assets.json`, build rows with
  `tools/tracker_rows.py <dir> review <ids...>` and write them with one ArtifactData `batch` (max 50).
- **Processing feedback ("check the tracker"):** query `videos` where `status == "regenerate"`. For each:
  log it (`node tools/feedback.js note "<title>: <feedback>"`), change the story in the generator, review,
  render, upload, bump `version` and append `{v, note: <feedback>}` to `history` in `tracker/assets.json`, then
  update the row (pin `if_version`) with the new video, thumb, version, history, `status: "review"`,
  `feedback: ""`. If the feedback is a general rule, add it to LEARNINGS.md (and the validator if checkable).
- `approved` -> `node tools/feedback.js approve "<title>"`; `rejected` -> `reject "<title>" "<feedback>"`;
  `published` -> `used "<title>"` so the title can never be reused.
- **Render progress is visible on the page:** while a batch renders, keep a Monitor on the render log (lines
  `render <id>`, `done ->`, FAIL/ERROR). Rows that are not finished stay `rendering` with a `workNote`: "Rendering now
  (about 4 min)" for the current one and "Queued · Nth in line" for the rest. On each `done ->`, check the frames and
  then upload, `tools/tracker_publish.py`, and update the row to `review` (delete workNote). Never let a finished
  video sit unpublished.
- Batches are 20 Shorts (owner's request). Research first: `research/batch-NN.md`.
