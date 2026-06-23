---
type: index
title: Consistency & Replication
description: Epoch ordering, conflict resolution, hybrid consistency, and replication.
timestamp: 2026-06-22
---

# Consistency & Replication

Epoch ordering, conflict resolution, hybrid consistency, and replication.

## Concepts

- [Epochs & DAG](epochs-dag.md) — Epoch-based ordering over a hash-linked DAG (CID/IPLD/DAG-CBOR).
- [Conflict Resolution](conflict-resolution.md) — Last-writer-wins CRDT for resolving concurrent writes.
- [Hybrid Consistency](hybrid-consistency.md) — Hybrid strong/eventual consistency for authorization state.
- [Replication](replication.md) — P2P replication subsystem present in the codebase but not compiled or mounted.
