---
type: concept
title: CACAO
description: Chain Agnostic Capability Object (CAIP-74) — the signed capability envelope TinyCloud uses as the root delegation in every session.
status: shipped
layer: protocol
resource: https://chainagnostic.org/CAIPs/caip-74
tags: [authz, cacao, siwe, delegation]
timestamp: 2026-06-23
---

# CACAO

**CACAO** (Chain Agnostic Capability Object, CAIP-74) is the signed authorization envelope that TinyCloud uses as the **root delegation** of every session. When an owner signs a [[siwe|SIWE]] message, the resulting signature and message are serialized into a CACAO, which carries the granted [[capabilities|capabilities]] (encoded as a [[recap|ReCap]]) and the delegatee (the [[session-keys|session key]]). The node validates it as the chain root in [[cacao-chain-validation]].

## Role in TinyCloud

TinyCloud uses CACAO as the **root** of every capability chain:

- The owner wallet signs a SIWE/[[recap|ReCap]] message once at sign-in.
- The result is wrapped into a CACAO (`dependencies/cacao` in `tinycloud-node`).
- The CACAO is the first link in the [[delegation]] chain; all subsequent links are [[ucan|UCAN]] sub-delegations.
- [[cacao-chain-validation]] walks this chain on every request.

## Structure

A CACAO envelope carries:
- **`iss`** — the issuer (owner) DID, a `did:pkh:eip155:…` [[dids|DID]].
- **`aud`** — the audience (delegatee) DID, typically the [[session-keys|session key]] `did:key:…`.
- **`p`** — the payload: SIWE fields (`domain`, `uri`, `nbt`, `exp`, `statement`) plus `resources` encoding the [[recap|ReCap]] capability list.
- **`s`** — the signature block (EIP-191 secp256k1 over the SIWE message).

## Relationships

Produced by the [[siwe|SIWE]] sign-in flow; carries a [[recap|ReCap]] encoding [[capabilities]]; validated by [[cacao-chain-validation]]; extended by [[ucan|UCAN]] sub-delegations; issued to a [[session-keys|session key]]; the full client sequence is [[sign-in-flow]].

## Status & drift

Shipped. CACAO is the live root delegation format; the `dependencies/cacao` crate in `tinycloud-node` implements parsing and validation. The SIWE message embedding is canonical in `tinycloud-node-server` and `packages/sdk-core`.

## Citations

- CAIP-74 CACAO specification: https://chainagnostic.org/CAIPs/caip-74
- Chain Agnostic Improvement Proposals: https://chainagnostic.org
