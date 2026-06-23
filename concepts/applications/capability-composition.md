---
type: concept
title: Capability Composition
description: composeManifestRequest unions an app manifest with backend/agent delegate manifests into one capability request — a single SIWE/ReCap the user signs once, covering the whole app graph plus pre-authorized downstream delegations.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/sdk-core/src/manifest.ts
  - repo: js-sdk
    path: packages/node-sdk/src/TinyCloudNode.ts
tags: [applications, composition, authz]
timestamp: 2026-06-23
---

# Capability Composition

**Capability composition** is the step that folds an app's [[manifest-model|manifest]] together with the manifests of its delegates (a [[tee-backends|TEE backend]], an agent) into **one** [[capabilities|capability]] request, so the user approves the entire app graph — app permissions *and* pre-authorized downstream [[delegation|delegations]] — in a **single** [[siwe|SIWE]]/[[recap|ReCap]] wallet prompt. After that one signature, downstream UCAN delegations are **materialized from the session key with no second prompt**.

## Role

Composition is the [[architecture-layers|Layer 1]] mechanism that makes the manifest app model usable: instead of one wallet signature per backend and per space, the app composes `f(manifests[]) → request`, signs once, then `f(request, signer) → grant` and `f(grant, targets[]) → subdelegations[]` with no further user interaction. It is the seam between the [[manifest-model|manifest]] (declarative) and the [[install-registry|install registry]] + [[delegation]] machinery (what actually gets signed and stored).

## Shape

`composeManifestRequest(inputs, options)` (`packages/sdk-core/src/manifest.ts:1222-1281`) returns a `ComposedManifestRequest` (`:204-217`):

```ts
interface ComposedManifestRequest {
  manifests: Manifest[];          // the validated inputs
  resources: ResourceCapability[];// the full permission union — ONE SIWE
  delegationTargets: ResolvedDelegate[]; // materializable after sign-in (from did manifests)
  registryRecords: ManifestRegistryRecord[]; // written to the account space on success
  expiryMs: number;               // longest composed manifest expiry
  includePublicSpace: boolean;    // true if any manifest opted in
}
```

- **`resources`** — every manifest's resolved caps, flattened, deduped, with implicit `tinycloud.capabilities/read` per space. This union is what the SIWE/ReCap requests.
- **`delegationTargets`** — one `ResolvedDelegate` per manifest that declared a `did`; carries that delegate's full permission set, to be minted *after* sign-in.
- **`registryRecords`** — one record per `app_id` (key `applications/<app_id>` in the `account` space) for the [[install-registry|install registry]].

## Mechanics

### Compose → sign once

`composeManifestRequest` validates and `resolveManifest`s each input, flattens all `resources`, and (unless `includeAccountRegistryPermissions: false`) injects the implicit **account-registry** caps so the SDK can write the [[install-registry|registry]] record: `tinycloud.kv` get/put/list on the `account` space paths `applications/` and `spaces/` (`accountRegistryPermissions`, `:1199-1206`) plus a `tinycloud.sql` read/write/ddl on the account index db (`:1208-1215`). The whole union is signed in one SIWE/ReCap, yielding a [[session-keys|session key]] holding the composed [[capabilities]].

### Materialize delegates without a second prompt

Each `delegationTarget` is realized by `node.materializeDelegation(did, request)` (`TinyCloudNode.ts:3093-3112`), which finds the matching target and calls `delegateTo` → the **session-key UCAN WASM path** (`createDelegationViaWasmPath`, `:3145`). Because the child [[delegation]] is signed by the *session key* — already authorized by the one wallet signature — minting it needs **no wallet interaction**. The result is a [[delegation|PortableDelegation]] the app delivers to the delegate out-of-band (e.g. Listen POSTs it to `/api/delegations`).

### Backend delegate manifests

A backend is composed in by turning its advertised permissions (fetched out-of-band, e.g. from `/api/server-info`) into a *delegate manifest*: same `app_id`, a `did`, `defaults: false`, and the backend's requested `permissions[]`. Composing `[appManifest, backendManifest]` unions both into the one request; the backend manifest's `did` makes it a `delegationTarget`. The decrypt grant for the owner's default [[encryption-networks|network]] is injected only for the matching delegate DID.

## Relationships

Consumes [[manifest-model|manifests]]; emits the [[capabilities|capability]] union signed via [[siwe|SIWE]]/[[recap|ReCap]] by a [[session-keys|session key]]; writes [[install-registry|install-registry]] records; produces [[delegation|PortableDelegations]] for [[tee-backends|TEE backends]] and agents; the canonical worked instance is [[example-listen|Listen]]'s sign-in.

## Example

Listen builds a backend delegate manifest from `/api/server-info` and composes `[listenManifest, backendDelegateManifest]`. One `createAndSignIn(provider, { capabilityRequest })` signs the union (one wallet prompt). The SDK writes the `applications/xyz.tinycloud.listen` registry record, then `createManifestDelegation` materializes the backend UCAN from the session key (no second prompt) and POSTs it to the backend. (See [[example-listen]] and [[tee-backends]].)

## Status & drift

Shipped. `includeAccountRegistryPermissions` defaults `true`; turning it off drops both the implicit `account`-space caps and the `registryRecords` (an app that opts out won't appear in the install registry). `expiryMs` is the **max** of the composed manifests, and `includePublicSpace` is **true if any** manifest opted in — composition widens to the most permissive of those two settings.

## Sources
- `js-sdk`: `packages/sdk-core/src/manifest.ts:204-217` (`ComposedManifestRequest`), `:1199-1215` (account-registry + index caps), `:1222-1281` (`composeManifestRequest`); `packages/node-sdk/src/TinyCloudNode.ts:3093-3112` (`materializeDelegation`), `:3145` (`createDelegationViaWasmPath` — session-key UCAN path)
