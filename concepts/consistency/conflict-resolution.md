---
type: concept
title: Conflict Resolution
description: How concurrent writes to a space reconcile. On one node, writes commit in order and the last committed write is a key's current value, with If-Match for optimistic concurrency; last-writer-wins across replicas over the hash-linked event DAG is the planned multi-host rule.
status: planned
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/models/current_kv.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/mod.rs@05c6a93
provenance_note: no replication module is in production Node 1.17.3 or node main; cross-replica LWW is design intent
tags: [consistency, crdt]
timestamp: 2026-10-05
---

# Conflict Resolution

**Conflict resolution** is how two concurrent writes to the same [[autonomic-space|space]] reconcile. The intended multi-host rule is **last-writer-wins (LWW)** over the hash-linked event DAG (see [[epochs-dag]]), so replicas that have seen the same events pick the same winner without coordination. Today a space is served by one node, where writes are simply committed in order.

## Role

It is the CRDT layer of [[consistency-model|consistency]]: combined with [[epochs-dag|epoch ordering]] it would give **eventual convergence** across replicas — the precondition for multi-host [[replication]].

## Mechanics

**On one node (shipped).** Every write is committed in a transaction and stamped with its `(seq, epoch, epoch_seq)` position. A key's current value is the `current_kv` row written by the last committed write or delete (a delete leaves a tombstone), so concurrent writers to one key resolve in commit order. A client that must not overwrite someone else's change sends `If-Match` with the strong `"blake3-…"` ETag it last read; the write is refused if the key has changed since (see [[kv]]).

**Across replicas (planned).** No replication code is in production Node 1.17.3 or on `main`; a P2P prototype with its own reconciliation code exists only on an unmerged branch that the current plan does not port. LWW over the DAG's [[epochs-dag|epoch ordering]] remains the design rule for when multi-host [[replication]] lands. Local read replicas (in progress) do not need conflict resolution: the host node stays the only writer.

## Relationships

Resolves concurrent writes ordered by [[epochs-dag]]; a precondition for multi-host [[replication]]; underpins the eventual-consistency half of [[hybrid-consistency]] / [[consistency-model]]; single-node behavior is the [[kv]] `current_kv` state and `If-Match`.

## Status & drift

**Planned** for cross-replica LWW. Single-node ordering and `If-Match` conditional writes are shipped in Node 1.17.3. See [[future/replication-and-discovery]].

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `tinycloud-core/src/db.rs` (`transact`, `current_kv` upkeep), `tinycloud-core/src/models/current_kv.rs`, `tinycloud-node-server/src/routes/mod.rs:685` (strong `If-Match` ETags)
- `tinycloud-node` branch `feat/replication-e2e-bootstrap` (unmerged): `tinycloud-core/src/replication/{commit,recon}.rs` (prototype)
