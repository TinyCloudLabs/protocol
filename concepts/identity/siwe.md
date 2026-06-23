---
type: concept
title: Sign-In with Ethereum
description: The SIWE message an owner wallet signs to root authority — carrying a ReCap of capabilities and serialized as a CACAO that becomes the root delegation.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-auth/src/authorization.rs
  - repo: tinycloud-node
    path: dependencies/siwe-recap/src/capability.rs
  - repo: js-sdk
    path: packages/sdk-core/src/userAuthorization.ts
tags: [identity, siwe, recap, cacao]
timestamp: 2026-06-23
---

# Sign-In with Ethereum

**SIWE** (Sign-In with Ethereum, EIP-4361) is the single human-facing signature that roots a TinyCloud session. The owner's wallet signs a SIWE message whose statement embeds a **[[recap|ReCap]]** — the [[capabilities|capabilities]] being granted — and the signed result is serialized as a **[[cacao|CACAO]]** that becomes the **root [[delegation]]** of the session.

## Role

SIWE is where the [[dids|owner DID]] (`did:pkh:eip155:…`) exercises root authority in [[architecture-layers|Layer 1]]. One wallet signature simultaneously proves control of the address and authorizes a scoped capability set to an ephemeral [[session-keys|session key]] — so the wallet need not sign again for ordinary operations.

## Mechanics

1. The client assembles the capabilities the app/[[manifest-model|manifest]] needs and encodes them as a **[[recap|ReCap]]** (`urn:recap:…`) appended to the SIWE message (`dependencies/siwe-recap/src/capability.rs`).
2. The wallet signs the SIWE string; the signature + message are wrapped into a **[[cacao|CACAO]]** (`dependencies/cacao`).
3. The node accepts that CACAO as a `TinyCloudDelegation` root (`tinycloud-auth/src/authorization.rs`), the source of the [[delegation]] chain every later [[invocation]] traces to.

The client builds and signs this in `packages/sdk-core/src/userAuthorization.ts` (`prepareSession` → wallet signs → `completeSessionSetup`); see [[sign-in-flow]] for the full sequence and [[cacao-chain-validation]] for how the node validates it.

## Relationships

Signed by the [[dids|owner DID]]; encodes [[capabilities]] as a [[recap|ReCap]]; serialized as a [[cacao|CACAO]]; produces the root [[delegation]] that a [[session-keys|session key]] extends; the full client flow is [[sign-in-flow]]; node-side validation is [[cacao-chain-validation]].

## Example

A wallet signs one SIWE message granting `tinycloud.space/host` + `tinycloud.kv/*` over `…:default`; the resulting CACAO roots the session, and the [[session-keys|session key]] thereafter signs [[invocation|invocations]] with no further wallet prompts.

## Status & drift

Shipped. SIWE+ReCap is the root-authority path; sub-delegations and invocations use [[ucan|UCAN]].

## Sources
- `tinycloud-node`: `tinycloud-auth/src/authorization.rs`, `dependencies/siwe-recap/src/capability.rs`
- `js-sdk`: `packages/sdk-core/src/userAuthorization.ts`
