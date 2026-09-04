#!/usr/bin/env node
/**
 * Guards the illustration set. A blog image is the most visible thing on the
 * page, so "it looked fine when I drew it" is not a good enough guarantee — this
 * fails loudly on anything that has drifted out of the theme.
 *
 *   npm run check-art        (also runs as part of `npm test`)
 *
 * Checks, per file:
 *   - the canvas is exactly the expected size
 *   - every colour used is in the palette; nothing invented
 *   - the ground is one of the four normalised grounds
 *   - the grounds are still within a tight lightness band of each other
 *   - no text: illustrations never carry words
 *   - the drawing stays inside the safe area a card crop leaves behind
 * And across the set:
 *   - every motif produced all three of its files
 *   - the manifest matches what is on disk
 *   - no two motifs claim the same topic word, which would make matching
 *     depend on array order rather than meaning
 */
import {readFileSync, readdirSync, existsSync} from 'node:fs'
import {GROUNDS, PALETTE, S} from './lib/art-kit.mjs'

const DIR = 'assets/blog-art'
const WIDE = {w: 1200, h: 630}
const SAFE = {min: 130, max: 590} // a 3:2 card crop of a square eats the sides

const allowed = new Set(
  [...Object.values(PALETTE), ...Object.values(GROUNDS), 'none', 'transparent'].map((c) =>
    c.toLowerCase(),
  ),
)

const luma = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

let failures = 0
const fail = (msg) => {
  console.log(`FAIL ${msg}`)
  failures++
}
const ok = (msg) => console.log(`ok   ${msg}`)

if (!existsSync(DIR)) {
  console.log(`FAIL ${DIR} does not exist — run \`npm run make-art\``)
  process.exit(1)
}

/* ------------------------------------------------------------- the grounds -- */
const groundL = Object.entries(GROUNDS).map(([name, hex]) => ({name, hex, L: luma(hex)}))
const spread = Math.max(...groundL.map((g) => g.L)) - Math.min(...groundL.map((g) => g.L))
if (spread > 8) {
  fail(`grounds vary by ${spread.toFixed(1)} in lightness — normalise them (see the guide)`)
} else {
  ok(`grounds share one lightness band (spread ${spread.toFixed(1)})`)
}

/* --------------------------------------------------------------- the files -- */
const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8'))
const onDisk = readdirSync(DIR)

for (const entry of manifest) {
  for (const suffix of ['.svg', '-wide.svg', '-og.jpg']) {
    if (!onDisk.includes(entry.name + suffix)) fail(`${entry.name}: missing ${suffix}`)
  }
}

const svgs = onDisk.filter((f) => f.endsWith('.svg'))
if (svgs.length !== manifest.length * 2) {
  fail(`${svgs.length} svg files for ${manifest.length} motifs — expected ${manifest.length * 2}`)
}

for (const file of svgs) {
  const svg = readFileSync(`${DIR}/${file}`, 'utf8')
  const wide = file.endsWith('-wide.svg')
  const want = wide ? WIDE : {w: S, h: S}

  const dims = svg.match(/width="(\d+)" height="(\d+)"/)
  if (!dims || +dims[1] !== want.w || +dims[2] !== want.h) {
    fail(`${file}: canvas is ${dims ? dims[1] + 'x' + dims[2] : '?'}, expected ${want.w}x${want.h}`)
  }

  // Every colour, from both fills and strokes.
  const colours = new Set(
    [...svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((m) => m[1].toLowerCase()),
  )
  for (const c of colours) {
    if (!allowed.has(c)) fail(`${file}: colour ${c} is not in the palette`)
  }

  // The ground is the first rect, and must be a known ground.
  const ground = svg.match(/<rect width="\d+" height="\d+" fill="([^"]+)"/)
  if (!ground || !Object.values(GROUNDS).includes(ground[1].toLowerCase())) {
    fail(`${file}: ground ${ground ? ground[1] : '?'} is not one of the four grounds`)
  }

  if (/<text|<tspan|font-family/i.test(svg)) {
    fail(`${file}: contains text — illustrations never carry words`)
  }

  // Safe area, checked on the square only: the wide variant letterboxes rather
  // than cropping, so it cannot lose anything.
  if (!wide) {
    const xs = []
    for (const m of svg.matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)) {
      xs.push(parseFloat(m[1]))
    }
    if (xs.length) {
      const lo = Math.min(...xs)
      const hi = Math.max(...xs)
      if (lo < SAFE.min - 25 || hi > SAFE.max + 25) {
        fail(`${file}: drawing spans x ${lo.toFixed(0)}–${hi.toFixed(0)}, outside the safe area ${SAFE.min}–${SAFE.max}`)
      }
    }
  }
}
if (!failures) ok(`${svgs.length} svg files: canvas, palette, ground, no-text, safe area`)

/* -------------------------------------------------------------- the topics -- */
const seen = new Map()
for (const m of manifest) {
  for (const t of m.topics) {
    if (seen.has(t)) fail(`topic "${t}" is claimed by both ${seen.get(t)} and ${m.name}`)
    else seen.set(t, m.name)
  }
}
if (manifest.length < 24) fail(`only ${manifest.length} motifs — the library should cover at least 24`)

if (!failures) {
  ok(`${manifest.length} motifs, ${seen.size} topic words, none claimed twice`)
  console.log('\nart is on-theme')
} else {
  console.log(`\n${failures} FAILED`)
}
process.exit(failures ? 1 : 0)
