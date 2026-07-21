---
type: reference
title: Open Knowledge Format (OKF)
description: The agent-readable knowledge bundle format this repository uses — markdown files with YAML frontmatter, reserved filenames, cross-links, and index files for progressive disclosure.
resource: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
sources:
  - repo: GoogleCloudPlatform/knowledge-catalog
    path: okf/SPEC.md
tags: [framing, meta, bundle-format, okf]
timestamp: 2026-07-02
---

# Open Knowledge Format (OKF)

OKF v0.1 is an open, human- and agent-friendly format for representing knowledge as a directory of markdown files with YAML frontmatter. It is intentionally minimal: no schema registry, no central authority, and no required tooling. If you can `cat` a file, you can read OKF; if you can `git clone` a repo, you can ship it.

**This repository is an OKF bundle.** Everything under `concepts/`, `meta/`, `index.md`, `log.md`, and `llms.txt` follows OKF conventions. See [SCHEMA.md](../../SCHEMA.md) for this bundle's specific profile.

## Core concepts

### Knowledge Bundle

The unit of distribution: a directory tree of markdown files, typically a git repository. Concept IDs are file paths within the bundle minus the `.md` suffix (e.g. `foundations/thesis`).

### Concept Documents

Each non-reserved `.md` file is one **concept**. Every concept has two parts:

1. A **YAML frontmatter block** (`---` delimited). The only required field is `type`. Recommended fields: `title`, `description`, `resource`, `tags`, `timestamp`. This bundle also requires `status` and `sources` on concept pages (see [SCHEMA.md](../../SCHEMA.md)).
2. A **markdown body** with free-form content. Conventional section headings: `# Schema`, `# Examples`, `# Citations`.

### Resource-bound concepts (§4.3)

When a concept describes a specific external asset, the frontmatter includes a `resource:` field set to the canonical URI of that asset. This page itself is a resource-bound concept: `resource` points at the OKF spec on GitHub.

### Reserved filenames

| Filename   | Purpose                                                   |
|------------|-----------------------------------------------------------|
| `index.md` | Directory listing for progressive disclosure (see §6).    |
| `log.md`   | Chronological update history (see §7).                    |

All other `.md` files are concept documents.

### Cross-links

Standard markdown links between concept documents form directed edges in the knowledge graph. Two forms are valid:

- **Absolute (bundle-relative):** `/concepts/authorization/capabilities.md` — stable when files move within their subdirectory.
- **Relative:** `../authorization/capabilities.md` — standard markdown relative path.

Consumers build a link graph from these edges. Broken links are tolerated — a missing target is not-yet-written knowledge.

### Index files

`index.md` files enumerate a directory's contents under one or more section headings, each item as a markdown list entry with a short description. They enable **progressive disclosure**: an agent reads the index first, then drills into individual concepts. Index files at any level have no frontmatter (or only a bundle-root `okf_version` key in the root `index.md`).

### Citations (§8)

Claims sourced from external material go under a `# Citations` heading at the bottom of the document, numbered `[1]`, `[2]`, etc.

### Conformance

A bundle is conformant with OKF v0.1 if every non-reserved `.md` file has parseable frontmatter with a non-empty `type` field, and every reserved filename follows the structure in §6/§7. All other constraints are soft guidance; consumers must tolerate unknown types, unknown keys, and broken links.

## How this repo uses OKF

| OKF construct        | This repo                                                                 |
|----------------------|---------------------------------------------------------------------------|
| Knowledge bundle     | The repository root (`TinyCloudLabs/protocol`)                            |
| Concept documents    | Every file under `concepts/` with `type: concept` or `type: reference`   |
| `index.md` per dir   | `concepts/<section>/index.md` files for progressive disclosure            |
| Bundle root `index.md` | `index.md` — the root catalog listing all sections                      |
| `log.md`             | `log.md` — append-only chronological change history                      |
| Agent bundle hint    | `llms.txt` at the repo root — crawler/agent entry point for the bundle    |
| Bundle schema/profile | `SCHEMA.md` — the OKF profile and per-bundle frontmatter conventions    |
| `resource:` field    | Used on reference pages that describe an external canonical asset         |
| `# Citations`        | Bottom of each concept that makes claims from external sources            |

The site at `protocol.tinycloud.xyz` renders the bundle in place: Astro reads `concepts/` as a content collection and generates a static site. The bundle is also served raw for agent consumption via `/llms.txt`.

## Relationship to similar formats

OKF is intentionally close to:

- LLM "wiki" repositories using markdown + frontmatter as agent-readable knowledge bases.
- Personal knowledge tools (Obsidian, Notion) using hierarchical markdown with cross-links.
- "Metadata as code" approaches that store catalog metadata alongside source code.

OKF differs in being **specified** — it pins the small set of rules needed for interoperability without dictating tooling.

## Citations

[1] [Open Knowledge Format v0.1 Spec](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) — GoogleCloudPlatform/knowledge-catalog
