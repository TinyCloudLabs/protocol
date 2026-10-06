---
type: concept
title: Node Architecture
description: The TinyCloud node — a Rocket HTTP server built from the auth, core, and server crates — that hosts spaces, verifies capability chains, and dispatches service invocations.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/lib.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/mod.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/lib.rs@05c6a93
  - repo: tinycloud-node
    path: CHANGELOG.md@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/lib.rs@d7f511f
tags: [nodes, architecture]
timestamp: 2026-10-05
---

# Node Architecture

A **TinyCloud node** is the server that hosts [[autonomic-space|spaces]] and serves their [[services|services]]. It is a **Rocket** HTTP server assembled from three crates — `tinycloud-auth` (the authorization primitives), `tinycloud-core` (the protocol engine), and `tinycloud-node-server` (the HTTP layer) — and it is deliberately **stateless about identity**: it authorizes purely from the [[capabilities|capability]] chain a request carries.

> **Interactive reference:** Follow concrete write, read, SQL, delegation, revocation, public-read, and operations paths in the [TinyCloud Node Atlas](/nodes/node-architecture/atlas/). The underlying [JSON Canvas](/nodes/node-architecture/atlas/tinycloud-node.canvas) is available as a portable architecture model. This is a source-anchored reference, not a normative protocol specification.

## Role

The node is the runtime of [[architecture-layers|Layer 1]]. It is where [[space-hosting|hosting]], [[cacao-chain-validation|chain validation]], [[storage|storage]], and [[services|service]] dispatch actually happen — but no business logic: it is a verifier and a store, which is what lets many nodes host the same owner's data interchangeably.

## Mechanics (request path)

1. A request arrives at a Rocket route (`tinycloud-node-server/src/routes/mod.rs`).
2. **`AuthHeaderGetter`** (`auth_guards.rs`) lifts the [[capabilities|capability]] headers and runs [[cacao-chain-validation|chain validation]] *before* the route body — an unauthorized request never reaches a [[services|service]].
3. The validated [[invocation]] dispatches to the relevant `tinycloud-core` service ([[kv]], [[sql]], [[encryption-networks|encryption]], …), which reads/writes [[storage|content-addressed blobs + the metadata DB]] and orders the write as a space event ([[epochs-dag]]).

`tinycloud-core` (`src/lib.rs`) holds the state machine, [[storage|storage]], SQL/DuckDB, and encryption; `tinycloud-node-server` adds routing, config, storage [[quota]], signed URLs, [[hooks]], and [[tee-dstack|TEE]] glue.

## Versions and features

A node describes itself at `GET /version` (and `GET /info`) with its `version`, a `features` list, `nodeId`, and `inTEE` (`routes/mod.rs:116-160`). The hosted production node reports (abridged):

```json
{"version":"1.17.3","features":["kv","delegation","sharing","sql","hooks","signed-urls","encryption","tee"],"inTEE":true}
```

`duckdb` appears only on nodes built with the `duckdb` cargo feature, and `tee` only on [[tee-dstack|DStack]] builds; the hosted node has no `duckdb` (see [[duckdb]]).

**Release line.** Production Node **1.17.3** (`05c6a93`) is built from a release branch, not from `main`. Node **1.18.0** (`c99b312`, same branch) is built but not deployed. `main` (`d7f511f`) carries unreleased work, including:

- the [[kv]] change feed `tinycloud.kv/sync` (feature `kv-sync-v1`);
- CORS preflight caching: preflight responses carry `Access-Control-Max-Age: 7200` (`lib.rs:693` @d7f511f, from `4f7bea7`);
- a sealed startup preflight, `--validate-config`, that checks the node's configuration before it serves (from `f894564`).

None of these are deployed.

## Relationships

Hosts [[autonomic-space|spaces]] via [[space-hosting]] / [[hosts]]; gates requests with [[cacao-chain-validation]]; runs the [[services]]; persists to [[storage]] within each space's [[quota]]; can run inside a [[tee-dstack|DStack TEE]]; spoken to by the [[sdk/packages|SDK]].

## Status & drift

Shipped; production is Node 1.17.3. Storage backends (FS/S3, SQLite/PG/MySQL) are configurable. The node has no replication subsystem: neither 1.17.3 nor `main` contains one, and multi-host [[replication]] is planned. Local read replicas built on the KV change feed are in progress.

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `tinycloud-node-server/src/lib.rs`, `tinycloud-node-server/src/routes/mod.rs:116-160` (`NodeInfo`, feature list, `/info`, `/version`), `tinycloud-core/src/lib.rs`, `CHANGELOG.md`
- `tinycloud-node` @c99b312: Node 1.18.0 (built, not deployed)
- `tinycloud-node` @d7f511f (`main`): `tinycloud-node-server/src/lib.rs:693` (CORS max-age, commit `4f7bea7`), `--validate-config` (commit `f894564`), `routes/mod.rs:138` (`kv-sync-v1`)
- Live `GET /version` of the hosted node (checked 2026-10-05)
