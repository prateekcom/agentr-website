// Throwaway harness: exercises the listing paths that only appear once the blog
// has many posts and several topics, which no live build can reach yet.
import {loadChrome} from './lib/template.mjs'
import {renderListing, PER_PAGE, humanDate} from './lib/listing.mjs'
import {chromeAtDepth} from './lib/template.mjs'

/** Stands in for Sanity's URL builder: chainable, and returns a stable URL. */
const urlFor = (source) => {
  const ref = (source && source.asset && source.asset._ref) || 'none'
  const api = new Proxy(() => api, {get: (_, k) => (k === 'url' ? () => `https://cdn.test/${ref}` : () => api)})
  return api
}

// Five drawings across 23 posts, so several rows share one and the panel has to
// hold each distinct image once — the case the swap actually has to get right.
const artRef = (i) => `image-${'abcde'[i % 5].repeat(8)}0000000000000000000000000000000-720x720-svg`
const imageFor = (i) => ({
  _type: 'image',
  asset: {_type: 'reference', _ref: artRef(i)},
  alt: 'Illustration: a test drawing.',
  dimensions: {width: 720, height: 720},
})

const shallow = loadChrome()
const CATS = [
  {slug: 'hiring', title: 'Hiring', description: 'On how hiring works.', count: 12},
  {slug: 'ai', title: 'AI', description: '', count: 8},
  {slug: 'candidates', title: 'Candidates', description: '', count: 3},
]

const posts = Array.from({length: 23}, (i0, i) => ({
  title: `Post number ${i + 1}`,
  slug: `post-${i + 1}`,
  lede: `Standfirst for post ${i + 1}.`,
  publishedAt: new Date(Date.UTC(2026, 7, 1 + i)).toISOString(),
  featured: i === 4,
  author: {name: 'Prateek'},
  categories: [CATS[i % 3]],
  mainImage: imageFor(i),
  body: [{_type: 'block', children: [{text: 'word '.repeat(400)}]}],
}))

let failures = 0
const check = (label, got, want) => {
  const ok = got === want
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`)
}

const totalPages = Math.ceil(posts.length / PER_PAGE)
check('page count for 23 posts at 9/page', totalPages, 3)

const render = (n, activeCategory = null) =>
  renderListing({
    posts: activeCategory
      ? posts.filter((p) => p.categories.some((c) => c.slug === activeCategory.slug))
      : posts.slice((n - 1) * PER_PAGE, n * PER_PAGE),
    allCount: posts.length,
    categories: CATS,
    activeCategory,
    pageNum: n,
    totalPages: activeCategory ? 1 : totalPages,
    shallowChrome: shallow,
    urlFor,
    depth: activeCategory ? 3 : n === 1 ? 1 : 3,
    canonical: 'https://agentr.global/blog/',
    prevUrl: n > 1 ? 'https://agentr.global/blog/' : undefined,
    nextUrl: n < totalPages ? 'https://agentr.global/blog/page/2/' : undefined,
  })

const p1 = render(1)
const p2 = render(2)
const p3 = render(3)

const count = (html, re) => (html.match(re) || []).length

// Page 1: one lead card plus the rest of the slice as index rows.
const rows = (html) => count(html, /<li><a href/g)
check('page 1 lead cards', count(p1, /class="postcard"/g), 1)
check('page 1 index rows', rows(p1), PER_PAGE - 1)
// Deeper pages are all rows, no lead.
check('page 2 lead cards', count(p2, /class="postcard"/g), 0)
check('page 2 index rows', rows(p2), PER_PAGE)
check('page 3 index rows (remainder)', rows(p3), 23 - 2 * PER_PAGE)

// The panel holds one image per DISTINCT drawing, not one per row: several posts
// share a category and so share a drawing, and duplicates would be dead weight.
const panelImgs = (html) => count(html, /<img[^>]*data-art=/g)
const rowArts = (html) => new Set([...html.matchAll(/<a href[^>]*data-art="([^"]+)"/g)].map((m) => m[1]))
check('panel has no duplicate drawings', panelImgs(p1), rowArts(p1).size)
check('panel covers every drawing the rows point at', panelImgs(p1) > 0, true)
check('exactly one drawing starts visible', count(p1, /<img class="on"/g), 1)
check('panel is hidden from screen readers', /class="indexart" aria-hidden="true"/.test(p1), true)
// Every row must resolve to a drawing the panel actually contains, or hovering
// it would fade everything out.
const panelNames = new Set([...p1.matchAll(/<img[^>]*data-art="([^"]+)"/g)].map((m) => m[1]))
check('every row points at a drawing the panel has', [...rowArts(p1)].every((n) => panelNames.has(n)), true)

// Pager: current page is not a link, and the ends are reachable.
check('page 2 marks itself current', /<span class="on" aria-current="page">2<\/span>/.test(p2), true)
check('page 2 has a Newer link', /class="edge" href="[^"]*">&#8592; Newer/.test(p2), true)
check('page 3 has no Older link', /Older &#8594;/.test(p3), false)
check('page 1 has no Newer link', /&#8592; Newer/.test(p1), false)

// Relative paths must match each page's depth or every asset 404s.
check('page 1 links to a post one level up', p1.includes('href="../blog/post-1/"'), true)
check('page 2 links to a post three levels up', p2.includes('href="../../../blog/post-10/"'), true)
check('page 2 stylesheet path is repointed', p2.includes('href="../../../assets/site.css"'), true)
check('page 1 stylesheet path unchanged', p1.includes('href="../assets/site.css"'), true)

// Topics.
check('topic chips rendered', count(p1, /class="topic[ "]/g), CATS.length + 1)
check('Everything chip is active on page 1', /class="topic on"[^>]*>Everything/.test(p1), true)

const topicPage = render(1, CATS[0])
check('topic page has no lead card', count(topicPage, /class="postcard"/g), 0)
check('topic page lists only that topic', rows(topicPage), 8)
check('topic page marks its own chip', /class="topic on"[^>]*>Hiring/.test(topicPage), true)
// The masthead is deliberately identical on every listing page: varying it made
// the header collapse from two lines to one when a topic was picked, so the
// chips jumped up the page mid-click.
const headerOf = (html) => html.slice(html.indexOf('<header class="phead wrap">'), html.indexOf('</header>'))
check('topic page keeps the same headline', headerOf(topicPage).includes('Writing on hiring,'), true)
check('topic page keeps the same standfirst',
  headerOf(topicPage).includes('What we are learning building a system'), true)
check('topic is named in the kicker instead', headerOf(topicPage).includes('our views &middot; Hiring'), true)
check('the plain index kicker carries no topic', headerOf(p1).includes('>our views<'), true)
check('header markup is byte-identical across pages', headerOf(p1) === headerOf(p2), true)

// Human dates.
const now = new Date('2026-09-04T12:00:00Z')
check('today', humanDate('2026-09-04T09:00:00Z', now), 'today')
check('yesterday', humanDate('2026-09-03T09:00:00Z', now), 'yesterday')
check('days', humanDate('2026-09-01T09:00:00Z', now), '3 days ago')
check('last week', humanDate('2026-08-27T09:00:00Z', now), 'last week')
check('weeks', humanDate('2026-08-10T09:00:00Z', now), '3 weeks ago')
check('older falls back to a real date', humanDate('2026-01-10T09:00:00Z', now), '10 January 2026')

// Chrome sourcing. The blog used to read its two-deep shell from the single
// article at views/when-everyone-is-using-bots/, so deleting one post would have
// stopped the whole blog building.
check('chrome loads from a source page', typeof shallow.nav === 'string' && shallow.nav.includes('<nav>'), true)
check('chrome names which page it came from', typeof shallow.source === 'string', true)
check('chrome is one level deep', shallow.prefix, '../')
const deep2 = chromeAtDepth(shallow, 2)
check('depth 2 is derived, not read from a second file', deep2.prefix, '../../')
check('derived chrome repoints its links', deep2.nav.includes('="../../'), true)
check('derived chrome leaves absolute urls alone',
  deep2.footer.includes('https://candidate.agentr.global/'), true)

// The row-to-drawing map is emitted as CSS per page. It replaced a JavaScript
// handler that passed every test here and still did not work on the machine that
// mattered, so these assert the generated selectors rather than any behaviour.
const styleOf = (html) => (html.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1]
const p1Style = styleOf(p1)
const p1Rows = [...p1.matchAll(/<li><a href[^>]*data-art="([^"]+)"/g)].map((m) => m[1])
const p1Imgs = [...p1.matchAll(/<img[^>]*data-art="([^"]+)"/g)].map((m) => m[1])

check('a rule is emitted for every row', (p1Style.match(/nth-child\(\d+\)>a:hover/g) || []).length, p1Rows.length)
check('every rule covers keyboard focus too',
  (p1Style.match(/:focus-visible/g) || []).length, p1Rows.length)
// Row n must point at the image holding row n's drawing, or hovering shows the
// wrong picture — the kind of off-by-one that looks like "it does not work".
const mapOk = p1Rows.every((art, i) => {
  const want = p1Imgs.indexOf(art) + 1
  return p1Style.includes(`nth-child(${i + 1})>a:hover) .indexart img:nth-child(${want})`)
})
check('each row maps to its own drawing', mapOk, true)
// addEventListener appears legitimately in the site chrome (GTM, scroll
// restore), so pull each script out and check none of them drives the panel.
const scriptBodies = [...p1.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
check('the swap needs no script', scriptBodies.some((b) => b.includes('indexart')), false)
check('a style block carries the mapping instead', p1Style.length > 0, true)

// The pager's ellipsis needs more than five pages. The live blog has three, and
// the fixture above has three, so this path had never rendered — it would have
// first appeared in production at roughly forty posts, which is a poor place to
// discover it is wrong.
const many = Array.from({length: 60}, (i0, i) => ({...posts[i % posts.length], slug: `many-${i}`}))
const manyTotal = Math.ceil(many.length / PER_PAGE)
const deepPage = renderListing({
  posts: many.slice(3 * PER_PAGE, 4 * PER_PAGE),
  allCount: many.length,
  categories: CATS,
  activeCategory: null,
  pageNum: 4,
  totalPages: manyTotal,
  shallowChrome: shallow,
  urlFor,
  depth: 3,
  canonical: 'https://agentr.global/blog/page/4/',
})
check('60 posts make 7 pages', manyTotal, 7)
check('an ellipsis appears past five pages', deepPage.includes('class="gap"'), true)
check('page one stays reachable from deep in the pager', /">1<\/a>/.test(deepPage), true)
check('the last page stays reachable', new RegExp(`">${manyTotal}<\/a>`).test(deepPage), true)
check('the current page is still not a link',
  deepPage.includes('<span class="on" aria-current="page">4</span>'), true)
// Two gaps, not one: page 4 of 7 leaves a hole on each side.
check('a gap on each side of the current page', (deepPage.match(/class="gap"/g) || []).length, 2)

console.log(failures ? `\n${failures} FAILED` : '\nall passed')

// Optional: dump two pages so the design can be looked at with a full grid.
if (process.env.WRITE_PREVIEW === '1') {
  const {mkdirSync, writeFileSync} = await import('node:fs')
  mkdirSync('_designpreview', {recursive: true})
  mkdirSync('_designpreview/p2', {recursive: true})
  writeFileSync('_designpreview/index.html', p1, 'utf8')
  writeFileSync('_designpreview/p2/index.html', render(2), 'utf8')
  console.log('wrote _designpreview/')
}

process.exit(failures ? 1 : 0)
