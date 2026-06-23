---
type: concept
title: Key-Value Service
description: Per-space key-value store, the most complete service surface.
status: shipped
resource: tinycloud.kv/*
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/models/kv_write.rs
  - repo: js-sdk
    path: packages/sdk-services/src/kv/KVService.ts
tags: [service, kv, storage]
timestamp: 2026-06-22
---

# Key-Value Service

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** shipped. Per-space key-value store, the most complete service surface.

## Sources
- `tinycloud-node`: `tinycloud-core`
