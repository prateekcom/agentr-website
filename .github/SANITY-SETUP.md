# Blog: Sanity setup

Blog posts live in Sanity, not in this repo. The deploy renders them into
`/blog/<slug>/index.html` as plain static HTML before syncing to S3, so the
published pages have nothing to fetch at runtime and index normally in Google.

- **Sanity project:** AgentR — `lv2lv9h9`, dataset `production`
- **Writing tool (Studio):** https://agentr.sanity.studio
- **Studio source:** `studio-agentr/`, a standalone folder kept *outside* this
  repo, per Sanity's guidance that the Studio is not embedded in the app.

---

## How a post reaches the live site

```
write in Sanity  ->  Publish  ->  webhook  ->  GitHub Actions  ->  build  ->  S3 + CloudFront
```

Nothing is committed when a post is published. The `repository_dispatch` trigger
in `deploy.yml` runs the same deploy that a push to `main` runs.

---

## One-time setup

### 1. Publish the Studio (needs a Sanity login)

```bash
cd ../studio-agentr
npm install
npx sanity login          # opens a browser; must be done by a person
npx sanity schemas deploy # uploads the content model
npm run deploy            # publishes to agentr.sanity.studio
```

`sanity login` is interactive by design and cannot be automated.

### 2. Let Sanity trigger the deploy

Create a GitHub token that may only start workflows:

1. GitHub → Settings → Developer settings → **Fine-grained personal access token**
2. Repository access: this repository only
3. Permissions: **Contents: Read and write** (this is what `repository_dispatch`
   requires; it is the narrowest permission that works)
4. Copy the token — it is shown once

Then in Sanity → **Manage → API → Webhooks → Create webhook**:

| Field | Value |
|---|---|
| Name | `Rebuild site` |
| URL | `https://api.github.com/repos/<owner>/<repo>/dispatches` |
| Dataset | `production` |
| Trigger on | Create, Update, Delete |
| Filter | `_type == "post"` |
| HTTP method | `POST` |
| API version | `v2021-03-25` |
| Body | `{"event_type": "sanity-publish"}` |

Headers:

```
Authorization: Bearer <the token>
Accept: application/vnd.github+json
Content-Type: application/json
```

The token grants write access to this repository — treat it as a password. It
belongs only in Sanity's webhook settings, never in a commit.

### 3. Private dataset (only if you make one)

The dataset is public by default, and the build needs no credentials. If it is
ever switched to private, add a read token as the repository secret
`SANITY_API_READ_TOKEN`; `deploy.yml` already passes it through.

---

## Writing a post

Go to https://agentr.sanity.studio → **Blog posts** → Create.

Required: Title, URL (click Generate), Standfirst, Author, Publish date, Body.

**Leave the banner image empty.** The illustration is the default, not a
fallback: the build picks a motif from the library by reading the title, so a
post is illustrated the moment it is published and nobody has to make a picture.
Uploading a banner *overrides* that and takes the post out of the house style —
worth doing only when the post genuinely needs a specific photograph or chart.

Because the match is read off the title, **the title is what chooses the
picture**. Rewriting it can change the drawing. `.github/ILLUSTRATION-GUIDE.md`
has the full matching order and the list of motifs.

- A **future publish date** keeps the post off the site until that date, but only
  a build after that date will pick it up.
- **Never change the URL after publishing** — every existing link to the post
  breaks. Sanity does not create a redirect.
- **Search engine overrides** at the bottom are optional; left empty, the title
  and standfirst are used.

---

## Running it locally

```bash
npm install
npm run build:blog     # renders /blog/ from Sanity
python -m http.server 8000
```

Then open http://localhost:8000/blog/.

The build reads **published** posts only, so a draft will not appear locally.

---

## How the generated pages stay on-brand

`scripts/lib/template.mjs` lifts the nav, mobile menu, footer, Google Tag Manager
snippet, favicons and font links out of pages that already ship
(`views/when-everyone-is-using-bots/index.html` for post pages,
`about/index.html` for the index) rather than keeping a second copy. Editing the
nav in those pages updates the blog on the next build.

Two consequences worth knowing:

- Those two files are load-bearing. Renaming or deleting either **fails the
  build** with a clear message rather than shipping a broken page.
- Asset paths on this site are relative. `/blog/<slug>/` is two levels deep, the
  same as `/views/<slug>/`, and `/blog/` is one level deep, the same as
  `/about/`. That is why those specific files are the sources.

## Things that will bite

- **`.gitignore` ignores `*.html` except files named `index.html`.** Any page
  written to another filename is silently untracked and never deploys. The
  generator only ever writes `<slug>/index.html`.
- **The S3 sync runs `--delete`.** Build tooling (`scripts/`, `node_modules/`,
  `package.json`) is excluded so it is not published; anything wrongly excluded
  is deleted from the bucket instead.
- **Deleting a post in Sanity deletes the page.** The build prunes `/blog/`
  directories with no matching published post, and the URL then 404s.
