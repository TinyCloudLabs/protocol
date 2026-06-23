---
type: concept
title: Secrets & Sharing
description: The client APIs for storing encrypted secrets and sharing them with other identities — SecretsService over the vault, and SharingService's self-contained share links.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/sdk-services/src/secrets/SecretsService.ts
  - repo: js-sdk
    path: packages/sdk-core/src/delegations/SharingService.ts
tags: [sdk, secrets, sharing]
timestamp: 2026-06-23
---

# Secrets & Sharing

These are the client APIs for the encrypted side of a space: **`SecretsService`** stores/reads secrets in the [[secrets-space|`secrets` space]] (over the [[vault|vault]]), and **`SharingService`** lets an owner share a secret — or any [[capabilities|capability]] — with another [[dids|identity]] via a self-contained share link.

## Shape

- **`SecretsService`** (`packages/sdk-services/src/secrets/SecretsService.ts`; node/web variants `NodeSecretsService`/`WebSecretsService`) — `get`/`set`/`list` secrets resolved to [[vault-secrets|`vault/secrets/<NAME>`]] paths, encrypted via [[encryption-networks]].
- **`SharingService`** (`packages/sdk-core/src/delegations/SharingService.ts`) — produces share artifacts; the **v2 form is a self-contained client-side token** (the recipient needs no prior account), backed by a [[delegation-api|delegation]] of the relevant read + decrypt [[capabilities]].

## Mechanics

Sharing a secret composes two grants: a **read** [[capabilities|capability]] over the [[kv|KV]] path and a **decrypt** capability on the [[encryption-networks|network]] ([[user-bound-decrypt]]). `SharingService` packages these as a [[delegation-api|PortableDelegation]]; the recipient redeems it (web receive helper in `web-sdk`) to read and decrypt — without the owner exposing the underlying key.

## Relationships

Stores into [[secrets-space]] / [[vault-secrets]] via the [[vault]]; encrypts with [[encryption-networks]] + decrypts via [[user-bound-decrypt]]; shares by [[delegation-api|delegating]] [[capabilities]]; the data-source pattern is shown in [[example-listen]] (`vault/secrets/*`).

## Status & drift

Shipped. v2 share links are self-contained (no recipient pre-registration); older link forms required a node round-trip.

## Sources
- `js-sdk`: `packages/sdk-services/src/secrets/SecretsService.ts`, `packages/sdk-core/src/delegations/SharingService.ts`
