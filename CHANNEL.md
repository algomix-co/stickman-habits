# Mind the Gap (@mindDgap)

**Tagline:** Outsmart your own brain.

**Niche:** the psychology and brain science that quietly steers everyday decisions: shopping, phones,
habits, money, motivation, happiness.

**Audience:** 22-45, UK and US, all genders. Plain British/American-neutral English; avoid
region-only references (prices shown in $ for now).

## Channel description (YouTube "About")
Your brain runs tricks on you every day: at the checkout, on your phone, in decisions you think are
yours. Mind the Gap turns real psychology and brain science into 30-second animated stories about the
gap between what you think you're choosing and what your brain is actually doing.

Each Short takes one real effect (anchoring, variable rewards, sunk cost, hedonic adaptation and more),
a handful of characters, one year, and asks one question: which one are you?

New Shorts every week. Mind the gap.

## Rules for every video
- **Title: 5 words max** (enforced by `make.js` through `titleMaxWords` in `brands/mind-the-gap.json`).
- One named, well-replicated effect per video; say its name in the description and the footnote.
- Numbers are illustrative and labelled as such; never present a made-up statistic as a study result.
- Avoid effects with weak replication records (ego depletion, power posing, most social priming,
  "you only use 10% of your brain").
- Every beat starts with something happening in its first second (event, bubble or value change).
- Rotate scenes and story structures; the engine varies look and sound automatically.

## The mirror cast (who viewers see themselves in)
Every story is built so a 22-45 year old instantly finds themselves on screen. Enforced by
`storyRules` in `brands/mind-the-gap.json` (make.js rejects specs that break it).
- **Everyone starts identical** ("SAME PAY. SAME SALES.") so the only difference is behaviour.
- **A: the Default** (`role: default`, listed first): what most people actually do today, named in
  everyday words, with their real inner voice as bubbles ("just checking one thing").
- **B: the Extreme** (`role: extreme`): the same trap taken all the way; they crash.
- **C/D: the Alternative trap** (`role: alternative`, optional): the one who thinks they're immune or
  chases the next shiny thing.
- **The Winner** (`role: winner`, owns the climax): the Default plus ONE small, doable change, and named
  after it ("PHONE AWAY", "OWN PRICE", "7AM = GYM").
- One caption names the effect ("THAT'S ANCHORING.") and one states the change ("ONE CHANGE: ...").
  The change is named **before** the winner pulls ahead.
- The number measures something concrete (money kept, free hours, workouts), and the effect stays
  realistic: small effects get small gaps.

## Story structures to rotate
1. **Classic race**: flashy starter crashes, the steady one wins (anchoring, if-then plans).
2. **The leader loses**: the one ahead is in the wrong game (sunk cost).
3. **Treadmill**: one character keeps spiking and resetting while another climbs slowly (hedonic adaptation).
4. **Same person, two choices**: 2 characters who differ by one decision (phone in the drawer).
5. **Many voices**: 4-5 characters, each a different trap (social proof, scarcity, defaults...).

## Effect backlog (well supported)
Anchoring · variable rewards · sunk cost · implementation intentions · hedonic adaptation ·
loss aversion · default effect · planning fallacy · social proof · peak-end rule · mere exposure ·
scarcity · present bias · IKEA effect · choice architecture · status quo bias
