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
- **Do (the format the owner liked best, generation 1):** one physical activity per Short (lift, pull-up,
  climb, run, dig, stack), a **live number over every head** that ticks all video long, a DAY / WEEK / MONTH
  counter, a fast starter who crashes halfway, a steady one who wins, and the ending **WHICH ONE ARE YOU?
  COMMENT A·B·C·D**. The gap between characters must visibly widen on screen.
- **Don't:** metaphor scenes where props change while people stand (round 2: bricks, buckets, swords,
  doors). The owner called it the worst generation: "the characters simply don't do anything... just wave
  their hands". Waving, nodding and fidgets are not action.
- **Don't:** hide the numbers or drop the counter. Visible numbers are the retention engine, not clutter.
  (Round 2's "no counters" rule was my own recommendation and it was wrong.)
- **Do:** a hook in the first second: a flash-forward of the climax ("HOW DID THIS HAPPEN?" then rewind)
  or an open-loop question with A·B·C·D badges ("WHO HITS GOLD?"). Never a calm line-up. (enforced)
- **Do:** every character is already doing the activity in beat 1, and keeps doing it: losers restart,
  slide back, crash and try again rather than stand still. (enforced: action check)
- **Do:** motion carries through caption changes; characters never all freeze at a beat boundary.
- **Don't:** copy a reference channel's specific metaphors or titles. Same genre, our own ideas.
- **Don't:** resend the same stories or titles after they were rejected. A rejection means new concepts,
  not a reword.
- **Do:** make the viewer see themselves in one of the characters.
- **Don't:** squeeze four characters close together to make them bigger (round 3: "spaced very near"). Keep
  columns about 310px apart in scene units, even if the still camera then draws everyone smaller.
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
- **Do (round 3, owner):** use the **generation-1 score**, the music of the very first video (Same Salary):
  piano arpeggios over a pad and bass, kick and hats, risers into crashes, a heartbeat in tense stretches,
  the thunder hit on the crash and the climax (`music: first`, `engine/audio_first.py`). The brand pins it.
- **Don't:** the round-2 "drive" score. The owner never confirmed it and asked to reset to the first music.
- **Don't:** any pause or gap in the music (round 2 feedback, still in force). The only change made to the
  generation-1 score is that its hook, rewind and pre-question gaps are filled.
- Note: in round 1 the owner called the same thunder hit in every video "template". If that comes back,
  vary the hit per video (`impact`) before touching anything else.

## Process
- **Do:** run the reviewer before every render and iterate until confident.
- **Do:** send scripts for approval before building new concepts, unless the owner says to decide and
  proceed (round 2: "you decide and proceed... don't take shortcuts").
- **Do:** when a generation is rejected, compare it frame by frame with the best one before changing
  anything, and say which of my own rules caused the regression.
- **Don't:** trust pixel-motion numbers as proof of action: round 2 moved more pixels than generation 1 and
  still had nobody doing anything.

## Performance notes
(add YouTube Studio numbers per video here: viewed-vs-swiped, average % viewed, subs per 1k views)

## Enforced by make.js
- Title: at most `titleMaxWords` words, must not match `rules.titleBan` patterns, must not be in the ledger
  or share most of its words with a ledger title.
- `keywords`: at least one from `rules.keywords`.
- Music: the brand pins `music: first` (generation-1 score), `instrument: piano`, `impact: boom`.
- Hook: `rules.hook` needs an open-loop `question` or a burst the flash-forward can show; the brand allows
  only the flash-forward hook (`allow.hook`), never a plain start.
- `rules.actionFromStart`: every character's number moves in beat 1.
- Action check (reviewer): each character does its activity >= 40% of the story (the winner >= 75%), the
  cast >= 60% on average, and never fewer than half the cast working for more than 1.2s in a row before
  the climax. A spec that fails does not render.
- Labels: the brand allows only numbers over heads (`allow.labels: above`), no leaderboard.

## Feedback log
- 2026-11-23: zoom distracting → still camera, effects on text. Hooks must relate to daily life.
- 2026-11-23: titles and stories rejected; niche corrected to discipline/motivation keywords; music must be
  rhythmic and escalating, not relaxing; build this feedback loop.
- 2026-11-23: round 2 feedback: at least 4 characters; tagline varies per story; music must never pause and needs rhythmic filler SFX; owner can't judge scripts on paper, wants to see videos
- 2026-11-23: round 3 feedback: generation 1 was best, round 2 worst ("characters simply don't do anything", no hook for engagement or retention). Rewound to the generation-1 format; kept the owner's own rules (niche, 4+ characters, still camera, drive music, story taglines, 5-word titles). Owner chose: keep the bean characters, full batch of 4.
- 2026-11-23: rejected "Pick Your Pain": round 2: worst generation; characters barely act (props change, people stand), no hook, no visible progress
- 2026-11-23: rejected "Luck Needs A Bucket": round 2: worst generation; characters barely act (props change, people stand), no hook, no visible progress
- 2026-11-23: rejected "Talent Rusts Without Practice": round 2: worst generation; characters barely act (props change, people stand), no hook, no visible progress
- 2026-11-23: rejected "Big Ego, Small Door": round 2: worst generation; characters barely act (props change, people stand), no hook, no visible progress
- 2026-11-24: round 3 feedback: characters too close together (widened to ~310px columns); music must be the very first score, not drive (restored generation-1 score, gaps filled).
