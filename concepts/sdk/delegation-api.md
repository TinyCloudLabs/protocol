---
type: concept
title: Delegation API
description: The client API for granting a subset of your authority to another DID — delegateTo with subset-checking, createSubDelegation for re-granting received access, materialized as a PortableDelegation.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/node-sdk/src/TinyCloudNode.ts@d43e51ea
  - repo: js-sdk
    path: packages/node-sdk/src/delegation.ts@d43e51ea
  - repo: js-sdk
    path: packages/sdk-core/src/delegations/DelegationManager.ts@d43e51ea
tags: [sdk, delegation, authz]
timestamp: 2026-10-05
---

# Delegation API

The **delegation API** is how a client grants a subset of its [[capabilities|authority]] to another [[dids|DID]]. `delegateTo(did, PermissionEntry[])` checks that the request is a subset of what the caller holds and produces a **`PortableDelegation`** the recipient can carry and use. It is the SDK surface over the protocol's [[delegation]] mechanism.

## Shape

- **`delegateTo(did, PermissionEntry[], options?)`** (`packages/node-sdk/src/TinyCloudNode.ts:5592`): grants the listed permissions to `did`.
- **`createSubDelegation(parentDelegation, params)`** (`TinyCloudNode.ts:7061`; web wrapper in `web-sdk/src/modules/tcw.ts`): re-grants a delegation the caller *received*, within the parent's path, actions and lifetime.
- **`PortableDelegation`** (`packages/node-sdk/src/delegation.ts:27`): the transportable artifact. It may carry several resources and is serialized with `serializeDelegation` / `deserializeDelegation`.
- **`DelegationManager`** (`packages/sdk-core/src/delegations/DelegationManager.ts`): orchestrates creation, [[recap|ReCap]] parsing, and subset checks.

## Mechanics

`delegateTo`:

1. Fails fast with `SessionExpiredError` if there is no live session.
2. Computes the expiry from `options.expiry`, capped at the session's expiry so the UCAN never outlives its parent.
3. Parses the session's held [[capabilities]] (`parseRecapFromSiwe`) and checks that every requested `PermissionEntry` is an `isCapabilitySubset` of them. The check understands action `/*` and path `/*` / `/**` wildcards.
4. If the session already covers the grant, signs a session-key UCAN with **no wallet prompt**; otherwise it throws `PermissionNotInManifestError`. Setting `forceWalletSign` skips this check entirely and takes the legacy wallet path, whether or not the session covers the grant.

`createSubDelegation` defaults its expiry to **the longest the parent allows**, the parent's own expiry, and caps any requested expiry there. The Node re-checks every link in either case (see [[delegation]] and [[attenuation]]): the client cannot mint authority it does not have.

Received **Share** access has its own re-delegation call, `ReceivedShare.delegate({ to, expiresAt? })`. It also defaults to the longest the parent allows, and is admitted by the Node as a policy-session descendant (see [[native-sharing]]).

## Relationships

Client surface over [[delegation]]; checks [[attenuation]] before the Node does; travels as `PortableDelegation`; the granted [[capabilities]] are exercised through [[data-apis]]; underlies bearer links in [[secrets-sharing]] and the agent hand-off in [[native-sharing]]; also used for [[tee-backends|TEE backend]] delegation; a grant ends early through [[revocation]].

## Status & drift

`shipped` in SDK 3.0.0, with node/web parity for `createDelegation` / `createSubDelegation`. Subset checking in the client is a convenience; the Node's chain validation ([[delegation]], [[cacao-chain-validation]]) is the authoritative gate.

## Sources
- `js-sdk` (`d43e51ea`, SDK 3.0.0): `packages/node-sdk/src/TinyCloudNode.ts:5592-5700` (`delegateTo`), `:7061-7130` (`createSubDelegation`, parent-expiry default), `packages/node-sdk/src/delegation.ts:27, 646-656` (`PortableDelegation`, serialization), `packages/sdk-core/src/delegations/DelegationManager.ts`, `packages/web-sdk/src/share/types.ts:49-55` (`ShareDelegateOptions.expiresAt` default)
