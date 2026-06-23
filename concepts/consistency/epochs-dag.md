---
type: concept
title: Epochs & DAG
description: Epoch-based ordering over a hash-linked DAG (CID/IPLD/DAG-CBOR).
status: planned
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/relationships/epoch_order.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/events/mod.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/replication/messages.rs
provenance_note: epoch ordering over events is compiled (relationships/events); the hash-linked DAG replication lives in the uncompiled, unmounted replication module as of 2026-06
tags: [consistency, dag]
timestamp: 2026-06-22
---

# Epochs & DAG

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** planned. Epoch-based ordering over a hash-linked DAG (CID/IPLD/DAG-CBOR).

## Sources
- `tinycloud-node`: `replication/`
