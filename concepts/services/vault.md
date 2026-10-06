---
type: concept
title: Vault Service
description: An SDK-virtual service that composes the KV service with encryption networks to store and retrieve encrypted blobs — not a node service.
status: in-progress
layer: protocol
resource: tinycloud.vault
sources:
  - repo: js-sdk
    path: packages/sdk-services/src/vault/DataVaultService.ts@d43e51ea
  - repo: js-sdk
    path: packages/sdk-services/src/vault/createVaultCrypto.ts@d43e51ea
tags: [service, vault, encryption]
timestamp: 2026-10-05
---

# Vault Service

The **vault** is an **SDK-side abstraction** — *not* a node service — that composes the [[kv|KV service]] with [[encryption-networks|encryption networks]] so callers can `put`/`get` **encrypted** blobs as if the vault were a single service. The client encrypts locally before writing to KV and decrypts on read via a capability-gated [[user-bound-decrypt|decrypt invocation]].

## Role

It exists so apps don't hand-wire KV + envelope crypto for every secret. It is the storage primitive behind the [[secrets|Secrets]] space convention (`vault/secrets/<NAME>`). Because it is SDK-virtual, the node sees only [[kv]] writes of opaque ciphertext and [[encryption-networks|encryption-network]] operations — there is no `tinycloud.vault/*` node ability.

## Mechanics

`DataVaultService` (`packages/sdk-services/src/vault/DataVaultService.ts`) orchestrates: derive/resolve the [[encryption-networks|network]] key (`createVaultCrypto.ts`), encrypt the value client-side, [[kv|`tinycloud.kv/put`]] the envelope under a `vault/...` key, and reverse on read (fetch envelope → [[user-bound-decrypt|decrypt via the node]]). Authority is therefore *two* real [[capabilities|capabilities]]: a KV grant over the `vault/` prefix and a decrypt grant on the [[encryption-networks|network]]. The decrypt grant must name the raw network URN `urn:tinycloud:encryption:<ownerDid>:<name>` as a top-level ReCap resource; one nested under a space is refused (see [[user-bound-decrypt]]).

Because vault writes are [[kv]] puts, a full space refuses them with the [[quota]] errors while vault reads keep working. The 3.1.0 beta SDK (3.1.0-beta.2) reports that through the same storage-full error codes as KV, SQL and DuckDB.

## Relationships

Composes [[kv]] + [[encryption-networks]] + [[user-bound-decrypt]]; backs [[secrets-space|the secrets space]] and [[vault-secrets|secret-manager]] paths; consumed via [[secrets-sharing]]. Contrast with the node-native [[services|services]] (kv/sql/…) — vault is purely client-side.

## Status & drift

`in-progress`. It is a real, used SDK service (stable in `@tinycloud` 3.0.0) but evolving; treat `tinycloud.vault` as an SDK convention, not a protocol ability namespace.

## Sources
- `js-sdk` @d43e51ea (stable 3.0.0): `packages/sdk-services/src/vault/DataVaultService.ts`, `createVaultCrypto.ts`; `origin/master` (3.1.0 beta): unified storage-full errors
