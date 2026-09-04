# AgentR blog illustrations — how to draw a new one

Blog posts are illustrated from a small library of hand-drawn motifs. They are
**generated from code**, not painted by hand, so a drawing made a year from now
lands in the same hand as the first one. This document is the instruction set. A
person or an agent should be able to add a motif from this page alone.

- **Kit** (the primitives): `scripts/lib/art-kit.mjs`
- **Library** (the motifs): `scripts/art-motifs.mjs`
- **Generator**: `npm run make-art` → writes `assets/blog-art/*.svg`

The shipping site build never runs any of this. It reads the committed SVGs as
ordinary files, so `roughjs` stays a dev dependency.

---

## The look, in one paragraph

A single object from the hiring world, drawn in sketchy ink on a flat
brand-tinted square, filled paper white. **Nothing else** — no shading, no
coloured marks, no gradients. It should look like something a thoughtful person
drew in a notebook while explaining an idea: not an icon, not a diagram, not a
scene. The calm is the point. These sit beside a headline and must never compete
with it.

> An earlier pass added hatched shading and brass annotations to "add detail".
> It made the set busy and it fought the text. Restraint is the house style;
> if a drawing feels thin, simplify the idea rather than decorating it.

---

## Fixed constraints — never vary these

| | Value | Why |
|---|---|---|
| Canvas | 720 × 720, square | The panel beside the blog list is square |
| Roughness / bowing | `1.3` / `1.1` | The single biggest driver of "same hand". Set in the kit; do not override |
| Stroke | `#171425` (ink) | Everything is drawn in ink. Colour lives in fills and marks |
| Main stroke weight | `3.2` | `hair()` at `2.4` for ruled lines only |
| Object fill | `#F5F2EC` (paper) | Objects are paper on a coloured ground |
| Shading | none | Deliberately: there is no shading helper |
| Second colour | none | Ink outline, paper fill, coloured ground. That is all |
| Grounds | The four in `GROUNDS` | All normalised to lightness ~172 |

**Do not add a ground colour without normalising it.** The four grounds are the
brand inks mixed toward paper until they share one lightness. An un-normalised
ground makes its drawing look heavier or more bleached than every neighbour, and
these sit side by side. Mix the ink toward the paper by
`t = (172 − L(ink)) / (L(paper) − L(ink))`, where `L` is Rec. 709 luma
(`0.2126R + 0.7152G + 0.0722B`). `npm run check-art` fails if the four grounds
drift more than 8 apart.

---

## Composition rules

1. **One subject.** A page, a stack, a funnel, a grid. If you need two objects,
   one is clearly primary and the other supports it.
2. **Fill the middle, leave the edges.** Keep the drawing roughly within
   `x, y ∈ [110, 610]`. It gets cropped to a card and to 16:9 on a post banner.
3. **Paper fill and ink outline only.** `solid()` for objects, `ink()`/`hair()`
   for lines. There is deliberately no shading helper and no brass pen: an
   earlier pass added both, it made the set busy, and they were removed rather
   than left in the kit as a temptation.
4. **Ruled lines stand in for text.** Never draw letterforms — no real text ever
   appears in an illustration. The headline sits next to it on the page already.
5. **Two depths**: ground, object. A `tick()`, `cross()` or `arrow()` in ink is
   allowed when it carries meaning, never as decoration.
6. **Seeds are arithmetic on the motif seed** (`s`, `s + 1`, `s + 20`). Reusing
   one seed for two shapes makes them wobble identically, which reads as
   copy-paste rather than a drawing.

### What to avoid

- Gradients, shadows, opacity tricks — the style is flat ink on flat ground
- Any second fill colour, or shading of any kind
- Perspective or 3D
- Faces or figures, except the deliberate hand in `judgment`
- Anything that needs a caption to be understood

---

## The kit

```js
import {
  PALETTE, GROUNDS, scene,          // palette + canvas
  ink, hair, solid,                 // pens
  rect, line, circle, ellipse, poly, path,   // shapes
  page, tick, cross, arrow, crowd,           // compounds
} from './lib/art-kit.mjs'
```

**Pens** take a seed and return options you pass to a shape:

| Pen | Use |
|---|---|
| `ink(seed, w = 3.2)` | Outlines, structure |
| `hair(seed, w = 2.4)` | Ruled lines, grid rules |
| `solid(seed, fill = paper)` | A thing: outlined and filled |

**Compounds** are shortcuts for things drawn often:

| Helper | Draws |
|---|---|
| `page(x, y, w, h, seed, {lines, head})` | A sheet with ruled text; `head: true` adds a heading block |
| `tick(x, y, size, seed, colour)` | A two-stroke tick |
| `cross(x, y, size, seed, colour)` | A cross |
| `arrow(x1, y1, x2, y2, seed, colour)` | A drawn arrow with a head |
| `crowd(points, seed, d)` | A scatter of small circles — applicants, claims |

---

## Adding a motif

1. Open `scripts/art-motifs.mjs`.
2. Write a function taking a seed and returning SVG:

```js
/** One line saying what the idea is, not what the shapes are. */
function escalation(s) {
  return [
    page(190, 170, 240, 310, s, {lines: 4, head: true}),
    rect(392, 250, 196, 180, solid(s + 20)),   // the second object, same paper
    arrow(400, 520, 470, 448, s + 30),         // ink, and only because it means something
  ].join('')
}
```

3. Register it, with the words a post might match on:

```js
{name: 'escalation', ground: 'lilac', draw: escalation,
 topics: ['escalation', 'review', 'appeal']},
```

4. `npm run make-art`, then look at `_designpreview/art/` before committing.

Rotate the `ground` so neighbours in the list differ. Keep `topics` specific —
adding a word to an existing motif beats adding a near-duplicate drawing.

---

## How a post gets its picture

The build matches, in order:

1. The post's **own banner image** in Sanity, if it has one — always wins
2. Its **title** against each motif's `topics`
3. Its **category**
4. Its **slug**
5. Failing all that, a **stable pick from the slug hash**, so a post always gets
   the same drawing and never changes under a reader

**Title before category**, deliberately. A category is a browsing bucket — six
of them cover a whole blog — so matching on it first handed the same drawing to
every post in the bucket: 9 distinct across 27 posts, against 19 from titles.
The title is also the one field an agent publishing through the MCP always sets,
since categories are references whose ids it has to look up.

Two consequences worth knowing:

- **Editing a title can change a post's picture.** Shortening one during the
  import removed the word its match relied on, and it silently fell to the hash.
  The build now prints any post that falls through, so it is caught rather than
  shipped.
- **A topic word must name a subject, not the domain.** "hiring", "candidate"
  and "ai" are in most titles on this blog; adding them to a motif makes it
  swallow a third of the archive. Matching is whole-word and lightly stemmed, so
  "Interviews" finds `interview`, but `ai` will never match inside "raised".

Order matters within `MOTIFS`: the first match wins, so a specific motif has to
sit above a general one. That is why `cheating` and `fraud` precede `interview`.

---

## The validator

A blog image is the most visible thing on the page, so conformance is enforced
rather than trusted:

```bash
npm run check-art     # also runs as part of `npm test`
```

It fails on: a canvas that is the wrong size, **any colour not in the palette**,
a ground that is not one of the four, grounds that have drifted apart in
lightness, any text in a drawing, a drawing that strays outside the safe area a
card crop leaves behind, a motif missing one of its three files, a manifest that
disagrees with the files on disk, two motifs claiming the same topic word, or a
library that has shrunk below 24 motifs.

It is not decorative. On its first run it caught the `judgment` hand extending to
x=648 — which a 3:2 card crop would have sliced the fingers off.

## Checking your work

Look at a new drawing three ways before committing it:

- **In the contact sheet** (`_designpreview/art/`) beside the others — does it
  belong to the same family?
- **At card size**, about 300px — is it still legible, or does the detail mush?
- **Cropped to 16:9**, which is what a post banner does — does the subject
  survive losing the top and bottom?

If it fails the third, move the drawing toward the vertical centre.
