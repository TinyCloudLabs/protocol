---
type: concept
title: Data APIs
description: The client surface for reading and writing a space's data across the KV, SQL, and DuckDB services, each call an authorized invocation.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/sdk-services/src/kv/KVService.ts
  - repo: js-sdk
    path: packages/sdk-services/src/sql/SQLService.ts
  - repo: js-sdk
    path: packages/sdk-services/src/duckdb/DuckDbService.ts
tags: [sdk, data]
timestamp: 2026-06-23
---

# Data APIs

The **data APIs** are the client methods for reading and writing a [[autonomic-space|space]]'s data through the [[kv|KV]], [[sql|SQL]], and [[duckdb|DuckDB]] [[services|services]]. Every call is an authorized [[invocation]] under the hood — the SDK signs it with the [[session-keys|session key]] and the [[nodes|node]] verifies the [[capabilities|capability]] chain ([[cacao-chain-validation]]).

## Shape

- **KV** (`KVService`): `get / put / batchPut / list / delete / head / createSignedReadUrl / withPrefix` → `tinycloud.kv/*`.
- **SQL/DuckDB** (`SQLService`/`DuckDbService`): `db().query / execute / batch / executeStatement / export` → `tinycloud.sql/*` / `tinycloud.duckdb/*`.
- Per-space helpers: **`kvForSpace(spaceId)`**, **`sqlForSpace(spaceId)`** target a space other than the default.
- All methods are **`Result`-typed** (explicit ok/err rather than throwing).

## Mechanics

Each method builds the [[capabilities|capability]] [[invocation]] (resource `{spaceId}/{service}[/path]` + ability) and sends it with the session [[ucan|UCAN]]; the [[nodes|node]] authorizes and dispatches to the [[services|service]]. Authority must already exist — these APIs *use* [[capabilities]] granted at [[sign-in-flow|sign-in]] or via the [[delegation-api]].

## Example

From the browser, a signed-in `TinyCloudWeb` reads and writes the owner's [[kv|KV]] directly. Every call returns a `Result`:

```ts
import type { TinyCloudWeb } from "@tinycloud/web-sdk";

async function saveNote(tcw: TinyCloudWeb, id: string, body: string) {
  const put = await tcw.kv.put(`notes/${id}`, body);
  if (!put.ok) throw new Error(put.error.message);

  const got = await tcw.kv.get(`notes/${id}`);
  if (!got.ok) throw new Error(got.error.message);
  return got.data.data; // the stored value
}
```

On a backend, a [[tee-backends|delegated]] `DelegatedAccess` (from `node.useDelegation(...)`) exposes the same surface, and `access.sql.db(name)` targets a named SQLite database (the bare `access.sql` shortcut uses the db named `default`):

```ts
import type { DelegatedAccess } from "@tinycloud/node-sdk";

async function listNotes(access: DelegatedAccess) {
  const sql = access.sql.db("main");
  const res = await sql.query(
    "SELECT id, title FROM notes ORDER BY updated_at DESC",
    [],
  );
  if (!res.ok) throw new Error(res.error.message);
  return res.data.rows; // rows aligned to res.data.columns
}
```

Schema setup uses the migration primitive rather than cold DDL in a hot path — `sql.db("main").migrations.apply({ namespace, migrations: [{ id, sql: [...] }] })` — and the SQL resource must request the `tinycloud.sql/schema` action (see [[tinycloud-app-kit]]).

## Relationships

Client surface over [[kv]] / [[sql]] / [[duckdb]]; each call an [[invocation]] of a [[capabilities|capability]]; scoped to an [[autonomic-space|space]]; authority comes from [[sign-in-flow]] / [[delegation-api]]; used along the [[getting-started]] path; also reachable from the [[cli]].

## Status & drift

Shipped. `Result`-typed surface; per-space helpers (`kvForSpace`/`sqlForSpace`) are recent additions.

## Sources
- `js-sdk`: `packages/sdk-services/src/{kv/KVService.ts, sql/SQLService.ts, duckdb/DuckDbService.ts}`
