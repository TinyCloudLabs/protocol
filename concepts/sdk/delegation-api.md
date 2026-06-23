---
type: concept
title: Delegation API
description: The client API for granting a subset of your authority to another DID — delegateTo with subset-checking, materialized as a PortableDelegation.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/node-sdk/src/delegation.ts
  - repo: js-sdk
    path: packages/sdk-core/src/delegations/DelegationManager.ts
tags: [sdk, delegation, authz]
timestamp: 2026-06-23
---

# Delegation API

The **delegation API** is how a client grants a subset of its [[capabilities|authority]] to another [[dids|DID]]: `delegateTo(did, PermissionEntry[])` checks the request is a subset of what the caller holds and produces a **`PortableDelegation`** the recipient can carry and exercise. It is the SDK surface over the protocol's [[delegation]] mechanism.

## Shape

- **`delegateTo(did, PermissionEntry[])`** (`packages/node-sdk/src/delegation.ts`) — grant the listed permissions to `did`.
- **`PortableDelegation`** — the transportable artifact (multi-resource `resources[]`) the recipient presents; effectively a serialized [[delegation]] link.
- **`DelegationManager`** (`packages/sdk-core/src/delegations/DelegationManager.ts`) — orchestrates creation, [[recap|ReCap]] parsing, and subset-checking.

## Mechanics

`delegateTo` parses the caller's held [[capabilities]] (`parseRecapFromSiwe`) and verifies the requested `PermissionEntry[]` `isCapabilitySubset` of them. If the grant is derivable from the session's existing authority, it signs a session-key [[ucan|UCAN]] with **no wallet prompt**; if it needs authority the session lacks, it escalates (`forceWalletSign` / legacy SIWE) or throws `PermissionNotInManifestError`. The result is a [[delegation]] link whose validity the [[nodes|node]] later confirms via [[cacao-chain-validation]] — the client cannot mint authority it doesn't have.

## Relationships

Client surface over [[delegation]]; enforces [[attenuation]] (subset-check) before the node does; transports as `PortableDelegation`; the granted [[capabilities]] are exercised through [[data-apis]]; underlies [[secrets-sharing]] and [[tee-backends|TEE backend]] delegation.

## Status & drift

Shipped, with full node/web parity (`createDelegation`/`createSubDelegation`). Subset-checking is client-side convenience; the node's [[cacao-chain-validation|chain validation]] is the authoritative gate.

## Sources
- `js-sdk`: `packages/node-sdk/src/delegation.ts` (`delegateTo`, `PortableDelegation`), `packages/sdk-core/src/delegations/DelegationManager.ts`
