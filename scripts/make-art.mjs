#!/usr/bin/env node
/**
 * DEV-ONLY. Draws the illustration library into assets/blog-art/.
 *
 * Two outputs per motif:
 *   <name>.svg      the page uses this — a few KB, sharp at any size
 *   <name>-og.jpg   1200x630, because Facebook, LinkedIn and X will not render
 *                   an SVG as a share image
 *
 * The shipping build runs neither roughjs nor a rasteriser; it reads the files.
 *
 *   npm run make-art
 */
import {mkdirSync, writeFileSync, rmSync, existsSync} from 'node:fs'
import {Resvg} from '@resvg/resvg-js'
import sharp from 'sharp'
import {GROUNDS, S, scene} from './lib/art-kit.mjs'
import {MOTIFS} from './art-motifs.mjs'

const OUT = 'assets/blog-art'
const OG_W = 1200
const OG_H = 630

/** The square drawing, centred on a 1200x630 ground for social. */
function wide(ground, body) {
  const scale = OG_H / S
  const dx = (OG_W - S * scale) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}">
  <rect width="${OG_W}" height="${OG_H}" fill="${ground}"/>
  <g transform="translate(${dx},0) scale(${scale})">${body}</g>
</svg>`
}

if (existsSync(OUT)) rmSync(OUT, {recursive: true, force: true})
mkdirSync(OUT, {recursive: true})

let bytes = 0
// The site build must not import roughjs, so the topic mapping is handed over as
// data rather than code.
const manifest = []
for (const [i, m] of MOTIFS.entries()) {
  const ground = GROUNDS[m.ground]
  const body = m.draw(20 + i * 13)

  const svg = scene(ground, body)
  writeFileSync(`${OUT}/${m.name}.svg`, svg)

  // A square drawing makes a very tall banner, so the post banner gets its own
  // 1200x630 vector rather than being cropped hard by CSS.
  const wideSvg = wide(ground, body)
  writeFileSync(`${OUT}/${m.name}-wide.svg`, wideSvg)

  const png = new Resvg(wideSvg, {fitTo: {mode: 'width', value: OG_W}}).render().asPng()
  const jpg = await sharp(png).jpeg({quality: 84, mozjpeg: true}).toBuffer()
  writeFileSync(`${OUT}/${m.name}-og.jpg`, jpg)

  bytes += Buffer.byteLength(svg) + Buffer.byteLength(wideSvg) + jpg.length
  manifest.push({name: m.name, ground: m.ground, topics: m.topics})
  console.log(
    `  ${m.name.padEnd(14)} ${m.ground.padEnd(7)} ` +
      `${(Buffer.byteLength(svg) / 1024).toFixed(1)}KB svg / ${(jpg.length / 1024).toFixed(0)}KB og`,
  )
}

writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n')
console.log(`\n${MOTIFS.length} illustrations, ${(bytes / 1024).toFixed(0)}KB total, in ${OUT}/`)
console.log('manifest.json written — the site build reads topic mapping from it')
