---
type: concept
title: At-Rest Encryption
description: AES-256-GCM column encryption (0x01||nonce||ct) with legacy-plaintext passthrough.
status: shipped
sources:
  - repo: tinycloud-node
    path: encryption.rs
tags: [encryption, at-rest]
timestamp: 2026-06-22
---

# At-Rest Encryption

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** shipped. AES-256-GCM column encryption (0x01||nonce||ct) with legacy-plaintext passthrough.

## Sources
- `tinycloud-node`: `encryption.rs`
