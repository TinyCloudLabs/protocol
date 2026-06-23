---
type: concept
title: DuckDB Service
description: An optional per-space DuckDB engine for analytical (OLAP) queries over a space's data, via tinycloud.duckdb/* capabilities.
status: shipped
layer: protocol
resource: tinycloud.duckdb/*
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/duckdb/service.rs
  - repo: js-sdk
    path: packages/sdk-services/src/duckdb/DuckDbService.ts
tags: [service, duckdb, analytics]
timestamp: 2026-06-23
---

# DuckDB Service

The **DuckDB service** is an optional, per-[[autonomic-space|space]] **analytical** engine, exercised through `tinycloud.duckdb/*` [[capabilities|capabilities]]. Where the [[sql|SQL service]] is the transactional store, DuckDB is the column-oriented OLAP engine for aggregate queries and exports over the same space.

## Role

A [[services|Layer 1 service]] for read-heavy analytics. It exists so an owner can [[delegation|grant]] an analytics workload query access to a space's data without it touching the transactional [[sql|SQL]] path.

## Shape

- **resource** — `{spaceId}/duckdb`.
- **abilities** — `tinycloud.duckdb/{query, execute, export, …}`.

## Mechanics

The node runs DuckDB per space (`tinycloud-core/src/duckdb/service.rs`); the client surface is `DuckDbService` (`packages/sdk-services/src/duckdb/`). Authorization is identical to any other [[services|service]]: a [[capabilities|capability]] over `{spaceId}/duckdb` verified through the [[delegation]] chain.

## Relationships

A [[services|service]] over an [[autonomic-space|space]]; transactional sibling [[sql]]; gated by [[capabilities]]; driven from [[data-apis]].

## Status & drift

Shipped as an optional service (a node may or may not enable it).

## Sources
- `tinycloud-node`: `tinycloud-core/src/duckdb/service.rs`
- `js-sdk`: `packages/sdk-services/src/duckdb/DuckDbService.ts`
