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

Sanity's webhook calls GitHub's `workflow_dispatch` endpoint, which starts the
same "Deploy" workflow the "Run workflow" button does. GitHub documents the
permission that endpoint needs as **"Actions" repository permissions (write)**
and nothing else, so the token cannot push code. (The `repository_dispatch`
trigger also present in `deploy.yml` would need Contents: write instead, which
is why it is not used.)

Create a fine-grained GitHub token that may only start workflows:

1. GitHub → profile picture → Settings → Developer settings → Personal access
   tokens → **Fine-grained tokens** → Generate new token
2. Resource owner: the organisation that owns the production repo
3. Repository access: **Only select repositories** → the production repo
4. Repository permissions: **Actions: Read and write**. Nothing else.
5. Copy the token — it is shown once. If the organisation requires approval for
   fine-grained tokens, it stays "pending" until an owner approves it.

Then in Sanity → **Manage → API → Webhooks → Create webhook** (needs the
Administrator or Developer role on the project):

| Field | Value |
|---|---|
| Name | `Rebuild site` |
| URL | `https://api.github.com/repos/<owner>/<repo>/actions/workflows/deploy.yml/dispatches` (production: `Vibencode-Solutions/agentr-landing-page`) |
| Dataset | `production` |
| Trigger on | Create, Update, Delete |
| Filter | `_type == "post"` |
| Projection | `{"ref": "main"}` |
| HTTP method | `POST` |
| API version | `v2021-03-25` |

The projection *is* the request body: GitHub requires `ref`, the branch to run
the workflow on. Without it GitHub answers 422 and nothing runs.

Headers:

```
Authorization: Bearer <the token>
Accept: application/vnd.github+json
Content-Type: application/json
```

The token belongs only in Sanity's webhook settings, never in a commit. It
expires on the date chosen at creation, and the webhook stops working with it.

GitHub only runs the workflow if `deploy.yml` with its `workflow_dispatch`
trigger exists on the default branch, so the webhook is inert until the blog
branch is merged. Test it afterwards: republish any post and a "Deploy" run
should appear in Actions within seconds.

### 3. Private dataset (only if you make one)

The dataset is public by default, and the build needs no credentials. If it is
ever switched to private, add a read token as the repository secret
`SANITY_API_READ_TOKEN`; `deploy.yml` already passes it through.

---

## Writing a post

Go to https://agentr.sanity.studio → **Blog posts** → Create.

Required: Title, URL (click Generate), Standfirst, Author, Publish date, Body.

**Every post carries its own drawing, uploaded with the post.** The build does
not choose or generate one any more. Make it with the `agentr-illustrations`
toolkit and attach both files it produces: `<slug>.svg` as the **Banner image**
and `<slug>-social.jpg` under **Search engine overrides → Social share image**.
A post without an image still publishes, with no picture; the build prints its
slug. `.github/ILLUSTRATION-GUIDE.md` has the details.

- A **future publish date** keeps the post off the site until that date, but only
  a build after that date will pick it up.
- **Never change the URL after publishing** — every existing link to the post
  breaks. Sanity does not create a redirect.
- **Search engine overrides** at the bottom are optional; left empty, the title
  and standfirst are used.

---

## Running it locally

Needs Node 22.12 or newer (`nvm use 22`).

```bash
npm ci --omit=dev
npm run build:blog     # renders /blog/ from Sanity
python -m http.server 8000
```

Then open http://localhost:8000/blog/.

Or, to see exactly what the deploy would put in the bucket, served the way
CloudFront serves it (directory URLs, real 404 status, content types):

```bash
docker compose -f docker/docker-compose.yml up --build
```

Then open http://localhost:8080/blog/. The image runs the same build with the
same S3 exclude list, so `scripts/`, `package.json`, `docker/` and
`irrelevent/` are not reachable, as in production.

The build reads **published** posts only, so a draft will not appear locally.
Set `INCLUDE_SCHEDULED=1` to preview a future-dated post; never in the deploy.

---

## How the generated pages stay on-brand

`scripts/lib/template.mjs` lifts the nav, mobile menu, footer, Google Tag Manager
snippet, favicons and font links out of a page that already ships rather than
keeping a second copy. It tries `about/index.html` first, then `pricing/`,
`contact/`, `for-candidates/` and `platform-security/`; the first that parses
wins, and every other depth (`/blog/<slug>/`, `/blog/page/2/`) is derived from
it. Editing the nav in those pages updates the blog on the next build.

Two consequences worth knowing:

- If none of those five pages can be parsed the build **fails with a clear
  message** rather than shipping a broken page.
- Asset paths on this site are relative, so the source page must be one level
  deep, like `/about/`. Do not move the sources to a different depth.

## Things that will bite

- **`.gitignore` ignores `*.html` except files named `index.html`.** Any page
  written to another filename is silently untracked and never deploys. The
  generator only ever writes `<slug>/index.html`.
- **The S3 sync runs `--delete`.** Build tooling (`scripts/`, `node_modules/`,
  `package.json`) is excluded so it is not published; anything wrongly excluded
  is deleted from the bucket instead.
- **Deleting a post in Sanity deletes the page.** The build prunes `/blog/`
  directories with no matching published post, and the URL then 404s.
