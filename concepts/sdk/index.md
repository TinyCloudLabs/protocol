---
type: index
title: SDK
description: How to use the protocol — packages, sign-in, data APIs, delegation, and CLI.
timestamp: 2026-10-05
---

# SDK

How to use the protocol — packages, sign-in, data APIs, delegation, and CLI.

## Concepts

- [Getting Started](getting-started.md) — Install, scaffold from tinyboilerplate, author a manifest, run + verify locally, deploy. The golden path to a working app.
- [Packages](packages.md) — sdk-core, sdk-services, node-sdk, web-sdk, sdk-rs (WASM), share-sdk, operations, mcp, vfs, and cli (SDK 3.0.0).
- [Sign-In Flow](sign-in-flow.md) — session key → prepareSession (SIWE-ReCap) → wallet signs → completeSessionSetup → ensureSpaceExists.
- [Data APIs](data-apis.md) — Reading and writing data across the KV, SQL, and DuckDB services from the SDK.
- [Delegation API](delegation-api.md) — delegateTo(did, PermissionEntry[]) and PortableDelegation for sharing capabilities.
- [Secrets Sharing](secrets-sharing.md) — Sharing encrypted secrets between identities via the SDK; file sharing is under [Sharing](../sharing/index.md).
- [CLI](cli.md) — The `tc` command-line interface (1.0.0): sign-in including device login, data, secrets, and Share publishing.

Agents use the same operations through the [MCP server](../agents/mcp.md) and the [agent skills](../agents/agent-skills.md).

The full developer track lives under [Build an App](../build/index.md).
