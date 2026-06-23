---
type: concept
title: Capabilities
description: Capability = resource × ability × caveats, the unit of authorization across the protocol.
status: shipped
sources:
  - repo: tinycloud-node
    path: tinycloud-auth/src/resource.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/models/delegation.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/auth_guards.rs
tags: [authz, capabilities]
timestamp: 2026-06-22
---

# Capabilities

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** shipped. Capability = resource × ability × caveats, the unit of authorization across the protocol.

## Sources
- `tinycloud-node`: `models/delegation.rs`
- `tinycloud-node`: `auth_guards.rs`
