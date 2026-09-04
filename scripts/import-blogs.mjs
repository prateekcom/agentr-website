#!/usr/bin/env node
/**
 * DEV-ONLY. Turns a folder of markdown posts into an NDJSON file that
 * `sanity dataset import` can load.
 *
 *   node scripts/import-blogs.mjs "<folder>" [out.ndjson]
 *
 * It writes a file; it does not touch Sanity. Importing is a separate, explicit
 * step so the output can be read before anything is published.
 *
 * Each file is expected to open with a `# Title` line and a bold standfirst.
 * Anything that does not parse, or converts to a block this site cannot render,
 * is reported and the run stops — a half-imported blog is worse than none.
 */
import {readFileSync, writeFileSync, readdirSync, statSync} from 'node:fs'
import {join, basename} from 'node:path'
import {markdownToPortableText} from '@portabletext/markdown'

const SRC = process.argv[2]
const OUT = process.argv[3] || 'blogs-import.ndjson'
if (!SRC) {
  console.error('Usage: node scripts/import-blogs.mjs "<folder>" [out.ndjson]')
  process.exit(1)
}

// Queried from the dataset rather than invented. Posts get Sanity-generated ids;
// only the categories carry explicit ones, because the references in this file
// have to resolve inside a single import.
const AUTHOR_ID = '30eb9b2c-3442-4c10-99c9-2e6228c61604'

/** The controlled vocabulary. Slugs stay short: they become /blog/topics/<slug>/. */
const CATEGORIES = {
  screening: {title: 'Screening', description: 'How applications get read, ranked and filtered.'},
  interviews: {title: 'Interviews', description: 'What happens once someone is in the room.'},
  candidates: {title: 'Candidates', description: 'The other side of the process.'},
  ai: {title: 'AI', description: 'What the machines are actually doing to hiring.'},
  trust: {title: 'Trust', description: 'Verification, fraud and the limits of what a claim is worth.'},
  market: {title: 'Market', description: 'What the hiring market is doing, and why.'},
}

/** Assigned by hand: a bucket per post, for browsing rather than for search. */
const ASSIGNED = {
  'ats-monster': 'screening',
  'paper-tiger-index': 'screening',
  'ai-rejected-best-candidate': 'ai',
  'time-to-hire-vanity-metric': 'market',
  'ai-match-score-trust': 'ai',
  'india-hiring-intelligence': 'market',
  'hiring-arms-race': 'ai',
  'humans-plus-agents': 'ai',
  'thirty-career-patterns': 'candidates',
  'post-hire-data-gap': 'market',
  'ghost-jobs-not-a-bug': 'market',
  'skills-based-hiring-illusion': 'screening',
  'interview-rounds-not-better': 'interviews',
  'boomerang-hire-alumni-pool': 'candidates',
  'jd-unhireable': 'screening',
  'fake-candidate-attack-surface': 'trust',
  'entry-level-collapse-screen-blind': 'market',
  'interview-teleprompter-cluely': 'interviews',
  'compensation-last-reveal': 'candidates',
  'ai-act-deadline-moved': 'market',
  'ai-roi-gap': 'ai',
  'resume-flood-1000-applicants': 'screening',
  'agent-vs-agent-hiring': 'ai',
  'overemployment-hiring-blind-spot': 'trust',
  'ai-layoff-reversal': 'market',
  'north-korean-deepfake-hire': 'trust',
  'honesty-tax-hiring': 'candidates',
}

/* ------------------------------------------------------------------ parse -- */

function parseMarkdown(raw, file) {
  const lines = raw.split(/\r?\n/)

  const titleAt = lines.findIndex((l) => /^#\s+\S/.test(l))
  if (titleAt === -1) throw new Error('no "# Title" heading — is this a blog post?')
  const title = lines[titleAt].replace(/^#\s+/, '').trim()

  // The standfirst is the bold line under the title. It becomes the `lede`, and
  // so must come out of the body or it appears twice on the page.
  let lede = ''
  let bodyFrom = titleAt + 1
  for (let i = titleAt + 1; i < Math.min(titleAt + 5, lines.length); i++) {
    const l = lines[i].trim()
    if (!l) continue
    if (/^\*\*[\s\S]*\*\*$/.test(l)) {
      lede = l.replace(/^\*\*/, '').replace(/\*\*$/, '').trim()
      bodyFrom = i + 1
    }
    break
  }
  if (!lede) throw new Error('no bold standfirst under the title')

  return {title, lede, body: lines.slice(bodyFrom).join('\n').trim()}
}

/* --------------------------------------------------------------- convert -- */

const OK_STYLES = new Set(['normal', 'h2', 'h3', 'blockquote'])
const OK_LISTS = new Set(['bullet', 'number'])
const OK_MARKS = new Set(['strong', 'em', 'code'])

function toBlocks(markdown, file) {
  const raw = markdownToPortableText(markdown)
  const blocks = []

  for (const b of raw) {
    // The `---` rules between sections. The schema has no horizontal rule, and
    // the h2s already carry the structure, so they are dropped rather than
    // smuggled in as a type the Studio would show as unknown.
    if (b._type === 'horizontal-rule') continue
    if (b._type !== 'block') throw new Error(`unsupported block type "${b._type}"`)

    // A stray h1 would be a second top-level heading on a page whose title
    // already is one. Demote rather than drop: the text is real content.
    const style = b.style === 'h1' ? 'h2' : b.style === 'h4' || b.style === 'h5' || b.style === 'h6' ? 'h3' : b.style
    if (style && !OK_STYLES.has(style)) throw new Error(`unsupported style "${b.style}"`)
    if (b.listItem && !OK_LISTS.has(b.listItem)) throw new Error(`unsupported list "${b.listItem}"`)

    const markDefKeys = new Set((b.markDefs || []).map((d) => d._key))
    for (const d of b.markDefs || []) {
      if (d._type !== 'link') throw new Error(`unsupported annotation "${d._type}"`)
    }
    for (const c of b.children || []) {
      for (const m of c.marks || []) {
        if (!OK_MARKS.has(m) && !markDefKeys.has(m)) throw new Error(`unsupported mark "${m}"`)
      }
    }

    blocks.push({...b, style: style || 'normal'})
  }

  if (!blocks.length) throw new Error('body converted to nothing')
  return blocks
}

/* ------------------------------------------------------------------ dates -- */

/**
 * Modified time, as asked. Ten of these files share one timestamp to the minute,
 * which would leave their order on the index arbitrary, so files sharing a time
 * are spread a minute apart in filename order — the numbering is the intended
 * sequence, and the date itself is unchanged.
 */
function publishDates(files) {
  const byTime = new Map()
  for (const f of files) {
    const t = statSync(f.path).mtime
    const key = t.toISOString().slice(0, 16)
    if (!byTime.has(key)) byTime.set(key, [])
    byTime.get(key).push({...f, mtime: t})
  }
  const out = new Map()
  for (const group of byTime.values()) {
    group.sort((a, b) => a.name.localeCompare(b.name))
    group.forEach((f, i) => {
      const d = new Date(f.mtime)
      d.setMinutes(d.getMinutes() + i)
      out.set(f.path, d.toISOString())
    })
  }
  return out
}

/* ------------------------------------------------------------------- main -- */

const files = readdirSync(SRC)
  .filter((n) => n.endsWith('.md'))
  // A LinkedIn variant of a post already here: shorter, no title, written for a
  // different surface. Publishing it would put near-duplicate content on the blog.
  .filter((n) => !n.includes('-linkedin'))
  .sort()
  .map((n) => ({name: n, path: join(SRC, n)}))

const dates = publishDates(files)
const docs = []
const failures = []
const rows = []

for (const f of files) {
  const slug = basename(f.name, '.md').replace(/^\d+-/, '')
  try {
    const raw = readFileSync(f.path, 'utf8')
    const {title, lede, body} = parseMarkdown(raw, f.name)
    const blocks = toBlocks(body, f.name)
    const cat = ASSIGNED[slug]
    if (!cat) throw new Error(`no category assigned for "${slug}"`)

    docs.push({
      _type: 'post',
      title,
      slug: {_type: 'slug', current: slug},
      kicker: 'our views',
      lede,
      author: {_type: 'reference', _ref: AUTHOR_ID},
      categories: [{_type: 'reference', _key: `cat-${slug}`, _ref: `category-${cat}`}],
      publishedAt: dates.get(f.path),
      featured: false,
      body: blocks,
    })
    rows.push({slug, date: dates.get(f.path).slice(0, 10), cat, blocks: blocks.length, words: body.split(/\s+/).length})
  } catch (err) {
    failures.push(`  ${f.name}: ${err.message}`)
  }
}

if (failures.length) {
  console.error(`\n${failures.length} file(s) could not be converted:\n`)
  failures.forEach((f) => console.error(f))
  console.error('\nNothing written. Fix these and re-run.\n')
  process.exit(1)
}

const categoryDocs = Object.entries(CATEGORIES).map(([slug, c]) => ({
  _id: `category-${slug}`,
  _type: 'category',
  title: c.title,
  slug: {_type: 'slug', current: slug},
  description: c.description,
}))

writeFileSync(OUT, [...categoryDocs, ...docs].map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf8')

console.log(`${docs.length} posts + ${categoryDocs.length} categories -> ${OUT}\n`)
console.log('  date        category    blocks  words  slug')
for (const r of rows.sort((a, b) => a.date.localeCompare(b.date))) {
  console.log(
    `  ${r.date}  ${r.cat.padEnd(11)} ${String(r.blocks).padStart(5)}  ${String(r.words).padStart(5)}  ${r.slug}`,
  )
}
console.log(`\nImport with:\n  cd ../studio-agentr && npx sanity dataset import ../agentr-website/${OUT} production`)
