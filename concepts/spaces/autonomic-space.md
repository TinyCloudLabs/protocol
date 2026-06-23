---
type: concept
title: Autonomic Space
description: The sovereign data primitive, created lazily when a delegation carries a tinycloud.space/host ability.
status: shipped
resource: tinycloud.space/*
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs
  - repo: tinycloud-node
    path: tinycloud-auth/src/resource.rs
  - repo: tinycloud-node
    path: tinycloud-sdk-wasm/src/host.rs
tags: [spaces, primitive]
timestamp: 2026-06-22
---

# Autonomic Space

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** shipped. The sovereign data primitive, created lazily when a delegation carries a tinycloud.space/host ability.

## Sources
- `tinycloud-node`: `tinycloud-auth/resource.rs:262`
