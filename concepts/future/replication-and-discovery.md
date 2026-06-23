---
type: concept
title: Replication & Peer Discovery
description: First-class replication and peer discovery modeled on Bitcoin/Ethereum P2P.
status: planned
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/replication/mod.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/replication/recon.rs
provenance_note: design-only; the replication module exists in tinycloud-core but is not declared in lib.rs (not compiled or mounted) and peer discovery is not implemented as of 2026-06
tags: [future, replication]
timestamp: 2026-06-22
---

# Replication & Peer Discovery

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** planned. First-class replication and peer discovery modeled on Bitcoin/Ethereum P2P.

## Sources
- `listen`
