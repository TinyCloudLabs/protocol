---
type: concept
title: Authorization Consistency Model
description: Hybrid strong/eventual consistency for authorization state; general /invoke has no nonce-dedup table.
status: in-progress
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/auth_guards.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/models/invocation.rs
tags: [authz, consistency]
timestamp: 2026-06-22
---

# Authorization Consistency Model

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** in-progress. Hybrid strong/eventual consistency for authorization state; general /invoke has no nonce-dedup table.

## Sources
- `tinycloud-node`: `auth_guards.rs`
