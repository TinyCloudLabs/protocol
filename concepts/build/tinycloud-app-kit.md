---
type: reference
title: tinycloud-app-kit
description: The app-package contract repo — manifest v1 JSON schema, the knowledge-bundle format and its frontmatter schema, a dependency-free validator, and two Claude skills for authoring and reviewing app packages.
status: shipped
layer: tinycloud-app
sources:
  - repo: tinycloud-app-kit
    path: README.md
  - repo: tinycloud-app-kit
    path: schemas/tinycloud-app-manifest.v1.schema.json
  - repo: tinycloud-app-kit
    path: schemas/tinycloud-app-knowledge-frontmatter.v1.schema.json
  - repo: tinycloud-app-kit
    path: guides/sql-schema-and-migrations.md
  - repo: tinycloud-app-kit
    path: skills
tags: [applications, manifest, reference, app-kit]
timestamp: 2026-07-02
---

# tinycloud-app-kit

[`tinycloud-app-kit`](https://github.com/TinyCloudLabs/tinycloud-app-kit) is the **contract reference** for a TinyCloud app package: what a [[manifest-model|manifest]] may contain, what a *knowledge bundle* is and how its files are shaped, a dependency-free linter that checks both, and two Claude skills that author and review app packages against these rules. It ships **schemas, examples, guides, and skills** — no runtime code. For the runnable substrate use [[tinyboilerplate]]; for the concepts use [[how-apps-work]] and [[manifest-model]]. This page encodes the substance; the repo has the full text.

A TinyCloud app package has three inspectable parts: `manifest.json` (identity + [[capabilities|capabilities]] it needs), app code (browser/backend/storage/delegation behavior), and `knowledge/` (what the app's resources mean, so humans and agents can operate them safely). The runtime app contract is `/api/manifest`; the backend delegation policy is `/api/server-info`.

## Manifest v1 schema

The manifest schema is published at **`https://schemas.tinycloud.xyz/app-manifest/v1.json`** (`schemas/tinycloud-app-manifest.v1.schema.json`). It is the JSON-Schema formalization of the [[manifest-model|SDK manifest model]] — the two are kept in sync, and app-kit is the canonical schema home. Required: `app_id` and `name`. Notable fields:

| Field | Meaning |
|---|---|
| `manifest_version` | `1` (missing means v1). |
| `app_id` | Stable application namespace and default path prefix. |
| `name` / `description` | Human-readable identity. |
| `did` | Delegate DID for this manifest (present → it's a [[capability-composition|delegation target]]). |
| `space` | Default [[system-spaces|space]]; missing means `applications`. |
| `prefix` | Path-prefix override; missing means `app_id`, empty string disables prefixing. |
| `defaults` | `boolean` or `"none"`/`"standard"`/`"admin"`/`"all"` — the built-in [[capabilities|capability]] tier. |
| `expiry` | Default permission expiry as an ms-style duration (`30d`, `2h`). |
| `includePublicSpace` | Include the public space in the request. |
| `knowledge` | `true` (default `knowledge/index.md`) or a `knowledge/*.md` root path. |
| `permissions[]` | Explicit [[capabilities|capability]] entries: `{ service, path, actions[], space?, skipPrefix?, description? }`. |
| `resources` | Structured, self-documenting `{ kv[], sql[], duckdb[], secrets[] }` declarations. |

The `resources` block is app-kit's richer, documentation-oriented way to declare data. Each entry carries a `name`, a `description`, optional `capabilities[]`, and a `sensitivity` (`public` / `user-data` / `private` / `secret-reference` / `derived` / `ephemeral`). A `sql` resource additionally names an `engine: "sqlite"`, an optional `schema` file, and a `migrations[]` list of `{ id, sql[] }` — the migration primitive (see below). A `secrets` resource documents a `name`, `required`, `consumers[]`, and `rotation` — a **reference**, never a value.

The minimal example (`examples/minimal-app`) declares one app-scoped KV namespace:

```json
{
  "manifest_version": 1,
  "app_id": "com.example.minimal",
  "name": "Minimal App",
  "knowledge": true,
  "resources": {
    "kv": [
      {
        "name": "settings",
        "prefix": "settings/*",
        "description": "User preferences stored as JSON documents.",
        "capabilities": ["tinycloud.kv/get", "tinycloud.kv/put", "tinycloud.kv/list"],
        "sensitivity": "user-data"
      }
    ]
  }
}
```

## Knowledge bundle

The knowledge bundle is a small set of markdown files that explain the app's resources so an agent can operate them safely. Enabled with `knowledge: true` (root `knowledge/index.md`) or an explicit `knowledge/*.md` path. Conventional layout:

```text
knowledge/
  index.md        # explains the app without requiring traversal
  resources.md
  sql.md          # databases, tables, derived state, mutation rules
  kv.md           # prefixes, value shape, lifecycle, deletion policy
  secrets.md      # references, consumers, rotation — never values
  operations.md
```

Keep the bundle flat until a category is large enough to warrant nesting; create a category file only for a category actually in use; never write a secret value. Each file carries frontmatter validated by `schemas/tinycloud-app-knowledge-frontmatter.v1.schema.json`: required `type` (one of `TinyCloud App` / `Manifest` / `Resources` / `KV` / `SQL` / `DuckDB` / `Secrets` / `Operations`) and `title`, plus an optional `tinycloud` block (`app`, `service`, `profile: tinycloud.app.v1`, `sensitivity`, and `containsSecretValue: false`).

## SQL schema and migrations

App-kit's rule for SQLite: use the **migration primitive**, not cold `CREATE TABLE` in hot request paths. The app pattern is `sql.db(name).migrations.apply({ namespace, migrations: [{ id, sql[] }] })` with stable ordered ids. A resource that runs `CREATE`/`ALTER`/`DROP`/index DDL must request the **`tinycloud.sql/schema`** action (in addition to `read`/`write`). The permission path must match the database name used at runtime, and the SDK shortcut `tc.sql.execute(...)` targets the database named `default` (equivalent to `tc.sql.db("default").execute(...)`). Materialized indexes should be rebuildable from canonical data and marked as caches in `knowledge/sql.md`. (See [[data-apis]] for the runtime SQL surface and [[example-listen|Listen]] for the SQLite authorizer's `PRIMARY KEY`-only constraint.)

## Validation

```bash
npm run lint
```

The linter is dependency-free (`scripts/lint.mjs`). It parses schema/example JSON, checks `knowledge` pointers, verifies example knowledge roots exist, catches secret-safety mistakes, and flags SQL migrations that forgot `tinycloud.sql/schema`.

## Skills

Two Claude skills encode the authoring and review workflow:

- **`tinycloud-app-authoring`** — create/update an app package: read the manifest, validate identity/permissions/resources/knowledge, keep knowledge flat, document only the services in use, keep capability detail next to its resource, never write secret values, and use the migration primitive for SQLite.
- **`tinycloud-manifest-review`** — review before shipping, findings-first: missing/invalid fields, capabilities that don't match declared resources, secret values committed to files, resources lacking agent operating context, excessive nesting, and schema setup that bypasses migrations.

## Relationships

The contract reference for the [[manifest-model|manifest]] and [[how-apps-work|app package]]; its schema is the formalization consumed by the SDK; the runnable counterpart is [[tinyboilerplate]]; used along the [[getting-started]] path; its migration guidance feeds the [[data-apis|SQL data API]]; the worked package is [[example-listen|Listen]].

## Status & drift

Shipped as the canonical schema + authoring home. It stops at manifest + knowledge + validation: it defines **no** app-registration / `app_id`-claiming flow and **no** deploy target — those belong to [[getting-started]] and [[tinyboilerplate]]. The `defaults` enum in the JSON schema (`none`/`standard`/`admin`/`all`) is the documentation-facing spelling of the SDK's boolean/string tiers ([[manifest-model|manifest model]] is canonical for exact resolution).

## Sources
- `tinycloud-app-kit`: `README.md` (three parts, package rules, contents, validation), `schemas/tinycloud-app-manifest.v1.schema.json` (fields + `resources`/`sensitivity`/`migration` defs), `schemas/tinycloud-app-knowledge-frontmatter.v1.schema.json` (frontmatter), `guides/sql-schema-and-migrations.md` (migration primitive, `tinycloud.sql/schema`, `default` db), `skills/{tinycloud-app-authoring,tinycloud-manifest-review}/SKILL.md`
- Repo: https://github.com/TinyCloudLabs/tinycloud-app-kit
