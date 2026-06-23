---
type: concept
title: Node Architecture
description: The TinyCloud node — a Rocket HTTP server built from the auth, core, and server crates — that hosts spaces, verifies capability chains, and dispatches service invocations.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/lib.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/mod.rs
  - repo: tinycloud-core
    path: tinycloud-core/src/lib.rs
tags: [nodes, architecture]
timestamp: 2026-06-23
---

# Node Architecture

A **TinyCloud node** is the server that hosts [[autonomic-space|spaces]] and serves their [[services|services]]. It is a **Rocket** HTTP server assembled from three crates — `tinycloud-auth` (the authorization primitives), `tinycloud-core` (the protocol engine), and `tinycloud-node-server` (the HTTP layer) — and it is deliberately **stateless about identity**: it authorizes purely from the [[capabilities|capability]] chain a request carries.

## Role

The node is the runtime of [[architecture-layers|Layer 1]]. It is where [[space-hosting|hosting]], [[cacao-chain-validation|chain validation]], [[storage|storage]], and [[services|service]] dispatch actually happen — but no business logic: it is a verifier and a store, which is what lets many nodes host the same owner's data interchangeably.

## Mechanics (request path)

1. A request arrives at a Rocket route (`tinycloud-node-server/src/routes/mod.rs`).
2. **`AuthHeaderGetter`** (`auth_guards.rs`) lifts the [[capabilities|capability]] headers and runs [[cacao-chain-validation|chain validation]] *before* the route body — an unauthorized request never reaches a [[services|service]].
3. The validated [[invocation]] dispatches to the relevant `tinycloud-core` service ([[kv]], [[sql]], [[encryption-networks|encryption]], …), which reads/writes [[storage|content-addressed blobs + the metadata DB]] and orders the write as a space event ([[epochs-dag]]).

`tinycloud-core` (`src/lib.rs`) holds the state machine, [[storage|storage]], SQL/DuckDB, and encryption; `tinycloud-node-server` adds routing, config, quota, signed URLs, and [[tee-dstack|TEE]] glue.

## Relationships

Hosts [[autonomic-space|spaces]] via [[space-hosting]] / [[hosts]]; gates requests with [[cacao-chain-validation]]; runs the [[services]]; persists to [[storage]]; can run inside a [[tee-dstack|DStack TEE]]; spoken to by the [[sdk/packages|SDK]].

## Status & drift

Shipped. Storage backends (FS/S3, SQLite/PG/MySQL) are configurable; the [[replication]] subsystem exists but is not mounted.

## Sources
- `tinycloud-node`: `tinycloud-node-server/src/lib.rs`, `routes/mod.rs`, `tinycloud-core/src/lib.rs`
