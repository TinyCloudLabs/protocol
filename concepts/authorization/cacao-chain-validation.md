---
type: concept
title: CACAO Chain Validation
description: The node's algorithm for validating a CACAO/UCAN delegation chain back to root authority.
status: shipped
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/models/delegation.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/auth_guards.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/relationships/parent_delegations.rs
tags: [authz, cacao, top-gap]
timestamp: 2026-06-22
---

# CACAO Chain Validation

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** shipped. The node's algorithm for validating a CACAO/UCAN delegation chain back to root authority.

## Sources
- `tinycloud-node`: `auth_guards.rs`
