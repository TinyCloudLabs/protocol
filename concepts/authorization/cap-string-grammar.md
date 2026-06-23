---
type: concept
title: Cap-String Grammar
description: Capability string form service:space:path:actions and the {namespace}.{service}/{action} ability wire form.
status: shipped
sources:
  - repo: tinycloud-node
    path: tinycloud-auth/src/resource.rs
  - repo: js-sdk
    path: packages/sdk-core/src/capabilities.ts
tags: [authz, grammar]
timestamp: 2026-06-22
---

# Cap-String Grammar

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** shipped. Capability string form service:space:path:actions and the {namespace}.{service}/{action} ability wire form.

## Sources
- `tinycloud-node`: `models/delegation.rs`
