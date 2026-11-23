# Mind the Gap: learnings (the feedback loop)

Every piece of feedback from the channel owner lands here as a **Do** or **Don't**. Before drafting any new
batch, read this file and `brands/mind-the-gap.titles.json` (the title ledger). Rules that a machine can check
are enforced by `make.js` (see "Enforced" at the bottom); a spec that breaks one does not render.

## How the loop works
1. **Before drafting:** read this file and the title ledger. Draft concepts that break none of the rules.
2. **Draft → approve:** new concepts and full scripts go to the owner first (`scripts/round-N.md`). Nothing
   is rendered until they approve.
3. **Record every verdict:** `node tools/feedback.js reject "Title" "why"`, `approve "Title"`,
   `do "rule"`, `dont "rule"`. It updates the ledger and appends to the log below.
4. **Build → review → render:** automatic reviewer + independent reviewer, fix until READY (README).
5. **After publishing:** note YouTube Studio numbers in "Performance notes"; formats that underperform three
   times in a row get a Don't.

## Niche & story
- **Do:** discipline / motivation / self-improvement. Keyword pool: discipline, mindset, motivation, money,
  fitness, top 1%, consistency, strengths, goal, vision, willpower, ambition, procrastination, overthinking,
  problem solving, focus, social, comfort, lust, quitting, obsession, talent, success, perfection, practice,
  ego, failure, hardest, dreams, decision, progress, chasing, choices, luck, potential, mistakes, pain,
  silence, results. Every video declares at least one in `"keywords"`.
- **Don't:** psychology / brain-science explainers (anchoring, sunk cost, hedonic adaptation...). The
  owner said this got the niche wrong (round 1, retired).
- **Do:** one original visual metaphor per Short (reference style: @SimplyAnimatedVisuals). A concept pair
  on screen (e.g. OVERTHINKER | DOER) and a few short lines.
- **Don't:** dashboards, leaderboards, percentages, A/B/C quizzes. Use a counter only when counting is the
  point.
- **Don't:** copy a reference channel's specific metaphors or titles. Same genre, our own ideas.
- **Don't:** resend the same stories or titles after they were rejected. A rejection means new concepts,
  not a reword.
- **Do:** make the viewer see themselves in one of the characters.
- **Do:** at least **4 characters** per video, each a recognisable archetype with a visible arc (enforced:
  `rules.minCharacters`). The owner judges a story by seeing it, so the visuals alone must tell it.

## Titles
- **Do:** at most 5 words, a statement or command that is quotable on its own ("Success is earned, never
  given" is the reference tone).
- **Don't:** "Why ..." question titles (rejected round 1).
- **Don't:** reuse or lightly reword any title in the ledger.

## Visuals
- **Don't:** zoom or pan the camera; it distracts from the characters. Keep it still, put effects on the text.
- **Don't:** crop or hide any character, or let text overlap text or characters.
- **Don't:** fluorescent backgrounds or ultra-bright characters; they look low-res.
- **Don't:** static frames toward the end, or a quiet opening. Use big movements, not small tweaks.
- **Do:** a consistent custom character for the channel, and vary the look per video so it never feels
  templated.
- **Do:** an end-card tagline written for each story (enforced: `endcard.tagline`), never one fixed line.

## Music & sound
- **Don't:** the same "thunder" impact and pattern every video (template feel).
- **Don't:** smooth, slow or relaxing beds (rejected round 2).
- **Do:** rhythmic and urgent, escalating as the video goes on: faster, layered, brighter, a lift before the
  climax (`music: drive`).
- **Don't:** any pause or gap in the music, including a 'drop-out' before the climax (round 2 feedback).
- **Do:** lock the music to the story: every caption change lands on a downbeat with a fill/swell, and
  filler SFX (bricks, hammers, blades, steps) play on the beat while characters work.

## Process
- **Do:** run the reviewer before every render and iterate until confident.
- **Do:** send scripts for approval before building new concepts, unless the owner says to decide and
  proceed (round 2: "you decide and proceed... don't take shortcuts").

## Performance notes
(add YouTube Studio numbers per video here: viewed-vs-swiped, average % viewed, subs per 1k views)

## Enforced by make.js
- Title: at most `titleMaxWords` words, must not match `rules.titleBan` patterns, must not be in the ledger
  or share most of its words with a ledger title.
- `keywords`: at least one from `rules.keywords`.
- Music: the brand pins `music: drive`.

## Feedback log
- 2026-11-23: zoom distracting → still camera, effects on text. Hooks must relate to daily life.
- 2026-11-23: titles and stories rejected; niche corrected to discipline/motivation keywords; music must be
  rhythmic and escalating, not relaxing; build this feedback loop.
- 2026-11-23: round 2 feedback: at least 4 characters; tagline varies per story; music must never pause and needs rhythmic filler SFX; owner can't judge scripts on paper, wants to see videos
