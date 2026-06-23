---
type: concept
title: Per-Space SQL
description: The SQL service that gives every space its own isolated SQLite database (in-memory, promoted to an on-disk file past a 10 MiB threshold), gated by ability + table/column caveats; with an optional parallel DuckDB analytical service.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/sql/service.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/sql/database.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/sql/authorizer.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/sql/storage.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/mod.rs
tags: [storage, sql, sqlite, duckdb]
timestamp: 2026-06-23
---

# Per-Space SQL

The **SQL service** gives each [[autonomic-space|space]] its own private, isolated **SQLite** database, addressed and authorized exactly like any other [[services|service]] — a `tinycloud.sql/*` [[capabilities|ability]] over a `…/sql/{db-name}` resource. A space's SQL data lives in its own database (one actor + one file per `(space, db_name)`), never co-mingled with another space's, and every statement is run through a runtime authorizer that enforces the invoker's [[capabilities|capability]] down to the table and column. An optional parallel **DuckDB** service (feature `duckdb`) offers the same model for analytical/columnar workloads.

## Role

Per-space SQL is a [[architecture-layers|Layer 1]] [[services|service]] alongside KV: where the [[blob-store]]/KV path stores opaque values, the SQL service stores *queryable relational state* a space owns. It is mounted on the same `/invoke` route and authorized by the same [[capabilities|capability]] machinery — the difference is only in dispatch (`service == "sql"`, ability `tinycloud.sql/…`) and in the fine-grained policy applied *inside* the database engine. This is what makes a space a small structured datastore, not just a key→blob map.

## Mechanics

### One database per (space, db_name)

`SqlService` (`sql/service.rs`) holds a `DashMap<(String, String), DatabaseHandle>` keyed by `(space.to_string(), db_name)` — so a space can have multiple named SQL databases. The `db_name` is the **last path segment** of the resource (`SqlService::db_name_from_path`: `path.split('/').next_back()`, defaulting to `"default"`). Each handle is an actor task (`spawn_actor`, `sql/database.rs`) owning a `rusqlite::Connection`; the server route resolves the cap scope and forwards a `SqlRequest` to the right handle (`routes/mod.rs:1043-1093`, dispatched when `r.service() == "sql" && ability.starts_with("tinycloud.sql/")`, `routes/mod.rs:644`).

### In-memory, promoted to file

A database **starts in memory** (`StorageMode::InMemory`, `sql/storage.rs`) and is **promoted to a file** the moment its size crosses the **memory threshold** — default **10 MiB** (`default_sql_memory_threshold = ByteUnit::Mebibyte(10)`, `config.rs:222`). On each operation the actor checks `current_size` (`page_count * page_size`) and, past the threshold, calls `promote_to_file`, switching `mode` to `StorageMode::File({base_path}/{space}/{db_name}.db)` (`database.rs:114-122`). If the file already exists at spawn, it opens directly from disk. The base path defaults to `{datadir}/sql`. Writes are durably captured as an exported **database artifact** persisted through the [[metadata-db|artifact repository]] after any statement that touched a write target, so the authoritative copy survives actor death and is restored on respawn.

### In-engine authorization

The security boundary is `create_authorizer(caveats, ability, is_admin)` (`sql/authorizer.rs`), an rusqlite `AuthContext` hook consulted for **every** SQL action:

- **ATTACH / DETACH are always denied** — a database cannot reach outside its own file.
- **Pragmas** are whitelisted (read-only set) unless `is_admin`; **functions** are whitelisted.
- **Reads** (`AuthAction::Read`) are gated by the [[attenuation|caveats']] table/column allow-lists (`SqlCaveats::is_table_allowed` / `is_column_allowed`).
- **Writes** (`Insert`/`Delete`/`Update`) are **denied outright** for the read-only abilities `tinycloud.sql/read` and `tinycloud.sql/select`, and otherwise gated by `is_write_allowed` + the table allow-list (`sql/caveats.rs`).

So the ability (`tinycloud.sql/read|select|write|admin|*`) sets the coarse mode and the `SqlCaveats` narrow it to specific tables/columns — the SQL analog of the [[uri-addressing-grammar|path-prefix]] attenuation used for KV.

## Shape

A SQL invocation carries a `tinycloud.sql/{action}` ability over resource `…:{space}/sql/{db_name}` and a `SqlRequest` body (query/execute/batch/export). The on-disk artifact for a promoted database is `{sql_base}/{space}/{db_name}.db` (with WAL/SHM siblings). Export produces a complete checkpointed `.db` payload (`handle_export`), the unit stored as a [[metadata-db|database artifact]].

## Relationships

A `tinycloud.sql/*` [[capabilities|ability]] over a `/sql/{db}` resource named per [[uri-addressing-grammar]]; authorized by the same [[delegation]]/[[invocation]] chain as KV, then further narrowed in-engine by [[attenuation|SqlCaveats]]; its durable artifacts and pointers are stored in the [[metadata-db]] (the live `.db` files are separate on-disk state, like the [[blob-store]]); per-[[autonomic-space|space]] isolation mirrors how the [[blob-store]] namespaces content by `SpaceId`. DuckDB is a parallel [[services|service]] (`tinycloud.duckdb/*`).

## Example

An owner delegates `tinycloud.sql/select` over `…:default/sql/notes` with a caveat allowing only table `entries`. An agent invokes `SELECT body FROM entries`; the actor for `(…:default, notes)` runs it, the authorizer allows the read of `entries` and denies any `INSERT`/`UPDATE`/`ATTACH`. If `notes` had grown past 10 MiB it now lives at `{datadir}/sql/{space}/notes.db`; otherwise it is still in memory, backed by its last exported artifact.

## Status & drift

Shipped. The optional **DuckDB** service (`tinycloud-core/src/duckdb/`, feature `duckdb`) is a structurally parallel per-space service with its own caveats/authorizer/parser and Arrow-IPC export — but it is a **separate database**, not DuckDB attached to the SQLite file: the KV↔DuckDB bridge is explicitly **"not yet available"** (`duckdb/database.rs:309`). Spec note: `specs/duckdb-service.md` is in-tree. See [[meta/contradictions]].

## Sources
- `tinycloud-node`: `tinycloud-core/src/sql/service.rs` (`SqlService`, `db_name_from_path`, artifact persistence), `tinycloud-core/src/sql/database.rs` (`spawn_actor`, 10 MiB promote, `handle_export`), `tinycloud-core/src/sql/storage.rs` (`StorageMode`, `current_size`, `promote_to_file`), `tinycloud-core/src/sql/authorizer.rs` (`create_authorizer`: deny ATTACH/DETACH, ability+caveat gating), `tinycloud-node-server/src/config.rs:218-231` (10 MiB default threshold), `tinycloud-node-server/src/routes/mod.rs:644,1043-1093` (dispatch)
