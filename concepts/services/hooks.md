---
type: concept
title: Hooks Service
description: Subscribe/webhook service for reacting to space events.
status: shipped
resource: tinycloud.hooks/*
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/hooks.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/write_hooks.rs
  - repo: js-sdk
    path: packages/sdk-services/src/hooks/HooksService.ts
tags: [service, hooks, events]
timestamp: 2026-06-22
---

# Hooks Service

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** shipped. Subscribe/webhook service for reacting to space events.

## Sources
- `tinycloud-node`: `sdk-services`
