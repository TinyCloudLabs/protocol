---
type: concept
title: Sign-In Flow
description: session key → prepareSession (SIWE-ReCap) → wallet signs → completeSessionSetup → ensureSpaceExists.
status: shipped
sources:
  - repo: js-sdk
    path: packages/sdk-core/src/userAuthorization.ts
  - repo: tinycloud-node
    path: tinycloud-sdk-wasm/src/session.rs
tags: [sdk, sign-in]
timestamp: 2026-06-22
---

# Sign-In Flow

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** shipped. session key → prepareSession (SIWE-ReCap) → wallet signs → completeSessionSetup → ensureSpaceExists.

## Sources
- `js-sdk`: `sdk-core`
