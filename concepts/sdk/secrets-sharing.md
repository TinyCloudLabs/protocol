---
type: concept
title: Secrets & Sharing
description: The SDK's SecretsService (encrypted secrets over the vault) and SharingService (read-only bearer tc1 links); addressed Share links and the full sharing model live in the Sharing section.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/sdk-services/src/secrets/SecretsService.ts@d43e51ea
  - repo: js-sdk
    path: packages/sdk-services/src/secrets/paths.ts@d43e51ea
  - repo: js-sdk
    path: packages/sdk-core/src/delegations/SharingService.ts@d43e51ea
tags: [sdk, secrets, sharing]
timestamp: 2026-10-05
---

# Secrets & Sharing

These are two client APIs on the encrypted side of a space:

- **`SecretsService`** stores and reads named secrets in the [[secrets-space|`secrets` space]], over the [[vault|vault]].
- **`SharingService`** creates read-only **bearer** share links (`tc1:` tokens).

Sharing as a whole, including addressed email and domain links, re-delegation and revocation, is documented in [[sharing]] and [[native-sharing]].

## Shape

- **`SecretsService`** (`packages/sdk-services/src/secrets/SecretsService.ts`; node and web variants `NodeSecretsService`, `WebSecretsService`):
  - `get` / `put` / `delete` / `list` / `listAll`, plus `unlock` / `lock` of the underlying vault.
  - Names match `^[A-Z][A-Z0-9_]*$` and resolve to vault keys `secrets/<NAME>` or `secrets/scoped/<scope>/<NAME>`, stored at [[vault-secrets|`vault/secrets/…`]].
- **`SharingService`** (`packages/sdk-core/src/delegations/SharingService.ts`):
  - `generate` / `preflightGenerate` create a link;
  - `receive` opens one;
  - `delegateReceivedShare` hands a received link on without the embedded key;
  - `encodeLink` / `decodeLink` handle the `tc1:` token.

## Mechanics

### Secrets

A secret is a vault entry. The [[vault]] encrypts it client-side before it reaches [[kv|KV]] (see [[encryption-networks]]), so the [[nodes|Node]] stores only ciphertext. The secrets space and its paths are described in [[secrets-space]] and [[vault-secrets]].

### Bearer share links

`generate` creates a fresh key, delegates the requested path and actions to it, and packs key plus delegation into a `tc1:` token. Defaults:

- actions are read-only, `tinycloud.kv/get` and `tinycloud.kv/metadata`;
- expiry is 7 days;
- there is **no decrypt capability**.

A bearer link therefore shares plaintext KV data, not vault secrets. The recipient needs no account; it invokes with the embedded key. `delegateReceivedShare` lets a browser pass that access to an agent or service as a child UCAN that does not contain the embedded private key.

Sharing something encrypted, so the recipient can decrypt it, uses an addressed Share link instead. It grants `tinycloud.encryption/decrypt` on the owner's network through a [[policy-v3-admission|Policy v3]] session, after the recipient proves an email credential (see [[native-sharing]] and [[user-bound-decrypt]]).

## Relationships

Secrets are stored in [[secrets-space]] / [[vault-secrets]] via the [[vault]] and encrypted with [[encryption-networks]]. Bearer links are [[delegation-api|delegations]] of [[capabilities]] to an embedded key. Encrypted and addressed sharing is [[native-sharing]] in [[sharing]]. The data-source pattern is shown in [[example-listen]].

## Status & drift

`shipped` in SDK 3.0.0. Older versions of this page said `SharingService` packages a read plus decrypt grant for secrets; it does not. Its links are read-only and carry no decrypt capability. Decryptable sharing ships as addressed Policy v3 links.

## Sources
- `js-sdk` (`d43e51ea`, SDK 3.0.0): `packages/sdk-services/src/secrets/SecretsService.ts` (API over the vault), `packages/sdk-services/src/secrets/paths.ts` (name rule, `secrets/` and `secrets/scoped/` keys), `packages/sdk-core/src/delegations/SharingService.ts:1-13, 104-117, 447-488, 1265-1275` (`tc1:` bearer links, default read actions, API, embedded-key-free hand-off), `packages/sdk-core/src/expiry.ts:63` (7-day default)
