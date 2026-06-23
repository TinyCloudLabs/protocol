---
type: reference
title: Bundle Schema & Conventions
description: The OKF profile and authoring conventions for this knowledge bundle.
timestamp: 2026-06-22
---

# Bundle Schema & Conventions

This bundle follows the **Open Knowledge Format (OKF) v0.1**. A bundle is a directory of markdown
files; each file is one **Concept**, and a concept's **ID** is its path within the bundle minus the
`.md` suffix.

## Frontmatter fields

Every file carries YAML frontmatter.

| Field | Required | Notes |
|-------|----------|-------|
| `type` | **yes** | `concept`, `index`, `reference`, or `log`. |
| `title` | recommended | Human-readable title. |
| `description` | recommended | One-line summary used in indexes and the viz panel. |
| `status` | concepts | One of `shipped`, `in-progress`, `planned`. |
| `resource` | optional | Canonical id when applicable, e.g. `tinycloud.kv/*`. Omit if n/a. |
| `sources` | concepts | Provenance list of `{ repo, path? }`. **Required on every concept.** |
| `tags` | recommended | Area tags. |
| `timestamp` | recommended | ISO date of last edit. |

Consumers must tolerate unknown keys.

## Reserved files

- `index.md` — a directory listing for **progressive disclosure**. An agent reads the index first,
  then drills into individual concepts.
- `log.md` — append-only chronological history of bundle updates (bundle root).

## Cross-links are edges

Every markdown link between concept documents is a **directed edge** in the knowledge graph. Author
dense cross-references; the visualizer derives the graph from these links.

## Status values

- `shipped` — present and working in code today.
- `in-progress` — partially implemented or actively being built.
- `planned` — designed or named but not in code.

## Provenance requirement

**Every concept MUST cite sources.** The `sources` frontmatter and the `## Sources` body section
both record where the concept's claims come from (repo + path). Technical claims should be validated
against source repos before authoring (see `scripts/cx` in the README).
