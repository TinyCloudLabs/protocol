---
type: concept
title: DuckDB Service
description: An optional per-space DuckDB engine for analytical (OLAP) queries over a space's data, via tinycloud.duckdb/* capabilities. Compiled only with the duckdb cargo feature; not enabled on the hosted node.
status: shipped
layer: protocol
resource: tinycloud.duckdb/*
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/duckdb/service.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/mod.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/Cargo.toml@05c6a93
  - repo: tinycloud-node
    path: capabilities.json@05c6a93
  - repo: js-sdk
    path: packages/sdk-services/src/duckdb/DuckDbService.ts@d43e51ea
tags: [service, duckdb, analytics]
timestamp: 2026-10-05
---

# DuckDB Service

The **DuckDB service** is an optional, per-[[autonomic-space|space]] **analytical** engine, exercised through `tinycloud.duckdb/*` [[capabilities|capabilities]]. Where the [[sql|SQL service]] is the transactional store, DuckDB is the column-oriented OLAP engine for aggregate queries, imports and exports in the same space.

## Role

A [[services|Layer 1 service]] for read-heavy analytics. It exists so an owner can [[delegation|grant]] an analytics workload query access to a space's data without it touching the transactional [[sql|SQL]] path.

## Shape

- **resource** — `{spaceId}/duckdb/{db_name}`.
- **abilities** — `tinycloud.duckdb/{read, select, write, admin, import, export}` (`capabilities.json`). `read`/`select` are query-only; `import` loads a database body; `export` returns the database.

## Mechanics

The node runs DuckDB per space (`tinycloud-core/src/duckdb/service.rs`); the client surface is `DuckDbService` (`packages/sdk-services/src/duckdb/`). Authorization is identical to any other [[services|service]]: a [[capabilities|capability]] over `{spaceId}/duckdb/…` verified through the [[delegation]] chain, then narrowed by DuckDB-specific caveats. DuckDB artifact bytes count toward the space's [[quota]]: write-class requests and `import` are refused with 402 when the space is full, while reads and exports never are (`routes/mod.rs:2694, 2760`).

## Relationships

A [[services|service]] over an [[autonomic-space|space]]; transactional sibling [[sql]] (see [[per-space-sql]]); gated by [[capabilities]]; bounded by [[quota]]; driven from [[data-apis]].

## Status & drift

Shipped as an **opt-in build feature**: the code is compiled only with the `duckdb` cargo feature (`tinycloud-node-server/Cargo.toml`), and a node advertises it by adding `duckdb` to its `/version` features (`routes/mod.rs:136-137`). The hosted production node (1.17.3) does **not** enable it — its live feature list is `kv, delegation, sharing, sql, hooks, signed-urls, encryption, tee`. Apps should check `/version` before relying on DuckDB.

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `tinycloud-core/src/duckdb/service.rs`; `tinycloud-node-server/src/routes/mod.rs:136-137` (feature flag), `:2694, :2760` (quota gate on import and writes); `tinycloud-node-server/Cargo.toml` (`duckdb` feature); `capabilities.json` (`tinycloud.duckdb/*` abilities)
- `js-sdk` @d43e51ea: `packages/sdk-services/src/duckdb/DuckDbService.ts`
