# TinyCloud Protocol — site

A custom **Astro 5** static site that renders the OKF protocol concept bundle in
`../concepts` as a human-readable reference, on top of the agent-readable
markdown. `concepts/` stays the source of truth; Astro renders it **in place**
via the content-layer `glob()` loader — nothing under `concepts/`, `meta/`,
`bin/`, or the root `llms.txt`/`index.md`/`log.md` is moved or modified by the
build.

Package manager / runner: **Bun** (matches the TinyCloud stack). Astro runs
under Bun.

## Develop

```bash
cd site
bun install
bun run dev        # http://localhost:4321  (predev copies raw md into public/)
```

## Build

```bash
cd site
bun install
bun run build      # output -> site/dist
```

The build runs three phases:

1. **prebuild** (`scripts/copy-static.mjs`) — copies the agent-readable source
   into `public/` so the deployed site serves it verbatim:
   - `../concepts/**/*.md` -> `dist/concepts/**/*.md`
   - `../llms.txt` -> `dist/llms.txt`
   - `../index.md`, `../log.md` -> `dist/index.md`, `dist/log.md`
2. **build** — `astro build` (`output: 'static'`).
3. **postbuild** (`scripts/link-report.mjs`) — writes `dist/.broken-links.json`
   and prints the unresolved/ambiguous wikilink summary.

## How it works

- **Content collection** (`src/content.config.ts`): `glob()` loader with
  `base: '../concepts'`, a zod schema matching the frontmatter (`type`, `title`,
  `description`, `status`, `layer`, `resource?`, `sources`, `tags?`, `timestamp`,
  `provenance_note?`), `.passthrough()` to tolerate unknown keys.
  - Concept **id** = path under `concepts/` minus `.md`
    (e.g. `authorization/capabilities`). **URL** = `/<id>`, except section
    `index.md` files map to the section root (`authorization/index` -> `/authorization`).
- **Wikilink resolution** (`src/plugins/remark-wikilinks.mjs`): a custom remark
  plugin. Wikilinks are rewritten at the **raw-markdown** level (before inline
  parsing) so aliases containing inline code resolve correctly, then re-parsed.
  Resolution order for `[[target]]` / `[[target|alias]]` / `[[target#anchor]]`:
  1. exact full-id match (`policy-engine/overview`)
  2. bare section name -> that section's index (`nodes` -> `nodes/index`)
  3. unique leaf-name match (`capabilities` -> `authorization/capabilities`)
  4. same-section sibling when a leaf is ambiguous across sections
     (Obsidian "same folder first" — deterministic, not a guess)
  Otherwise the link is rendered as a visible `<span class="broken-link">` and
  recorded in the report. `[[#anchor]]` becomes a same-page link. Relative `.md`
  markdown links (`[x](../section/name.md)`) are rewritten the same way.
  The id map is built once in `astro.config.mjs` (`src/lib/id-map.mjs`) and
  passed to the plugin.
- **Backlinks** (`src/lib/concepts.ts` + `link-graph.mjs`): the reverse wikilink
  graph is computed at build from the same resolution rules; each concept page
  shows a "Referenced by" list.
- **Pages**: `/` (home: thesis + 3-layer model + section directory) and
  `/[...id]` (concept body + metadata rail: status/layer badges, resource,
  sources as `repo` + `path`, tags, provenance, backlinks). Sidebar is grouped
  by the 15 canonical sections with a layer filter.

## Lint

The bundle lint lives at `../bin/lint.sh` and is also exposed as `bun run lint`:

- **Frontmatter YAML validity** (`scripts/check-frontmatter.mjs`) — parses every
  file's YAML frontmatter and fails on parse errors. This catches bugs a Markdown
  *style* linter misses, e.g. an unquoted scalar containing a colon
  (`description: Foo: bar`), which YAML reads as a malformed nested mapping.
- **`type:` presence** and **orphan** checks (pre-existing).

Markdown *style* is linted separately with **rumdl**
(<https://github.com/rvben/rumdl>), configured strict in `../.rumdl.toml`:

```bash
pip install rumdl     # or: pipx install rumdl
rumdl check .         # from the repo root
rumdl fmt             # auto-fix the fixable subset
```

## Deploy — Cloudflare Pages

This repo is **not** wired to Cloudflare by this change; settings for reference:

- **Build command:** `cd site && bun install && bun run build`
  - If CF defaults to npm and you want Bun, set the `SKIP_DEPENDENCY_INSTALL`
    environment variable so CF does not run `npm ci` first, and let the build
    command's `bun install` handle deps.
- **Build output directory:** `site/dist`
- **Root directory:** repo root (the build `cd`s into `site`).

`site/node_modules`, `site/dist`, and the regenerated `public/` copies are
gitignored.
