---
type: concept
title: Sign-In Flow
description: The SDK sequence that turns a wallet signature into a working session with a scoped capability set, without exposing the owner key to the app.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/node-sdk/src/authorization/NodeUserAuthorization.ts
  - repo: js-sdk
    path: packages/sdk-core/src/userAuthorization.ts
  - repo: tinycloud-node
    path: tinycloud-sdk-wasm/src/session.rs
tags: [sdk, sign-in]
timestamp: 2026-06-23
---

# Sign-In Flow

The **sign-in flow** is the SDK sequence that turns one wallet signature into a working [[session-keys|session]] with a scoped [[capabilities|capability]] set — so the app acts with a delegated session key and never touches the [[dids|owner key]].

## Actors

[[dids|Owner DID]] (wallet) · ephemeral [[session-keys|session `did:key`]] · the [[nodes|host node]] · the app [[manifest-model|manifest]].

## Sequence

1. **Resolve** address/chain and hosts; **create a [[session-keys|session key]]** (WASM `TCWSessionManager`, `tinycloud-sdk-wasm/src/session.rs`).
2. **`resolveSignInCapabilities`** → the [[capabilities]] the [[manifest-model|manifest]] needs.
3. **`prepareSession`** builds the [[siwe|SIWE]]-[[recap|ReCap]] message.
4. **Wallet signs** `prepared.siwe` → a [[cacao|CACAO]].
5. **`completeSessionSetup`** mints the session [[ucan|UCAN]] (`delegationHeader`/CID) delegating from owner → session key.
6. **`checkNodeInfo`** → **`afterSignIn` hooks** → **`ensureSpaceExists`** ([[space-hosting]] via host-SIWE if the space is absent).

Thereafter the [[session-keys|session key]] signs [[invocation|invocations]] with no further wallet prompts. The platform entry is `NodeUserAuthorization.signIn` (`packages/node-sdk/...`); `prepareSessionForSigning`/`signInWithPreparedSession` support external signers.

## Crypto

One wallet signature (step 4) authorizes the whole [[capability-composition|composed capability set]]; the node validates the resulting chain via [[cacao-chain-validation]]. Replay is bounded by the SIWE nonce + time.

## Relationships

Produces the [[session-keys|session]] + root [[delegation]] that [[capabilities]] derive from; consumes the app [[manifest-model|manifest]] (and [[capability-composition]] for app+backend); hosts the space via [[space-hosting]]; the node-side counterpart is [[cacao-chain-validation]].

## Status & drift

Shipped. The exact `prepareSession`/`completeSessionSetup` implementations live in the WASM crate (`sdk-rs`/`tinycloud-sdk-wasm`), surfaced through `sdk-core/src/userAuthorization.ts`.

## Sources
- `js-sdk`: `packages/node-sdk/src/authorization/NodeUserAuthorization.ts`, `packages/sdk-core/src/userAuthorization.ts`
- `tinycloud-node`: `tinycloud-sdk-wasm/src/session.rs`
