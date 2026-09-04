/**
 * The AgentR blog illustration library — the hiring world, drawn.
 *
 * Style: paper-white objects, ink outlines, on a flat brand ground. Nothing
 * else. No shading, no coloured marks, no gradients. The calm is the point:
 * these sit beside a headline and must never compete with it.
 *
 * Every motif is a function of a seed returning SVG, composed only from
 * scripts/lib/art-kit.mjs. Read .github/ILLUSTRATION-GUIDE.md before adding one,
 * and run `npm run check-art` after — it fails on anything outside the palette.
 *
 * `topics` is how a post finds its picture: the build matches a post's category,
 * then its slug, against these words.
 */
import {
  arrow,
  circle,
  crowd,
  cross,
  ellipse,
  hair,
  ink,
  line,
  page,
  path,
  poly,
  rect,
  solid,
  tick,
} from './lib/art-kit.mjs'

const INK = '#171425'

/* --------------------------------------------- the application arrives ---- */

/** One application, read in full. */
function application(s) {
  return page(240, 150, 244, 320, s, {lines: 5, head: true})
}

/** The pile nobody reads to the bottom of. */
function volume(s) {
  const out = []
  for (let i = 3; i >= 0; i--) out.push(page(206 + i * 34, 170 + i * 38, 244, 288, s + i, {lines: 3}))
  return out.join('')
}

/** The role, written down before anyone applied. */
function role(s) {
  const out = [rect(238, 148, 248, 328, solid(s))]
  out.push(rect(266, 186, 140, 18, solid(s + 1, INK, 0)))
  for (let i = 0; i < 4; i++) {
    const y = 254 + i * 48
    out.push(circle(280, y, 16, ink(s + 10 + i, 2.6)))
    out.push(line(302, y, i === 3 ? 404 : 456, y, hair(s + 20 + i)))
  }
  return out.join('')
}

/** Where the applicants come from. */
function sourcing(s) {
  const out = [
    crowd(
      [
        [212, 196],
        [300, 168],
        [392, 190],
        [478, 164],
        [246, 274],
        [340, 250],
        [432, 272],
        [510, 244],
      ],
      s,
      34,
    ),
    rect(238, 348, 244, 152, solid(s + 30)),
    line(238, 400, 482, 400, hair(s + 40)),
    line(310, 348, 310, 500, hair(s + 41)),
    line(410, 348, 410, 500, hair(s + 42)),
  ]
  return out.join('')
}

/** Everyone who applied, held in one place. */
function talentPool(s) {
  const out = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      out.push(rect(190 + c * 92, 200 + r * 108, 68, 84, solid(s + r * 4 + c)))
    }
  }
  return out.join('')
}

/* ------------------------------------------------ reading and judging ----- */

/** Everyone in, a shortlist out. */
function screening(s) {
  return [
    crowd([[196, 132], [286, 104], [378, 126], [468, 102], [548, 128]], s, 34),
    poly(
      [
        [166, 190],
        [556, 190],
        [408, 372],
        [408, 508],
        [312, 558],
        [312, 372],
      ],
      solid(s + 20),
    ),
  ].join('')
}

/** A claim read closely against the record. */
function verification(s) {
  return [
    page(168, 168, 240, 316, s, {lines: 4, head: true}),
    circle(432, 386, 190, ink(s + 20, 3.8)),
    circle(432, 386, 154, hair(s + 21, 2)),
    line(506, 460, 580, 538, ink(s + 22, 5.6)),
  ].join('')
}

/** Scored against a rubric written first. */
function rubric(s) {
  const out = [rect(160, 162, 400, 350, solid(s))]
  for (let r = 1; r < 4; r++) out.push(line(160, 162 + r * 88, 560, 162 + r * 88, hair(s + r)))
  out.push(line(372, 162, 372, 512, hair(s + 8)))
  out.push(tick(408, 198, 44, s + 10))
  out.push(tick(408, 286, 44, s + 11))
  out.push(cross(412, 356, 40, s + 12))
  out.push(tick(408, 462, 44, s + 13))
  for (let r = 0; r < 4; r++) out.push(line(192, 204 + r * 88, 330, 204 + r * 88, hair(s + 20 + r)))
  return out.join('')
}

/** Twenty signals, ranked. */
function shortlist(s) {
  const out = []
  ;[104, 156, 214, 288].forEach((h, i) => out.push(rect(196 + i * 92, 548 - h, 68, h, solid(s + i))))
  out.push(line(164, 552, 572, 552, ink(s + 20, 3.4)))
  return out.join('')
}

/** Two readers, one standard. */
function calibration(s) {
  const out = []
  for (let i = 0; i < 3; i++) {
    const y = 226 + i * 96
    out.push(line(196, y, 528, y, hair(s + i, 2.6)))
    out.push(circle(196 + (i === 1 ? 210 : 150), y, 40, solid(s + 10 + i)))
  }
  out.push(rect(324, 452, 76, 76, solid(s + 30)))
  out.push(tick(342, 480, 40, s + 31))
  return out.join('')
}

/** The same standard for applicant one and applicant a thousand. */
function fairness(s) {
  const out = []
  for (let i = 0; i < 4; i++) {
    out.push(rect(178 + i * 96, 250, 72, 176, solid(s + i)))
    out.push(tick(192 + i * 96, 300, 40, s + 10 + i))
  }
  out.push(line(160, 462, 566, 462, ink(s + 30, 3.4)))
  return out.join('')
}

/* --------------------------------------------------- the conversation ----- */

/** A conversation that was actually structured. */
function interview(s) {
  return [
    rect(146, 178, 262, 172, solid(s)),
    poly([[190, 350], [190, 412], [252, 350]], solid(s + 1)),
    line(180, 234, 372, 234, hair(s + 10)),
    line(180, 280, 328, 280, hair(s + 11)),
    rect(320, 348, 264, 176, solid(s + 20)),
    poly([[538, 524], [538, 584], [478, 524]], solid(s + 21)),
    line(354, 406, 550, 406, hair(s + 30)),
    line(354, 452, 498, 452, hair(s + 31)),
  ].join('')
}

/** Questions built from the role. */
function questions(s) {
  const out = [rect(214, 162, 292, 336, solid(s))]
  for (let i = 0; i < 4; i++) {
    const y = 222 + i * 78
    out.push(circle(252, y, 26, ink(s + 10 + i, 2.6)))
    out.push(line(282, y - 10, 470, y - 10, hair(s + 20 + i)))
    out.push(line(282, y + 16, 420, y + 16, hair(s + 30 + i)))
  }
  return out.join('')
}

/** The hiring panel. */
function panel(s) {
  const out = [ellipse(360, 424, 340, 150, solid(s))]
  for (const [cx, cy] of [
    [224, 268],
    [360, 232],
    [496, 268],
  ]) {
    out.push(circle(cx, cy, 74, solid(s + cx)))
    out.push(path(`M ${cx - 52} ${cy + 96} q 52 -58 104 0`, solid(s + cx + 1)))
  }
  return out.join('')
}

/** What was said, written down. */
function notes(s) {
  const out = [rect(200, 160, 268, 340, solid(s))]
  for (let i = 0; i < 6; i++) {
    out.push(line(232, 214 + i * 50, i % 3 === 2 ? 376 : 436, 214 + i * 50, hair(s + 10 + i)))
  }
  out.push(line(496, 190, 434, 452, ink(s + 30, 6)))
  out.push(poly([[434, 452], [424, 486], [452, 468]], solid(s + 31)))
  return out.join('')
}

/* ------------------------------------------------------- the logistics ---- */

/** No calendars, no slots — one link. */
function scheduling(s) {
  const out = [rect(168, 186, 400, 350, solid(s))]
  out.push(line(168, 252, 568, 252, ink(s + 1, 2.8)))
  for (let c = 1; c < 5; c++) out.push(line(168 + c * 80, 252, 168 + c * 80, 536, hair(s + 4 + c, 1.9)))
  for (let r = 1; r < 4; r++) out.push(line(168, 252 + r * 71, 568, 252 + r * 71, hair(s + 12 + r, 1.9)))
  out.push(rect(328, 324, 72, 64, solid(s + 20, INK, 0)))
  return out.join('')
}

/** How long any of it actually takes. */
function speed(s) {
  return [
    circle(360, 348, 250, solid(s)),
    line(360, 348, 360, 236, ink(s + 1, 4.6)),
    line(360, 348, 444, 396, ink(s + 2, 4.6)),
    circle(360, 348, 20, solid(s + 3, INK, 0)),
    line(360, 224, 360, 198, hair(s + 10, 3)),
    line(484, 348, 510, 348, hair(s + 11, 3)),
    line(360, 472, 360, 498, hair(s + 12, 3)),
    line(236, 348, 210, 348, hair(s + 13, 3)),
  ].join('')
}

/** Cost per hire, and what it buys. */
function compensation(s) {
  return [
    line(360, 176, 360, 240, ink(s, 3.6)),
    line(200, 240, 520, 240, ink(s + 1, 3.6)),
    poly([[152, 240], [248, 240], [200, 340]], solid(s + 2)),
    poly([[472, 240], [568, 240], [520, 340]], solid(s + 3)),
    rect(304, 400, 112, 112, solid(s + 4)),
    line(336, 436, 384, 436, hair(s + 5)),
    line(336, 476, 384, 476, hair(s + 6)),
  ].join('')
}

/* ------------------------------------------------ decision and after ------ */

/**
 * The decision that stays with a person. The hand reaches 218px to the right of
 * wherever it starts, so it starts at 372 and the page moves left to make room:
 * any further right and a 3:2 card crop takes the fingers off.
 */
function judgment(s) {
  return [
    page(136, 210, 206, 288, s, {lines: 4}),
    path(
      `M 372 486 q -18 -78 12 -132 q 26 -44 62 -20 q 10 -74 44 -66 q 26 6 20 68
       q 22 -50 48 -30 q 22 22 -4 74 q 26 -18 36 4 q 10 24 -30 66
       q -48 50 -110 52 q -60 2 -78 -16 z`,
      solid(s + 20, undefined, 3.4),
    ),
  ].join('')
}

/** The offer. */
function offer(s) {
  return [
    rect(176, 226, 368, 250, solid(s)),
    poly([[176, 226], [360, 370], [544, 226]], solid(s + 1)),
    circle(360, 452, 76, solid(s + 2)),
    tick(332, 442, 48, s + 3),
  ].join('')
}

/** Not this time. */
function declined(s) {
  return [
    page(238, 158, 244, 316, s, {lines: 4}),
    line(214, 508, 506, 508, ink(s + 20, 3.4)),
    arrow(360, 512, 360, 596, s + 21),
  ].join('')
}

/** The first day. */
function onboarding(s) {
  return [
    rect(252, 156, 216, 288, solid(s)),
    circle(360, 224, 66, solid(s + 1)),
    path(`M 312 316 q 48 -50 96 0`, solid(s + 2)),
    line(298, 366, 422, 366, hair(s + 3)),
    line(320, 402, 400, 402, hair(s + 4)),
    line(360, 156, 360, 108, ink(s + 5, 3)),
    ellipse(360, 96, 64, 34, ink(s + 6, 3)),
    rect(300, 466, 120, 62, solid(s + 7)),
  ].join('')
}

/** Someone who already works here, vouching. */
function referral(s) {
  return [
    circle(238, 288, 118, solid(s)),
    circle(482, 288, 118, solid(s + 1)),
    line(300, 288, 420, 288, ink(s + 2, 3.4)),
    path(`M 186 452 q 52 -58 104 0`, solid(s + 3)),
    path(`M 430 452 q 52 -58 104 0`, solid(s + 4)),
  ].join('')
}

/* --------------------------------------------------- what we hold --------- */

/** What the system will never do with a candidate's data. */
function privacy(s) {
  return [
    poly(
      [
        [360, 130],
        [540, 200],
        [540, 376],
        [360, 566],
        [180, 376],
        [180, 200],
      ],
      solid(s),
    ),
    rect(310, 322, 100, 90, solid(s + 10)),
    path(`M 328 322 q 32 -58 64 0`, ink(s + 11, 3.6)),
  ].join('')
}

/** Everything on the record, in order. */
function timeline(s) {
  const out = [line(178, 356, 552, 356, ink(s, 3.4))]
  ;[214, 320, 426, 520].forEach((x, i) => {
    const up = i % 2 === 0
    out.push(circle(x, 356, 34, solid(s + 10 + i)))
    out.push(line(x, up ? 336 : 376, x, up ? 262 : 450, hair(s + 20 + i, 2.4)))
    out.push(rect(x - 52, up ? 196 : 450, 104, 62, solid(s + 30 + i)))
  })
  return out.join('')
}

/** What someone can actually do. */
function skills(s) {
  const out = []
  const rows = [
    [186, 220, 152],
    [352, 220, 182],
    [186, 306, 196],
    [400, 306, 134],
    [186, 392, 128],
    [330, 392, 204],
  ]
  rows.forEach(([x, y, w], i) => {
    out.push(rect(x, y, w, 58, solid(s + i)))
    out.push(line(x + 22, y + 30, x + w - 22, y + 30, hair(s + 10 + i, 2.2)))
  })
  return out.join('')
}

/** Papers that say so. */
function credentials(s) {
  return [
    rect(178, 190, 364, 264, solid(s)),
    line(216, 250, 504, 250, hair(s + 1)),
    line(216, 296, 438, 296, hair(s + 2)),
    line(216, 342, 470, 342, hair(s + 3)),
    circle(360, 470, 86, solid(s + 10)),
    poly([[334, 508], [334, 588], [360, 552], [386, 588], [386, 508]], solid(s + 11)),
  ].join('')
}

/* --------------------------------------------- and the machines ----------- */

/** When everyone is using bots. */
function bots(s) {
  return [
    rect(220, 226, 280, 226, solid(s)),
    circle(298, 312, 44, ink(s + 1, 3.4)),
    circle(422, 312, 44, ink(s + 2, 3.4)),
    line(296, 388, 424, 388, ink(s + 3, 3.4)),
    line(360, 226, 360, 166, ink(s + 4, 3.2)),
    circle(360, 148, 38, solid(s + 5)),
    line(220, 310, 172, 310, ink(s + 6, 3)),
    line(500, 310, 548, 310, ink(s + 7, 3)),
  ].join('')
}

/** Reasoning you can actually see. */
function reasoning(s) {
  const out = [rect(212, 168, 296, 200, solid(s))]
  for (let i = 0; i < 3; i++) {
    out.push(line(244, 218 + i * 46, i === 2 ? 400 : 476, 218 + i * 46, hair(s + i)))
  }
  out.push(arrow(360, 372, 360, 434, s + 10))
  out.push(rect(212, 440, 296, 118, solid(s + 11)))
  out.push(line(244, 486, 476, 486, hair(s + 12)))
  out.push(line(244, 522, 396, 522, hair(s + 13)))
  return out.join('')
}

/** Nobody auto-rejected. */
function humanInLoop(s) {
  return [
    rect(168, 264, 172, 172, solid(s)),
    rect(380, 264, 172, 172, solid(s + 1)),
    arrow(348, 350, 372, 350, s + 2),
    circle(254, 350, 62, solid(s + 10)),
    path(`M 466 306 q 42 -46 84 0`, ink(s + 11, 3.2)),
    line(410, 400, 522, 400, hair(s + 12)),
  ].join('')
}

/**
 * `topics` decides which drawing a post gets: the build matches a post's
 * category, then its slug, against these words. Add words rather than adding
 * near-duplicate motifs. Grounds rotate so neighbours in a list differ.
 */
export const MOTIFS = [
  {name: 'application', ground: 'violet', draw: application, topics: ['application', 'resume', 'cv', 'applicant']},
  {name: 'volume', ground: 'brass', draw: volume, topics: ['volume', 'scale', 'backlog', 'throughput', 'pile']},
  {name: 'role', ground: 'deep', draw: role, topics: ['role', 'job description', 'jd', 'requirements', 'brief', 'ghost job', 'vacancy']},
  {name: 'sourcing', ground: 'lilac', draw: sourcing, topics: ['sourcing', 'pipeline', 'inbound', 'job board']},
  {name: 'talent-pool', ground: 'violet', draw: talentPool, topics: ['talent pool', 'database', 'ats', 'archive', 'fresher', 'graduate']},
  {name: 'screening', ground: 'brass', draw: screening, topics: ['screening', 'funnel', 'filter', 'sifting']},
  {name: 'verification', ground: 'deep', draw: verification, topics: ['verification', 'claims', 'evidence', 'bgv', 'background', 'overemployment', 'moonlighting', 'fake', 'deepfake', 'impersonation']},
  {name: 'rubric', ground: 'lilac', draw: rubric, topics: ['rubric', 'criteria', 'scorecard', 'structured']},
  {name: 'shortlist', ground: 'violet', draw: shortlist, topics: ['shortlist', 'ranking', 'ranked', 'signals', 'match score']},
  {name: 'calibration', ground: 'brass', draw: calibration, topics: ['calibration', 'consistency', 'agreement']},
  {name: 'fairness', ground: 'deep', draw: fairness, topics: ['fairness', 'bias', 'equity', 'same standard', 'inclusion']},
  {name: 'interview', ground: 'lilac', draw: interview, topics: ['interview', 'conversation', 'screen call']},
  {name: 'questions', ground: 'violet', draw: questions, topics: ['questions', 'prompts', 'script']},
  {name: 'panel', ground: 'brass', draw: panel, topics: ['panel', 'hiring team', 'committee', 'debrief']},
  {name: 'notes', ground: 'deep', draw: notes, topics: ['notes', 'transcript', 'record', 'writing']},
  {name: 'scheduling', ground: 'lilac', draw: scheduling, topics: ['scheduling', 'calendar', 'slots', 'availability']},
  {name: 'speed', ground: 'violet', draw: speed, topics: ['speed', 'time to hire', 'faster', 'delay']},
  {name: 'compensation', ground: 'brass', draw: compensation, topics: ['compensation', 'salary', 'cost', 'budget', 'pricing', 'roi']},
  {name: 'judgment', ground: 'deep', draw: judgment, topics: ['judgment', 'decision', 'call', 'discretion']},
  {name: 'offer', ground: 'lilac', draw: offer, topics: ['offer', 'accepted', 'closing', 'hired']},
  {name: 'declined', ground: 'violet', draw: declined, topics: ['rejection', 'rejected', 'declined', 'dropout', 'ghosting']},
  {name: 'onboarding', ground: 'brass', draw: onboarding, topics: ['onboarding', 'first day', 'induction', 'new hire']},
  {name: 'referral', ground: 'deep', draw: referral, topics: ['referral', 'network', 'recommendation', 'boomerang', 'alumni', 'rehire']},
  {name: 'privacy', ground: 'lilac', draw: privacy, topics: ['privacy', 'security', 'data', 'consent', 'transparency', 'law', 'regulation', 'compliance']},
  {name: 'timeline', ground: 'violet', draw: timeline, topics: ['timeline', 'career', 'history', 'trajectory']},
  {name: 'skills', ground: 'brass', draw: skills, topics: ['skills', 'competency', 'capability', 'keywords']},
  {name: 'credentials', ground: 'deep', draw: credentials, topics: ['credentials', 'education', 'degree', 'certificate']},
  {name: 'bots', ground: 'lilac', draw: bots, topics: ['ai', 'bots', 'cheating', 'integrity', 'llm', 'machines', 'arms race']},
  {name: 'reasoning', ground: 'violet', draw: reasoning, topics: ['reasoning', 'explainability', 'why', 'evidence trail']},
  {name: 'human-in-loop', ground: 'brass', draw: humanInLoop, topics: ['human', 'oversight', 'auto-reject', 'accountability']},
]
