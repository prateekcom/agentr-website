import {readFileSync} from 'node:fs'
import {esc, SITE} from './render.mjs'

/**
 * Candidate source pages, all one level deep. The first that parses wins.
 *
 * Chrome is read from a page that already ships rather than kept as a second
 * copy here, so editing the menu updates the blog on the next build. Taking a
 * list rather than one filename matters: an earlier version read the two-deep
 * chrome from views/when-everyone-is-using-bots/, the only two-deep page on the
 * site, so deleting one article would have stopped the blog building. Depth is
 * now derived with chromeAtDepth() instead, and any of these pages will do.
 */
const SOURCES = [
  'about/index.html',
  'pricing/index.html',
  'contact/index.html',
  'for-candidates/index.html',
  'platform-security/index.html',
]

function between(html, startRe, endMarker, what, file) {
  const start = html.search(startRe)
  if (start === -1) throw new Error(`Could not find ${what} in ${file}`)
  const end = html.indexOf(endMarker, start)
  if (end === -1) throw new Error(`Could not find the end of ${what} in ${file}`)
  return html.slice(start, end + endMarker.length)
}

/**
 * Read the one-level-deep chrome. Every other depth is derived from it with
 * chromeAtDepth(), so there is exactly one page the blog depends on and four
 * spares behind it.
 */
export function loadChrome() {
  const problems = []
  for (const candidate of SOURCES) {
    try {
      return extractChrome(candidate)
    } catch (err) {
      problems.push(`  ${candidate}: ${err.message}`)
    }
  }
  throw new Error(
    'Could not read the site chrome from any source page. Tried:\n' +
      problems.join('\n') +
      '\nEdit SOURCES in scripts/lib/template.mjs if these pages moved.',
  )
}

function extractChrome(file) {
  const html = readFileSync(file, 'utf8')

  const gtmHead = between(html, /<!-- Google Tag Manager/, '<!-- End Google Tag Manager -->', 'the GTM head snippet', file)
  const gtmBody = between(html, /<!-- Google Tag Manager \(noscript\)/, '<!-- End Google Tag Manager (noscript) -->', 'the GTM noscript snippet', file)
  const nav = between(html, /<nav>/, '</nav>', 'the nav', file)
  const footer = between(html, /<footer>/, '</footer>', 'the footer', file)

  // The mobile menu is a run of sibling divs with no single wrapper, so take
  // everything the source page puts between the nav and <main>.
  const afterNav = html.indexOf('</nav>') + '</nav>'.length
  const mainAt = html.indexOf('<main>')
  if (mainAt === -1 || mainAt < afterNav) throw new Error(`Could not locate <main> in ${file}`)
  const mobileMenu = html.slice(afterNav, mainAt).trim()

  // Shared <head> furniture: favicons, manifest, theme colour, the scroll-restore
  // script, font preconnects and the stylesheet. Page-specific tags are stripped
  // and rebuilt per page below.
  const head = between(html, /<meta charset=/, '</head>', 'the <head>', file).replace('</head>', '')
  const shared = head
    .replace(/<title>[\s\S]*?<\/title>\s*/g, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/g, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/g, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/g, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/g, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '')
    .trim()

  return {gtmHead, gtmBody, nav, mobileMenu, footer, sharedHead: shared, prefix: '../', source: file}
}

/**
 * Re-point a chrome's relative links for a page at another depth. Paginated and
 * topic listings sit deeper than /blog/, and every link in the nav, footer and
 * head is relative. The shallow chrome is exactly one level up, so its `../`
 * prefixes are rewritten to as many levels as the target page needs. Absolute
 * URLs contain no `="../` and are left alone.
 */
export function chromeAtDepth(shallow, depth) {
  if (depth === 1) return shallow
  const prefix = '../'.repeat(depth)
  const repoint = (html) => html.split('="../').join(`="${prefix}`)
  return {
    ...shallow,
    nav: repoint(shallow.nav),
    mobileMenu: repoint(shallow.mobileMenu),
    footer: repoint(shallow.footer),
    sharedHead: repoint(shallow.sharedHead),
    prefix,
  }
}

/** Page-specific <head> tags: the bits that differ per URL. */
function metaTags({url, title, description, image, imageAlt, type, publishedAt, modifiedAt, authorName, noIndex, prevUrl, nextUrl}) {
  const lines = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    noIndex ? '<meta name="robots" content="noindex, follow" />' : '',
    `<link rel="canonical" href="${esc(url)}" />`,
    // Tells a crawler that a paginated listing is one sequence rather than a set
    // of near-duplicate pages competing with each other.
    prevUrl ? `<link rel="prev" href="${esc(prevUrl)}" />` : '',
    nextUrl ? `<link rel="next" href="${esc(nextUrl)}" />` : '',
    `<meta property="og:url" content="${esc(url)}" />`,
    '<meta property="og:site_name" content="AgentR" />',
    '<meta property="og:locale" content="en" />',
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${esc(imageAlt)}" />`,
    publishedAt ? `<meta property="article:published_time" content="${esc(publishedAt)}" />` : '',
    modifiedAt ? `<meta property="article:modified_time" content="${esc(modifiedAt)}" />` : '',
    authorName ? `<meta property="article:author" content="${esc(authorName)}" />` : '',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ]
  return lines.filter(Boolean).join('\n')
}

export function page({chrome, meta, jsonLd, body}) {
  const ld = jsonLd ? `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>` : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
${chrome.gtmHead}
${chrome.sharedHead}
${metaTags(meta)}
${ld}
</head>
<body>
${chrome.gtmBody}
${chrome.nav}
${chrome.mobileMenu}
<main>
${body}
</main>
${chrome.footer}
<script src="${chrome.prefix}assets/site.js"></script>
</body>
</html>
`
}

export {SITE}
