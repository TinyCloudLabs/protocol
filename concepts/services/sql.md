---
type: concept
title: SQL Service
description: A per-space SQLite database exposed as a service, queried and mutated through tinycloud.sql/* capabilities.
status: shipped
layer: protocol
resource: tinycloud.sql/*
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/sql/service.rs
  - repo: js-sdk
    path: packages/sdk-services/src/sql/SQLService.ts
tags: [service, sql, storage]
timestamp: 2026-06-23
---

# SQL Service

The **SQL service** gives every [[autonomic-space|space]] its own **SQLite** database, addressed as the `sql` [[services|service]] on that space and exercised through `tinycloud.sql/*` [[capabilities|capabilities]]. It is how structured, relational, queryable data lives inside a sovereign space — the relational counterpart to the key/value [[kv|KV service]].

## Role

A [[services|Layer 1 service]]: the protocol does not run a shared database, it hosts a **per-space** one. Because access is a [[capabilities|capability]] over `{spaceId}/sql`, an owner can [[delegation|delegate]] table- or query-scoped read/write to an app or [[session-keys|agent]] without surrendering the rest of the space — the relational analogue of [[uri-addressing-grammar|path-scoped]] KV grants.

## Shape

- **resource** — `{spaceId}/sql[/{db}]` (a space may hold multiple named databases).
- **abilities** — `tinycloud.sql/{query, execute, batch, …}` (read vs write split so a [[capabilities|capability]] can grant query-only).
- **caveats** — [[attenuation|attenuations]] can restrict to specific tables/statements.

## Mechanics

The node SQL service (`tinycloud-core/src/sql/service.rs`) runs statements against the space's SQLite file behind a **statement authorizer** that constrains what a given [[invocation]] may do. Writes flow through the same [[capabilities|capability]] verification as any other [[invocation]] and are ordered as space events (see [[epochs-dag]]). The client side is `SQLService` / `DatabaseHandle` (`packages/sdk-services/src/sql/`), surfaced as `db().query/execute/batch` and the per-space helper `sqlForSpace(spaceId)` (see [[data-apis]]).

## Relationships

A [[services|service]] over an [[autonomic-space|space]]; access granted by [[capabilities]] (with table/query [[attenuation|caveats]]) and passed via [[delegation]]; its analytical sibling is [[duckdb]]; data is exercised by clients through [[data-apis]]; the worked example is [[example-listen|Listen]]'s `conversations` database.

## Example

`tinycloud.sql/query` over `tinycloud:pkh:eip155:1:0xf39f…2266:applications/sql/xyz.tinycloud.listen/conversations` lets an [[session-keys|agent]] read Listen's conversation table — and, if the [[delegation]] carried a table caveat, *only* that table.

## Status & drift

Shipped. Note: under the SQLite authorizer, app schemas have been constrained (e.g. PRIMARY-KEY-only patterns observed in [[example-listen|Listen]]) — a node-enforced limitation, not a protocol-level guarantee.

## Sources
- `tinycloud-node`: `tinycloud-core/src/sql/service.rs`
- `js-sdk`: `packages/sdk-services/src/sql/SQLService.ts`, `DatabaseHandle.ts`
