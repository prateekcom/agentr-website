import {readFileSync} from 'node:fs'
import {toHTML} from '@portabletext/to-html'
import {createImageUrlBuilder} from '@sanity/image-url'

export const SITE = 'https://agentr.global'

/**
 * Turn escaped HTML back into plain text. Heading labels for the contents rail
 * are read out of already-rendered markup, so without this the `&quot;` in a
 * heading gets escaped a second time and the rail displays it literally.
 */
export function unesc(value) {
  return String(value ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    // Ampersand last: doing it first would let "&amp;lt;" decode twice.
    .replace(/&amp;/g, '&')
}

/** Escape for HTML text nodes and double-quoted attribute values. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function makeImageBuilder(client) {
  const builder = createImageUrlBuilder(client)
  return (source) => builder.image(source)
}

/**
 * Sanity's CDN does the resizing and format negotiation, so `auto=format` hands
 * WebP/AVIF to browsers that accept it and JPEG to those that do not. That keeps
 * the same WebP-first behaviour the hand-written article got from a <picture>
 * element, without committing binaries to the repo.
 */
export function imageUrl(urlFor, source, {width = 1600, quality = 80} = {}) {
  return urlFor(source).width(width).quality(quality).auto('format').fit('max').url()
}

/**
 * Posts with no image of their own are illustrated from the drawn library in
 * assets/blog-art/ (see .github/ILLUSTRATION-GUIDE.md). The mapping arrives as
 * data, not code, so this build never imports roughjs.
 */
export function loadArtManifest() {
  try {
    return JSON.parse(readFileSync('assets/blog-art/manifest.json', 'utf8'))
  } catch {
    // Art is optional: a checkout that has not run `npm run make-art` should
    // still build, just without illustrations.
    return []
  }
}

/** The drawing for a post. See matchArt for how it is chosen. */
export function artFor(post, manifest) {
  return matchArt(post, manifest).name
}

/**
 * Fold a word to a crude singular, so a "Candidates" category finds the
 * `candidate` topic and a slug saying "roles" finds `role`. Requiring topic
 * authors to list both forms of every word is exactly the kind of bookkeeping
 * that gets forgotten, and the failure is silent — a post quietly gets an
 * arbitrary drawing.
 *
 * Deliberately crude. Both sides are folded the same way, so even a wrong stem
 * ("bias" -> "bia") still matches itself. "ss" is left alone so "process" does
 * not become "proces".
 */
function stem(word) {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y'
  // "es" only where English actually adds it — after s, x, z, ch, sh. Stripping
  // it everywhere turned "candidates" into "candidat", which then failed to find
  // the "candidate" topic at all.
  if (word.length > 4 && /(?:s|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

/** Split any text into folded lowercase words, so slugs and titles compare alike. */
const words = (value) =>
  String(value ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(stem)

/**
 * Whole-word matching, not substring.
 *
 * Substring matching looked fine until it didn't: the slug "we-raised-a-round"
 * contains "ai", so an Announcements post was illustrated with the bots drawing.
 * Comparing word runs also lets a multi-word topic like "time to hire" match the
 * slug "time-to-hire-is-a-lie", which substring matching never could, since the
 * slug separates with hyphens and the topic with spaces.
 */
function hasTopic(hay, topic) {
  const needle = words(topic)
  if (!needle.length) return false
  for (let i = 0; i + needle.length <= hay.length; i++) {
    let hit = true
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) {
        hit = false
        break
      }
    }
    if (hit) return true
  }
  return false
}

/**
 * Category, then title, then slug, then a stable hash — reporting which, so the
 * build can name the posts nothing actually claimed. The hash matters: without it
 * a post with no matching topic would get a different drawing every time the
 * library grew, changing under readers who had already seen it.
 */
export function matchArt(post, manifest) {
  if (!manifest.length) return {name: null, how: 'none'}
  const slug = String(post.slug || '')
  const slugWords = words(slug)
  const catWords = (post.categories || []).flatMap((c) => [
    ...words(c?.title),
    ...words(c?.slug),
  ])

  // Title first. A category is a browsing bucket — six of them cover a whole
  // blog — so matching on it hands the same drawing to every post in the bucket:
  // on the real archive that was 9 distinct drawings across 27 posts, against 12
  // from the titles. The title is the most specific description a post has, and
  // it is also the one field an agent publishing through the MCP always sets,
  // since categories are references whose ids it has to look up.
  const byTitle = manifest.find((m) => m.topics.some((t) => hasTopic(words(post.title), t)))
  if (byTitle) return {name: byTitle.name, how: 'title'}

  const byCategory = manifest.find((m) => m.topics.some((t) => hasTopic(catWords, t)))
  if (byCategory) return {name: byCategory.name, how: 'category'}

  const bySlug = manifest.find((m) => m.topics.some((t) => hasTopic(slugWords, t)))
  if (bySlug) return {name: bySlug.name, how: 'slug'}

  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  return {name: manifest[hash % manifest.length].name, how: 'hash'}
}

export const ART_SQUARE = 720
export const ART_WIDE_W = 1200
export const ART_WIDE_H = 630

/** Card thumbnails, cropped to one shape so a listing of mixed images stays even. */
export const CARD_W = 760
export const CARD_H = 507 // 3:2

/**
 * `fit=crop` on a source that carries a hotspot crops around it, so the editor
 * decides what survives the crop by dragging the hotspot in the Studio rather
 * than the build guessing at the centre.
 */
export function cardImageUrl(urlFor, source, {quality = 80} = {}) {
  return urlFor(source)
    .width(CARD_W)
    .height(CARD_H)
    .quality(quality)
    .auto('format')
    .fit('crop')
    .url()
}

/**
 * An editor cropping an image in the Studio does not change the asset, so
 * `metadata.dimensions` still reports the original. The delivered file is the
 * crop, and using the original's aspect ratio for width/height makes the browser
 * reserve the wrong space — the page jumps as the image loads. Resolve the crop
 * to the shape actually served.
 */
export function effectiveDims(dims, crop) {
  if (!dims || !dims.width || !dims.height) return null
  if (!crop) return {width: dims.width, height: dims.height}
  const width = Math.round(dims.width * (1 - (crop.left || 0) - (crop.right || 0)))
  const height = Math.round(dims.height * (1 - (crop.top || 0) - (crop.bottom || 0)))
  return width > 0 && height > 0 ? {width, height} : {width: dims.width, height: dims.height}
}

/**
 * The width/height attributes must describe the file actually served, not the
 * original upload. A 12752px-wide original delivered at 1600px would otherwise
 * advertise itself as 12752px. `fit=max` never enlarges, so an original smaller
 * than the target is served unchanged.
 */
export function scaleDims(dims, targetWidth) {
  if (!dims || !dims.width || !dims.height) return null
  if (dims.width <= targetWidth) return {width: dims.width, height: dims.height}
  return {
    width: targetWidth,
    height: Math.round((dims.height * targetWidth) / dims.width),
  }
}

/** Approximate reading time, matching the "N min read" byline on the existing article. */
export function readingTime(blocks) {
  const words = plainText(blocks).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 225))
}

/** Flatten Portable Text to plain prose, for word counts and fallback descriptions. */
export function plainText(blocks) {
  if (!Array.isArray(blocks)) return ''
  return blocks
    .filter((b) => b?._type === 'block' && Array.isArray(b.children))
    .map((b) => b.children.map((c) => c?.text ?? '').join(''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Portable Text -> the exact markup the site's `.prose.article` styles already
 * target. Anything not represented here cannot be produced by the schema, so a
 * writer cannot generate unstyled output.
 */
export function bodyToHtml(blocks, urlFor) {
  // A writer pressing Enter twice leaves an empty text block behind. Rendering it
  // emits <p></p>, which the stylesheet still gives a margin, so the article ends
  // up with unexplained gaps. Images and callouts carry no text and must survive.
  const cleaned = (blocks ?? []).filter((block) => {
    if (block?._type !== 'block') return true
    return (block.children ?? []).some((child) => (child?.text ?? '').trim() !== '')
  })

  return toHTML(cleaned, {
    components: {
      block: {
        normal: ({children}) => `<p>${children}</p>`,
        h2: ({children}) => `<h2>${children}</h2>`,
        h3: ({children}) => `<h3>${children}</h3>`,
        blockquote: ({children}) => `<blockquote>${children}</blockquote>`,
        // Posts written as markdown and converted elsewhere arrive with heading
        // levels the Studio never offers. Left alone they render as real <h1>
        // and <h4> tags: the <h1> is a second top-level heading on a page whose
        // title is already one, which breaks the outline search engines read,
        // and neither is styled, because .prose only defines h2 and h3. Fold
        // them into the two levels this site actually has.
        h1: ({children}) => `<h2>${children}</h2>`,
        h4: ({children}) => `<h3>${children}</h3>`,
        h5: ({children}) => `<h3>${children}</h3>`,
        h6: ({children}) => `<h3>${children}</h3>`,
      },
      list: {
        bullet: ({children}) => `<ul>${children}</ul>`,
        number: ({children}) => `<ol>${children}</ol>`,
      },
      listItem: {
        bullet: ({children}) => `<li>${children}</li>`,
        number: ({children}) => `<li>${children}</li>`,
      },
      marks: {
        strong: ({children}) => `<strong>${children}</strong>`,
        em: ({children}) => `<em>${children}</em>`,
        code: ({children}) => `<code>${children}</code>`,
        link: ({children, value}) => {
          const href = value?.href ?? '#'
          const external = /^https?:\/\//i.test(href) && !href.startsWith(SITE)
          // rel=noopener is a security requirement on target=_blank: without it the
          // opened page gets a handle on this one through window.opener.
          const attrs = value?.newTab || external ? ' target="_blank" rel="noopener noreferrer"' : ''
          return `<a href="${esc(href)}"${attrs}>${children}</a>`
        },
      },
      types: {
        image: ({value}) => {
          if (!value?.asset) return ''
          const dims = scaleDims(effectiveDims(value.dimensions, value.crop), 1400)
          const src = imageUrl(urlFor, value, {width: 1400})
          const sizeAttrs = dims ? ` width="${dims.width}" height="${dims.height}"` : ''
          const caption = value.caption
            ? `<figcaption class="fignote">${esc(value.caption)}</figcaption>`
            : ''
          return (
            `<figure><img src="${esc(src)}" alt="${esc(value.alt ?? '')}"${sizeAttrs}` +
            ` loading="lazy" decoding="async" />${caption}</figure>`
          )
        },
        callout: ({value}) => `<blockquote>${esc(value?.text ?? '')}</blockquote>`,
      },
      hardBreak: () => '<br />',
    },
    onMissingComponent: (message, options) => {
      // Loud, because a silently dropped block means content vanishing from a
      // published page with nothing in the build output to explain it.
      throw new Error(`Unhandled Portable Text ${options.nodeType} "${options.type}": ${message}`)
    },
  })
}

/**
 * Give every <h2> an id and report the headings, so a post can carry the same
 * sticky contents rail the legal pages use. The scroll-spy in assets/site.js
 * already drives `.doc-split .toc` generically: it only needs anchors whose
 * href matches an element id, so nothing new is needed on the client.
 */
export function withHeadingAnchors(html) {
  const headings = []
  const used = new Set()

  // Sub-headings are collected too, indented under their section. A post is often
  // one big section with several sub-points, and a rail listing only the h2 would
  // be a single entry pointing at the top of the page.
  const out = html.replace(/<(h2|h3)>([\s\S]*?)<\/\1>/g, (whole, tag, inner) => {
    const text = unesc(inner.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
    if (!text) return whole

    let id = text
      .toLowerCase()
      .replace(/&[a-z]+;|&#\d+;/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
    if (!id) id = 'section'
    // Two headings with the same wording would otherwise produce one id, and the
    // second anchor would jump to the first.
    let unique = id
    let n = 2
    while (used.has(unique)) unique = `${id}-${n++}`
    used.add(unique)

    headings.push({id: unique, text, level: tag === 'h3' ? 3 : 2})
    return `<${tag} id="${unique}">${inner}</${tag}>`
  })

  return {html: out, headings}
}

/** "18 March 2025", matching the existing byline format. */
export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** YYYY-MM-DD, for <time datetime> and JSON-LD. */
export function isoDate(iso) {
  return new Date(iso).toISOString().slice(0, 10)
}
