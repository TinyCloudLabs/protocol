---
type: concept
title: Replication
description: P2P replication subsystem present in the codebase but not compiled or mounted.
status: planned
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/replication/mod.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/replication.rs
provenance_note: present in tinycloud-core but the replication module is not declared in lib.rs (not compiled or mounted) as of 2026-06
tags: [consistency, replication, future]
timestamp: 2026-06-22
---

# Replication

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** planned. P2P replication subsystem present in the codebase but not compiled or mounted.

## Sources
- `tinycloud-node`: `replication/`
