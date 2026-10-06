---
type: index
title: Consistency & Replication
description: Epoch ordering, conflict resolution, hybrid consistency, and replication.
timestamp: 2026-10-05
---

# Consistency & Replication

Epoch ordering, conflict resolution, hybrid consistency, and replication.

## Concepts

- [Epochs & DAG](epochs-dag.md) — Epoch-based ordering over a hash-linked DAG (CID/IPLD/DAG-CBOR).
- [Conflict Resolution](conflict-resolution.md) — Commit-order writes and `If-Match` on one node; last-writer-wins across replicas planned.
- [Hybrid Consistency](hybrid-consistency.md) — Hybrid strong/eventual consistency for authorization state.
- [Replication](replication.md) — Multi-host P2P replication planned (not in the node); local read replicas on the KV change feed in progress.
