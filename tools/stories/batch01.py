#!/usr/bin/env python3
"""Batch 1 (20 Shorts): stories and launch kits. Writes specs/batch-01/<id>.json.
Concepts and research: research/batch-01.md. Rules: LEARNINGS.md, README "On-screen logic"."""
import json, os, re

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'specs', 'batch-01')
RED, TEAL, PURPLE, GOLD = '#ff5a6e', '#36e0c8', '#b98cff', '#ffc53d'
ACC = {RED: 'headband', TEAL: 'glasses', PURPLE: 'headphones', GOLD: 'cap'}
METRIC = {
    'bridge': {'suffix': ' PLANKS', 'scale': 1, 'max': 22},
    'race': {'suffix': ' KM', 'scale': 1, 'max': 200},
    'climb': {'suffix': ' M', 'scale': 1, 'max': 30},
    'dig': {'suffix': ' M', 'scale': 1, 'max': 40},
    'pullup': {'suffix': ' REPS', 'scale': 1, 'max': 20},
    'lift': {'suffix': ' KG', 'scale': 1},
}
BASE_TAGS = ['discipline', 'self improvement', 'motivation', 'consistency', 'mindset', 'stickman animation', 'shorts']


def B(dur, caption, counter, values=None, **kw):
    b = {'dur': dur, 'caption': caption, 'counter': counter}
    if values: b['values'] = values
    for k, v in kw.items():
        if v is not None: b[k] = v
    return b


def ev(type_, who=None, at=None, **kw):
    e = {'type': type_}
    if who: e['who'] = who
    if at is not None: e['at'] = at
    e.update(kw); return e


def bub(who, text, at):
    return {'who': who, 'text': text, 'at': at}


def story(num, title, scene, cast, beats, *, counter, keywords, twist, tagline, description, hashtags, tags, pinned, start=None, metric=None):
    sid = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    chars = [{'name': n, 'color': c, 'accessory': ACC[c]} for n, c in cast]
    spec = {
        'id': sid, 'brand': 'mind-the-gap', 'batch': 1, 'batchIndex': num, 'scene': scene, 'twist': twist,
        'keywords': keywords, 'characters': chars,
        'start': start or {n: 0 for n, _ in cast},
        'metric': metric or METRIC[scene], 'counter': {'label': counter, 'start': 1},
        'footnote': 'Illustrative',
        'upload': {'title': title, 'description': description + ' Which one are you? (Illustrative.)',
                   'hashtags': hashtags + ['shorts'], 'tags': tags + BASE_TAGS, 'pinned': pinned},
        'endcard': {'tagline': tagline},
        'beats': beats + [B(3.0, 'WHICH ONE ARE YOU?', None, style='question')],
    }
    spec['beats'][-1].pop('counter')
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, sid + '.json'), 'w') as f: json.dump(spec, f, indent=1, ensure_ascii=False)
    return sid


S = []
# 1 ------------------------------------------------------------------ bridge: the oldest beginner
S.append(story(1, 'Oldest Beginner Crossed First', 'bridge',
  [('AGE 22', RED), ('AGE 41', TEAL), ('AGE 33', PURPLE), ('AGE 28', GOLD)], [
  B(2.8, 'SAME GAP. DIFFERENT AGES.', 3, {'AGE 22': 5, 'AGE 41': 1, 'AGE 33': 2, 'AGE 28': 3}, curves={'AGE 22': 'accel'}, bubbles=[bub('AGE 41', 'too late for me?', 0.3)]),
  B(3.0, 'AGE 22 HAS ALL THE ENERGY.', 9, {'AGE 22': 12, 'AGE 41': 3, 'AGE 33': 3, 'AGE 28': 6}, curves={'AGE 22': 'decel'}, bubbles=[bub('AGE 22', 'easy.', 1.2)]),
  B(3.0, 'AGE 28 GETS DISTRACTED.', 15, {'AGE 22': 15, 'AGE 41': 5, 'AGE 33': 4}, states={'AGE 28': 'sad'}, stateAt={'AGE 28': 1.0}, bubbles=[bub('AGE 28', 'maybe next year.', 0.5)]),
  B(3.0, 'THEN THE STORM HITS.', 22, {'AGE 22': 16, 'AGE 41': 7, 'AGE 33': 5}, states={'AGE 22': 'sad'}, stateAt={'AGE 22': 1.4}, events=[ev('storm', at=0.2, dur=2.4)], bubbles=[bub('AGE 22', 'this got boring.', 0.5)]),
  B(3.2, 'AGE 41 NEVER MISSES A DAY.', 45, {'AGE 41': 12, 'AGE 33': 7, 'AGE 28': 8}, curve='linear', states={'AGE 28': 'active'}, stateAt={'AGE 28': 0.5}),
  B(3.4, 'AGE 22 TRIES AGAIN.', 70, {'AGE 22': 18, 'AGE 41': 18, 'AGE 33': 9, 'AGE 28': 10}, states={'AGE 22': 'active'}, stateAt={'AGE 22': 0.3}, tags={'AGE 33': 'STILL PLANNING'}),
  B(3.6, 'DAY 100: ACROSS AT 41.', 100, {'AGE 41': 22, 'AGE 22': 19, 'AGE 33': 10, 'AGE 28': 11}, curve='accel', states={'AGE 41': 'win'}, stateAt={'AGE 41': 3.3}, events=[ev('burst', 'AGE 41', 3.35)], tags={'AGE 28': 'ON AND OFF'}),
  ], counter='DAY', keywords=['progress', 'potential', 'consistency'],
  twist='The 41-year-old who thought it was too late crosses first.', tagline="IT'S NOT LATE. IT'S DAY ONE.",
  description='Four people start the same bridge at 22, 28, 33 and 41. The youngest has all the energy. The oldest thinks she is too late.',
  hashtags=['discipline', 'neverlate', 'consistency', 'motivation'], tags=['never too late', 'late bloomer', 'starting at 40'],
  pinned="Be honest: which age are you building at? A, B, C or D 👇"))
# 2 ------------------------------------------------------------------ bridge: rest days
S.append(story(2, 'Rest Days Built This Bridge', 'bridge',
  [('NEVER RESTS', RED), ('RESTS SUNDAY', TEAL), ('ALWAYS TIRED', PURPLE), ('WEEKEND ONLY', GOLD)], [
  B(2.8, 'SAME GAP. SAME HANDS.', 3, {'NEVER RESTS': 4, 'RESTS SUNDAY': 2, 'ALWAYS TIRED': 2, 'WEEKEND ONLY': 1}, curves={'NEVER RESTS': 'accel'}, bubbles=[bub('NEVER RESTS', 'rest is for the weak', 0.3)]),
  B(3.0, 'NEVER RESTS. NEVER STOPS.', 8, {'NEVER RESTS': 11, 'RESTS SUNDAY': 5, 'ALWAYS TIRED': 3, 'WEEKEND ONLY': 3}, curves={'NEVER RESTS': 'decel'}, states={'RESTS SUNDAY': 'sit'}, stateAt={'RESTS SUNDAY': 1.7}, bubbles=[bub('RESTS SUNDAY', 'Sunday off.', 1.8)]),
  B(3.0, 'HIS HANDS START SHAKING.', 14, {'NEVER RESTS': 15, 'RESTS SUNDAY': 8, 'ALWAYS TIRED': 4, 'WEEKEND ONLY': 6}, states={'RESTS SUNDAY': 'active'}, stateAt={'RESTS SUNDAY': 0.2}, events=[ev('shake', 'NEVER RESTS', 1.2)], bubbles=[bub('NEVER RESTS', 'just push through.', 1.5)]),
  B(3.0, 'THEN HE BREAKS.', 20, {'NEVER RESTS': 6, 'RESTS SUNDAY': 11, 'ALWAYS TIRED': 5, 'WEEKEND ONLY': 7}, events=[ev('crash', 'NEVER RESTS', 0.4)], tags={'NEVER RESTS': 'BURNT OUT'}),
  B(3.2, 'RESTS SUNDAY. BUILDS MONDAY.', 40, {'RESTS SUNDAY': 15, 'ALWAYS TIRED': 7, 'WEEKEND ONLY': 10}, states={'RESTS SUNDAY': 'sit'}, stateAt={'RESTS SUNDAY': 2.2}, bubbles=[bub('RESTS SUNDAY', 'back tomorrow.', 2.3)]),
  B(3.4, 'REST IS PART OF THE WORK.', 75, {'RESTS SUNDAY': 20, 'NEVER RESTS': 8, 'ALWAYS TIRED': 9, 'WEEKEND ONLY': 12}, states={'RESTS SUNDAY': 'active', 'NEVER RESTS': 'active'}, stateAt={'RESTS SUNDAY': 0.2, 'NEVER RESTS': 1.0}, tags={'NEVER RESTS': 'STARTING OVER'}),
  B(3.6, 'DAY 100: RESTED. ACROSS.', 100, {'RESTS SUNDAY': 22, 'NEVER RESTS': 10, 'ALWAYS TIRED': 10, 'WEEKEND ONLY': 14}, curve='accel', states={'RESTS SUNDAY': 'win'}, stateAt={'RESTS SUNDAY': 3.3}, events=[ev('burst', 'RESTS SUNDAY', 3.35)]),
  ], counter='DAY', keywords=['discipline', 'consistency', 'pain'],
  twist='The one who never rests burns out; the one who rests every Sunday crosses first.', tagline='REST IS NOT QUITTING.',
  description='One never rests. One rests every Sunday. One is always tired. One only builds on weekends. Guess who burns out.',
  hashtags=['discipline', 'burnout', 'restday', 'consistency'], tags=['burnout', 'rest day', 'avoid burnout', 'work life balance'],
  pinned='Do you take rest days, or do you wait until you break? 👇'))
# 3 ------------------------------------------------------------------ bridge: after work
S.append(story(3, 'He Built It After Work', 'bridge',
  [('NO TIME', RED), ('AFTER WORK', TEAL), ('VACATIONS', PURPLE), ('QUIT HIS JOB', GOLD)], [
  B(2.8, 'SAME GAP. SAME 24 HOURS.', 3, {'NO TIME': 1, 'AFTER WORK': 2, 'VACATIONS': 1, 'QUIT HIS JOB': 5}, curves={'QUIT HIS JOB': 'accel'}, bubbles=[bub('NO TIME', 'no time this week.', 0.3)]),
  B(3.0, 'QUIT HIS JOB FOR IT.', 10, {'QUIT HIS JOB': 12, 'AFTER WORK': 4, 'NO TIME': 2, 'VACATIONS': 2}, curves={'QUIT HIS JOB': 'decel'}, bubbles=[bub('QUIT HIS JOB', 'full time on it!', 0.4)]),
  B(3.0, 'AFTER WORK: ONE PLANK.', 20, {'AFTER WORK': 7, 'QUIT HIS JOB': 15, 'NO TIME': 3, 'VACATIONS': 3}, bubbles=[bub('AFTER WORK', 'tired. one plank.', 0.5)]),
  B(3.0, 'THEN THE MONEY RUNS OUT.', 35, {'QUIT HIS JOB': 16, 'AFTER WORK': 10, 'NO TIME': 4, 'VACATIONS': 4}, states={'QUIT HIS JOB': 'sad'}, stateAt={'QUIT HIS JOB': 1.0}, tags={'QUIT HIS JOB': 'BROKE'}),
  B(3.2, 'VACATION WEEK!', 42, {'VACATIONS': 12, 'AFTER WORK': 12, 'NO TIME': 5}, curves={'VACATIONS': 'decel'}, bubbles=[bub('VACATIONS', 'vacation mode!', 0.3)]),
  B(3.4, 'BACK TO WORK. BACK TO NOTHING.', 75, {'AFTER WORK': 18, 'NO TIME': 6, 'QUIT HIS JOB': 18}, states={'VACATIONS': 'sad', 'QUIT HIS JOB': 'active'}, stateAt={'VACATIONS': 1.0, 'QUIT HIS JOB': 0.8}, tags={'QUIT HIS JOB': 'PART TIME NOW'}, bubbles=[bub('VACATIONS', 'too tired after work', 1.2)]),
  B(3.6, 'DAY 100: BUILT AFTER WORK.', 100, {'AFTER WORK': 22, 'QUIT HIS JOB': 19, 'NO TIME': 7}, curve='accel', states={'AFTER WORK': 'win'}, stateAt={'AFTER WORK': 3.3}, events=[ev('burst', 'AFTER WORK', 3.35)], tags={'NO TIME': 'STILL NO TIME', 'VACATIONS': 'NEXT VACATION'}),
  ], counter='DAY', keywords=['discipline', 'consistency', 'goal'],
  twist='The busiest one, building one plank after work, crosses before the one who quit his job for it.', tagline='ONE PLANK AFTER WORK BEATS SOMEDAY.',
  description='Same 24 hours. One has no time, one waits for vacation, one quits his job to go all in, one lays a single plank every evening after work.',
  hashtags=['discipline', 'sidehustle', 'nineToFive', 'consistency'], tags=['side hustle', 'after work routine', 'no time excuse', '9 to 5'],
  pinned="What's the one plank you could lay after work tonight? 👇"))
# 4 ------------------------------------------------------------------ race: comparison
S.append(story(4, 'Comparison Slowed Him Down', 'race',
  [('LOOKS AROUND', RED), ('OWN LANE', TEAL), ('COPYCAT', PURPLE), ('WORRIER', GOLD)], [
  B(2.6, 'SAME ROAD. SAME LEGS.', 2, {'LOOKS AROUND': 6, 'OWN LANE': 4, 'COPYCAT': 5, 'WORRIER': 3}, curves={'LOOKS AROUND': 'accel'}, bubbles=[bub('LOOKS AROUND', 'too easy.', 0.3)]),
  B(3.0, 'HE CHECKS THE OTHERS.', 15, {'LOOKS AROUND': 30, 'OWN LANE': 25, 'COPYCAT': 28, 'WORRIER': 20}, events=[ev('shake', 'LOOKS AROUND', 1.4)], bubbles=[bub('LOOKS AROUND', "who's catching up?", 1.6)]),
  B(3.0, 'EVERY LOOK COSTS HIM.', 30, {'LOOKS AROUND': 46, 'OWN LANE': 50, 'COPYCAT': 48, 'WORRIER': 40}, curves={'LOOKS AROUND': 'decel'}, events=[ev('shake', 'LOOKS AROUND', 0.8), ev('shake', 'LOOKS AROUND', 2.1)], bubbles=[bub('OWN LANE', 'eyes forward.', 0.4)]),
  B(3.0, "COPYCAT CAN'T KEEP UP.", 45, {'COPYCAT': 62, 'OWN LANE': 75, 'LOOKS AROUND': 64, 'WORRIER': 60}, events=[ev('crash', 'COPYCAT', 1.6)], tags={'COPYCAT': 'BURNT OUT'}),
  B(3.2, 'HE LOOKS AGAIN.', 60, {'LOOKS AROUND': 80, 'OWN LANE': 105, 'WORRIER': 85}, events=[ev('shake', 'LOOKS AROUND', 0.6)], bubbles=[bub('LOOKS AROUND', 'is she faster?', 0.8)]),
  B(3.4, 'RUN YOUR OWN RACE.', 80, {'OWN LANE': 160, 'WORRIER': 130, 'LOOKS AROUND': 110, 'COPYCAT': 70}, curve='linear', states={'COPYCAT': 'active'}, stateAt={'COPYCAT': 0.5}, tags={'COPYCAT': 'WALKING NOW'}),
  B(3.6, 'DAY 90: SHE FINISHES.', 90, {'OWN LANE': 200, 'WORRIER': 168, 'LOOKS AROUND': 140, 'COPYCAT': 80}, curve='accel', states={'OWN LANE': 'win'}, stateAt={'OWN LANE': 3.3}, events=[ev('burst', 'OWN LANE', 3.35)], tags={'LOOKS AROUND': 'FASTEST LEGS. 3RD.'}),
  ], counter='DAY', keywords=['focus', 'mindset', 'progress'],
  twist='The fastest runner finishes third because he keeps checking the others.', tagline='EYES ON YOUR OWN LANE.',
  description='The fastest legs on the road belong to the runner who keeps checking everyone else. Every look costs him.',
  hashtags=['discipline', 'comparison', 'focus', 'mindset'], tags=['stop comparing yourself', 'comparison is the thief of joy', 'run your own race'],
  pinned='Who do you keep checking on instead of running your race? 👇'))
# 5 ------------------------------------------------------------------ race: the crowd
S.append(story(5, 'The Crowd Stopped Cheering', 'race',
  [('FOR APPLAUSE', RED), ('FOR HIMSELF', TEAL), ('FOR A MEDAL', PURPLE), ('FOR A BET', GOLD)], [
  B(2.6, 'SAME TRACK. DIFFERENT REASONS.', 2, {'FOR APPLAUSE': 8, 'FOR HIMSELF': 4, 'FOR A MEDAL': 5, 'FOR A BET': 6}, curves={'FOR APPLAUSE': 'accel'}, events=[ev('marker', 'FOR APPLAUSE', 0.4, text='CHEERS!', dur=1.8, color=GOLD)]),
  B(3.0, 'APPLAUSE FEELS LIKE FUEL.', 12, {'FOR APPLAUSE': 35, 'FOR HIMSELF': 24, 'FOR A MEDAL': 27, 'FOR A BET': 30}, events=[ev('marker', 'FOR APPLAUSE', 0.6, text='CHEERS!', dur=1.6, color=GOLD)], bubbles=[bub('FOR A BET', 'easy money.', 2.0)]),
  B(3.0, 'THEN THE CROWD GOES HOME.', 25, {'FOR APPLAUSE': 48, 'FOR HIMSELF': 50, 'FOR A MEDAL': 46, 'FOR A BET': 52}, curves={'FOR APPLAUSE': 'decel'}, states={'FOR APPLAUSE': 'sad'}, stateAt={'FOR APPLAUSE': 1.8}, events=[ev('marker', 'FOR APPLAUSE', 0.5, text='CROWD LEFT', dur=1.8)], bubbles=[bub('FOR APPLAUSE', 'where is everyone?', 2.0)]),
  B(3.0, 'THE BET ENDS. SO DOES HE.', 35, {'FOR A BET': 60, 'FOR HIMSELF': 70, 'FOR A MEDAL': 60}, states={'FOR A BET': 'sad'}, stateAt={'FOR A BET': 2.2}, tags={'FOR A BET': 'BET OVER'}, bubbles=[bub('FOR A BET', 'won the bet. done.', 0.4)]),
  B(3.2, 'NOBODY WATCHING. STILL RUNNING.', 55, {'FOR HIMSELF': 110, 'FOR A MEDAL': 78, 'FOR APPLAUSE': 52}, states={'FOR APPLAUSE': 'active', 'FOR A MEDAL': 'sad'}, stateAt={'FOR APPLAUSE': 1.0, 'FOR A MEDAL': 1.8}, events=[ev('storm', at=0.3, dur=2.4)], bubbles=[bub('FOR A MEDAL', 'not worth it.', 2.0)]),
  B(3.4, 'HE RUNS FOR HIMSELF.', 80, {'FOR HIMSELF': 165, 'FOR A MEDAL': 92, 'FOR APPLAUSE': 60, 'FOR A BET': 75}, curve='linear', states={'FOR A MEDAL': 'active', 'FOR A BET': 'active'}, stateAt={'FOR A MEDAL': 0.4, 'FOR A BET': 0.6}, tags={'FOR A BET': 'NEW BET'}),
  B(3.6, 'DAY 90: NO CROWD. FINISHED.', 90, {'FOR HIMSELF': 200, 'FOR A MEDAL': 104, 'FOR APPLAUSE': 66, 'FOR A BET': 82}, curve='accel', states={'FOR HIMSELF': 'win'}, stateAt={'FOR HIMSELF': 3.3}, events=[ev('burst', 'FOR HIMSELF', 3.35)], tags={'FOR APPLAUSE': 'NEEDS AN AUDIENCE'}),
  ], counter='DAY', keywords=['motivation', 'discipline', 'silence'],
  twist='The runner fuelled by applause stops when the crowd goes home; the one running for himself finishes in silence.', tagline="APPLAUSE ENDS. DISCIPLINE DOESN'T.",
  description='Four runners, four reasons: applause, a medal, a bet, and himself. Then the crowd goes home.',
  hashtags=['discipline', 'motivation', 'workinsilence', 'mindset'], tags=['work in silence', 'intrinsic motivation', 'do it for yourself'],
  pinned='Who are you really running for? A, B, C or D 👇'))
# 6 ------------------------------------------------------------------ race: friends quit
S.append(story(6, 'Started Together, Finished Alone', 'race',
  [('HYPE FRIEND', RED), ('KEEPS GOING', TEAL), ('LAZY FRIEND', PURPLE), ('BUSY FRIEND', GOLD)], [
  B(2.6, 'FOUR FRIENDS. ONE GOAL.', 2, {'HYPE FRIEND': 6, 'KEEPS GOING': 5, 'LAZY FRIEND': 5, 'BUSY FRIEND': 5}, bubbles=[bub('HYPE FRIEND', "let's do this together!", 0.3)]),
  B(3.0, "TOGETHER, IT'S EASY.", 12, {'HYPE FRIEND': 28, 'KEEPS GOING': 27, 'LAZY FRIEND': 26, 'BUSY FRIEND': 27}, bubbles=[bub('LAZY FRIEND', 'same pace, guys', 1.0)]),
  B(3.0, 'LAZY FRIEND STOPS FIRST.', 20, {'LAZY FRIEND': 34, 'HYPE FRIEND': 45, 'KEEPS GOING': 44, 'BUSY FRIEND': 44}, states={'LAZY FRIEND': 'quit'}, stateAt={'LAZY FRIEND': 1.4}, tags={'LAZY FRIEND': 'PARTY TONIGHT'}, bubbles=[bub('LAZY FRIEND', 'you guys go ahead', 0.3)]),
  B(3.0, 'BUSY FRIEND STOPS NEXT.', 30, {'BUSY FRIEND': 58, 'HYPE FRIEND': 64, 'KEEPS GOING': 64}, states={'BUSY FRIEND': 'quit'}, stateAt={'BUSY FRIEND': 1.6}, tags={'BUSY FRIEND': 'NO TIME'}, bubbles=[bub('BUSY FRIEND', "work's crazy now.", 0.3)]),
  B(3.2, 'HYPE FRIEND NEEDS A GROUP.', 45, {'HYPE FRIEND': 78, 'KEEPS GOING': 92}, states={'HYPE FRIEND': 'sad'}, stateAt={'HYPE FRIEND': 1.8}, bubbles=[bub('HYPE FRIEND', 'no fun alone.', 2.0)]),
  B(3.4, 'HE KEEPS GOING. ALONE.', 75, {'KEEPS GOING': 160, 'HYPE FRIEND': 85, 'LAZY FRIEND': 40}, curve='linear', states={'HYPE FRIEND': 'active', 'LAZY FRIEND': 'active'}, stateAt={'HYPE FRIEND': 0.6, 'LAZY FRIEND': 1.0}, tags={'LAZY FRIEND': 'TRYING AGAIN'}, events=[ev('storm', at=1.2, dur=1.8)]),
  B(3.6, 'DAY 90: FINISHED ALONE.', 90, {'KEEPS GOING': 200, 'HYPE FRIEND': 92, 'LAZY FRIEND': 46, 'BUSY FRIEND': 66}, curve='accel', states={'KEEPS GOING': 'win', 'BUSY FRIEND': 'active'}, stateAt={'KEEPS GOING': 3.3, 'BUSY FRIEND': 0.4}, events=[ev('burst', 'KEEPS GOING', 3.35)], tags={'BUSY FRIEND': 'WEEKENDS NOW'}),
  ], counter='DAY', keywords=['social', 'discipline', 'consistency'],
  twist='His friends quit one by one; finishing alone is still finishing.', tagline='FINISH, EVEN IF YOU FINISH ALONE.',
  description='Four friends start the same goal together. One by one they find a reason to stop. One keeps going.',
  hashtags=['discipline', 'consistency', 'friends', 'keepgoing'], tags=['friends quit', 'going alone', 'stay consistent alone'],
  pinned='Did your friends quit before you did? 👇'))
# 7 ------------------------------------------------------------------ climb: notifications
S.append(story(7, 'Notifications Pulled Her Down', 'climb',
  [('PHONE ON', RED), ('PHONE OFF', TEAL), ('PERFECT SONG', PURPLE), ('HALF ASLEEP', GOLD)], [
  B(2.8, 'SAME ROPE. ONE PHONE.', 1, {'PHONE ON': 4, 'PHONE OFF': 2, 'PERFECT SONG': 3, 'HALF ASLEEP': 1}, curves={'PHONE ON': 'accel'}, bubbles=[bub('PHONE ON', "I'm a natural.", 0.3)]),
  B(3.0, "SHE'S THE BEST CLIMBER HERE.", 2, {'PHONE ON': 10, 'PHONE OFF': 5, 'PERFECT SONG': 5, 'HALF ASLEEP': 3}),
  B(3.0, 'THEN: PING.', 3, {'PHONE ON': 8, 'PHONE OFF': 8, 'PERFECT SONG': 6, 'HALF ASLEEP': 4}, curves={'PHONE ON': 'early'}, events=[ev('marker', 'PHONE ON', 0.3, text='PING', dur=1.2), ev('shake', 'PHONE ON', 0.35)], bubbles=[bub('PERFECT SONG', 'wait, wrong song', 1.4)]),
  B(3.0, 'PING. PING. PING.', 5, {'PHONE ON': 9, 'PHONE OFF': 13, 'PERFECT SONG': 8, 'HALF ASLEEP': 6}, events=[ev('marker', 'PHONE ON', 0.2, text='PING', dur=0.9), ev('shake', 'PHONE ON', 0.25), ev('marker', 'PHONE ON', 1.3, text='PING', dur=0.9), ev('shake', 'PHONE ON', 1.35)], bubbles=[bub('HALF ASLEEP', 'so tired today', 1.8)]),
  B(3.2, 'ONE MORE SCROLL.', 7, {'PHONE ON': 0, 'PHONE OFF': 18, 'PERFECT SONG': 10, 'HALF ASLEEP': 8}, events=[ev('crash', 'PHONE ON', 0.9)], tags={'PHONE ON': 'SLIPPED'}),
  B(3.4, 'PHONE OFF. EYES UP.', 10, {'PHONE OFF': 26, 'PHONE ON': 6, 'PERFECT SONG': 13, 'HALF ASLEEP': 10}, states={'PHONE ON': 'active'}, stateAt={'PHONE ON': 0.5}, tags={'PHONE ON': 'STARTING OVER'}),
  B(3.6, 'THE TOP HAS NO SIGNAL.', 12, {'PHONE OFF': 30, 'PHONE ON': 9, 'PERFECT SONG': 15, 'HALF ASLEEP': 11}, curve='accel', states={'PHONE OFF': 'win'}, stateAt={'PHONE OFF': 3.3}, events=[ev('burst', 'PHONE OFF', 3.35)], tags={'PERFECT SONG': 'PICKING SONGS', 'HALF ASLEEP': 'TIRED AGAIN'}),
  ], counter='MONTH', keywords=['focus', 'talent', 'discipline'],
  twist='The most talented climber slips at every notification; the one with her phone off reaches the top.', tagline='PHONE DOWN. CLIMB UP.',
  description="She's the best climber on the wall. She also checks every notification. Ping by ping, the others catch up.",
  hashtags=['discipline', 'focus', 'phoneaddiction', 'productivity'], tags=['phone addiction', 'deep focus', 'distractions', 'dopamine detox'],
  pinned="How many times did you check your phone today? Be honest 👇"))
# 8 ------------------------------------------------------------------ climb: a strong why
S.append(story(8, 'Strong Arms, Weak Why', 'climb',
  [('STRONGEST', RED), ('FOR HIS KIDS', TEAL), ('WANTS ABS', PURPLE), ('DOCTOR SAID', GOLD)], [
  B(2.8, 'SAME ROPE. DIFFERENT WHY.', 1, {'STRONGEST': 5, 'FOR HIS KIDS': 1, 'WANTS ABS': 3, 'DOCTOR SAID': 2}, curves={'STRONGEST': 'accel'}, bubbles=[bub('FOR HIS KIDS', 'for my kids.', 0.3)]),
  B(3.0, 'THE STRONGEST STARTS FAST.', 2, {'STRONGEST': 12, 'FOR HIS KIDS': 3, 'WANTS ABS': 7, 'DOCTOR SAID': 4}, bubbles=[bub('STRONGEST', 'too easy.', 1.4)]),
  B(3.0, 'THEN IT GETS BORING.', 4, {'STRONGEST': 0, 'FOR HIS KIDS': 5, 'WANTS ABS': 9, 'DOCTOR SAID': 5}, curves={'STRONGEST': 'late'}, states={'STRONGEST': 'quit'}, stateAt={'STRONGEST': 2.8}, tags={'STRONGEST': 'BORED'}, bubbles=[bub('STRONGEST', 'this is boring.', 0.2)]),
  B(3.0, "ABS DON'T SHOW UP FAST.", 6, {'WANTS ABS': 4, 'FOR HIS KIDS': 9, 'DOCTOR SAID': 6}, curves={'WANTS ABS': 'late'}, states={'WANTS ABS': 'quit'}, stateAt={'WANTS ABS': 2.7}, events=[ev('shake', 'WANTS ABS', 1.0)], tags={'WANTS ABS': 'NO ABS YET'}, bubbles=[bub('WANTS ABS', 'where are my abs?', 0.3)]),
  B(3.2, 'FOR HIS KIDS: ONE MORE GRIP.', 8, {'FOR HIS KIDS': 15, 'DOCTOR SAID': 8}, bubbles=[bub('DOCTOR SAID', "doctor's orders.", 0.5)]),
  B(3.4, 'A STRONG WHY OUTLASTS STRONG ARMS.', 10, {'FOR HIS KIDS': 23, 'STRONGEST': 6, 'DOCTOR SAID': 10, 'WANTS ABS': 6}, states={'STRONGEST': 'active', 'WANTS ABS': 'active'}, stateAt={'STRONGEST': 0.4, 'WANTS ABS': 0.6}, tags={'STRONGEST': 'TRYING AGAIN', 'WANTS ABS': 'BACK AT IT'}),
  B(3.6, 'THE WEAKEST REACHED THE TOP.', 12, {'FOR HIS KIDS': 30, 'DOCTOR SAID': 12, 'STRONGEST': 8, 'WANTS ABS': 7}, curve='accel', states={'FOR HIS KIDS': 'win'}, stateAt={'FOR HIS KIDS': 3.3}, events=[ev('burst', 'FOR HIS KIDS', 3.35)]),
  ], counter='MONTH', keywords=['motivation', 'vision', 'strengths'],
  twist='The strongest climber quits when it gets boring; the weakest has a reason and reaches the top.', tagline='FIND YOUR WHY. THE ARMS FOLLOW.',
  description='The strongest arms on the wall. The weakest reason. Watch what happens when climbing stops being exciting.',
  hashtags=['discipline', 'motivation', 'findyourwhy', 'fitness'], tags=['find your why', 'purpose', 'motivation fades'],
  pinned="What's your why? Drop it below 👇"))
# 9 ------------------------------------------------------------------ climb: fell twice
S.append(story(9, 'Fell Twice, Still Won', 'climb',
  [('RECKLESS', RED), ('FALLS A LOT', TEAL), ('NEVER FALLS', PURPLE), ('AFRAID', GOLD)], [
  B(2.8, 'SAME ROPE. SAME FEAR.', 1, {'RECKLESS': 5, 'FALLS A LOT': 6, 'NEVER FALLS': 3, 'AFRAID': 1}, curves={'RECKLESS': 'accel'}, bubbles=[bub('AFRAID', 'what if I fall?', 0.3)]),
  B(3.0, 'HE FALLS.', 2, {'FALLS A LOT': 0, 'RECKLESS': 10, 'NEVER FALLS': 6, 'AFRAID': 2}, events=[ev('crash', 'FALLS A LOT', 1.0)], tags={'FALLS A LOT': 'FALL #1'}),
  B(3.0, 'AND CLIMBS AGAIN.', 3, {'FALLS A LOT': 9, 'RECKLESS': 15, 'NEVER FALLS': 9, 'AFRAID': 3}, states={'FALLS A LOT': 'active'}, stateAt={'FALLS A LOT': 0.2}, tags={'FALLS A LOT': 'BACK UP'}),
  B(3.0, 'RECKLESS FALLS ONCE. FOR GOOD.', 5, {'RECKLESS': 0, 'FALLS A LOT': 0, 'NEVER FALLS': 11, 'AFRAID': 3}, events=[ev('crash', 'RECKLESS', 0.5), ev('crash', 'FALLS A LOT', 2.0)], tags={'RECKLESS': 'NEVER AGAIN', 'FALLS A LOT': 'FALL #2'}),
  B(3.2, 'FALL NUMBER TWO. STILL CLIMBING.', 7, {'FALLS A LOT': 16, 'NEVER FALLS': 12, 'AFRAID': 4}, states={'FALLS A LOT': 'active'}, stateAt={'FALLS A LOT': 0.2}, tags={'FALLS A LOT': 'BACK UP'}, bubbles=[bub('NEVER FALLS', 'good enough for me.', 1.2)]),
  B(3.4, 'NEVER FALLS NEVER RISES.', 10, {'FALLS A LOT': 24, 'NEVER FALLS': 13, 'AFRAID': 4, 'RECKLESS': 5}, states={'RECKLESS': 'active'}, stateAt={'RECKLESS': 0.6}, tags={'RECKLESS': 'CAREFUL NOW'}),
  B(3.6, 'FELL TWICE. REACHED THE TOP.', 12, {'FALLS A LOT': 30, 'NEVER FALLS': 14, 'AFRAID': 5, 'RECKLESS': 8}, curve='accel', states={'FALLS A LOT': 'win'}, stateAt={'FALLS A LOT': 3.3}, events=[ev('burst', 'FALLS A LOT', 3.35)], tags={'NEVER FALLS': 'NEVER FELL. NEVER ROSE.', 'AFRAID': 'STILL AFRAID'}),
  ], counter='MONTH', keywords=['failure', 'mistakes', 'progress'],
  twist='The one who fell most reached the top; the one who never fell never left the middle.', tagline='FALLING IS PART OF CLIMBING.',
  description="One climbs recklessly. One never falls. One is too afraid to try. One falls twice and gets back up every time.",
  hashtags=['discipline', 'failure', 'nevergiveup', 'growth'], tags=['fear of failure', 'fail forward', 'getting back up'],
  pinned='How many times did you fall before you got where you are? 👇'))
# 10 ----------------------------------------------------------------- climb: tomorrow
S.append(story(10, 'Tomorrow Never Reached The Top', 'climb',
  [('TOMORROW', RED), ('TODAY', TEAL), ('WHEN READY', PURPLE), ('AFTER COFFEE', GOLD)], [
  B(2.8, 'SAME ROPE. SAME MORNING.', 1, {'TOMORROW': 1, 'TODAY': 3, 'WHEN READY': 1, 'AFTER COFFEE': 2}, curves={'TOMORROW': 'late', 'AFTER COFFEE': 'late'}, bubbles=[bub('TOMORROW', "I'll start tomorrow.", 0.3)]),
  B(3.0, 'TODAY CLIMBS. TOMORROW PLANS.', 10, {'TOMORROW': 2, 'TODAY': 8, 'WHEN READY': 2, 'AFTER COFFEE': 5}, curves={'TOMORROW': 'late', 'AFTER COFFEE': 'late'}, bubbles=[bub('AFTER COFFEE', 'after coffee.', 0.4)]),
  B(3.0, 'TOMORROW BECOMES NEXT WEEK.', 25, {'TOMORROW': 3, 'TODAY': 13, 'WHEN READY': 3, 'AFTER COFFEE': 7}, curves={'TOMORROW': 'late'}, bubbles=[bub('TOMORROW', 'next week, for sure.', 0.4)]),
  B(3.0, 'THEN THE STORM HITS.', 40, {'TODAY': 16, 'AFTER COFFEE': 8, 'WHEN READY': 3}, states={'TOMORROW': 'sad'}, stateAt={'TOMORROW': 1.0}, events=[ev('storm', at=0.2, dur=2.4)], bubbles=[bub('TOMORROW', 'see? bad timing.', 1.2)]),
  B(3.2, 'TODAY KEEPS GOING.', 60, {'TODAY': 21, 'TOMORROW': 5, 'AFTER COFFEE': 10, 'WHEN READY': 4}, curves={'TOMORROW': 'late'}, states={'TOMORROW': 'active'}, stateAt={'TOMORROW': 0.6}),
  B(3.4, 'TOMORROW NEVER COMES.', 80, {'TODAY': 26, 'TOMORROW': 6, 'AFTER COFFEE': 11, 'WHEN READY': 5}, curves={'TOMORROW': 'late'}, bubbles=[bub('TOMORROW', 'tomorrow, I promise.', 0.4)]),
  B(3.6, 'TODAY REACHED THE TOP.', 100, {'TODAY': 30, 'TOMORROW': 6, 'AFTER COFFEE': 12, 'WHEN READY': 5}, curve='accel', states={'TODAY': 'win'}, stateAt={'TODAY': 3.3}, events=[ev('burst', 'TODAY', 3.35)], tags={'TOMORROW': 'STARTS TOMORROW', 'WHEN READY': 'STILL NOT READY'}),
  ], counter='DAY', keywords=['procrastination', 'discipline', 'decision'],
  twist='TOMORROW never climbs today; TODAY climbs every day and reaches the top.', tagline='TODAY IS THE ONLY DAY YOU CLIMB.',
  description='Four climbers: TOMORROW, TODAY, WHEN READY and AFTER COFFEE. Only one of them actually climbs today.',
  hashtags=['discipline', 'procrastination', 'startnow', 'productivity'], tags=['stop procrastinating', 'procrastination', 'start today'],
  pinned="What are you putting off until tomorrow? 👇"))
# 11 ----------------------------------------------------------------- dig: night owl
S.append(story(11, 'Night Owl Dug Less', 'dig',
  [('NIGHT OWL', PURPLE), ('EARLY BED', TEAL), ('ALL NIGHTER', RED), ('FIVE COFFEES', GOLD)], [
  B(2.8, 'SAME SHOVEL. DIFFERENT BEDTIMES.', 1, {'NIGHT OWL': 3, 'EARLY BED': 2, 'ALL NIGHTER': 4, 'FIVE COFFEES': 3}, curves={'NIGHT OWL': 'accel', 'ALL NIGHTER': 'accel'}, bubbles=[bub('NIGHT OWL', 'I work best at 2am', 0.3)]),
  B(3.0, 'THE NIGHT OWL DIGS AT 2AM.', 7, {'NIGHT OWL': 9, 'EARLY BED': 6, 'ALL NIGHTER': 12, 'FIVE COFFEES': 8}, curves={'NIGHT OWL': 'decel', 'ALL NIGHTER': 'decel'}, bubbles=[bub('ALL NIGHTER', 'all night!', 1.2)]),
  B(3.0, "THE NEXT DAY, HE'S WRECKED.", 14, {'NIGHT OWL': 10, 'EARLY BED': 11, 'FIVE COFFEES': 13}, states={'ALL NIGHTER': 'sit'}, stateAt={'ALL NIGHTER': 0.4}, events=[ev('shake', 'NIGHT OWL', 0.6), ev('shake', 'FIVE COFFEES', 1.6)], tags={'ALL NIGHTER': 'ASLEEP'}, bubbles=[bub('NIGHT OWL', 'so tired...', 1.0), bub('FIVE COFFEES', 'third coffee!', 1.9)]),
  B(3.0, 'EARLY BED. EARLY SHOVEL.', 21, {'EARLY BED': 16, 'NIGHT OWL': 12, 'ALL NIGHTER': 14, 'FIVE COFFEES': 14}, states={'ALL NIGHTER': 'active'}, stateAt={'ALL NIGHTER': 0.8}, tags={'ALL NIGHTER': 'WOKE UP'}, bubbles=[bub('FIVE COFFEES', 'crashing...', 1.4)]),
  B(3.2, 'AWAKE HOURS ARE NOT WORK HOURS.', 40, {'EARLY BED': 24, 'NIGHT OWL': 15, 'ALL NIGHTER': 16, 'FIVE COFFEES': 17}, states={'ALL NIGHTER': 'sit'}, stateAt={'ALL NIGHTER': 2.0}, tags={'ALL NIGHTER': 'ASLEEP AGAIN'}),
  B(3.4, 'SLEEP IS A SHOVEL.', 70, {'EARLY BED': 34, 'NIGHT OWL': 18, 'ALL NIGHTER': 18, 'FIVE COFFEES': 19}, states={'ALL NIGHTER': 'active'}, stateAt={'ALL NIGHTER': 0.6}, tags={'ALL NIGHTER': 'WOKE UP'}),
  B(3.6, '8 HOURS OF SLEEP. 40 M DEEP.', 100, {'EARLY BED': 40, 'NIGHT OWL': 20, 'ALL NIGHTER': 20, 'FIVE COFFEES': 21}, curve='accel', states={'EARLY BED': 'win'}, stateAt={'EARLY BED': 3.3}, events=[ev('burst', 'EARLY BED', 3.35)], tags={'NIGHT OWL': 'MOST HOURS. LEAST DEPTH.'}),
  ], counter='DAY', keywords=['discipline', 'focus', 'results'],
  twist='The one who works the most hours digs the least; the one who sleeps 8 hours goes deepest.', tagline='GO TO BED. DIG DEEPER.',
  description="One works best at 2am. One pulls all-nighters. One lives on coffee. One goes to bed early. Who digs deepest?",
  hashtags=['discipline', 'sleep', 'productivity', 'nightowl'], tags=['sleep and productivity', 'all nighter', 'night owl', 'sleep schedule'],
  pinned='What time did you go to bed last night? 👇'))
# 12 ----------------------------------------------------------------- dig: small spoon
S.append(story(12, 'Small Spoon, Deep Hole', 'dig',
  [('BIG MACHINE', GOLD), ('TINY SPOON', TEAL), ('GEAR FIRST', PURPLE), ('LEARNS FIRST', RED)], [
  B(2.8, 'SAME DIRT. DIFFERENT TOOLS.', 1, {'BIG MACHINE': 6, 'TINY SPOON': 1, 'GEAR FIRST': 2, 'LEARNS FIRST': 1}, curves={'BIG MACHINE': 'accel'}, bubbles=[bub('TINY SPOON', "it's just a spoon.", 0.3)]),
  B(3.0, 'THE DIGGER MOVES FAST.', 3, {'BIG MACHINE': 16, 'TINY SPOON': 3, 'GEAR FIRST': 3, 'LEARNS FIRST': 2}, curves={'BIG MACHINE': 'decel'}, events=[ev('marker', 'GEAR FIRST', 1.0, text='NEW SHOVEL', dur=1.6, color=GOLD)], bubbles=[bub('LEARNS FIRST', 'one more tutorial', 0.4)]),
  B(3.0, 'THE SPOON NEVER STOPS.', 6, {'TINY SPOON': 7, 'BIG MACHINE': 22, 'GEAR FIRST': 5, 'LEARNS FIRST': 3}),
  B(3.0, 'THEN THE DIGGER BREAKS.', 9, {'BIG MACHINE': 4, 'TINY SPOON': 11, 'GEAR FIRST': 6, 'LEARNS FIRST': 5}, events=[ev('crash', 'BIG MACHINE', 0.4), ev('marker', 'GEAR FIRST', 1.6, text='BETTER SHOVEL', dur=1.2, color=GOLD)], tags={'BIG MACHINE': 'BROKE DOWN'}),
  B(3.2, 'WAITING FOR PARTS.', 14, {'TINY SPOON': 17, 'GEAR FIRST': 8, 'LEARNS FIRST': 7}, bubbles=[bub('BIG MACHINE', 'parts come next month', 0.5)]),
  B(3.4, 'SMALL TOOL. EVERY DAY.', 20, {'TINY SPOON': 33, 'BIG MACHINE': 8, 'GEAR FIRST': 10, 'LEARNS FIRST': 9}, curve='linear', states={'BIG MACHINE': 'active'}, stateAt={'BIG MACHINE': 0.6}, tags={'BIG MACHINE': 'BY HAND NOW'}),
  B(3.6, 'THE SPOON HIT GOLD.', 24, {'TINY SPOON': 40, 'BIG MACHINE': 10, 'GEAR FIRST': 11, 'LEARNS FIRST': 10}, curve='accel', states={'TINY SPOON': 'win'}, stateAt={'TINY SPOON': 3.3}, events=[ev('burst', 'TINY SPOON', 3.35)], tags={'GEAR FIRST': '4 SHOVELS. 11 M.', 'LEARNS FIRST': 'STILL LEARNING'}),
  ], counter='MONTH', keywords=['discipline', 'consistency', 'results'],
  twist='The smallest tool digs deepest; the rented digger breaks down and the gear collector never digs.', tagline='START WITH WHAT YOU HAVE.',
  description="One rents a digger. One keeps buying better shovels. One watches tutorials first. One digs with a tiny spoon, every day.",
  hashtags=['discipline', 'startnow', 'consistency', 'mindset'], tags=['start with what you have', 'no excuses', 'gear excuse'],
  pinned="What 'better tool' are you waiting for before you start? 👇"))
# 13 ----------------------------------------------------------------- dig: celebrated too early
S.append(story(13, 'He Celebrated Too Early', 'dig',
  [('CELEBRATES', GOLD), ('KEEPS GOING', TEAL), ('TAKES BREAKS', PURPLE), ('HALF IS FINE', RED)], [
  B(2.8, 'SAME SHOVEL. SAME GOLD.', 1, {'CELEBRATES': 4, 'KEEPS GOING': 3, 'TAKES BREAKS': 2, 'HALF IS FINE': 3}, curves={'CELEBRATES': 'accel'}),
  B(3.0, '10 METRES! TIME TO PARTY.', 4, {'CELEBRATES': 10, 'KEEPS GOING': 7, 'TAKES BREAKS': 5, 'HALF IS FINE': 8}, states={'CELEBRATES': 'cheer'}, stateAt={'CELEBRATES': 1.6}, bubbles=[bub('CELEBRATES', '10 metres!!', 1.7)]),
  B(3.0, 'THE PARTY LASTS A WEEK.', 6, {'KEEPS GOING': 12, 'TAKES BREAKS': 6, 'HALF IS FINE': 13}, bubbles=[bub('TAKES BREAKS', 'just a quick break', 0.6)]),
  B(3.0, 'BACK TO WORK. BRIEFLY.', 9, {'CELEBRATES': 18, 'KEEPS GOING': 17, 'TAKES BREAKS': 8, 'HALF IS FINE': 19}, states={'CELEBRATES': 'active'}, stateAt={'CELEBRATES': 0.3}),
  B(3.2, '20 METRES! PARTY AGAIN.', 13, {'CELEBRATES': 20, 'KEEPS GOING': 24, 'TAKES BREAKS': 10, 'HALF IS FINE': 21}, states={'CELEBRATES': 'cheer', 'HALF IS FINE': 'sad'}, stateAt={'CELEBRATES': 1.2, 'HALF IS FINE': 1.8}, tags={'HALF IS FINE': 'GOOD ENOUGH'}, bubbles=[bub('CELEBRATES', "20!! let's go!", 1.3)]),
  B(3.4, 'THE GOLD WAS STILL DOWN THERE.', 20, {'KEEPS GOING': 34, 'CELEBRATES': 22, 'TAKES BREAKS': 12}, states={'CELEBRATES': 'active'}, stateAt={'CELEBRATES': 1.0}),
  B(3.6, 'NO PARTY. JUST GOLD.', 24, {'KEEPS GOING': 40, 'CELEBRATES': 24, 'TAKES BREAKS': 13}, curve='accel', states={'KEEPS GOING': 'win'}, stateAt={'KEEPS GOING': 3.3}, events=[ev('burst', 'KEEPS GOING', 3.35)], tags={'CELEBRATES': 'PARTIED AT 10 AND 20'}),
  ], counter='MONTH', keywords=['success', 'discipline', 'goal'],
  twist='The one who throws a party at every milestone loses the gold to the one who keeps digging.', tagline='CELEBRATE AT THE FINISH LINE.',
  description='One celebrates every milestone like it is the finish. One takes long breaks. One is happy at halfway. One keeps digging.',
  hashtags=['discipline', 'success', 'keepgoing', 'goals'], tags=['celebrating too early', 'complacency', 'keep going'],
  pinned='Have you ever celebrated before the finish line? 👇'))
# 14 ----------------------------------------------------------------- pullup: likes
S.append(story(14, 'Most Liked, Fewest Reps', 'pullup',
  [('POSTS DAILY', RED), ('QUIET REPS', TEAL), ('BEST ANGLE', PURPLE), ('COPIES REELS', GOLD)], [
  B(2.8, 'SAME BAR. ONE CAMERA.', 1, {'POSTS DAILY': 3, 'QUIET REPS': 1, 'BEST ANGLE': 2, 'COPIES REELS': 2}, events=[ev('marker', 'POSTS DAILY', 0.6, text='+40 LIKES', dur=1.6, color=GOLD)]),
  B(3.0, 'HE POSTS EVERY REP.', 3, {'POSTS DAILY': 4, 'QUIET REPS': 2, 'BEST ANGLE': 3, 'COPIES REELS': 3}, events=[ev('marker', 'POSTS DAILY', 0.4, text='+120 LIKES', dur=1.2, color=GOLD), ev('marker', 'POSTS DAILY', 1.8, text='+300 LIKES', dur=1.1, color=GOLD)], bubbles=[bub('BEST ANGLE', 'wait, bad angle', 0.9)]),
  B(3.0, 'THE LIKES GO UP.', 6, {'POSTS DAILY': 4, 'QUIET REPS': 4, 'BEST ANGLE': 3, 'COPIES REELS': 5}, events=[ev('marker', 'POSTS DAILY', 0.5, text='+900 LIKES', dur=1.6, color=GOLD)], bubbles=[bub('COPIES REELS', 'new viral routine!', 1.3)]),
  B(3.0, "THE REPS DON'T.", 10, {'POSTS DAILY': 5, 'QUIET REPS': 7, 'BEST ANGLE': 4, 'COPIES REELS': 4}, events=[ev('marker', 'POSTS DAILY', 0.8, text='+2K LIKES', dur=1.6, color=GOLD), ev('shake', 'COPIES REELS', 1.6)]),
  B(3.2, 'QUIET REPS. NO CAMERA.', 22, {'QUIET REPS': 12, 'POSTS DAILY': 5, 'BEST ANGLE': 5, 'COPIES REELS': 6}, bubbles=[bub('POSTS DAILY', 'post now, reps later', 0.5)]),
  B(3.4, 'THE ALGORITHM MOVES ON.', 36, {'QUIET REPS': 17, 'BEST ANGLE': 6, 'COPIES REELS': 7}, states={'POSTS DAILY': 'quit'}, stateAt={'POSTS DAILY': 1.6}, events=[ev('marker', 'POSTS DAILY', 0.5, text='-80% REACH', dur=1.4)], tags={'POSTS DAILY': 'NO LIKES. NO REPS.'}),
  B(3.6, 'WEEK 52: 20 QUIET REPS.', 52, {'QUIET REPS': 20, 'POSTS DAILY': 6, 'BEST ANGLE': 7, 'COPIES REELS': 8}, curve='accel', states={'QUIET REPS': 'win', 'POSTS DAILY': 'active'}, stateAt={'QUIET REPS': 3.3, 'POSTS DAILY': 0.4}, events=[ev('burst', 'QUIET REPS', 3.35)], tags={'POSTS DAILY': 'STARTING OVER'}),
  ], counter='WEEK', keywords=['ego', 'silence', 'fitness'],
  twist='Likes pile up for the one who posts every rep while his reps stay flat; the quiet one gets 20.', tagline='BUILD IT FIRST. POST IT LATER.',
  description='One posts every rep. One needs the perfect angle. One copies every viral routine. One trains with no camera at all.',
  hashtags=['discipline', 'fitness', 'workinsilence', 'gym'], tags=['work in silence', 'social media vs reality', 'gym motivation', 'pull ups'],
  pinned='Would you train the same if nobody could see it? 👇'))
# 15 ----------------------------------------------------------------- pullup: started with zero
S.append(story(15, 'He Started With Zero', 'pullup',
  [('NATURAL', RED), ('STARTED AT 0', TEAL), ('ALL OR NONE', PURPLE), ('SKIPS WEEKS', GOLD)], [
  B(2.8, "WEEK 1. HE CAN'T DO ONE.", 1, {'NATURAL': 8, 'STARTED AT 0': 1, 'ALL OR NONE': 5, 'SKIPS WEEKS': 4}, curves={'STARTED AT 0': 'late'}, bubbles=[bub('STARTED AT 0', "can't even do one.", 0.2)]),
  B(3.0, "THE NATURAL DOESN'T TRY HARD.", 3, {'NATURAL': 9, 'STARTED AT 0': 2, 'ALL OR NONE': 9, 'SKIPS WEEKS': 2}, bubbles=[bub('NATURAL', "I'm built for this.", 0.5)]),
  B(3.0, 'ALL OR NOTHING GOES ALL IN.', 6, {'ALL OR NONE': 0, 'STARTED AT 0': 3, 'NATURAL': 9, 'SKIPS WEEKS': 5}, events=[ev('crash', 'ALL OR NONE', 2.0)], tags={'ALL OR NONE': 'INJURED'}),
  B(3.0, 'ZERO ADDS ONE.', 12, {'STARTED AT 0': 6, 'SKIPS WEEKS': 3}, states={'NATURAL': 'quit'}, stateAt={'NATURAL': 1.8}, tags={'NATURAL': 'BORED'}, bubbles=[bub('NATURAL', 'boring now.', 0.5)]),
  B(3.2, 'ONE MORE. EVERY WEEK.', 25, {'STARTED AT 0': 11, 'SKIPS WEEKS': 6, 'ALL OR NONE': 2}, states={'ALL OR NONE': 'active'}, stateAt={'ALL OR NONE': 1.0}, tags={'ALL OR NONE': 'REHAB'}),
  B(3.4, 'THE NATURAL COMES BACK.', 40, {'NATURAL': 9, 'STARTED AT 0': 16, 'SKIPS WEEKS': 5, 'ALL OR NONE': 5}, states={'NATURAL': 'active'}, stateAt={'NATURAL': 0.4}, tags={'NATURAL': 'BACK'}, bubbles=[bub('NATURAL', 'still got it?', 0.6)]),
  B(3.6, 'STARTED WITH ZERO. NOW 20.', 52, {'STARTED AT 0': 20, 'NATURAL': 9, 'SKIPS WEEKS': 7, 'ALL OR NONE': 7}, curve='accel', states={'STARTED AT 0': 'win'}, stateAt={'STARTED AT 0': 3.3}, events=[ev('burst', 'STARTED AT 0', 3.35)], tags={'NATURAL': 'STILL 9', 'SKIPS WEEKS': 'ON AND OFF'}),
  ], counter='WEEK', keywords=['talent', 'practice', 'progress'],
  twist="The one who couldn't do a single pull-up ends with 20; the natural stays at 9.", tagline='EVERYONE STARTS AT ZERO.',
  description="One is a natural. One goes all or nothing. One skips weeks. One can't do a single pull-up on day one.",
  hashtags=['discipline', 'fitness', 'pullups', 'beginner'], tags=['beginner pull ups', 'zero to hero', 'calisthenics progress'],
  pinned='How many pull-ups could you do on day one? 👇'))
# 16 ----------------------------------------------------------------- pullup: five minutes
S.append(story(16, 'Five Minutes Beat An Hour', 'pullup',
  [('SUNDAY HOUR', RED), ('5 MIN DAILY', TEAL), ('IF INSPIRED', PURPLE), ('NO PLAN', GOLD)], [
  B(2.8, 'SAME GOAL. DIFFERENT SCHEDULE.', 1, {'SUNDAY HOUR': 4, '5 MIN DAILY': 2, 'IF INSPIRED': 3, 'NO PLAN': 3}),
  B(3.0, 'SUNDAY: ONE BIG HOUR.', 2, {'SUNDAY HOUR': 7, '5 MIN DAILY': 3, 'IF INSPIRED': 3, 'NO PLAN': 4}, curves={'SUNDAY HOUR': 'accel'}, bubbles=[bub('SUNDAY HOUR', 'beast mode!', 0.5)]),
  B(3.0, 'MONDAY: TOO SORE TO MOVE.', 3, {'5 MIN DAILY': 4, 'IF INSPIRED': 5, 'NO PLAN': 3}, states={'SUNDAY HOUR': 'quit'}, stateAt={'SUNDAY HOUR': 0.6}, tags={'SUNDAY HOUR': 'SORE'}, bubbles=[bub('SUNDAY HOUR', 'everything hurts.', 0.9), bub('IF INSPIRED', 'feeling it today!', 1.9)]),
  B(3.0, 'FIVE MINUTES. EVERY DAY.', 8, {'5 MIN DAILY': 7, 'SUNDAY HOUR': 8, 'IF INSPIRED': 4, 'NO PLAN': 5}, states={'SUNDAY HOUR': 'active'}, stateAt={'SUNDAY HOUR': 1.6}, tags={'SUNDAY HOUR': 'SUNDAY AGAIN'}),
  B(3.2, 'SUNDAY. SORE. REPEAT.', 16, {'5 MIN DAILY': 11, 'IF INSPIRED': 6, 'NO PLAN': 4}, states={'SUNDAY HOUR': 'quit'}, stateAt={'SUNDAY HOUR': 1.4}, tags={'SUNDAY HOUR': 'SORE AGAIN'}),
  B(3.4, 'SMALL DOSES ADD UP.', 34, {'5 MIN DAILY': 17, 'SUNDAY HOUR': 9, 'IF INSPIRED': 6, 'NO PLAN': 6}, curve='linear', states={'SUNDAY HOUR': 'active'}, stateAt={'SUNDAY HOUR': 0.6}, tags={'SUNDAY HOUR': 'SUNDAY AGAIN'}),
  B(3.6, '5 MINUTES A DAY: 20 REPS.', 52, {'5 MIN DAILY': 20, 'SUNDAY HOUR': 9, 'IF INSPIRED': 7, 'NO PLAN': 6}, curve='accel', states={'5 MIN DAILY': 'win'}, stateAt={'5 MIN DAILY': 3.3}, events=[ev('burst', '5 MIN DAILY', 3.35)], tags={'IF INSPIRED': 'WAITING TO FEEL IT'}),
  ], counter='WEEK', keywords=['consistency', 'fitness', 'discipline'],
  twist='Five minutes every day beats one big hour every Sunday.', tagline='SMALL AND DAILY BEATS BIG AND RARE.',
  description='One trains one big hour every Sunday and is sore all week. One trains when inspired. One has no plan. One does 5 minutes every day.',
  hashtags=['discipline', 'fitness', 'consistency', 'habits'], tags=['5 minute workout', 'daily habits', 'consistency over intensity'],
  pinned='Which is you: 5 minutes daily or 1 hour on Sunday? 👇'))
# 17 ----------------------------------------------------------------- lift: through winter
S.append(story(17, 'She Lifted Through Winter', 'lift',
  [('SUMMER BODY', RED), ('ALL YEAR', TEAL), ('TOO COLD', PURPLE), ('NEEDS BUDDY', GOLD)], [
  B(2.8, 'SAME BAR. SAME SPRING.', 3, {'SUMMER BODY': 50, 'ALL YEAR': 40, 'TOO COLD': 42, 'NEEDS BUDDY': 45}, curves={'SUMMER BODY': 'accel'}),
  B(3.0, 'SUMMER IS COMING.', 5, {'SUMMER BODY': 70, 'ALL YEAR': 48, 'TOO COLD': 50, 'NEEDS BUDDY': 55}, curves={'SUMMER BODY': 'decel'}, bubbles=[bub('SUMMER BODY', 'beach ready!', 0.5)]),
  B(3.0, 'THEN WINTER HITS.', 11, {'ALL YEAR': 60, 'NEEDS BUDDY': 56}, states={'SUMMER BODY': 'quit', 'TOO COLD': 'quit'}, stateAt={'SUMMER BODY': 0.8, 'TOO COLD': 1.2}, events=[ev('storm', at=0.2, dur=2.6)], tags={'SUMMER BODY': 'SEE YOU IN MAY', 'TOO COLD': 'TOO COLD'}, bubbles=[bub('NEEDS BUDDY', 'buddy cancelled.', 1.5)]),
  B(3.0, 'SHE LIFTS THROUGH THE COLD.', 13, {'ALL YEAR': 68}, states={'NEEDS BUDDY': 'quit'}, stateAt={'NEEDS BUDDY': 1.0}, tags={'NEEDS BUDDY': 'NO BUDDY'}),
  B(3.2, "SPRING. THEY'RE BACK. WEAKER.", 15, {'SUMMER BODY': 55, 'TOO COLD': 45, 'ALL YEAR': 75, 'NEEDS BUDDY': 50}, states={'SUMMER BODY': 'active', 'TOO COLD': 'active', 'NEEDS BUDDY': 'active'}, stateAt={'SUMMER BODY': 0.4, 'TOO COLD': 0.6, 'NEEDS BUDDY': 1.2}, tags={'SUMMER BODY': 'SUMMER AGAIN', 'TOO COLD': 'WARMER NOW', 'NEEDS BUDDY': 'NEW BUDDY'}),
  B(3.4, 'EVERY WINTER, THE SAME RESET.', 20, {'ALL YEAR': 95, 'NEEDS BUDDY': 55}, states={'SUMMER BODY': 'quit', 'TOO COLD': 'quit'}, stateAt={'SUMMER BODY': 1.4, 'TOO COLD': 1.6}, events=[ev('storm', at=1.2, dur=1.8)], tags={'SUMMER BODY': 'SEE YOU IN MAY', 'TOO COLD': 'TOO COLD'}),
  B(3.6, 'TWO YEARS: 120 KG.', 24, {'ALL YEAR': 120, 'NEEDS BUDDY': 58}, curve='accel', states={'ALL YEAR': 'win'}, stateAt={'ALL YEAR': 3.3}, events=[ev('burst', 'ALL YEAR', 3.35)]),
  ], counter='MONTH', keywords=['discipline', 'consistency', 'fitness'],
  twist='Every winter resets the seasonal lifters; the one who lifts all year doubles them.', tagline="SEASONS CHANGE. YOUR HABITS DON'T.",
  description='One trains for summer. One stops when it is cold. One needs a gym buddy. One lifts all year, through every winter.',
  hashtags=['discipline', 'fitness', 'gym', 'consistency'], tags=['winter motivation', 'summer body', 'gym all year', 'deadlift progress'],
  pinned='Do you train through winter, or wait for summer? 👇', metric={'suffix': ' KG', 'scale': 1, 'max': 120}))
# 18 ----------------------------------------------------------------- lift: warmups
S.append(story(18, 'Skipped Warmups, Lost Months', 'lift',
  [('SKIPS WARMUP', RED), ('WARMS UP', TEAL), ('MAXES DAILY', PURPLE), ('COMFORT ZONE', GOLD)], [
  B(2.8, 'SAME BAR. SAME GOAL.', 1, {'SKIPS WARMUP': 80, 'WARMS UP': 60, 'MAXES DAILY': 70, 'COMFORT ZONE': 50}, curves={'SKIPS WARMUP': 'accel'}),
  B(3.0, 'WHO NEEDS A WARM-UP?', 2, {'SKIPS WARMUP': 110, 'WARMS UP': 70, 'MAXES DAILY': 85, 'COMFORT ZONE': 52}, curves={'SKIPS WARMUP': 'decel'}, bubbles=[bub('SKIPS WARMUP', 'warm-ups are for kids', 0.4)]),
  B(3.0, 'THEN THE BACK GOES.', 3, {'SKIPS WARMUP': 0, 'WARMS UP': 80, 'MAXES DAILY': 90, 'COMFORT ZONE': 54}, events=[ev('crash', 'SKIPS WARMUP', 0.4)], tags={'SKIPS WARMUP': 'INJURED'}, bubbles=[bub('MAXES DAILY', 'new max? new max?', 1.4)]),
  B(3.0, 'SIX MONTHS ON THE BENCH.', 9, {'WARMS UP': 110, 'MAXES DAILY': 90, 'COMFORT ZONE': 55}, bubbles=[bub('COMFORT ZONE', 'this feels safe.', 0.6)]),
  B(3.2, 'FIVE BORING MINUTES OF WARM-UP.', 12, {'WARMS UP': 125, 'SKIPS WARMUP': 40, 'MAXES DAILY': 92, 'COMFORT ZONE': 56}, states={'SKIPS WARMUP': 'active'}, stateAt={'SKIPS WARMUP': 1.0}, tags={'SKIPS WARMUP': 'REHAB'}),
  B(3.4, 'WARM-UPS: BORING. RESULTS: NOT.', 18, {'WARMS UP': 145, 'SKIPS WARMUP': 70, 'MAXES DAILY': 92, 'COMFORT ZONE': 58}, tags={'MAXES DAILY': 'STUCK AT 92'}),
  B(3.6, 'TWO YEARS: 160 KG.', 24, {'WARMS UP': 160, 'SKIPS WARMUP': 85, 'MAXES DAILY': 92, 'COMFORT ZONE': 60}, curve='accel', states={'WARMS UP': 'win'}, stateAt={'WARMS UP': 3.3}, events=[ev('burst', 'WARMS UP', 3.35)], tags={'COMFORT ZONE': 'STILL COMFORTABLE'}),
  ], counter='MONTH', keywords=['discipline', 'ego', 'fitness'],
  twist='The heaviest lifter skips warm-ups and loses six months; five boring minutes win.', tagline='FIVE BORING MINUTES SAVE FIVE MONTHS.',
  description='One skips warm-ups. One maxes out every day. One stays in his comfort zone. One spends five boring minutes warming up.',
  hashtags=['discipline', 'gym', 'deadlift', 'injuryprevention'], tags=['warm up', 'gym injury', 'deadlift', 'lifting progress'],
  pinned='Be honest: do you skip warm-ups? 👇', metric={'suffix': ' KG', 'scale': 1, 'max': 160}))
# 19 ----------------------------------------------------------------- bridge: perfectionism
S.append(story(19, 'Perfect Planks, Unfinished Bridge', 'bridge',
  [('COPYCAT', RED), ('GOOD ENOUGH', TEAL), ('PERFECT ONLY', PURPLE), ('NEEDS A PLAN', GOLD)], [
  B(2.8, 'ONE GAP. FOUR BUILDERS.', 3, {'COPYCAT': 2, 'GOOD ENOUGH': 3, 'PERFECT ONLY': 1, 'NEEDS A PLAN': 1}, bubbles=[bub('PERFECT ONLY', 'it has to be perfect.', 0.3)]),
  B(3.0, 'PERFECT ONLY REDOES PLANK ONE.', 8, {'COPYCAT': 4, 'GOOD ENOUGH': 6, 'PERFECT ONLY': 2, 'NEEDS A PLAN': 2}, events=[ev('marker', 'PERFECT ONLY', 1.0, text='REDO', dur=1.4, color=GOLD)], bubbles=[bub('NEEDS A PLAN', 'need a blueprint first', 0.4)]),
  B(3.0, 'GOOD ENOUGH KEEPS GOING.', 15, {'GOOD ENOUGH': 9, 'PERFECT ONLY': 3, 'NEEDS A PLAN': 3, 'COPYCAT': 7}, events=[ev('marker', 'PERFECT ONLY', 0.6, text='REDO', dur=1.0, color=GOLD), ev('marker', 'PERFECT ONLY', 2.0, text='REDO', dur=0.9, color=GOLD)], bubbles=[bub('COPYCAT', 'doing what she does', 1.2)]),
  B(3.0, 'THEN THE STORM HITS.', 22, {'GOOD ENOUGH': 11, 'NEEDS A PLAN': 4, 'COPYCAT': 8}, states={'PERFECT ONLY': 'sad'}, stateAt={'PERFECT ONLY': 1.0}, events=[ev('storm', at=0.2, dur=2.4)], bubbles=[bub('PERFECT ONLY', 'the wood is ruined!', 1.2)]),
  B(3.2, 'IMPERFECT. BUT MOVING.', 40, {'GOOD ENOUGH': 15, 'PERFECT ONLY': 4, 'NEEDS A PLAN': 5, 'COPYCAT': 11}, states={'PERFECT ONLY': 'active'}, stateAt={'PERFECT ONLY': 0.6}, events=[ev('marker', 'PERFECT ONLY', 1.8, text='REDO', dur=1.0, color=GOLD)]),
  B(3.4, 'COPIED PLANKS DON\'T HOLD.', 75, {'GOOD ENOUGH': 20, 'PERFECT ONLY': 5, 'NEEDS A PLAN': 6, 'COPYCAT': 9}, curve='linear', events=[ev('crash', 'COPYCAT', 1.6)], tags={'COPYCAT': 'COLLAPSED'}),
  B(3.6, 'DAY 100: GOOD ENOUGH IS ACROSS.', 100, {'GOOD ENOUGH': 22, 'PERFECT ONLY': 6, 'NEEDS A PLAN': 7}, curve='accel', states={'GOOD ENOUGH': 'win'}, stateAt={'GOOD ENOUGH': 3.3}, events=[ev('burst', 'GOOD ENOUGH', 3.35)], tags={'PERFECT ONLY': '6 PERFECT PLANKS', 'NEEDS A PLAN': 'STILL PLANNING'}),
  ], counter='DAY', keywords=['perfection', 'progress', 'overthinking'],
  twist='The perfectionist keeps redoing plank one; good enough crosses on day 100.', tagline='DONE IS BETTER THAN PERFECT.',
  description='One needs every plank perfect. One needs a full blueprint first. One copies everyone. One builds good enough, every day.',
  hashtags=['discipline', 'perfectionism', 'progress', 'productivity'], tags=['perfectionism', 'done is better than perfect', 'overthinking'],
  pinned='Is perfectionism keeping your bridge unfinished? 👇'))
# 20 ----------------------------------------------------------------- race: head start
S.append(story(20, 'Head Start, Still Lost', 'race',
  [('HEAD START', RED), ('BORN BEHIND', TEAL), ('MIDDLE START', PURPLE), ('NEEDS LUCK', GOLD)], [
  B(2.6, 'NOT EVERYONE STARTS EQUAL.', 1, {'HEAD START': 82, 'BORN BEHIND': 4, 'MIDDLE START': 34, 'NEEDS LUCK': 22}, curves={'BORN BEHIND': 'accel'}, bubbles=[bub('HEAD START', "I'm already ahead.", 0.3)]),
  B(3.0, 'HEAD START TAKES IT EASY.', 10, {'HEAD START': 88, 'BORN BEHIND': 22, 'MIDDLE START': 48, 'NEEDS LUCK': 26}, bubbles=[bub('NEEDS LUCK', 'waiting for my break', 1.2)]),
  B(3.0, 'BORN BEHIND RUNS EVERY DAY.', 25, {'BORN BEHIND': 50, 'HEAD START': 92, 'MIDDLE START': 62, 'NEEDS LUCK': 30}, bubbles=[bub('HEAD START', 'no rush.', 0.6)]),
  B(3.0, 'THEN THE STORM HITS.', 35, {'BORN BEHIND': 72, 'MIDDLE START': 74, 'HEAD START': 93, 'NEEDS LUCK': 31}, states={'HEAD START': 'sad', 'NEEDS LUCK': 'sad'}, stateAt={'HEAD START': 0.8, 'NEEDS LUCK': 1.2}, events=[ev('storm', at=0.2, dur=2.4)], bubbles=[bub('HEAD START', "I'll wait it out.", 1.0)]),
  B(3.2, 'BORN BEHIND PASSES HIM.', 50, {'BORN BEHIND': 100, 'HEAD START': 96, 'MIDDLE START': 90, 'NEEDS LUCK': 34}, states={'HEAD START': 'active', 'NEEDS LUCK': 'active'}, stateAt={'HEAD START': 1.0, 'NEEDS LUCK': 0.6}),
  B(3.4, "LUCK STARTS THE RACE. IT DOESN'T RUN IT.", 75, {'BORN BEHIND': 160, 'MIDDLE START': 120, 'HEAD START': 100, 'NEEDS LUCK': 40}, curve='linear'),
  B(3.6, 'DAY 90: HEAD START LOST.', 90, {'BORN BEHIND': 200, 'MIDDLE START': 140, 'HEAD START': 104, 'NEEDS LUCK': 44}, curve='accel', states={'BORN BEHIND': 'win'}, stateAt={'BORN BEHIND': 3.3}, events=[ev('burst', 'BORN BEHIND', 3.35)], tags={'HEAD START': '80 KM HEAD START', 'NEEDS LUCK': 'STILL WAITING'}),
  ], counter='DAY', keywords=['luck', 'discipline', 'potential'],
  start={'HEAD START': 80, 'BORN BEHIND': 0, 'MIDDLE START': 30, 'NEEDS LUCK': 20},
  twist='The runner who starts 80 km ahead coasts and loses to the one born behind.', tagline="WHERE YOU START ISN'T WHERE YOU FINISH.",
  description='One starts 80 km ahead. One starts at zero. One starts in the middle. One waits for a lucky break. 90 days later...',
  hashtags=['discipline', 'luck', 'mindset', 'motivation'], tags=['head start', 'privilege vs hard work', 'luck vs discipline'],
  pinned='Did you get a head start, or start from zero? 👇'))

if __name__ == '__main__':
    print(len(S), 'stories:'); [print(' ', s) for s in S]
