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

## Relationships

Client surface over [[kv]] / [[sql]] / [[duckdb]]; each call an [[invocation]] of a [[capabilities|capability]]; scoped to an [[autonomic-space|space]]; authority comes from [[sign-in-flow]] / [[delegation-api]]; also reachable from the [[cli]].

## Status & drift

Shipped. `Result`-typed surface; per-space helpers (`kvForSpace`/`sqlForSpace`) are recent additions.

## Sources
- `js-sdk`: `packages/sdk-services/src/{kv/KVService.ts, sql/SQLService.ts, duckdb/DuckDbService.ts}`
