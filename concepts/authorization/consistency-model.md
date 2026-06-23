---
type: concept
title: Authorization Consistency Model
description: How authorization state stays consistent across a node and its peers — a hybrid of strong local checks and eventual replication — and the current replay-protection posture of the invoke path.
status: in-progress
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/models/invocation.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/auth_guards.rs
tags: [authz, consistency]
timestamp: 2026-06-23
---

# Authorization Consistency Model

The **authorization consistency model** is how the authority graph — [[delegation|delegations]], [[revocation|revocations]], [[invocation|invocations]] — stays correct as it is read, written, and (eventually) replicated. The design intent is a **hybrid**: authority decisions are made against **strong, locally-consistent** state on the serving [[nodes|node]], while the authorization event log propagates with **eventual consistency** across peers (the same epoch-ordered model as data — see [[epochs-dag]]).

## Role

It is the correctness contract for [[cacao-chain-validation|chain validation]] under concurrency and distribution: a node must never admit an [[invocation]] against authority it should already consider revoked, and must converge with peers on the order of authority events.

## Mechanics (current vs intended)

- **Local (shipped):** each [[invocation]] is verified synchronously against the node's current authority state ([[cacao-chain-validation]]); authority events are ordered as space events ([[epochs-dag]]).
- **Distributed (design-intent):** strong-for-decisions / eventual-for-propagation across peers is the stated team model, but cross-node convergence rides on the [[replication|replication subsystem]] which is **present but not yet mounted** — so today consistency is effectively single-node-strong.
- **Replay posture (flagged):** the general `/invoke` path has **no dedicated nonce-dedup table** (`auth_guards.rs` / `models/invocation.rs`); replay is bounded by capability time-windows + chain hash-identity. The encryption-decrypt path *does* nonce-dedup. This is a known sharp edge (the owner is reconciling it separately) — documented here, not asserted as final design.

## Relationships

Governs [[cacao-chain-validation]] and [[revocation]] under concurrency; shares ordering with data via [[epochs-dag]] and [[conflict-resolution]]; its distributed half depends on [[replication]] and the broader [[hybrid-consistency]] story.

## Status & drift

`in-progress`. Single-node strong consistency is real; the distributed hybrid is design-intent pending [[replication]]. The `/invoke` nonce-dedup gap is a flagged security item, not a settled design choice.

## Sources
- `tinycloud-node`: `tinycloud-core/src/models/invocation.rs`, `tinycloud-node-server/src/auth_guards.rs`
