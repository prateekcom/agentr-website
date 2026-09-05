# Blog illustrations

Illustrations are no longer made in this repo, and no longer live in it.

Every post carries its own drawing, uploaded with the post and served from
Sanity's CDN. The build just renders whatever image the post has; it does not
choose, match or generate one.

**To draw an illustration**, use the standalone toolkit: `agentr-illustrations`.
It holds the kit, the house style, the earlier drawings as worked examples, and
a validator that says whether a new drawing has drifted off theme. It needs
neither this repo nor AWS, so the person writing a post can make its picture
without being able to break the site.

**To publish one**, attach both files it produces to the post in Sanity:
`<slug>.svg` as the **Banner image**, `<slug>-social.jpg` under **Search engine
overrides → Social share image**. Both are needed — the CDN will not convert an
SVG, and Facebook, LinkedIn and X will not render one.

A post published without an image still publishes; it just has no picture. The
build prints the slug of any post in that state.

The 33 drawings this repo used to generate are now Sanity assets. Their source
is in the toolkit's `reference/library.mjs`; the history is in this repo up to
commit 292a3a5.
