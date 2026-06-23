---
type: concept
title: Encryption Networks
description: X25519 envelopes; client encrypts locally; node unwraps/rewraps via LocalOneOfOneBackend (n=1,t=1).
status: in-progress
resource: urn:tinycloud:encryption
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/backend.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/service.rs
  - repo: js-sdk
    path: packages/sdk-services/src/encryption/envelope.ts
tags: [encryption, networks]
timestamp: 2026-06-22
---

# Encryption Networks

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** in-progress. X25519 envelopes; client encrypts locally; node unwraps/rewraps via LocalOneOfOneBackend (n=1,t=1).

## Sources
- `tinycloud-node`: `encryption_network/`
