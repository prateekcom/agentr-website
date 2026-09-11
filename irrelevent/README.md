# irrelevent/

Files that are in the repository's history but are not needed for the site to
build or deploy. Kept here rather than deleted so nothing is lost; excluded from
the S3 sync in `.github/workflows/deploy.yml`, so nothing in this folder is
ever published.

| File | Why it is here |
|---|---|
| `assets/investor-1.jpeg` | 4.8 MB original of `assets/investor-1.jpg`. No page references it. The 156 KB `.jpg` is what `investors/index.html` uses. |
| `assets/investor-2.jpg` | No page references it. |
| `scripts/import-blogs.mjs` | One-off tool that converted the 27 archive posts from markdown into an NDJSON file for `sanity dataset import`. The import is done; the posts live in Sanity now. Needs `@portabletext/markdown`, which was removed from `package.json` with it. To run it again: `npm i -D @portabletext/markdown` then `node irrelevent/scripts/import-blogs.mjs <folder>`. |

Everything else in the repo is either served, or read by `scripts/build-blog.mjs`
at build time (see `scripts/lib/template.mjs` for the pages it lifts the nav and
footer from).
