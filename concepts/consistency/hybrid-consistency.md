---
type: concept
title: Hybrid Consistency
description: The intended model — strong consistency for authorization decisions made locally, eventual consistency for propagating state across peers — so security is never sacrificed for availability.
status: in-progress
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/auth_guards.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/models/invocation.rs@05c6a93
  - repo: tinycloud-node
    path: docs/kv-sync.md@d7f511f
tags: [consistency, hybrid]
timestamp: 2026-10-05
---

# Hybrid Consistency

**Hybrid consistency** is TinyCloud's intended posture: **strong** consistency where it matters for security — [[cacao-chain-validation|authorization decisions]] are made against locally-consistent state on the serving [[nodes|node]] — and **eventual** consistency for propagating data and authority events across peers. The principle is *never trade security for availability*: a node would rather refuse than admit a request against stale authority.

## Role

It is the team's stated consistency philosophy for [[consistency-model|authorization state]] and data alike. It explains why [[revocation]] and [[cacao-chain-validation]] are evaluated synchronously and locally, while [[replication]] of data is allowed to lag.

## Mechanics (intended vs current)

- **Strong, local (shipped):** every [[invocation]] is authorized synchronously against the node's current view (`auth_guards.rs`); writes are ordered as [[epochs-dag|epoch events]].
- **Eventual, read-only copies (in-progress):** local read replicas on client devices follow the host through the [[kv]] change feed (`tinycloud.kv/sync`, on node `main`, unreleased). They may lag, but they never authorize anything: every feed page is itself an authorized invocation, and the host node stays the only writer.
- **Eventual, multi-host (design-intent):** cross-peer convergence would ride on [[conflict-resolution|LWW]] over the DAG via multi-host [[replication]]. No replication code is in production Node 1.17.3 or on `main`, so today the system is single-node-strong.

## Relationships

The umbrella over [[consistency-model]] (authorization) and [[conflict-resolution]] (data); the strong half is enforced by [[cacao-chain-validation]] / [[revocation]]; the eventual half depends on [[replication]] + [[epochs-dag]].

## Status & drift

`in-progress` / design-intent. Single-node strong consistency is real and shipped (Node 1.17.3); local read replicas are in progress; multi-host eventual consistency is planned pending [[replication]]. (Framing sourced from team design discussion; the implemented pieces are the local authorization path.)

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `tinycloud-node-server/src/auth_guards.rs`, `tinycloud-core/src/models/invocation.rs` (the shipped strong-local path)
- `tinycloud-node` @d7f511f (`main`): `docs/kv-sync.md` (change feed for local read replicas)
