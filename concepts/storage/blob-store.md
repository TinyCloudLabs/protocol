---
type: concept
title: Blob Store
description: Content-addressed blob store (FileSystem or S3) keyed by SpaceId + hash.
status: shipped
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/storage/mod.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/storage/file_system.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/storage/s3.rs
tags: [storage, blobs]
timestamp: 2026-06-22
---

# Blob Store

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** shipped. Content-addressed blob store (FileSystem or S3) keyed by SpaceId + hash.

## Sources
- `tinycloud-node`: `tinycloud-core`
