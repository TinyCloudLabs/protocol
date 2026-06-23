---
type: concept
title: Threshold Decryption
description: Delegatable ferveo-based threshold decryption; KeyBackendKind::Threshold slot reserved, not implemented in v1.
status: planned
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/types.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/backend.rs
provenance_note: design-only; only the KeyBackendKind::Threshold enum slot exists in code, no implementing backend as of 2026-06. Design spec lives outside the tracked source repos (docs/specs/threshold-decryption-v1.md).
tags: [encryption, threshold, future]
timestamp: 2026-06-22
---

# Threshold Decryption

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** planned. Delegatable ferveo-based threshold decryption; KeyBackendKind::Threshold slot reserved, not implemented in v1.

## Sources
- `tinycloud-node`: `encryption_network/`
- `memory`: `threshold-decryption-v1`
