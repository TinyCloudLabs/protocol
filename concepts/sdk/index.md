---
type: index
title: SDK
description: How to use the protocol — packages, sign-in, data APIs, delegation, and CLI.
timestamp: 2026-06-22
---

# SDK

How to use the protocol — packages, sign-in, data APIs, delegation, and CLI.

## Concepts

- [Packages](packages.md) — sdk-core, sdk-services, node-sdk, web-sdk, sdk-rs (WASM), vfs, and cli.
- [Sign-In Flow](sign-in-flow.md) — session key → prepareSession (SIWE-ReCap) → wallet signs → completeSessionSetup → ensureSpaceExists.
- [Data APIs](data-apis.md) — Reading and writing data across the KV, SQL, and DuckDB services from the SDK.
- [Delegation API](delegation-api.md) — delegateTo(did, PermissionEntry[]) and PortableDelegation for sharing capabilities.
- [Secrets Sharing](secrets-sharing.md) — Sharing encrypted secrets between identities via the SDK.
- [CLI](cli.md) — The command-line interface for interacting with a node.
