import {chromeAtDepth, page} from './template.mjs'
import {
  CARD_H,
  CARD_W,
  SITE,
  cardImageUrl,
  esc,
  formatDate,
  artFor,
  ART_SQUARE,
  readingTime,
} from './render.mjs'

export const OUT_DIR = 'blog'
export const PER_PAGE = 9
const DEFAULT_OG = `${SITE}/assets/og-default.jpg`

/**
 * Dates read differently depending on how old they are. "3 days ago" is what a
 * reader wants for something recent; for anything older the actual date is more
 * use than counting weeks. The <time> element always carries the machine date,
 * so nothing is lost to a crawler.
 */
export function humanDate(iso, now = new Date()) {
  const then = new Date(iso)
  const days = Math.floor((now - then) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  if (days < 45) return `${Math.floor(days / 7)} weeks ago`
  return formatDate(iso)
}

function summaryOf(post) {
  return (post.seo && post.seo.metaDescription && post.seo.metaDescription.trim()) || post.lede
}

function cardImage(post, urlFor, {up, manifest}) {
  if (post.mainImage && post.mainImage.asset) {
    return (
      `<img src="${esc(cardImageUrl(urlFor, post.mainImage))}"` +
      ` alt="${esc((post.mainImage && post.mainImage.alt) || '')}"` +
      ` width="${CARD_W}" height="${CARD_H}" loading="lazy" decoding="async" />`
    )
  }
  // No image of its own: fall back to its illustration. SVG, so one file serves
  // every size and a nine-card listing stays a few KB.
  const art = artFor(post, manifest)
  if (art) {
    return (
      `<img src="${up}assets/blog-art/${art}.svg" alt=""` +
      ` width="${ART_SQUARE}" height="${ART_SQUARE}" loading="lazy" decoding="async" />`
    )
  }
  // No art library present either (nobody has run `npm run make-art`). Ship the
  // site's default card rather than a broken image path.
  return `<img src="${up}assets/og-default.jpg" alt="" width="1200" height="630" loading="lazy" decoding="async" />`
}

/** The lead piece. Marked as an editor's pick only when someone actually picked it. */
function featureCard(post, urlFor, ctx) {
  const label = post.featured ? "Editor&rsquo;s pick" : 'Latest'
  const cat = post.categories && post.categories[0]
  return (
    // The card is clipped to its own radius, so the tape that overhangs its top
    // edge has to sit on a wrapper rather than inside the link.
    `  <div class="leadcard">\n` +
    `    <span class="tape" aria-hidden="true"></span>\n` +
    `  <a class="feature" href="${ctx.postHref(post.slug)}">\n` +
    `    <div class="feature-img">${cardImage(post, urlFor, ctx)}</div>\n` +
    `    <div class="feature-body">\n` +
    `      <span class="eyebrow">${label}${cat ? ` &middot; ${esc(cat.title)}` : ''}</span>\n` +
    `      <h2>${esc(post.title)}</h2>\n` +
    `      <p>${esc(summaryOf(post))}</p>\n` +
    `      <p class="feature-meta">${esc((post.author && post.author.name) || 'AgentR')} &middot; ` +
    `<time datetime="${post.publishedAt.slice(0, 10)}">${humanDate(post.publishedAt)}</time>` +
    ` &middot; ${readingTime(post.body)} min read &nbsp;` +
    `<span class="go-arrow">&#8594;</span></p>\n` +
    `    </div>\n` +
    `  </a>\n` +
    `  </div>`
  )
}

/** One line of the index: when, what kind, what it is called. */
function indexRow(post, ctx) {
  const cat = post.categories && post.categories[0]
  const art = artFor(post, ctx.manifest)
  return (
    `      <li>` +
    `<a href="${ctx.postHref(post.slug)}"${art ? ` data-art="${esc(art)}"` : ''}>` +
    `<span class="row-date"><time datetime="${post.publishedAt.slice(0, 10)}">` +
    `${humanDate(post.publishedAt)}</time></span>` +
    `<span class="row-cat">${cat ? esc(cat.title) : ''}</span>` +
    `<span class="row-title">${esc(post.title)}</span>` +
    `</a></li>`
  )
}

/**
 * The panel that follows the list. Every drawing the list can point at is in the
 * DOM at once and cross-faded, so a first hover never waits on a fetch. Only the
 * distinct ones: several posts share a category, and so share a drawing.
 *
 * aria-hidden, because it says nothing the row it mirrors has not already said,
 * and a screen reader stepping through the list should not hear it repeated.
 */
function artPanel(posts, ctx) {
  const names = [...new Set(posts.map((p) => artFor(p, ctx.manifest)).filter(Boolean))]
  if (!names.length) return ''
  const imgs = names.map(
    (n, i) =>
      `        <img${i === 0 ? ' class="on"' : ''} data-art="${esc(n)}"` +
      ` src="${ctx.up}assets/blog-art/${esc(n)}.svg" alt=""` +
      ` width="${ART_SQUARE}" height="${ART_SQUARE}" decoding="async" />`,
  )
  return (
    `    <div class="indexart" aria-hidden="true">\n` +
    `      <div class="indexart-in">\n` +
    imgs.join('\n') +
    `\n      </div>\n` +
    `      <span class="indexart-note">what we have been writing about</span>\n` +
    `    </div>`
  )
}

/** Topic chips, each carrying how much is behind it so nothing leads to one post. */
function topics(categories, activeSlug, total, ctx) {
  if (!categories.length) return ''
  const chip = (href, label, count, on) =>
    `    <a class="topic${on ? ' on' : ''}" href="${href}"${on ? ' aria-current="page"' : ''}>` +
    `${esc(label)} <span>${count}</span></a>`
  return (
    `  <nav class="topics" aria-label="Topics">\n` +
    [
      chip(ctx.allHref, 'Everything', total, !activeSlug),
      ...categories.map((c) => chip(ctx.topicHref(c.slug), c.title, c.count, c.slug === activeSlug)),
    ].join('\n') +
    `\n  </nav>`
  )
}

/**
 * Numbered pager with ellipses. Rendered as links plus one non-link for the
 * current page, so the current position is not a control that goes nowhere.
 */
function pager(pageNum, totalPages, ctx) {
  if (totalPages <= 1) return ''
  const nums = []
  for (let n = 1; n <= totalPages; n++) {
    const near = Math.abs(n - pageNum) <= 1
    if (n === 1 || n === totalPages || near) nums.push(n)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }
  const items = nums.map((n) =>
    n === '…'
      ? `    <span class="gap">&hellip;</span>`
      : n === pageNum
        ? `    <span class="on" aria-current="page">${n}</span>`
        : `    <a href="${ctx.pageHref(n)}">${n}</a>`,
  )
  const prev =
    pageNum > 1 ? `    <a class="edge" href="${ctx.pageHref(pageNum - 1)}">&#8592; Newer</a>` : ''
  const next =
    pageNum < totalPages
      ? `    <a class="edge" href="${ctx.pageHref(pageNum + 1)}">Older &#8594;</a>`
      : ''
  return (
    `  <nav class="pager" aria-label="Pagination">\n` +
    [prev, ...items, next].filter(Boolean).join('\n') +
    `\n  </nav>`
  )
}

/**
 * One listing page: /blog/, /blog/page/N/ or /blog/topics/<slug>/.
 * `depth` is how many directories deep the page sits, which fixes every relative
 * link on it.
 */
export function renderListing(opts) {
  const {
    posts, // posts on this page
    allCount, // total across the whole blog
    categories,
    activeCategory,
    pageNum,
    totalPages,
    shallowChrome,
    urlFor,
    depth,
    manifest = [],
    canonical,
    prevUrl,
    nextUrl,
  } = opts

  const up = '../'.repeat(depth)
  const ctx = {
    up,
    manifest,
    allHref: `${up}${OUT_DIR}/`,
    postHref: (slug) => `${up}${OUT_DIR}/${slug}/`,
    topicHref: (slug) => `${up}${OUT_DIR}/topics/${slug}/`,
    pageHref: (n) => (n === 1 ? `${up}${OUT_DIR}/` : `${up}${OUT_DIR}/page/${n}/`),
  }

  // The lead card is only worth its size at the top of an unfiltered first page;
  // deeper pages are for scanning, so everything there is the same size.
  const lead = pageNum === 1 && !activeCategory && posts.length ? posts[0] : null
  const rest = lead ? posts.slice(1) : posts

  const heading = activeCategory
    ? `<h1>${esc(activeCategory.title)}, <span class="serif">and what we make of it.</span></h1>`
    : `<h1>Writing on hiring, <span class="serif">and the machines doing it.</span></h1>`
  const lede = activeCategory
    ? esc(activeCategory.description || `Everything we have written on ${activeCategory.title.toLowerCase()}.`)
    : 'What we are learning building a system that reads every application, and what it means for the people on both sides of the process.'

  const body =
    `<header class="phead wrap">\n` +
    `  <span class="kicker">our views</span>\n` +
    `  ${heading}\n` +
    `  <p class="lede">${lede}</p>\n` +
    `</header>\n\n` +
    `<section class="wrap band listing-ground" style="padding-top:0">\n` +
    (topics(categories, activeCategory && activeCategory.slug, allCount, ctx) + '\n') +
    (lead ? featureCard(lead, urlFor, ctx) + '\n' : '') +
    // Only earned when there is a lead above it and cards below: on a topic page
    // or a deeper page it would label nothing.
    (lead && rest.length ? `  <div class="listsplit"><span>more writing</span></div>\n` : '') +
    (rest.length
      ? `  <div class="index">\n` +
        `    <ol class="rows">\n${rest.map((p) => indexRow(p, ctx)).join('\n')}\n    </ol>\n` +
        artPanel(rest, ctx) +
        `\n  </div>\n`
      : '') +
    (!posts.length ? `  <p class="emptynote">Nothing here yet. Check back shortly.</p>\n` : '') +
    pager(pageNum, totalPages, ctx) +
    `\n</section>`

  const title = activeCategory
    ? `${activeCategory.title} — AgentR`
    : pageNum > 1
      ? `Our views on hiring and AI screening — page ${pageNum} — AgentR`
      : 'Our views on hiring and AI screening — AgentR'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': canonical,
    name: 'AgentR — our views',
    description: 'Writing on hiring, screening and the systems that read applications.',
    publisher: {'@id': `${SITE}/#organization`},
    inLanguage: 'en',
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${SITE}/${OUT_DIR}/${p.slug}/`,
      datePublished: p.publishedAt.slice(0, 10),
      author: {'@type': 'Person', name: (p.author && p.author.name) || 'AgentR'},
    })),
  }

  return page({
    chrome: chromeAtDepth(shallowChrome, depth),
    meta: {
      url: canonical,
      title,
      description:
        'Writing on hiring, screening and the systems that read applications. From the team building AgentR.',
      image: DEFAULT_OG,
      imageAlt: 'AgentR — infinite resumes, one perfect hire',
      type: 'website',
      // Pages 2+ and topic listings are real pages, but only page one should
      // compete in search for the blog's own terms.
      prevUrl,
      nextUrl,
    },
    jsonLd,
    body,
  })
}
