---
type: concept
title: Conflict Resolution
description: How concurrent writes to a space reconcile — last-writer-wins over the hash-linked event DAG. Part of the not-yet-mounted replication subsystem.
status: planned
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/replication/commit.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/replication/recon.rs
provenance_note: the replication module exists in tinycloud-core but is not declared in lib.rs (not compiled/mounted) as of 2026-06
tags: [consistency, crdt]
timestamp: 2026-06-23
---

# Conflict Resolution

**Conflict resolution** is how two concurrent writes to the same [[autonomic-space|space]] reconcile when they are later ordered together: TinyCloud uses **last-writer-wins (LWW)** semantics over the hash-linked event DAG (see [[epochs-dag]]), so a deterministic winner is chosen without coordination. It is the convergence guarantee that makes a space safe to write from multiple devices/hosts.

## Role

It is the CRDT layer of [[consistency-model|consistency]]: combined with [[epochs-dag|epoch ordering]] it gives **eventual convergence** — every replica that has seen the same events agrees on the resulting state — which is the precondition for the planned multi-host [[replication]].

## Mechanics

The reconciliation logic lives in the replication subsystem (`tinycloud-core/src/replication/commit.rs`, `recon.rs`): concurrent events are merged by the LWW rule against the DAG's [[epochs-dag|epoch ordering]]. **Note:** this module is **present but not compiled/mounted** (not declared in `lib.rs`), so today, with single-host serving, conflicts don't arise in practice — LWW is the *designed* behavior for when [[replication]] lands.

## Relationships

Resolves concurrent writes ordered by [[epochs-dag]]; part of the [[replication]] subsystem; underpins the eventual-consistency half of [[hybrid-consistency]] / [[consistency-model]].

## Status & drift

**Planned** (code present, unmounted). LWW-over-DAG is the intended rule; it activates with [[replication]] / [[future/replication-and-discovery]].

## Sources
- `tinycloud-node`: `tinycloud-core/src/replication/commit.rs`, `recon.rs` (present, not mounted)
