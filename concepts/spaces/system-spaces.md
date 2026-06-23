---
type: concept
title: System Spaces
description: Reserved spaces: default, public, account, secrets, applications, plus the synthetic encryption label.
status: shipped
sources:
  - repo: js-sdk
    path: packages/sdk-core/src/manifest.ts
  - repo: tinycloud-node
    path: tinycloud-sdk-wasm/src/session.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/public.rs
tags: [spaces, system-spaces]
timestamp: 2026-06-22
---

# System Spaces

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** shipped. Reserved spaces: default, public, account, secrets, applications, plus the synthetic encryption label.

## Sources
- `tinycloud-node`: `primitives`
- `js-sdk`: `sdk-core/manifest.ts`
