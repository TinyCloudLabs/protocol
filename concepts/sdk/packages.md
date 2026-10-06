---
type: concept
title: Packages
description: The js-sdk package layout — platform-agnostic core, service implementations, node and web SDKs, the Rust→WASM bridge, Share, operations, MCP, VFS, and CLI — and how they compose.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: architecture.md
  - repo: js-sdk
    path: packages
tags: [sdk, packages]
timestamp: 2026-10-05
---

# Packages

The TinyCloud **js-sdk** is a monorepo of layered packages: a platform-agnostic core, service implementations, platform SDKs for Node and the browser, a Rust→WASM crypto bridge, plus a VFS and a CLI. Together they are how an application speaks the protocol — building [[sign-in-flow|sign-in]], [[capabilities|capabilities]], and [[data-apis|data access]] without hand-rolling crypto.

## Members

- **`@tinycloud/sdk-core`** — the `TinyCloud` class + platform-agnostic model: identity, [[autonomic-space|spaces]], [[manifest-model|manifests]], [[delegation-api|delegations]], [[capabilities]].
- **`@tinycloud/sdk-services`** — the [[services|service]] clients: [[kv]], [[sql]], [[duckdb]], [[hooks]], [[vault]], [[secrets-sharing|secrets]], [[encryption-networks|encryption]].
- **`@tinycloud/node-sdk`** — `TinyCloudNode`, `NodeUserAuthorization`, `PrivateKeySigner` (server/Node runtime).
- **`@tinycloud/web-sdk`** — `TinyCloudWeb`, which wraps a `TinyCloudNode` for the browser (wallet signer, session storage).
- **`@tinycloud/sdk-rs`** — the Rust source compiled to WASM (`web-sdk-wasm`, `node-sdk-wasm`): the [[session-keys|session manager]], [[siwe|SIWE]]/[[recap|ReCap]] prep, [[delegation]] signing, vault crypto.
- **`@tinycloud/share-sdk`** / **`@tinycloud/share-envelope`** — native Share: publishing bearer and addressed links, receiving, sender history, revocation, and the sealed envelope codecs and verifier (see [[secrets-sharing]]).
- **`@tinycloud/operations`** — the shared operation contracts and error mapping behind the CLI and MCP.
- **`@tinycloud/mcp`** — the [[mcp|MCP server]] (`tinycloud-mcp` for local stdio, `tinycloud-mcp-http` for the hosted service).
- **`vfs`** — a virtual filesystem abstraction over [[kv]].
- **`cli`** — the `tc` [[cli|command-line interface]], which also ships the `tc-cli` [[agent-skills|agent skill]].

## Mechanics

`web-sdk` and `node-sdk` are thin platform adapters over the shared `sdk-core` + `sdk-services`; the heavy cryptographic operations cross into `sdk-rs` (WASM). So an app targets `web-sdk` or `node-sdk`, gets the same `TinyCloud` API, and the WASM boundary handles signing/session management identically on both.

## Install

The `@tinycloud` packages are on npm. Current stable: **`web-sdk`/`node-sdk`/`sdk-core` 3.0.0**, `cli` 1.0.0, `share-sdk` 1.0.0, `mcp` and `operations` 0.3.3, `@openkey/sdk` 0.10.2 (betas: SDKs 3.1.0, CLI 1.1.0, MCP 0.4.0). A browser app pulls `web-sdk` + the [[openkey|OpenKey]] SDK; a backend pulls `node-sdk`:

```bash
npm install @tinycloud/web-sdk@3.0.0 @openkey/sdk   # frontend
npm install @tinycloud/node-sdk@3.0.0               # backend
npm install -g @tinycloud/cli@1.0.0                 # optional: the `tc` CLI
npm install -g @tinycloud/mcp                       # optional: local MCP server
```

**3.0.0 breaking changes** (Oct 2026): `TinyCloudWeb` signs through the wallet's **raw EIP-1193 provider** (no ethers-style facade; the standalone RPC provider factory is gone), and the legacy broker-backed Share APIs and the plaintext `?tc2` link codec are removed in favor of native Share. The default sign-in session also rose from 7 to 30 days (see [[session-keys]]).

`web-sdk`/`node-sdk` re-export `sdk-core` + `sdk-services`, so you import from a single package per platform. The [[getting-started|Getting Started]] path pins these for you via [[tinyboilerplate]].

## Relationships

Implements client access to all [[services]]; drives [[sign-in-flow]]; exposes [[data-apis]] and the [[delegation-api]]; installed and scaffolded via [[getting-started]]; the WASM layer mints the [[session-keys|session keys]] and [[siwe|SIWE]]/[[ucan|UCAN]] tokens validated by [[cacao-chain-validation]].

## Status & drift

Shipped (3.0.0 stable as of Oct 4, 2026). Note `architecture.md` references a legacy `web-core` package not present in the current workspace; the layout above reflects current `packages/`. [[tinyboilerplate]] still pins the 2.6.3 line.

## Sources
- `js-sdk` (`v3.0.0` = `d43e51ea`): `architecture.md`, `packages/` (sdk-core, sdk-services, node-sdk, web-sdk, sdk-rs, share-sdk, share-envelope, operations, mcp, vfs, cli), package `CHANGELOG.md` files for the 3.0.0 breaking changes
- npm registry dist-tags (checked Oct 5, 2026)
