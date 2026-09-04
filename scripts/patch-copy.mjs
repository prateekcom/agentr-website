/**
 * DEV-ONLY, one-off. Trims the titles and standfirsts that were too long to sit
 * well on the page.
 *
 *   cd ../studio-agentr
 *   npx sanity exec ../agentr-website/scripts/patch-copy.mjs --with-user-token
 *
 * Patches only `title` and `lede`; bodies and slugs are untouched, so no URL
 * changes and nothing that is already linked moves.
 *
 * Why: imported titles ran to 141 characters and standfirsts to 762, because
 * posts 11 onward opened with a full news-brief paragraph. The standfirst is
 * also the meta description, which Google truncates around 155.
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-09-04'})

/** slug -> {title?, lede?}. Only what changes is listed. */
const EDITS = {
  'skills-based-hiring-illusion': {
    lede: '85% of companies claim to practice it. Fewer than one hire in 700 proves it.',
  },
  'interview-rounds-not-better': {
    lede: 'Offer acceptance has fallen to 51%, and technical roles now average 17.6 rounds. The best candidates walk out before the process ends.',
  },
  'boomerang-hire-alumni-pool': {
    lede: 'Boomerang employees are now more than a third of all new hires, and 68% in tech. The most pre-qualified pool you have is the people who left.',
  },
  'jd-unhireable': {
    lede: 'The average corporate role lists more requirements than any one person plausibly carries. Recruiters call the result a purple squirrel.',
  },
  'fake-candidate-attack-surface': {
    lede: 'Gartner projects one in four candidate profiles will be fake by 2028. Keyword matching cannot tell a real career from a manufactured one.',
  },
  'entry-level-collapse-screen-blind': {
    lede: 'AI is hollowing out the entry-level jobs that turn graduates into seniors, and the screen is structurally blind to what they do offer.',
  },
  'interview-teleprompter-cluely': {
    title: 'A Dropout Raised $15M to Cheat Your Interview. He Is Half Right.',
    lede: 'An invisible AI window now feeds candidates perfect answers in real time. Companies are fighting the wrong battle: the interview was measuring the wrong thing already.',
  },
  'compensation-last-reveal': {
    lede: 'Companies spend $5,475 hiring someone who declines because the number was not what they expected. Both sides knew their number on day one.',
  },
  'ai-act-deadline-moved': {
    lede: 'Brussels pushed the AI Act’s hiring obligations from August 2026 to December 2027. The deadline moved. Nothing creating the exposure did.',
  },
  'ai-roi-gap': {
    title: '88% of HR Leaders Saw No Value From Their AI. The Vendor Says 340%.',
    lede: '87% of talent teams use AI daily or weekly. 88% of HR leaders say it has delivered no significant business value. Both numbers are real.',
  },
  'resume-flood-1000-applicants': {
    lede: 'Two thirds of hiring managers say AI-written applications have slowed them down. This is what happens when applying costs nothing and screening still costs everything.',
  },
  'agent-vs-agent-hiring': {
    lede: 'Half of talent leaders will deploy autonomous recruiting agents this year. Candidates are deploying their own. Nobody is checking either one’s work.',
  },
  'overemployment-hiring-blind-spot': {
    title: 'He Worked Four Full-Time Jobs. Every Reference Check Came Back Clean.',
    lede: 'A growing share of remote workers hold two or more full-time roles at once, undisclosed, on the same hours. None of it shows up on a background check.',
  },
  'ai-layoff-reversal': {
    title: 'A Bank Admitted Its AI Layoffs Were a Mistake. It Was Not the Last.',
    lede: 'Nearly a third of managers who cut a role because of AI have already rehired for it, and 55% of leaders who made those cuts now call them a mistake.',
  },
  'north-korean-deepfake-hire': {
    title: 'The FBI Found a North Korean Operative Inside a US Federal Agency',
    lede: 'One cell submitted more than 166,000 job applications and landed 76 offers, using deepfakes good enough to put human detection at roughly a coin toss.',
  },
  'honesty-tax-hiring': {
    title: '93% of Candidates Admit They Lied. Only 26% Were Ever Caught.',
    lede: 'A survey of 1,500 recent applicants found almost all had embellished or fabricated something. Only a quarter say anyone ever checked and found it.',
  },
}

const posts = await client.fetch('*[_type=="post"]{_id,"slug":slug.current,title,lede}')
const bySlug = new Map(posts.map((p) => [p.slug, p]))

let patched = 0
const missing = []

for (const [slug, edit] of Object.entries(EDITS)) {
  const post = bySlug.get(slug)
  if (!post) {
    missing.push(slug)
    continue
  }
  await client.patch(post._id).set(edit).commit()
  patched++
  if (edit.title) console.log(`  title  ${slug}\n         ${post.title.length} -> ${edit.title.length} chars`)
  if (edit.lede) console.log(`  lede   ${slug}\n         ${post.lede.length} -> ${edit.lede.length} chars`)
}

if (missing.length) console.log(`\nNot found: ${missing.join(', ')}`)

const after = await client.fetch('*[_type=="post"]{title,lede}')
const t = after.map((p) => p.title.length)
const l = after.map((p) => p.lede.length)
console.log(`\n${patched} documents patched`)
console.log(`  titles now ${Math.min(...t)}-${Math.max(...t)} chars`)
console.log(`  ledes  now ${Math.min(...l)}-${Math.max(...l)} chars`)
