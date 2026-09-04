/**
 * The drawing kit every AgentR blog illustration is built from.
 *
 * Motifs never talk to roughjs directly — they compose the helpers below. That is
 * what keeps a drawing made six months from now in the same hand as the first
 * one: stroke weights, fills, roughness and the palette live here and nowhere
 * else. See .github/ILLUSTRATION-GUIDE.md for the rules and how to add a motif.
 */
import rough from 'roughjs'

export const S = 720 // every illustration is square

export const PALETTE = {
  paper: '#F5F2EC',
  card: '#FFFEFA',
  ink: '#171425',
  violet: '#5438CC',
  brass: '#A8823B',
  brassTint: '#F3ECDB',
  violetTint: '#ECE8FB',
}

/**
 * Grounds are the brand inks mixed toward paper until they share one lightness
 * (~172). Equal weight matters because these sit next to each other: an
 * un-normalised set reads as a jumble, with the brass looking bleached beside a
 * deep violet. Add a ground only if you normalise it the same way.
 */
export const GROUNDS = {
  violet: '#b2a5df',
  brass: '#c4aa7a',
  deep: '#b1a7cd',
  lilac: '#b3a4ea',
}

const gen = rough.generator()

/* ---------------------------------------------------------------- pens ---- */
/** The house hand. Roughness and bowing are fixed so nothing drifts loose. */
const HAND = {roughness: 1.3, bowing: 1.1}

export const ink = (seed, strokeWidth = 3.2) => ({
  ...HAND,
  seed,
  stroke: PALETTE.ink,
  strokeWidth,
})

/** Thin stroke, for the ruled lines that stand in for text. */
export const hair = (seed, strokeWidth = 2.4) => ink(seed, strokeWidth)

/** A solid shape in paper white: the default for anything that is "a thing". */
export const solid = (seed, fill = PALETTE.paper, strokeWidth = 3.2) => ({
  ...ink(seed, strokeWidth),
  fill,
  fillStyle: 'solid',
})

/**
 * Hatched fill. This is where detail comes from: shading reads as drawn, where
 * another flat shape would just read as another flat shape. Use it on the one
 * element the drawing is actually about.
 */
export const hatch = (seed, fill = PALETTE.violet, strokeWidth = 3.2) => ({
  ...ink(seed, strokeWidth),
  fill,
  fillStyle: 'hachure',
  hachureGap: 7,
  fillWeight: 1.7,
  hachureAngle: -41,
})

/* ------------------------------------------------------------- emitting --- */
function emit(drawable) {
  return gen
    .toPaths(drawable)
    .map(
      (p) =>
        `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth || 0}"` +
        ` fill="${p.fill || 'none'}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('')
}

/* --------------------------------------------------------------- shapes --- */
export const rect = (x, y, w, h, opts) => emit(gen.rectangle(x, y, w, h, opts))
export const line = (x1, y1, x2, y2, opts) => emit(gen.line(x1, y1, x2, y2, opts))
export const circle = (cx, cy, d, opts) => emit(gen.circle(cx, cy, d, opts))
export const ellipse = (cx, cy, w, h, opts) => emit(gen.ellipse(cx, cy, w, h, opts))
export const poly = (pts, opts) => emit(gen.polygon(pts, opts))
export const path = (d, opts) => emit(gen.path(d, opts))

/* ------------------------------------------------------------ compounds --- */

/** A sheet of paper with ruled lines standing in for text. The core object. */
export function page(x, y, w, h, seed, {lines = 4, fill = PALETTE.paper, head = false} = {}) {
  const out = [rect(x, y, w, h, solid(seed, fill))]
  let top = y + 34
  if (head) {
    // a heavier block at the top reads as a name or a heading
    out.push(rect(x + 26, top, w * 0.46, 16, solid(seed + 1, PALETTE.ink, 0)))
    top += 44
  }
  const gap = Math.min(38, (h - (top - y) - 26) / Math.max(1, lines))
  for (let i = 0; i < lines; i++) {
    const short = i === lines - 1
    out.push(line(x + 26, top + i * gap, x + w - (short ? 74 : 26), top + i * gap, hair(seed + 10 + i)))
  }
  return out.join('')
}

/** A hand-drawn tick. Two strokes, because one curve reads as a glyph. */
export function tick(x, y, size, seed, color = PALETTE.ink) {
  const o = {...ink(seed, 4.6), stroke: color}
  return line(x, y, x + size * 0.36, y + size * 0.36, o) + line(x + size * 0.36, y + size * 0.36, x + size, y - size * 0.42, o)
}

/** A cross, for the thing that did not pass. */
export function cross(x, y, size, seed, color = PALETTE.ink) {
  const o = {...ink(seed, 4.2), stroke: color}
  return line(x, y, x + size, y + size, o) + line(x + size, y, x, y + size, o)
}

/** A scribbled ring around something, the way you would circle it in pen. */
export function ringMark(cx, cy, d, seed, color = PALETTE.brass) {
  return circle(cx, cy, d, {...ink(seed, 3.4), stroke: color, roughness: 2.1})
}

/** A drawn arrow. */
export function arrow(x1, y1, x2, y2, seed, color = PALETTE.ink) {
  const o = {...ink(seed, 3.2), stroke: color}
  const a = Math.atan2(y2 - y1, x2 - x1)
  const h = 20
  return (
    line(x1, y1, x2, y2, o) +
    line(x2, y2, x2 - h * Math.cos(a - 0.42), y2 - h * Math.sin(a - 0.42), o) +
    line(x2, y2, x2 - h * Math.cos(a + 0.42), y2 - h * Math.sin(a + 0.42), o)
  )
}

/** A scatter of small circles: applicants, claims, candidates. */
export function crowd(points, seed, d = 30, opts) {
  return points.map(([cx, cy], i) => circle(cx, cy, d, opts || ink(seed + i * 3, 2.6))).join('')
}

/* --------------------------------------------------------------- scene ---- */

/**
 * Wrap a drawing in its ground. Nothing else sets the canvas, so every
 * illustration is the same size and every ground comes from the same set.
 */
export function scene(ground, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <rect width="${S}" height="${S}" fill="${ground}"/>
  ${body}
</svg>`
}
