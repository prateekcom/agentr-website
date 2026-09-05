#!/usr/bin/env node
/**
 * Turns the posts held in Sanity into ordinary HTML pages under /blog/.
 *
 * The site ships as static files with no build step, and the deploy simply syncs
 * the directory to S3. So rather than fetch content in the browser (which would
 * cost the blog its search ranking), this writes real pages at build time. The
 * deploy's existing `find . -name index.html` pass then gives every generated
 * post its directory URL for free.
 */
import {createClient} from '@sanity/client'
import {mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync} from 'node:fs'
import {join} from 'node:path'
import {chromeAtDepth, loadChrome, page, SITE} from './lib/template.mjs'
import {
  bodyToHtml,
  esc,
  formatDate,
  imageUrl,
  isoDate,
  makeImageBuilder,
  plainText,
  readingTime,
  slugPath,
  effectiveDims,
  scaleDims,
  withHeadingAnchors,
} from './lib/render.mjs'
import {OUT_DIR, PER_PAGE, renderListing} from './lib/listing.mjs'

const PROJECT_ID = process.env.SANITY_PROJECT_ID || 'lv2lv9h9'
const DATASET = process.env.SANITY_DATASET || 'production'
const DEFAULT_OG = SITE + '/assets/og-default.jpg'

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  // Pinned deliberately: a floating version would let Sanity change query
  // behaviour under a build that nobody touched.
  apiVersion: '2026-09-04',
  // The CDN lags a publish by a few seconds. Builds are infrequent and triggered
  // by a publish, so read live and be certain the new post is included.
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN || undefined,
})

// A post dated in the future is held back until that date. Set INCLUDE_SCHEDULED=1
// to render it anyway, for checking a scheduled post locally before it goes live.
// Never set this in the deploy: it would publish embargoed posts early.
const INCLUDE_SCHEDULED = process.env.INCLUDE_SCHEDULED === '1'
const DATE_FILTER = INCLUDE_SCHEDULED ? '' : '&& publishedAt <= now()'

const POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
  && !(_id in path("drafts.**"))
  ${DATE_FILTER}
] | order(publishedAt desc) {
  _id, title, "slug": slug.current, kicker, lede, publishedAt, _updatedAt, featured,
  "author": author->{name, role},
  "categories": categories[]->{title, description, "slug": slug.current},
  mainImage{..., "dimensions": asset->metadata.dimensions},
  body[]{..., _type == "image" => {"dimensions": asset->metadata.dimensions}},
  seo{..., ogImage{..., "dimensions": asset->metadata.dimensions}}
}`

/** An SVG is served back unchanged: the CDN ignores width, fit and format on one. */
const isSvg = (image) => /-svg$/.test((image && image.asset && image.asset._ref) || '')

/**
 * The banner wants a wide image. A photograph can simply be re-cropped by the
 * CDN, but a drawn illustration is an SVG, and the CDN will not touch it — ask
 * for 1200 wide and the 720x720 square comes back, which renders as a banner
 * twice the height it should be.
 *
 * Its wide rendition therefore has to exist as its own asset, and it already
 * does: the social image is the same drawing centred on a 1200x630 ground.
 * So an SVG banner falls back to it, and everything else keeps the normal path.
 */
function bannerFor(post, urlFor) {
  if (!post.mainImage || !post.mainImage.asset) return null
  const og = post.seo && post.seo.ogImage && post.seo.ogImage.asset ? post.seo.ogImage : null
  const wide = isSvg(post.mainImage) && og ? og : post.mainImage

  return {
    src: imageUrl(urlFor, wide, {width: 1600}),
    og: imageUrl(urlFor, og || post.mainImage, {width: 1200}),
    alt: post.mainImage.alt || '',
    caption: post.mainImage.caption || '',
    dims: scaleDims(effectiveDims(wide.dimensions, wide.crop), 1600),
    cardDims: scaleDims(post.mainImage.dimensions, 760),
  }
}

function sizeAttrs(dims) {
  return dims ? ` width="${dims.width}" height="${dims.height}"` : ''
}

/**
 * A post edited before its publish date (a scheduled post, or one written ahead
 * of time) has _updatedAt earlier than publishedAt. Reporting that as
 * dateModified gives a page "last modified before it existed", which Google
 * rejects as invalid structured data, so never go earlier than publication.
 */
function modifiedAt(post) {
  const updated = post._updatedAt || post.publishedAt
  return new Date(updated) > new Date(post.publishedAt) ? updated : post.publishedAt
}

function renderPost(post, chrome, urlFor) {
  const url = `${SITE}/${OUT_DIR}/${slugPath(post.slug)}/`
  const banner = bannerFor(post, urlFor)
  const description = (post.seo && post.seo.metaDescription && post.seo.metaDescription.trim()) || post.lede
  const title = (post.seo && post.seo.metaTitle && post.seo.metaTitle.trim()) || post.title
  const ogImage =
    post.seo && post.seo.ogImage && post.seo.ogImage.asset
      ? imageUrl(urlFor, post.seo.ogImage, {width: 1200})
      : banner
        ? banner.og
        : DEFAULT_OG
  const mins = readingTime(post.body)

  let bannerHtml
  if (banner) {
    const caption = banner.caption
      ? `\n      <figcaption class="fignote">${esc(banner.caption)}</figcaption>`
      : ''
    bannerHtml =
      `    <figure class="banner">\n` +
      `      <img src="${esc(banner.src)}" alt="${esc(banner.alt)}"${sizeAttrs(banner.dims)}` +
      ` fetchpriority="high" decoding="async" />${caption}\n` +
      `    </figure>\n`
  } else {
    // No image on the post. It reads fine without one, which beats emitting a
    // path to a file that is not there.
    bannerHtml = ''
  }

  // The kicker doubles as the way back, rather than a separate link beside it:
  // two items sat on one line and read as one broken phrase, and "our views"
  // already names where the reader came from. A post is often the first page
  // someone lands on, from search or a shared link, and the nav has no Blog
  // entry, so something in the header has to lead to the rest of them.
  const kicker =
    `<a class="kicker back" href="../">` +
    `<span aria-hidden="true">&#8592;</span> ${esc(post.kicker || 'our views')}</a>`
  const authorName = (post.author && post.author.name) || 'AgentR'

  const {html: bodyHtml, headings} = withHeadingAnchors(bodyToHtml(post.body, urlFor))

  // A contents rail earns its place only once there is somewhere to go. Below two
  // sections it is a list of one thing, so the post keeps the plain layout.
  const article = `  <div class="prose article">\n${bannerHtml}${bodyHtml}\n  </div>`
  const inner =
    headings.length >= 2
      ? `  <div class="doc-split">\n` +
        `  <div class="toc">\n` +
        `    <b>on this page</b>\n` +
        `    <ol>\n` +
        headings
          .map(
            (h) =>
              `      <li${h.level === 3 ? ' class="toc-sub"' : ''}>` +
              `<a href="#${h.id}">${esc(h.text)}</a></li>`,
          )
          .join('\n') +
        `\n    </ol>\n` +
        `  </div>\n` +
        article +
        `\n  </div>`
      : article

  const body =
    `<header class="phead wrap">\n` +
    // A post is often the first page someone lands on, from search or a shared
    // link, with no history to go back through. The nav carries no Blog entry,
    // so without this there is no route from an article to the rest of them.
    `  ${kicker}\n` +
    `  <h1>${esc(post.title)}</h1>\n` +
    `  <p class="lede">${esc(post.lede)}</p>\n` +
    `  <p class="byline">${esc(authorName)} &middot; ` +
    `<time datetime="${isoDate(post.publishedAt)}">${formatDate(post.publishedAt)}</time>` +
    ` &middot; ${mins} min read</p>\n` +
    `</header>\n\n` +
    `<section class="wrap band" style="padding-top:0">\n` +
    inner +
    `\n</section>`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {'@type': 'WebPage', '@id': url},
    headline: post.title,
    description,
    image: ogImage,
    datePublished: isoDate(post.publishedAt),
    dateModified: isoDate(modifiedAt(post)),
    author: {'@type': 'Person', name: authorName},
    publisher: {'@id': SITE + '/#organization'},
    inLanguage: 'en',
  }

  return page({
    chrome,
    meta: {
      url,
      title,
      description,
      image: ogImage,
      imageAlt: (banner && banner.alt) || 'AgentR — infinite resumes, one perfect hire',
      type: 'article',
      publishedAt: new Date(post.publishedAt).toISOString(),
      modifiedAt: new Date(modifiedAt(post)).toISOString(),
      authorName,
      noIndex: !!(post.seo && post.seo.noIndex),
    },
    jsonLd,
    body,
  })
}

/**
 * Every category that actually has posts, with its count. A topic chip leading to
 * an empty page is worse than no chip, so categories nobody used are dropped.
 */
function countCategories(posts) {
  const byslug = new Map()
  for (const post of posts) {
    for (const cat of post.categories || []) {
      if (!cat || !cat.slug) continue
      const seen = byslug.get(cat.slug)
      if (seen) seen.count++
      else byslug.set(cat.slug, {slug: cat.slug, title: cat.title, description: cat.description, count: 1})
    }
  }
  return [...byslug.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
}

/** Rewrite the managed /blog/ entries, leaving hand-maintained URLs untouched. */
function updateSitemap(posts, listingPages) {
  const file = 'sitemap.xml'
  const xml = readFileSync(file, 'utf8')
  const stripped = xml.replace(/^[ \t]*<url><loc>[^<]*\/blog\/[^<]*<\/loc>.*?<\/url>[ \t]*\r?\n/gm, '')
  const entries = [
    ...listingPages.map((p) => `  <url><loc>${SITE}/${p.rel}</loc></url>`),
    ...posts
      .filter((p) => !(p.seo && p.seo.noIndex))
      .map(
        (p) =>
          `  <url><loc>${SITE}/${OUT_DIR}/${slugPath(p.slug)}/</loc>` +
          `<lastmod>${isoDate(p._updatedAt || p.publishedAt)}</lastmod></url>`,
      ),
  ].join('\n')
  const next = stripped.replace(/[\s]*<\/urlset>[\s]*$/, `\n${entries}\n</urlset>\n`)
  writeFileSync(file, next, 'utf8')
  return posts.filter((p) => !(p.seo && p.seo.noIndex)).length + listingPages.length
}

/** Remove pages for posts that were unpublished or deleted in Sanity. */
function pruneRemoved(validSlugs, categories, totalPages) {
  if (!existsSync(OUT_DIR)) return []
  const removed = []

  for (const entry of readdirSync(OUT_DIR, {withFileTypes: true})) {
    if (!entry.isDirectory()) continue
    // `page` and `topics` hold generated listings, not posts, and are swept below.
    if (entry.name === 'page' || entry.name === 'topics') continue
    if (!validSlugs.has(entry.name)) {
      rmSync(join(OUT_DIR, entry.name), {recursive: true, force: true})
      removed.push(entry.name)
    }
  }

  // A blog that shrinks leaves orphan pages behind: /blog/page/4/ still answering
  // 200 after the fourth page's worth of posts is gone, and topic pages for
  // categories nobody uses any more.
  const sweep = (dir, keep) => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      if (entry.isDirectory() && !keep.has(entry.name)) {
        rmSync(join(dir, entry.name), {recursive: true, force: true})
        removed.push(`${dir}/${entry.name}`)
      }
    }
  }
  sweep(
    join(OUT_DIR, 'page'),
    new Set(Array.from({length: Math.max(0, totalPages - 1)}, (_, i) => String(i + 2))),
  )
  sweep(join(OUT_DIR, 'topics'), new Set(categories.map((c) => c.slug)))

  return removed
}

async function main() {
  // The blog build runs before the S3 sync, so anything thrown here stops the
  // whole deploy — including changes that have nothing to do with the blog. An
  // unreachable Sanity is not a reason a marketing copy fix cannot ship, and the
  // pages from the last good build are committed, so leaving them exactly as
  // they are means the site goes out slightly stale rather than not at all.
  let posts
  try {
    posts = await client.fetch(POSTS_QUERY)
  } catch (err) {
    console.error('\nCould not reach Sanity: ' + err.message)
    console.error(
      'Leaving /blog/ as last built and continuing, so the rest of the deploy\n' +
        'is not blocked. Re-run the deploy once Sanity is reachable to pick up\n' +
        'any posts published since.\n',
    )
    return
  }

  const urlFor = makeImageBuilder(client)

  // Fail loudly rather than publishing a page Google would show with no snippet.
  for (const p of posts) {
    if (!p.slug) throw new Error(`Post "${p.title}" has no slug`)
    if (!plainText(p.body)) throw new Error(`Post "${p.title}" has an empty body`)
  }

  mkdirSync(OUT_DIR, {recursive: true})
  // One chrome, read from whichever source page is present; every other depth is
  // derived from it, so the blog no longer depends on any single article existing.
  const shallow = loadChrome()
  const deep = chromeAtDepth(shallow, 2)

  // Render every post before writing any, collecting failures rather than dying
  // on the first. Bodies are written elsewhere and converted to Portable Text
  // before they reach Sanity, so a malformed one is a question of when, not if —
  // and "the deploy failed" naming no post is a bad way to find out which.
  const rendered = []
  const broken = []
  for (const post of posts) {
    try {
      rendered.push({post, html: renderPost(post, deep, urlFor)})
    } catch (err) {
      broken.push({post, message: err.message})
    }
  }
  if (broken.length) {
    console.error(`
${broken.length} post(s) could not be rendered:
`)
    for (const b of broken) {
      console.error(`  /${OUT_DIR}/${b.post.slug}/`)
      console.error(`    ${b.message}`)
    }
    console.error(
      '\nThe body is not valid Portable Text for this schema. Fix the post in' +
        '\nSanity, or add the missing block type in scripts/lib/render.mjs.\n',
    )
    throw new Error(`${broken.length} post(s) failed to render`)
  }

  for (const {post, html} of rendered) {
    const dir = join(OUT_DIR, post.slug)
    mkdirSync(dir, {recursive: true})
    writeFileSync(join(dir, 'index.html'), html, 'utf8')
  }

  // A post marked "featured" leads the index; otherwise the newest does. Only the
  // first such post is promoted, so ticking the box twice cannot produce two leads.
  const ordered = [...posts].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))

  const categories = countCategories(posts)
  const listingPages = []

  const totalPages = Math.max(1, Math.ceil(ordered.length / PER_PAGE))
  for (let n = 1; n <= totalPages; n++) {
    const slice = ordered.slice((n - 1) * PER_PAGE, n * PER_PAGE)
    const rel = n === 1 ? `${OUT_DIR}/` : `${OUT_DIR}/page/${n}/`
    const depth = n === 1 ? 1 : 3
    listingPages.push({
      rel,
      html: renderListing({
        posts: slice,
        allCount: posts.length,
        categories,
        activeCategory: null,
        pageNum: n,
        totalPages,
        shallowChrome: shallow,
        urlFor,
        depth,
        canonical: `${SITE}/${rel}`,
        prevUrl: n > 1 ? `${SITE}/${OUT_DIR}/${n === 2 ? '' : `page/${n - 1}/`}` : undefined,
        nextUrl: n < totalPages ? `${SITE}/${OUT_DIR}/page/${n + 1}/` : undefined,
      }),
    })
  }

  for (const cat of categories) {
    const inCat = ordered.filter((p) => (p.categories || []).some((c) => c.slug === cat.slug))
    const rel = `${OUT_DIR}/topics/${cat.slug}/`
    listingPages.push({
      rel,
      html: renderListing({
        posts: inCat,
        allCount: posts.length,
        categories,
        activeCategory: cat,
        pageNum: 1,
        totalPages: 1,
        shallowChrome: shallow,
        urlFor,
        depth: 3,
        canonical: `${SITE}/${rel}`,
      }),
    })
  }

  for (const p of listingPages) {
    mkdirSync(p.rel, {recursive: true})
    writeFileSync(join(p.rel, 'index.html'), p.html, 'utf8')
  }

  const removed = pruneRemoved(new Set(posts.map((p) => p.slug)), categories, totalPages)
  const sitemapCount = updateSitemap(posts, listingPages)

  console.log(`Built ${posts.length} post${posts.length === 1 ? '' : 's'} into /${OUT_DIR}/`)
  for (const p of posts) console.log(`  /${OUT_DIR}/${p.slug}/`)
  // Every post is expected to arrive with its own drawing. One that does not
  // still publishes — it just has no picture anywhere, which is worth saying
  // out loud rather than leaving to be found on the live listing.
  const bare = posts.filter((p) => !(p.mainImage && p.mainImage.asset))
  if (bare.length) {
    console.log(`\n${bare.length} post(s) have no illustration:`)
    for (const p of bare) console.log(`  ${p.slug}`)
    console.log('  Draw one with the agentr-illustrations toolkit and upload it in Sanity.')
  }

  console.log(`Listing pages: ${listingPages.length} (${totalPages} paged, ${categories.length} topic)`)
  if (removed.length) console.log(`Removed ${removed.length} stale page(s): ${removed.join(', ')}`)
  console.log(`Sitemap: ${sitemapCount} /${OUT_DIR}/ entries written`)
}

main().catch((err) => {
  console.error('\nBlog build failed:', err.message)
  process.exit(1)
})
