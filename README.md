# TinyCloud Protocol — Knowledge Bundle

An **Open Knowledge Format (OKF)** knowledge bundle documenting the TinyCloud data protocol.
It publishes to **protocol.tinycloud.xyz** and doubles as an agent-readable graph: a directory of
markdown concepts with YAML frontmatter, dense cross-links, and per-directory `index.md` files for
progressive disclosure.

> **Thesis:** Signatures Are All You Need: cryptographic access control for AI and applications.

## What this is

- `index.md` — root catalog. Start here.
- `concepts/` — one markdown file per concept, grouped into sections.
- `meta/` — glossary, tracked contradictions, provenance/sources, and a status matrix.
- `SCHEMA.md` — the OKF profile and frontmatter conventions for this bundle.
- `log.md` — chronological change history.
- `llms.txt` — crawler/agent hint at the domain root.
- `bin/` — producer/validator/visualizer scripts.

This is currently a **scaffold**: structure, frontmatter, and stubs only. Concept bodies are
authored in a later pass.

## How to view

Build a self-contained force-directed graph (`viz.html`) — no backend, no install, no data leaves
the browser:

```sh
bin/build-viz.sh        # → viz.html (stub for now)
open viz.html
```

Nodes are colored by `type`; edges come from markdown cross-links; the detail panel renders
frontmatter + body, with "Cited by" backlinks, search, and type filters. Model the implementation
on `scaccogatto/okf-skills` or `GoogleCloudPlatform/knowledge-catalog` OKF `visualize`.

## How to author

Author concept bodies with the **codex-validator loop**: validate every technical claim against the
source repos before writing it down.

```sh
scripts/cx <repo> "<question>"   # ask a codex pane to confirm a claim against source
```

Conventions:

1. Keep one concept per file; the file path is the concept ID.
2. Fill the body from the cited `sources` only; do not invent claims.
3. Cross-link related concepts with normal markdown links (each link = a graph edge).
4. Set `status` to `shipped`, `in-progress`, or `planned` and keep it honest.
5. **Every concept must cite sources** (provenance). See `SCHEMA.md`.
6. When a source reveals a spec-vs-impl divergence, record it in `meta/contradictions.md`.

## Validate the bundle

```sh
bin/lint.sh             # asserts type frontmatter, lists orphans, prints a summary
```
