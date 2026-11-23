# Mind the Gap: audience & evergreen content strategy

## 1. Reality check: "viral forever" vs. evergreen
- **Viral** is a feed event: the first days decide it, and luck is a big part. Nobody can guarantee it.
- Shorts views usually **peak within about a month**; what keeps a Short earning for years is **search**
  (people typing a problem into YouTube/Google) and a growing back-catalogue that new viewers binge.
- So we engineer what *can* be engineered: **evergreen topics** (never date), **search-phrased titles**,
  and **retention mechanics** (hook, open loop, payoff, loop) that make the algorithm keep re-testing a video.

## 2. Niche and audience (corrected in round 2)
**Niche:** discipline, motivation and self-improvement, told as a race between four relatable people doing one
physical activity (the generation-1 format the owner liked best; title-tone reference:
@SimplyAnimatedVisuals, whose top Shorts reach 10-29M views with statement titles like "Success is earned, never
given"). The keyword pool lives in `brands/mind-the-gap.json` (`rules.keywords`) and in LEARNINGS.md.

**Core viewer:** 18-34, ambitious, feels behind, wants a push. Watches on a phone in idle moments (bed, commute,
gym rest). **Secondary:** 35-45 restarting (fitness, money, career). UK/US English, gender-neutral stakes.

## 3. The evergreen rules (every video), restored in round 3
1. **One physical activity everyone does on screen** (lift, pull-up, climb, run, dig): progress you can see.
2. **Four relatable people**, not abstract traits (NEW YEAR, HACK HUNTER, QUITS AT 80%...), each with a
   **live number over the head** and a DAY / WEEK / MONTH counter.
3. **Hook in the first second:** flash-forward of the climax ("HOW DID THIS HAPPEN?", rewind) or an open-loop
   question with A·B·C·D badges ("WHO HITS GOLD?").
4. **A crash halfway** (the fast starter burns out, caves in, lets go), then the steady one wins with a burst.
5. **Ending:** WHICH ONE ARE YOU? COMMENT A·B·C·D (comments + rewatches), then the story's own tagline.
6. **A statement title**, at most 5 words, quotable on its own. No "Why..." questions.
7. **Drive music:** rhythmic from frame 1, escalating to the climax, never pausing.
8. **Still camera, moving text.** Every character keeps working; nobody stands around.

## 4. Hook formulas
| Formula | Example |
|---|---|
| Flash-forward | climax first, "HOW DID THIS HAPPEN?", rewind to day 1 |
| Open loop | "WHO HITS GOLD?" with A·B·C·D badges, answered at the climax |
| Same start | "SAME BAR. SAME JANUARY." |

## 5. Backlog
Round 3 specs are in `specs/`; round-2 metaphor concepts (`scripts/round-2.md`) are retired. Rejected and used
titles live in the ledger (`brands/mind-the-gap.titles.json`); new drafts must clear `make.js` validation.

## 6. Publishing system
- **1-5 Shorts a week** (consistent day/time). Each is reviewed by the two-layer review in README.
- **Title** = the search question. **Description**: first line restates the problem in plain words, then
  the effect name, then "(Illustrative numbers.)". 3-5 hashtags: #psychology #mindset + topic.
- **Pinned comment**: "Which one were you this year? Be honest." to seed comments.
- **Playlists by pillar** (Discipline, Money, Mindset, Fitness) for binge sessions.
- **Every 8-10 Shorts: a long-form compilation** ("8 truths about discipline"). Long-form keeps
  earning from search for years, which Shorts alone usually don't.

## 7. What to measure (YouTube Studio)
| Metric | Target | Lever |
|---|---|---|
| Viewed vs. swiped away | above channel median | first caption plus the open-loop question |
| Average % viewed | 80% or more (looping above 100% is the goal) | pacing, the loop ending |
| Comments per 1k views | rising | the A/B/C ask, relatability of option A |
| Search traffic share after 30 days | growing | search-phrased titles |
| Subscribers per 1k views | rising | end card, series consistency |

Kill a topic format after 3 weak videos; double down on formats whose viewed-vs-swiped beats the median.
