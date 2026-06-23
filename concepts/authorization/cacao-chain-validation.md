---
type: concept
title: CACAO Chain Validation
description: The node's end-to-end algorithm for validating an authorization chain — a SIWE/CACAO root plus UCAN sub-delegations — back to a space's owner, the gate every request passes.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/models/delegation.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/models/invocation.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/auth_guards.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/relationships/parent_delegations.rs
tags: [authz, cacao, ucan, top-gap]
timestamp: 2026-06-23
---

# CACAO Chain Validation

**CACAO chain validation** is the algorithm a [[nodes|node]] runs to decide whether a request is authorized: it walks the request's [[delegation]] chain — a **[[siwe|SIWE]]/[[cacao|CACAO]]** root plus zero or more **[[ucan|UCAN]]** sub-delegations, ending in a [[invocation]] — and admits it only if every link verifies cryptographically and stays within its parent's authority, terminating at the [[autonomic-space|space]]'s [[dids|owner DID]]. This is the single gate behind every read and write, and getting its exact rules right is what makes TinyCloud authority server-independent.

## Role

This is the heart of [[architecture-layers|Layer 1]] enforcement. Because the chain is self-describing and self-verifying, a node needs **no account database** to authorize a caller — the proof travels with the request (`AuthHeaderGetter` in `tinycloud-node-server/src/auth_guards.rs` lifts it off the HTTP headers before any route runs). It is the concrete validation of the [[capabilities|capability]] model.

## Actors

The [[dids|owner DID]] (root, `did:pkh`) · zero or more intermediate [[session-keys|session/delegate keys]] (`did:key`) · the final invoker · the [[nodes|node]] verifying against the target [[autonomic-space|space]].

## The algorithm

A chain is `root_delegation → [sub_delegation …] → invocation`. The two link types are modeled in `tinycloud-auth`: a `TinyCloudDelegation` is **either** a UCAN **or** a SIWE/CACAO ([[recap|ReCap]]); a `TinyCloudInvocation` is a UCAN. Validation (`tinycloud-core/src/models/delegation.rs`, `models/invocation.rs`, parentage in `relationships/parent_delegations.rs`) checks, per link:

1. **Signature.** Each link is signed by the principal its parent delegated *to*. The root [[cacao|CACAO]] is signed by the [[dids|owner]] (EIP-191 over the [[siwe|SIWE]] message); each [[ucan|UCAN]] is signed by its issuer key. A signature that doesn't verify against the expected DID rejects the chain.
2. **Issuer/audience linkage.** Each sub-delegation's *issuer* must equal its parent's *audience* (the key the parent granted to); the invocation's issuer must equal the last delegation's audience. This is the parent-delegatee match enforced in `invocation.rs` / `parent_delegations.rs`.
3. **Time validity.** Each link's `[nbf, exp]` window must be valid *now* and contained within its parent's window — a child can never outlive its parent.
4. **Scope containment (attenuation).** The link's resource must be `extends`-covered by the parent's resource (the path-containment rule in [[uri-addressing-grammar]]) **and** its ability must be covered by the parent's ability. See [[attenuation]] — a child can only narrow.
5. **Root authority.** The chain's root must be signed by the DID that **owns the target [[autonomic-space|space]]** — `is_root_authority` compares the space's `base_did` to the root delegator. A chain that doesn't bottom out at the space owner is rejected regardless of internal validity.

Only if **every** link passes 1–5 is the [[invocation]] admitted and dispatched to the [[services|service]].

## Crypto / replay

Root authority is EIP-191 secp256k1 over the SIWE/CACAO; sub-links are UCAN (Ed25519 `did:key`) signatures. Replay protection on the general invoke path rests on the time-bounds + the chain's hash-identity rather than a dedicated nonce-dedup table (see [[consistency-model]]).

## Relationships

Validates a [[delegation]] chain of [[capabilities]] rooted in a [[siwe|SIWE]]/[[cacao|CACAO]] and extended by [[ucan|UCAN]]; enforces [[attenuation]] via [[uri-addressing-grammar|`extends`]]; gates every [[invocation]]; the HTTP entry is [[node-architecture|`auth_guards`]]; the inverse operation (issuing a chain) is [[sign-in-flow]].

## Example

Request: invoke `tinycloud.kv/get` on `…:applications/kv/xyz.tinycloud.listen/transcript/x`. Chain: owner SIWE/CACAO root granting `tinycloud.kv/get` over `…:applications/kv/xyz.tinycloud.listen/transcript/` to a [[session-keys|session key]] → that key's UCAN invocation of the exact path. The node verifies the owner's signature, that the session key is the CACAO's audience, that `transcript/x` is `extends`-covered by `transcript/`, that times are valid, and that the root signer owns `…:applications` — then serves the read.

## Status & drift

Shipped. The chain types and verification live in `tinycloud-auth` + `tinycloud-core/src/models/{delegation,invocation}.rs`; this concept is **Sam's top documentation gap**, now pinned to those paths. The general `/invoke` replay nuance is tracked in [[consistency-model]].

## Sources
- `tinycloud-node`: `tinycloud-core/src/models/delegation.rs`, `models/invocation.rs`, `relationships/parent_delegations.rs`, `tinycloud-node-server/src/auth_guards.rs` (`AuthHeaderGetter`), `tinycloud-auth/src/authorization.rs` (`TinyCloudDelegation`/`TinyCloudInvocation`)
