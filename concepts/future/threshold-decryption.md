---
type: concept
title: Threshold Decryption (Future)
description: Ferveo threshold decryption: ≥3 TACO nodes, key-gen ceremony, client-side share-combine, owner-only network management.
status: planned
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/types.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/backend.rs
provenance_note: design-only; only the KeyBackendKind::Threshold enum slot exists in code, no ferveo/TACO implementing backend as of 2026-06. The full design spec (docs/specs/threshold-decryption-v1.md) lives outside the tracked source repos.
tags: [future, threshold, encryption]
timestamp: 2026-06-22
---

# Threshold Decryption (Future)

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** planned. Ferveo threshold decryption: ≥3 TACO nodes, key-gen ceremony, client-side share-combine, owner-only network management.

## Sources
- `memory`: `threshold-decryption-v1`
- `listen`
