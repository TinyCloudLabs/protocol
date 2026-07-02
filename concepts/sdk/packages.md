---
type: concept
title: Packages
description: The js-sdk package layout — platform-agnostic core, service implementations, node and web SDKs, the Rust→WASM bridge, VFS, and CLI — and how they compose.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: architecture.md
  - repo: js-sdk
    path: packages
tags: [sdk, packages]
timestamp: 2026-06-23
---

# Packages

The TinyCloud **js-sdk** is a monorepo of layered packages: a platform-agnostic core, service implementations, platform SDKs for Node and the browser, a Rust→WASM crypto bridge, plus a VFS and a CLI. Together they are how an application speaks the protocol — building [[sign-in-flow|sign-in]], [[capabilities|capabilities]], and [[data-apis|data access]] without hand-rolling crypto.

## Members

- **`@tinycloud/sdk-core`** — the `TinyCloud` class + platform-agnostic model: identity, [[autonomic-space|spaces]], [[manifest-model|manifests]], [[delegation-api|delegations]], [[capabilities]].
- **`@tinycloud/sdk-services`** — the [[services|service]] clients: [[kv]], [[sql]], [[duckdb]], [[hooks]], [[vault]], [[secrets-sharing|secrets]], [[encryption-networks|encryption]].
- **`@tinycloud/node-sdk`** — `TinyCloudNode`, `NodeUserAuthorization`, `PrivateKeySigner` (server/Node runtime).
- **`@tinycloud/web-sdk`** — `TinyCloudWeb`, which wraps a `TinyCloudNode` for the browser (wallet signer, session storage).
- **`@tinycloud/sdk-rs`** — the Rust source compiled to WASM (`web-sdk-wasm`, `node-sdk-wasm`): the [[session-keys|session manager]], [[siwe|SIWE]]/[[recap|ReCap]] prep, [[delegation]] signing, vault crypto.
- **`vfs`** — a virtual filesystem abstraction over [[kv]].
- **`cli`** — the `tc` [[cli|command-line interface]].

## Mechanics

`web-sdk` and `node-sdk` are thin platform adapters over the shared `sdk-core` + `sdk-services`; the heavy cryptographic operations cross into `sdk-rs` (WASM). So an app targets `web-sdk` or `node-sdk`, gets the same `TinyCloud` API, and the WASM boundary handles signing/session management identically on both.

## Install

The `@tinycloud` packages are on npm (current line: **2.4.0**). A browser app pulls `web-sdk` + the [[openkey|OpenKey]] SDK; a backend pulls `node-sdk`:

```bash
npm install @tinycloud/web-sdk @openkey/sdk        # frontend
npm install @tinycloud/node-sdk                    # backend
npm install -g @tinycloud/cli                       # optional: the `tc` CLI
```

`web-sdk`/`node-sdk` re-export `sdk-core` + `sdk-services`, so you import from a single package per platform. The [[getting-started|Getting Started]] path pins these for you via [[tinyboilerplate]].

## Relationships

Implements client access to all [[services]]; drives [[sign-in-flow]]; exposes [[data-apis]] and the [[delegation-api]]; installed and scaffolded via [[getting-started]]; the WASM layer mints the [[session-keys|session keys]] and [[siwe|SIWE]]/[[ucan|UCAN]] tokens validated by [[cacao-chain-validation]].

## Status & drift

Shipped. Note `architecture.md` references a legacy `web-core` package not present in the current workspace; the layout above reflects current `packages/`.

## Sources
- `js-sdk`: `architecture.md`, `packages/` (sdk-core, sdk-services, node-sdk, web-sdk, sdk-rs, vfs, cli)
