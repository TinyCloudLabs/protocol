---
type: concept
title: js-sdk
description: The TinyCloud JavaScript/TypeScript SDK — the client-side library providing sign-in, delegation, invocation, and data-API access for TinyCloud apps.
status: shipped
layer: tinycloud-app
resource: https://github.com/TinyCloudLabs/js-sdk
tags: [sdk, typescript, javascript]
timestamp: 2026-06-23
---

# js-sdk

**`js-sdk`** is the TinyCloud JavaScript/TypeScript SDK — the published npm packages (`@tinycloud/web-sdk`, `@tinycloud/node-sdk`, `@tinycloud/web-sdk-wasm`) that a TinyCloud app uses to sign in, issue [[delegation|delegations]] and [[invocation|invocations]], and access [[spaces|space]] data. The installable surface is documented in [[packages]].

## Packages

- **`@tinycloud/web-sdk`** — browser-side SDK. Wraps the WASM session manager, implements [[sign-in-flow]] (`prepareSession`, `completeSessionSetup`), issues UCAN delegation/invocation headers, and exposes the [[data-apis|data APIs]] (`kv`, `sql`, `duckdb`, `vault`).
- **`@tinycloud/node-sdk`** — server-side SDK. Same data APIs but runs in Node/Bun, backed by an operational key instead of a wallet session; used by [[tee-backends|TEE backends]] and the [[delegation-api|delegation API]].
- **`@tinycloud/web-sdk-wasm`** (`tinycloud-sdk-wasm`) — the Rust/WASM session core: Ed25519 key generation, [[cacao|CACAO]] parsing, [[ucan|UCAN]] signing. The JS SDK delegates crypto operations here.

## Role

The SDK is the only sanctioned way for an application to interact with the TinyCloud protocol. It:

1. Drives [[sign-in-flow]] (SIWE → [[recap|ReCap]] → [[cacao|CACAO]] → session key).
2. Manages [[session-keys|session keys]] entirely client-side (private key never leaves the browser).
3. Constructs and signs [[ucan|UCAN]] sub-delegations and invocations.
4. Provides typed wrappers for each [[services|service]] (`kv.get/put`, `sql.query`, `duckdb.query`, `vault.get/put`).

## Relationships

Built on [[packages|the published packages]]; implements [[sign-in-flow]]; manages [[session-keys]]; issues [[ucan|UCAN]] delegations/invocations; speaks to the [[node-architecture|node]]; consumed by [[tinyboilerplate]] and [[example-listen|Listen]]; the delegation side is [[delegation-api]]; data access is [[data-apis]].

## Status & drift

Shipped. The SDK is actively maintained and published to npm. See [[packages]] for the current version surface and [[getting-started]] for installation.

## Citations

- Repository: https://github.com/TinyCloudLabs/js-sdk
- npm: `@tinycloud/web-sdk`, `@tinycloud/node-sdk`
