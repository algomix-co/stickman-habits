# Stickman Habits: Shorts Factory

Engine for the **Mind the Gap** channel ([@mindDgap](https://www.youtube.com/@mindDgap)). Channel positioning, title rules and story backlog: [CHANNEL.md](CHANNEL.md). Channel brand: `brands/mind-the-gap.json`. Channel stories: `specs/`. Earlier demo stories from other niches: `examples/specs/`.

Turns a short **story spec (JSON)** into a finished 1080×1920 vertical video in the
"neon archetypes" format: colour-coded stick-figure characters, one visual metaphor, a ticking
number, a time counter, early leader crashes, consistent one wins, *"WHICH ONE ARE YOU?"*.

```
specs/<id>.json ──► validate ──► preview sheet (approve) ──► frames + cue sheet ──► score ──► MP4
                                                         └─ upload.txt, qa.json
```

## What's new in v2
- **Brand kit** (`brands/<name>.json`): your own consistent character (body, face, line style, accessories),
  end card mascot + channel name, and a sonic signature (motif) played on every end card.
- **Variation engine**: every video picks a combination of 12 style dimensions, steering away from what the
  brand's last 6 videos used (`brands/<name>.history.json`) and forced to differ from the previous video in at
  least half of them. Picks are saved to `out/<id>/style.json` so preview and render match.
- **Effects**: day-counter zoom, slow-motion speed ramps on crashes/climaxes, flash-forward + rewind hook,
  motion trails on fast movers, sweat, per-character tempo, mood colour tints.
- **Lift scene rebuilt** (front view, barbell + plates scale with the character and weight).
- **Safety checks**: text off-screen, text under the Shorts like/comment buttons, auto-shrinking labels.

## Still camera, moving text (v10)
- **The camera never moves.** Each video gets one fixed frame that keeps every character, label and badge in
  view for the whole video, so viewers watch the characters progress without zoom or pan distractions.
- **Emphasis lives in the text**: captions shake and flash red on crashes and glow gold at the climax; words
  after "THAT'S" and "ONE CHANGE:" are teal, numbers gold.
- **Open loop**: with `"question"` in the spec (required for brands with `storyRules.question`), a gold question
  sits at the top from frame 1 ("WHO KEEPS THE MOST MONEY?") and flips to the answer on a dark pill at the
  climax ("IT'S C: OWN PRICE"; override with `"answer"`). A/B/C predict badges show in beat 1 so viewers pick.
  The flash-forward hook is disabled for these videos because it would reveal the answer.
- **Layout**: labels and bubbles avoid every other character's whole body (slide into the free gap, wrap,
  shrink at most 15%); in the race scene each label sits beside its runner inside its own lane; text crossed by
  bars, ground lines or the finish line gets a dark plate. Captions wrap to stay inside x 130-950.
- See `STRATEGY.md` for the audience, evergreen rules and hook formulas, `LEARNINGS.md` for every do/don't from
  owner feedback (enforced by the validator where possible), and `scripts/` for drafts awaiting approval.
- **Music** (`music: first`, pinned for Mind the Gap): the generation-1 score from the very first video
  (`engine/audio_first.py`): piano arpeggios, pad and bass, risers into crashes, heartbeat, thunder hit on the
  climax, with no gaps. `music: drive` (`engine/audio.py`) is the round-2 score, kept but no longer used.

## Review before render (two layers)
1. **Automatic reviewer** (`node make.js --review specs/<id>.json`, and always before a full render).
   It renders every frame in memory and checks:
   - label/bubble/badge overlaps and text off screen;
   - the Shorts bottom overlay and right button strip;
   - text under 26-27px;
   - characters covering their own labels, and labels/bubbles covering any other character;
   - labels overlapping the caption block;
   - props crossing faces or not held by the hands;
   - scenery lines striking through text;
   - washed-out characters, bright backgrounds and quiet seconds early in the video;
   - beats with nothing in their first second.

   It applies automatic fixes in a loop (energy boost, leaderboard labels, smaller labels at the edges,
   less glow, darker theme). **Any warning it cannot fix fails the review and blocks the render.**
   Output: `out/<id>/review.json`, `out/<id>/review-strip.jpg` (32 frames across the video).
2. **Independent visual review** of the strips plus full-resolution frames by a reviewer who did not make
   the video: visual defects, mirror-cast relatability, scientific accuracy, channel rules and story
   logic. Fix and repeat until every video is READY, then render.

## Pacing & liveliness (v4)
- **Energy curve**: full energy for the first ~65% of the story, one planned breather around 70-82%
  (tension before the payoff), full again from ~1.6s before the climax to the end.
- **Never quiet at the start**: characters jump in one after another, then a cast introduction (each waves
  and hops while their label pops); a flash-forward hook now plays the climax live instead of freezing.
- **Reactions**: others flinch at a crash or dip and clap at the climax.
- **Fidgets**: idle characters fist-pump, look around, shrug, wave or clap every ~1.7s (hanging or climbing
  characters kick their legs), scaled by the energy curve.
- **Workers keep working**: reps, lifting and digging continue at a minimum tempo while a character is
  `active`, even when their number moves slowly.
- **Milestones**: when a value crosses a round number (1/2/5 x 10^n), a "$100K!" pop and a chime.
- **Frame rate**: renders at 60 fps by default (`--fps 30` for faster drafts). 60 fps makes fast motion
  smoother, but it does not add motion; the items above do.
- **Motion QA**: after every render the pipeline measures per-second motion and warns about any quiet
  second in the first 60% of the video (stored in `out/<id>/qa.json`).
- **Layout QA**: every frame is checked for overlapping labels between characters and characters
  out of frame; the camera always keeps every character (with labels) in view.

## Motion & pacing (v3)
- **Camera director** (retired in v10; the code remains as `cameraAtOld` but the camera is now still).
- **Ending sequence** (automatic): confetti on the climax → short wide reveal → recap tour (camera visits each
  character's final result, lowest first, winner last) → "WHICH ONE ARE YOU?" with A/B/C badges, each character
  jumping in turn, "COMMENT A · B · C", a second confetti wave → end card (bouncing mascot, title pop,
  follow pill) or a **loop** rewind back to day 1 so the Short replays seamlessly (`outro: loop`).
- **Kinetic captions**: words pop in one by one; character names appear in their colour.
- **Bigger motion**: winners jump and pump their fists, crashers tumble, larger run/climb/pull-up cycles,
  breathing and bobbing at rest, value labels swell while climbing and turn red while falling.
- **Pacing rule**: the validator warns when more than 7.5s of story follows the climax. Keep the summary beat
  ~3.4s and the question ~3s.
- `python3 -I tools_motion.py out/<id>/<id>.mp4` prints a per-second motion profile, so you can spot
  near-static stretches before posting.

## Variation dimensions (picked per video unless pinned)
| dimension | options |
|---|---|
| theme | void · dusk · navy · grid |
| captionStyle | tracked (thin, wide-spaced) · bold (huge DAY counter) · boxed (pill caption) |
| transition | fade · slide · cut (white pop + punch) · dayzoom (giant counter flies into place) |
| labels | above (value over each head) · board (live leaderboard that re-ranks) |
| hook | straight · flashforward (opens on the climax, "HOW DID THIS HAPPEN?", rewinds to day 1; not used with a question header) |
| speed | none · slowmo (speed ramp on crashes and the climax, audio muffled) |
| outro | question · endcard (brand mascot + channel name + motif) · loop (rewinds to the first frame) |
| instrument | piano · pluck · musicbox · epiano · lofi (voice, pad and drum feel) |
| impact | boom · tapestop · glitch · snap · sub (what crashes/climaxes sound like) |
| root / bpm | 7 keys · 72–90 bpm |

Pin anything per video with `"style": {"hook": "flashforward"}` in the spec, per brand with
`"fixed": {"outro": "endcard"}`, or restrict the pool with `"allow": {"theme": ["navy","dusk"]}`.
`--restyle` re-rolls a video's style.

## Brand kit / your own character
```jsonc
{
  "name": "Neon Bean",
  "character": {
    "body": "bean",            // stick | bean (capsule torso) | noodle (thin, big head) | block (square head)
    "face": true,              // eyes, brows, mouth with 7 expressions driven by the story state
    "lineStyle": "neon",       // neon (glow) | flat (solid with dark outline, little glow)
    "accessory": null,         // default for every character: headband | cap | beanie | glasses | headphones | crown
    "accent": "#ffffff",       // accessory colour
    "winnerCrown": true        // the winner gets a crown on "win"
  },
  "endcard": {"title": "YOUR CHANNEL", "tagline": "ONE HABIT AT A TIME", "color": "#ffc53d",
              "accessory": "headband", "accent": "#ff5a6e", "look": {"body": "bean"}},
  "music": {"motif": [0, 3, 7, 12]},     // semitones above the key: your 4-note sonic logo
  "allow": {"theme": ["void", "navy"]},  // optional: limit the variation pool
  "fixed": {"outro": "endcard"}          // optional: always do this
}
```
Per-character overrides in a spec: `{"name": "GAMBLER", "color": "#b98cff", "accessory": "cap", "tempo": 1.4,
"look": {"body": "noodle"}}`. `tempo` speeds up or slows down that character's animation (reps, digging, trails).

Model sheet for approving a character: `node make.js --sheet brands/<name>.json`, which writes
`out/brand-<name>/model-sheet.jpg` with every expression, the accessories and the end card.

## Setup
```bash
npm install && npx playwright install chromium
pip install -r requirements.txt   # numpy
```
Also needs `ffmpeg` and the **Inter** font installed on the machine.

**Variation history:** `brands/<brand>.history.json` is written after every full render and steers the next
video's style away from recent ones. Commit it after you publish, so the next session (or teammate) knows
what the channel has already used.

**Titles:** a brand can cap title length with `"titleMaxWords"` (Mind the Gap: 5); `make.js` rejects longer titles.

**Characters per video:** 2 to 5. With 5, numbers switch to short form (5.5K) and the style picker prefers
the leaderboard layout where the scene supports it. All six scenes are tested with 5 characters.

## Workflow (draft → approve → render)
1. **Draft**: Claude writes `specs/<id>.json` for a niche (see "Drafting guide" below).
2. **Preview** (≈5 s): one still per beat, for approval:
   ```bash
   node make.js --preview specs/<id>.json        # -> out/<id>/sheet.jpg  (+ out/<id>/style.json)
   node make.js --check specs/<id>.json          # every frame through the layout checks, no video
   ```
3. **Approve / edit** the JSON (captions, numbers, who wins), re-preview.
4. **Render** (≈1–2 min per 30 s video on 4 cores):
   ```bash
   node make.js specs/<id>.json                   # or specs/*.json for a batch
   ```
   Output in `out/<id>/`: `<id>.mp4`, `upload.txt` (title/description/hashtags), `sheet.jpg`,
   `qa.json` (warnings, e.g. text off-screen), `cues.json`, `audio.wav`.
5. **Human review** of the MP4 before uploading, especially sound and any factual claims.

Brand: `"brand": "neon-bean"` in the spec or `--brand brands/neon-bean.json`.

Requirements: Node 18+, `playwright` with Chromium, Python 3 + numpy, ffmpeg, the Inter font.

## Scenes (visual metaphors)
| scene | what the number means visually | good for |
|---|---|---|
| `towers` | stack of coins/blocks under each character (fixed frame sized for the tallest stack) | money, savings, followers, anything that accumulates |
| `race` | side-view lanes toward a FINISH line | skills, learning, progress to a goal |
| `climb` | ropes up to a goal bar; quitters fall to the floor | careers, startups, anything with "falling off" |
| `pullup` | hanging from one bar doing reps; quitters drop and sit | effort/volume: calls, reps, sessions |
| `lift` | side-view deadlift; plate grows with the value | strength, load, capacity |
| `dig` | shafts dug down toward a treasure | deep work, mastery, "hidden" progress |

Ideas for next scenes: tug-of-war (you vs. excuses), stairs vs. elevator, mountain path, garden/roots.

## Spec reference
```jsonc
{
  "id": "kebab-case-id",                 // output folder name
  "scene": "towers|race|climb|pullup|lift|dig",
  "characters": [                        // 2–5, names <= 12 chars, UPPERCASE
    {"name": "SPENDER", "color": "#ff5a6e", "volatile": false}   // volatile = wobbly value
  ],
  "start": {"SPENDER": 0},               // optional starting values (default 0)
  "metric": {"prefix": "$", "suffix": " KG", "compact": true,     // compact: 12K / 1.15M
             "decimals": 0, "scale": 0.7, "max": 160},            // scale: visual exponent (lower = small values more visible); max: value that fills the scene
  "counter": {"label": "DAY", "start": 1},                        // "DAY 365", "AGE 60", "WEEK 52"
  "footnote": "Illustrative · ...",      // shown on the last 2 beats (keep claims honest)
  "music": {"seed": 3, "bpm": 80, "root": 57},                    // seed varies key/tempo/progression
  "upload": {"title": "...", "description": "...", "hashtags": ["..."]},
  "beats": [                             // 4+ beats, total <= 59 s (aim ~30 s)
    {
      "dur": 3.0,                        // 1.5–7 s
      "caption": "THEN IT CRASHES.",     // ALL CAPS, short, ends with a period; "|" forces a line break
      "counter": 32,                     // counter value at the END of the beat
      "values": {"GAMBLER": 3140},       // values at the END of the beat (omitted = hold)
      "curve": "ease",                   // ease|linear|accel|decel|early|late|snap (accel = compounding)
      "curves": {"GAMBLER": "accel"},    // per-character override
      "states": {"SPENDER": "sad"},      // active|idle|boast|win|quit|sad|shock|throw (persist until changed)
      "stateAt": {"SPENDER": 1.2},       // seconds into the beat (default 0)
      "bubbles": [{"who": "SAVER", "text": "told you.", "at": 1.3, "dur": 1.5}],   // <= 24 chars, lowercase
      "tags": {"GAMBLER": "QUIT", "INVESTOR": {"text": "TOP", "color": "#ffc53d"}}, // small label above; null clears
      "dim": ["SPENDER"],                // fade losers from this beat on
      "events": [
        {"type": "crash", "who": "GAMBLER", "at": 0.22},  // value drops, shake + red flash + debris, figure falls and quits
        {"type": "shake", "who": "INVESTOR", "at": 2.2},  // dip/turbulence hit
        {"type": "marker", "who": "INVESTOR", "text": "−35%", "at": 2.3, "dur": 1.7, "dx": -110, "dy": 120},
        {"type": "rain", "at": 0.1},                     // towers: coins fall onto every stack
        {"type": "fling", "who": "SPENDER", "at": 0.6},  // coins thrown away
        {"type": "burst", "who": "INVESTOR", "at": 5.35} // the climax: gold rings, glow, sparkles, music hit
      ],
      "style": "question",               // gold caption, use on the last beat
      "mood": "tense"                    // music override: normal|build|tense|crash|climax|end
    }
  ]
}
```
The music follows the story automatically: risers into every crash and burst, impacts on them,
a heartbeat on `tense` beats, kick/hats on `accel` (build) beats, and a drop-out before the final question.

## Drafting guide (what makes these work)
- **3–4 archetypes of the niche**, each a recognisable behaviour, not a person: SPENDER, CRAMMER, EGO.
- **Arc**: the flashy one leads early → crashes/quits mid-video (≈40%) → a slow, boring, consistent one
  wins with a late `accel` beat → `burst` → summary beat with `dim` + tags → `WHICH ONE ARE YOU?`
- **Captions**: one idea, ≤ 30 chars, period at the end. Bubbles are the characters' inner voice.
- **Numbers**: plausible and labelled "illustrative" in `footnote`; avoid precise claims you can't back.
- **Variety**: rotate scenes, niches, palettes and `music.seed`; don't reuse the same metaphor every week.
- **First frame matters**: beat 1 is visible at t=0 (no fade-in); make its caption the hook.

## Files
- `make.js`: CLI (validate, preview, render, encode, QA)
- `engine/engine.js`: rig, timeline compiler, captions, labels, effects, bloom/reflection, audio cue export
- `engine/scenes.js`: the six metaphors
- `brands/`: brand kits (`default`, `neon-bean`, `ink-noodle`, `block-buddy`) and their style history
- `engine/audio.py`: procedural score from the cue sheet
- `specs/`: one JSON per video
