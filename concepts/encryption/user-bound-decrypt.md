---
type: concept
title: User-Bound Decryption
description: Decrypt as a capability-gated native invocation against node + networkId; node never sees plaintext.
status: in-progress
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/encryption.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/service.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/protocol.rs
tags: [encryption, user-bound]
timestamp: 2026-06-22
---

# User-Bound Decryption

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** in-progress. Decrypt as a capability-gated native invocation against node + networkId; node never sees plaintext.

## Sources
- `tinycloud-node`: `encryption_network/`
