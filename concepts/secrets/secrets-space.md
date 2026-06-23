---
type: concept
title: Secrets Space
description: The secrets system space — a per-owner autonomic space holding network-encrypted vault entries at vault/secrets/<NAME>, granted via the tinycloud.vault permission shorthand.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/sdk-core/src/manifest.ts
  - repo: js-sdk
    path: packages/sdk-services/src/secrets/paths.ts
  - repo: js-sdk
    path: packages/node-sdk/src/TinyCloudNode.ts
tags: [secrets, space, system-spaces]
timestamp: 2026-06-23
---

# Secrets Space

The **`secrets` space** is the reserved [[system-spaces|system space]] in which every owner keeps **network-encrypted secrets** — API keys, OAuth tokens, and other sensitive values — stored as KV records under the **`vault/secrets/`** key-prefix. It is an ordinary [[autonomic-space|autonomic space]] off the owner [[dids|DID]] (auto-hosted by the node like `account` and `applications`), distinguished only by convention: the ecosystem agrees that secrets live here, that their keys follow the `vault/secrets/<NAME>` layout, and that their values are encrypted through the owner's [[encryption-networks|encryption network]] rather than stored in plaintext.

## Role

The `secrets` space is [[architecture-layers|Layer 1]] convention — the substrate the L2 [[vault-secrets|secret-manager]] app enshrines. It lets any [[manifest-model|manifest]] app *declare* the named secrets it needs (`secrets: { ANTHROPIC_API_KEY: true }`) and receive a scoped read [[capabilities|capability]] over exactly that vault entry — without the app ever holding the plaintext, knowing how the secret was created, or implementing its own secret store. The space is the shared rendezvous point: one app (the secret-manager) writes the encrypted value, others read it under granted caps, and the [[tee-backends|TEE backend]] decrypts it only through the node under a delegated [[encryption-networks|network]] grant.

## Shape

`secrets` is named by the SDK constant `SECRETS_SPACE = "secrets"` (`packages/sdk-core/src/manifest.ts:262`). Like every space it is addressed by the [[uri-addressing-grammar|URI grammar]] as `tinycloud:{did-suffix}:secrets`, and the node auto-hosts it on first use (`ensureOwnedSpaceHosted(this.ownedSpaceId("secrets"))`, `TinyCloudNode.ts:831`).

Secrets are addressed inside it by **vault key**, resolved by `resolveSecretPath` (`packages/sdk-services/src/secrets/paths.ts`):

- **Global secret** → vault key `secrets/<NAME>`; backing KV permission path `vault/secrets/<NAME>`.
- **Scoped secret** → vault key `secrets/scoped/<scope>/<NAME>`; backing KV permission path `vault/secrets/scoped/<scope>/<NAME>`.

Names must match `SECRET_NAME_RE = /^[A-Z][A-Z0-9_]*$/` (env-style: uppercase, digits, underscores). Scopes are canonicalized to lowercase kebab-case; the scopes **`default`** and **`global`** are **reserved** (omit `scope` for the global namespace). The list-prefix for a scope is `vault/secrets/[scoped/<scope>/]` (`resolveSecretListPrefix`).

### The `tinycloud.vault` permission shorthand

Manifest secret declarations do **not** name `tinycloud.kv` directly; they emit the SDK-only **`tinycloud.vault`** service (`VAULT_PERMISSION_SERVICE`, `manifest.ts:265`). `secretEntriesForManifest` (`manifest.ts:971-999`) turns each declared secret into a `PermissionEntry` with `service: "tinycloud.vault"`, `space: "secrets"`, `path: <vaultKey>`, and `skipPrefix: true` (so the app's `app_id` prefix is *not* prepended — secrets are shared, not app-scoped). `tinycloud.vault` is never encoded as a recap service: `expandPermissionEntry` (`manifest.ts:448`) expands it to concrete `tinycloud.kv` actions on the backing `vault/<vaultKey>` path before it ever reaches the wire (`vault/...` get→`tinycloud.kv/get`, etc.).

## Mechanics

A value written to a secret is encrypted under the owner's [[encryption-networks|encryption network]] before it is stored as a KV record at `vault/secrets/<NAME>` — so what lives in the `secrets` space is ciphertext, never plaintext. The node binds its base secrets service to `space("secrets").vault` (`TinyCloudNode.ts:2176`). A reader holding a `tinycloud.kv/get` cap over `vault/secrets/<NAME>` fetches the encrypted envelope; decryption is a *separate* authority — a `tinycloud.encryption/decrypt` [[capabilities|capability]] on the network URN `urn:tinycloud:encryption:{ownerDid}:default` — performed by the node. This split (read the envelope vs. decrypt it) is what lets a [[tee-backends|TEE backend]] be delegated a secret without ever being trusted with plaintext: it can only obtain the value by asking the node to decrypt under the delegated network grant.

## Relationships

A [[system-spaces|system space]] addressed by the [[uri-addressing-grammar|URI grammar]]; populated as KV via [[vault-secrets|vault secrets]]; access granted via [[capabilities]]/[[delegation]] using the `tinycloud.vault` shorthand; values encrypted through an [[encryption-networks|encryption network]]; declared in an app [[manifest-model|manifest]]'s `secrets{}` block; read by [[tee-backends|TEE backends]] and worked through end-to-end in [[example-listen|Listen]]; the L2 [[vault-secrets|secret-manager]] app owns and curates it.

## Example

Listen declares `FIREFLIES_API_KEY: ["read"]` in its [[manifest-model|manifest]]. The SDK resolves this to a `tinycloud.vault` entry on `space: secrets`, `path: secrets/FIREFLIES_API_KEY`, expanded to a `tinycloud.kv/get` cap over `tinycloud:{did-suffix}:secrets/kv/vault/secrets/FIREFLIES_API_KEY`. The secret-manager app earlier wrote the encrypted envelope to that key; Listen's [[tee-backends|backend]], delegated the same read cap plus a `tinycloud.encryption/decrypt` grant, fetches and decrypts it through the node at run time — never seeing the key in plaintext outside the node. (See [[example-listen]].)

## Status & drift

Shipped. The space name is SDK-enforced convention, not node-enforced (`tinycloud-node` will host any name — see [[system-spaces]]). The user-facing path the [[vault-secrets|secret-manager]] presents is `secrets/<NAME>`; the **KV** permission/storage path carries the extra `vault/` prefix (`vault/secrets/<NAME>`) — a common point of confusion. The secret-manager README also references a parallel `keys/secrets/<NAME>` KV path for write/delete operations; `resolveSecretPath` itself emits only the `vault/...` permission path, so treat the `keys/...` path as the secret-manager app's own convention, not a protocol guarantee.

## Sources
- `js-sdk`: `packages/sdk-core/src/manifest.ts:262` (`SECRETS_SPACE`), `:265` (`VAULT_PERMISSION_SERVICE`), `:448` (`expandPermissionEntry`), `:971-999` (`secretEntriesForManifest`); `packages/sdk-services/src/secrets/paths.ts` (`resolveSecretPath`, `SECRET_NAME_RE`, reserved scopes, `resolveSecretListPrefix`); `packages/node-sdk/src/TinyCloudNode.ts:831` (host secrets space), `:2176` (`space("secrets").vault`)
