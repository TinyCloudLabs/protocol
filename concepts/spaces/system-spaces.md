---
type: concept
title: System Spaces
description: The reserved, conventional space names every owner has — default, public, account, secrets, applications — plus encryption as a synthetic network label, not a hosted space.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/sdk-core/src/manifest.ts
  - repo: js-sdk
    path: packages/sdk-core/src/account/AccountService.ts
  - repo: tinycloud-node
    path: tinycloud-sdk-wasm/src/session.rs
tags: [spaces, system-spaces]
timestamp: 2026-06-23
---

# System Spaces

**System spaces** are the reserved, conventional [[autonomic-space|space]] names that every owner DID has by convention: **`default`**, **`public`**, **`account`**, **`secrets`**, and **`applications`**. They are not a special *kind* of space — each is an ordinary [[autonomic-space|autonomic space]] off the owner's [[dids|DID]], created lazily by a `tinycloud.space/host` [[capabilities|capability]] like any other — but the ecosystem agrees on these names and what lives in each, so apps and agents can find data without discovery.

## Role

System spaces are [[architecture-layers|Layer 1]] convention. They give the [[manifest-model|manifest]] model and L2 [[#used-by|TinyCloud apps]] a shared map of *where data goes*: an app declares which spaces it needs in its manifest, the user grants scoped [[capabilities|capabilities]] over them, and reads/writes address them through the [[uri-addressing-grammar|URI grammar]] (`tinycloud:{did-suffix}:{name}/{service}/…`). Because the names are conventional rather than enforced by the node, this is genuinely a protocol *convention*, not a runtime feature.

## Shape

There is **no backend reserved-name list** — `tinycloud-node` will host a space of any name (`tinycloud-auth/src/resource.rs::Name` accepts any string; validation is a TODO). The only name with backend behavior is `public`, special-cased for unauthenticated reads by `tinycloud-node-server/src/routes/public.rs::is_public_space`. The canonical set is conventional, defined **in the SDK** as named constants (`packages/sdk-core/src/manifest.ts`: `ACCOUNT_REGISTRY_SPACE="account"`, `SECRETS_SPACE="secrets"`, `DEFAULT_MANIFEST_SPACE="applications"`, `ENCRYPTION_MANIFEST_SPACE="encryption"`). The names:

| Space | Holds | Notes |
|-------|-------|-------|
| `default` | the owner's primary/home data | the space the SDK ensures on first sign-in |
| `public` | world-readable data | unauthenticated reads; owner-only writes |
| `account` | the app-install **registry** + an account index | registry entries live under the **`applications/` key-prefix** in this space (`AccountService`) |
| `secrets` | encrypted secrets | entries at `vault/secrets/<NAME>` (see [[secrets]]) |
| `applications` | per-app data | each app's data is keyed under its `app_id` (e.g. `com.listen.app/…`) |

> **The `applications` overload.** "applications" names *two distinct things*: (1) the **`applications` space** that holds app data, and (2) the **`applications/` key-prefix** inside the **`account`** space that holds the install registry. They are not the same location — the registry is `account/…/applications/`, the data is the `applications` space.

### `encryption` is NOT a space

The `encryption` label is **synthetic**: it resolves to an **encryption-network URN** `urn:tinycloud:encryption:{ownerDid}:{network}`, a `Resource::Other` (see [[uri-addressing-grammar]]), not a hosted [[autonomic-space|space]]. Encryption networks are user-bound and managed separately (see [[encryption-networks]]); SDKs auto-create an owner-owned network during manifest sign-in.

## Mechanics

A system space is materialized exactly like any space: the first time an app needs it, the SDK transacts a [[delegation]] carrying `tinycloud.space/host` over `tinycloud:{did-suffix}:{name}/space`, and the node inserts the `SpaceId` (see [[autonomic-space]] for the lazy-host path). Authority over a system space still roots at the owner DID — `public` differs only in that its read [[capabilities|capabilities]] are granted to everyone.

## Used by

The L2 [[architecture-layers|TinyCloud apps]] enshrine these spaces: [[example-listen|Listen]] writes conversation data into the `applications` space (keyed by its `app_id`), [[secrets|Secrets]] owns the `secrets` space, and the [[manifest-model|manifest]]/install registry lives in `account`. An L3 [[apps-feed-listen|super-operable app]] reads across several of them under the user's [[policy-engine|policy]].

## Relationships

Each is an [[autonomic-space|autonomic space]] addressed by the [[uri-addressing-grammar|URI grammar]]; populated through [[services]] (kv/sql); access via [[capabilities]] + [[delegation]]; declared in an app [[manifest-model|manifest]]; `secrets` ↔ [[secrets]]; the `applications` space ↔ [[example-listen|Listen]] and other [[manifest-model|manifest]] apps; `encryption` ↔ [[encryption-networks]].

## Status & drift

Shipped. **Drift:** the whitepaper lists the system space as **`apps`**; the code uses **`applications`** — code is canonical (see [[meta/contradictions]]). The set is SDK-enforced, not node-enforced, so it is a convention that could evolve; treat the list as current-as-of-code, not a frozen protocol constant.

## Sources
- `js-sdk`: `packages/sdk-core/src/manifest.ts` (space-name constants), `packages/sdk-core/src/account/AccountService.ts` (`account` registry + `applications/` / `spaces/` prefixes), `packages/sdk-services/src/secrets/paths.ts` (`resolveSecretPath` → `vault/secrets/<NAME>`, scoped variant), `packages/sdk-services/src/encryption/networkId.ts` (`buildNetworkId`/`parseNetworkId`)
- `tinycloud-node`: `tinycloud-node-server/src/routes/public.rs` (`is_public_space`), `tinycloud-auth/src/resource.rs` (`Name` accepts any string — no reserved-name list); confirmed via `cx`
