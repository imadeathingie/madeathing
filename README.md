# I Made A Thingie

A Jekyll theme for a maker's project blog — code, 3D prints, and CAD —
built around a "workbench pegboard" motif: a pegboard-textured hero and
footer, and project cards that look like index cards pinned up with
pushpins.

## Embedding a 3D model viewer

Any post can include an interactive, rotatable preview of an STL file —
handy for 3D print and CAD write-ups. It's built on Three.js, loaded
from a CDN, so there's nothing to install.

1. Drop your `.stl` file in `assets/models/`.
2. In the post's Markdown, add:

```liquid
{% include stl-viewer.html src="/assets/models/your-model.stl" %}
```

Optional parameters:

```liquid
{% include stl-viewer.html
   src="/assets/models/your-model.stl"
   height="500"
   color="#E85D2C"
   caption="v2, printed in PETG" %}
```

- `height` — viewer height in pixels (default `420`)
- `color` — model color as a hex string (default the brass `#B98B3E`;
  the sample posts use each category's badge color)
- `caption` — short text appended to the "drag to rotate" hint line

The viewer auto-fits the camera to the model, supports orbit/zoom via
mouse or touch, and has toolbar buttons for:

- **heatmap** (on by default) — colors the surface by height, pine-green
  at the base through brass to safety-orange at the top. Makes curvature
  and contours far easier to read than a single flat color. Turn it off
  to fall back to the flat `color` you set.
- **edges** (on by default) — overlays the model's facet edges as thin
  dark lines, so sharp features and the underlying mesh triangulation
  stand out clearly.
- **wireframe** — swaps to a see-through wireframe-only view.
- **auto-rotate** / **reset view** — as named.

Multiple viewers can appear on the same page.

Binary and ASCII STL are both supported. Very large files (tens of MB)
will be slow to load over the network — for print-in-place or highly
detailed scans, consider decimating the mesh before adding it here.

## Per-post scripts (`custom_scripts`)

Most posts need nothing beyond the site's default JS. For the rare post
that needs its own script (a puzzle player, a small interactive demo,
whatever), add a `custom_scripts` list to that post's front matter
instead of loading it site-wide:

```yaml
---
title: "..."
custom_scripts:
  - /assets/js/crossword-player.js
---
```

Each entry can be a plain path (loaded as a classic, deferred script),
or a hash for more control:

```yaml
custom_scripts:
  - src: /assets/js/some-module.js
    type: module
    defer: false
```

This is handled in `_layouts/default.html`, which reads `page.custom_scripts`
and injects the right `<script>` tags at the end of the page — so it
works on any post (or page) that sets the field, with zero cost to
every other post.

## Crossword builder & playable puzzles

There's a small crossword-making tool at `/crossword-builder/`
(`crossword-builder.html`) — a client-side React app (no build step;
Babel Standalone transpiles the JSX in the browser) for laying out a
grid, auto-numbering it, writing clues, and searching a dictionary API
for words matching a pattern like `C?T`. Its component code lives in
`assets/js/crossword-builder.js`; its styling is in the `.cwb-*` rules
in `assets/css/style.css`.

From the builder, **Export / Share** gives you two options:

- **Download JSON** — the puzzle data. Drop it in `assets/crosswords/`
  and embed it in a post:

  ```yaml
  ---
  title: "..."
  custom_scripts:
    - /assets/js/crossword-player.js
  ---
  ```
  ```liquid
  {% include crossword.html src="/assets/crosswords/your-puzzle.json" %}
  ```

  This renders a fill-in grid with check/reveal/clear controls, styled
  to match the rest of the site (`.crossword-*` rules, same
  stylesheet). `assets/js/crossword-player.js` fetches the JSON and
  supports multiple puzzles on one page.

- **Download Playable Puzzle (HTML)** — a fully standalone, self-styled
  HTML file with no dependency on this site at all, for sharing a
  puzzle with someone off-site.

## Running it locally

You'll need Ruby installed. Then:

```bash
bundle install
bundle exec jekyll serve
```

Visit `http://localhost:4000`.

## Deploying to GitHub Pages

This theme deploys via a **GitHub Actions** workflow
(`.github/workflows/pages.yml`), not the older "Deploy from a branch /
github-pages gem" method. That's deliberate: the legacy `github-pages`
gem pins Jekyll to an old 3.x release and only allows a short whitelist
of plugins, which causes exactly the kind of version-mismatch problems
this theme was hitting. Building with Actions instead means the site is
built with the modern Jekyll/gems declared in the `Gemfile` — the same
ones you're running locally — so there's no drift between what you see
on `localhost` and what ends up live.

To turn it on:

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**
   (not "Deploy from a branch").
4. Push to `main` — the **Deploy Jekyll site to Pages** workflow (visible
   under the **Actions** tab) builds and publishes the site automatically.
   It also runs on demand via **Actions → Deploy Jekyll site to Pages →
   Run workflow**.

Your site will be live at `https://<username>.github.io/<repo>/` (project
site) or `https://<username>.github.io/` if the repo is named
`<username>.github.io` (user site). The workflow sets the correct base
path for either case automatically — you don't need to edit `baseurl` in
`_config.yml` by hand.

### Gems

The `Gemfile` uses **Jekyll 4.3** directly, plus `jekyll-feed` and
`jekyll-seo-tag` in the `jekyll_plugins` group (both work fine outside
the legacy whitelist since Actions builds aren't restricted to it). It
also declares `webrick`, `csv`, `base64`, and `logger` explicitly —
Ruby 3.x stopped bundling these by default, and Jekyll's dependencies
still expect them. If `bundle install` ever complains about a missing
gem after a Ruby upgrade, that's almost always the fix: add the missing
stdlib gem to the `Gemfile` rather than downgrading Ruby or Jekyll.

## Adding a new project

Drop a new file in `_posts/`, named `YYYY-MM-DD-title.md`:

```yaml
---
title: "Your Project Name"
category: code        # must match a key in _config.yml categories_meta
tags: [tag-one, tag-two]
image: /assets/images/your-thumbnail.svg
excerpt: "One or two sentences — shows up on the card."
---

Your writeup here, in Markdown. Fenced code blocks, images, and
blockquotes are all styled.
```

## Adding a new category

Categories (and their badge colors) live in `_config.yml`:

```yaml
categories_meta:
  code:
    label: "Code"
    color: "#B98B3E"
  3dprint:
    label: "3D Print"
    color: "#E85D2C"
  cad:
    label: "CAD"
    color: "#43554B"
  electronics:          # add a new one here
    label: "Electronics"
    color: "#4A6670"
```

New categories automatically get a filter tab on the homepage and a badge
color everywhere — no template changes needed.

## Customizing the look

Every color, font, and radius in the theme is a CSS variable at the top
of `assets/css/style.css`:

```css
:root {
  --pegboard:      #5B7065;
  --kraft:         #E8DBC0;
  --safety-orange: #E85D2C;
  --brass:         #B98B3E;
  --font-display:  'Staatliches', sans-serif;
  --font-body:     'Karla', sans-serif;
  --font-mono:     'IBM Plex Mono', monospace;
  ...
}
```

Change those and the whole site re-skins consistently.

### Fonts

Loaded from Google Fonts in `_includes/head.html`. Swap the `<link>` and
the `--font-*` variables together if you want a different pairing.

### Thumbnails

The sample posts use simple SVG line-art thumbnails (in
`assets/images/`) instead of photos, matching a "blueprint sketch" style.
Swap in real photos of your builds any time — just point `image:` in the
post front matter at a `.jpg`/`.png` instead.

## Structure

```
_config.yml          site settings + category definitions
_layouts/
  default.html        base HTML shell
  home.html            hero + filter tabs + project grid
  post.html            single project page
_includes/
  head.html, header.html, footer.html
  project-card.html    the pinned index-card component
_posts/                your projects (3 samples included)
assets/
  css/style.css        the whole design system, token-driven
  js/filter.js          client-side category filtering
  images/                favicon + sample thumbnails
```

## Deploying

This is a stock Jekyll site, so it works as-is on GitHub Pages: push to a
repo, enable Pages in Settings, and set the source to your default branch
(GitHub Pages builds Jekyll sites automatically). For any other host, run
`bundle exec jekyll build` and deploy the generated `_site/` folder.
