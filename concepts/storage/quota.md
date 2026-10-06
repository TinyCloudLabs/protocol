---
type: concept
title: Storage Quota
description: How a node bounds a space's storage — limit resolution (admin override, billing service, default), the 402/413 refusals on writes, what is never gated so reads keep working when full, and how the SDK and CLI report it.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/quota.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/mod.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/config.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/mod.rs@c99b312
  - repo: js-sdk
    path: packages/sdk-services/src/types.ts@d43e51ea
tags: [storage, quota, billing, errors]
timestamp: 2026-10-05
---

# Storage Quota

A **storage quota** is the byte limit a [[nodes|node]] enforces on one [[autonomic-space|space]]. The node measures a space's usage as its [[blob-store]] bytes plus its [[per-space-sql|SQL and DuckDB artifact]] bytes, and refuses writes that would grow a full space. Reads, lists, deletes and plain exports are never refused for quota, so **a full space stays readable**.

## Role

The quota is the node-side bound on [[architecture-layers|Layer 1]] storage. It is enforced per space, at the HTTP layer, before a write reaches the [[kv]], [[sql]] or [[duckdb]] service. It does not change authorization: a request still needs a valid [[capabilities|capability]] chain, and a write that is authorized can still be refused because the space is full.

## Mechanics

### Usage

`store_size(space)` is the space's block-store bytes plus the sum of its SQL/DuckDB artifact bytes (`tinycloud-core/src/db.rs:977-984`). A space with only SQL data reports its SQL bytes; a space with neither reports "not found".

### Limit resolution

`QuotaCache::get_limit` (`quota.rs:95`) picks the limit in this order:

1. **Admin override**, set by the node operator for one space.
2. **Billing service.** If the node is configured with a billing source, it asks that service for the space's limit and caches the answer. If the billing service is unavailable, the node keeps applying the last known limit.
3. **Node default**, from the node's configuration.
4. **None**: no limit.

Public spaces (the `public` [[system-spaces|system space]]) use a separate fixed limit, **10 MiB** by default (`default_public_storage_limit`, `config.rs:764`).

Clients learn about quota from the node's write responses; there is no client-facing quota API.

### Refusals

| Condition | Status | Body |
|---|---|---|
| Space usage already at or over its limit | **402** | `Storage quota exceeded. Used: N bytes, Limit: M bytes` (plain text) |
| One upload larger than the space's remaining bytes | **413** | `Write exceeds remaining storage. Used: N bytes, Limit: M bytes` |

The 402 check is at `routes/mod.rs:1137`; the streaming 413 check at `:1167`.

**Gated** (`routes/mod.rs:1211, 1578-1620, 2197-2216, 2694, 2760`):

- [[kv]] `put`, including multi-key batch puts;
- write-class [[sql]] statements;
- [[duckdb]] writes and `import`.

**Never gated**: reads (`get`, `metadata`, SQL/DuckDB reads), `list`, `kv/del`, and plain SQL/DuckDB exports. This is what keeps a full space usable for reading and cleanup.

### SQL and DuckDB

Write-class SQL and DuckDB requests are refused with 402 when the space is at or over its limit. Deleting rows does not currently reduce usage. See [[per-space-sql]].

## Node 1.18.0 (in-progress)

Node 1.18.0 (`c99b312`) is built but **not deployed**. It changes the quota surface (TC-626):

- 402 and 413 return **structured JSON** errors, optionally including account-level totals;
- a `tinycloud.space/info` read returns a space's usage;
- writes that do not grow a space are allowed when it is full.

## SDK and CLI

- **Stable SDK 3.0.0** defines `STORAGE_QUOTA_EXCEEDED` (402) and `STORAGE_LIMIT_REACHED` (413) (`packages/sdk-services/src/types.ts:103-104`) and maps them for [[kv]] only.
- **SDK 3.1.0-beta.2** (TC-619) maps the same codes for KV, SQL, DuckDB and the [[vault]], adds `isStorageFullError(error)` to detect either, and makes `migrations.apply()` read first so an already-applied schema does not need a write on a full space.
- **CLI 1.1.0 beta** exits with code **10** when a command fails because storage is full. Stable CLI 1.0.0 does not.

What to do when storage is full: https://docs.tinycloud.xyz/troubleshooting#storage-is-full.

## Relationships

Measures the [[blob-store]] plus the [[per-space-sql]] artifacts recorded in the [[metadata-db]]; gates writes of the [[kv]], [[sql]] and [[duckdb]] services; the [[vault]] and [[secrets-space|secrets]] inherit it through KV; enforced by the [[nodes|node]] HTTP layer described in [[node-architecture]]; separate from, and checked after, [[capabilities|capability]] authorization.

## Status & drift

`shipped` in production Node 1.17.3 (resolution, 402/413, gating). The structured errors and `tinycloud.space/info` of Node 1.18.0 are in-progress (built, not deployed). SDK coverage beyond KV and the CLI exit code are in the 3.1.0 / 1.1.0 betas, not in stable SDK 3.0.0 / CLI 1.0.0.

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `tinycloud-node-server/src/quota.rs:95` (`get_limit` order); `tinycloud-node-server/src/routes/mod.rs:1137` (402), `:1167` (413), `:1211` (batch put gate), `:1578-1620` (KV put gate), `:2197-2216` (SQL gate), `:2694, :2760` (DuckDB import/write gates); `tinycloud-node-server/src/config.rs:764` (public 10 MiB default); `tinycloud-core/src/db.rs:977-984` (`store_size`)
- `tinycloud-node` @c99b312 (Node 1.18.0, not deployed): structured quota errors and `tinycloud.space/info` (TC-626)
- `js-sdk` @d43e51ea (stable 3.0.0): `packages/sdk-services/src/types.ts:103-104`; `origin/master` (3.1.0 beta): `isStorageFullError`, unified mapping, CLI exit code 10
