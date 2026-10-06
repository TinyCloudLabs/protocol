---
type: concept
title: Vault Secrets
description: The secret-manager convention — resolveSecretPath maps a NAME (and optional scope) to a vault/secrets/<NAME> KV entry; secrets are shared cross-app via a decrypt-grant plus a read-grant.
status: shipped
layer: tinycloud-app
sources:
  - repo: js-sdk
    path: packages/sdk-services/src/secrets/paths.ts@d43e51ea
  - repo: js-sdk
    path: packages/sdk-services/src/secrets/SecretsService.ts@d43e51ea
  - repo: secret-manager
    path: README.md@64fb63e
tags: [secrets, vault, tinycloud-app]
timestamp: 2026-10-05
---

# Vault Secrets

**Vault secrets** are the convention by which the L2 **secret-manager** app ([[architecture-layers|TinyCloud apps]] layer) stores and shares user secrets in the [[secrets-space|secrets space]]: each logical secret `NAME` (with an optional `scope`) resolves deterministically to a network-encrypted KV entry at **`vault/secrets/<NAME>`**, and is shared with other apps by granting them a **read** capability on that key plus a **decrypt** capability on the owner's [[encryption-networks|encryption network]]. The secret-manager is the one app that *writes* the vault; every other app is a declarative *reader*.

## Role

This is the [[architecture-layers|Layer 2]] secret manager — the user-facing manager for "API keys, tokens, and other encrypted values that TinyApps need at runtime" (secret-manager `README.md`). It enshrines the [[secrets-space|secrets space]] the way [[example-listen|Listen]] enshrines the `applications` space. Its purpose is to make secret access *explicit and declarative*: apps state the secret `NAME`s they need in their [[manifest-model|manifest]]'s `secrets{}` block and receive scoped reads, while the secret-manager owns the privileged write/rotate/delete path and the provider catalog. The deterministic `resolveSecretPath` mapping is the shared contract that lets a writer and an unrelated reader land on the same KV key without coordination.

## Shape

The canonical mapping is `resolveSecretPath(name, { scope? })` (`packages/sdk-services/src/secrets/paths.ts`), which returns a `ResolvedSecretPath`:

```ts
// global secret
resolveSecretPath("ANTHROPIC_API_KEY")
// → { name: "ANTHROPIC_API_KEY",
//     vaultKey: "secrets/ANTHROPIC_API_KEY",
//     permissionPaths: { vault: "vault/secrets/ANTHROPIC_API_KEY" } }

// scoped secret
resolveSecretPath("ANTHROPIC_API_KEY", { scope: "food-tracker" })
// → { name: "ANTHROPIC_API_KEY", scope: "food-tracker",
//     vaultKey: "secrets/scoped/food-tracker/ANTHROPIC_API_KEY",
//     permissionPaths: { vault: "vault/secrets/scoped/food-tracker/ANTHROPIC_API_KEY" } }
```

- **`vaultKey`** — what the vault service is addressed with: `secrets/<NAME>` (global) or `secrets/scoped/<scope>/<NAME>` (scoped). The `scoped/` segment keeps per-project keys separate from global keys.
- **`permissionPaths.vault`** — the backing **KV** path: the `vaultKey` with a literal `vault/` prefix. This is the path a [[capabilities|capability]] is actually issued over.
- **`name`** must match `SECRET_NAME_RE = /^[A-Z][A-Z0-9_]*$/`. **`scope`** is canonicalized to lowercase kebab-case; `default` and `global` are reserved (omit `scope` for the global namespace).

The runtime surface is `SecretsService` (`packages/sdk-services/src/secrets/SecretsService.ts`, with node/web bindings), bound to `space("secrets").vault`. `secrets.listAll()` (stable 3.0.0, `SecretsService.ts:129`) returns the **names** of both global and scoped secrets, never their values. Provider metadata (provider id, ENV name, scope, note, last-test status) is **not** the secret — the secret-manager keeps it in its own app SQL so listing providers does not unlock the data vault (secret-manager `README.md`, "Provider State").

## Mechanics

### Reads are manifest-declared; writes are escalated

A consuming app declares `secrets: { ANTHROPIC_API_KEY: true }`, which the SDK turns into a `tinycloud.vault` read entry on `vault/secrets/ANTHROPIC_API_KEY` (see [[secrets-space]] and [[manifest-model]]). That default grants **read** only. Adding, rotating, or deleting a secret is privileged: the secret-manager asks the SDK to request the exact vault permission for that operation — `tinycloud.vault/write` or `tinycloud.vault/delete` on `secrets/<NAME>` — which the SDK expands to the backing `tinycloud.kv/put`/`tinycloud.kv/del` resources (secret-manager `README.md`, "Permission Model").

### Cross-app sharing = read-grant + decrypt-grant

A secret value is a [[encryption-networks|network]]-encrypted envelope stored under `vault/secrets/<NAME>`. Sharing it with another principal (an app, a [[tee-backends|TEE backend]]) is two grants, never a key hand-off:

1. a **read-grant** — a `tinycloud.kv/get` [[capabilities|capability]] over `vault/secrets/<NAME>` in the [[secrets-space|secrets space]], so the grantee can fetch the *ciphertext*; and
2. a **decrypt-grant** — a `tinycloud.encryption/decrypt` capability on the owner's network URN `urn:tinycloud:encryption:{ownerDid}:default`, so the node will decrypt that envelope on the grantee's behalf. The URN must be a **top-level ReCap resource** in the grant; one nested under the `secrets` space is refused with 401 (TC-598). OpenKey's `/delegate` signs decrypt grants that way (see [[user-bound-decrypt]]).

The grantee never holds the encryption key; the node performs decryption only when both grants are present. This is exactly how [[example-listen|Listen]] hands its TEE backend secret access.

### Setup links for a missing secret

When an app or agent needs a secret that does not exist yet, it can send the owner a link that opens Secret Manager with that name filled in. The beta CLI builds `https://secrets.tinycloud.xyz/app?secret=NAME` (plus `&scope=…` for a scoped secret); Secret Manager also accepts `?name=NAME` (secret-manager `6d6fa75`).

### When storage is full

Secret Manager (`secrets.tinycloud.xyz`) stays readable when the secrets space is over its storage [[quota]]: every secret stays listed and readable, a save the node rejects for storage shows a plain message and a persistent "Storage full: read-only" banner, and deleting a secret still works (secret-manager `64fb63e`).

## Relationships

Stores into the [[secrets-space|secrets space]]; addressed by `resolveSecretPath` → `vault/secrets/<NAME>`; encrypted through an [[encryption-networks|encryption network]]; declared via the [[manifest-model|manifest]] `secrets{}` block (`true`/`"read"`/actions/object form); shared by composing a read [[capabilities|capability]] with a decrypt capability ([[delegation]]); consumed by [[tee-backends|TEE backends]] and demonstrated in [[example-listen|Listen]]; the SDK shorthand is the `tinycloud.vault` service.

## Example

A user adds `ANTHROPIC_API_KEY` scoped to `food-tracker` in the secret-manager. The app requests `tinycloud.vault/write` on `secrets/scoped/food-tracker/ANTHROPIC_API_KEY` (SDK expands → `tinycloud.kv/put` on `vault/secrets/scoped/food-tracker/ANTHROPIC_API_KEY`), encrypts the value under the user's default network, and stores it. Later the food-tracker app, having declared `ANTHROPIC_API_KEY` with `{ scope: "food-tracker" }` in its manifest, gets a `tinycloud.kv/get` over the same path plus a decrypt grant — and reads the key through the node, never seeing how it was created.

## Status & drift

Shipped (stable SDK 3.0.0; Secret Manager at `secrets.tinycloud.xyz`). CLI 1.0.0 already returns a setup link for a missing secret (`secrets.tinycloud.xyz?name=…`, which Secret Manager forwards to its add form); the 1.1.0 beta links to `/app?secret=…` directly. The L2 app's GitHub repo is `secret-manager` (product name "TinyCloud Secrets" / "TinyCloud Secret Manager"). The user-facing `secrets/<NAME>` form and the on-wire `vault/secrets/<NAME>` KV path differ by the `vault/` prefix — match the one the layer you are in actually uses.

## Sources
- `js-sdk` @d43e51ea (stable 3.0.0): `packages/sdk-services/src/secrets/paths.ts` (`resolveSecretPath`, `ResolvedSecretPath`, `canonicalizeSecretScope`, `resolveSecretListPrefix`, `SECRET_NAME_RE`, reserved scopes); `packages/sdk-services/src/secrets/SecretsService.ts` (runtime service, `space("secrets").vault`; `:129` `listAll()`)
- `secret-manager`: `README.md` (declarative reads, escalated writes/deletes, vault layout, provider state, `keys/...` vs `vault/...`); `64fb63e` (read-only when storage is full, TC-619); `6d6fa75` (setup links with `?secret=` / `?name=`, TC-649)
