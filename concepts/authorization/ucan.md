---
type: concept
title: UCAN
description: User Controlled Authorization Networks — the bearer-token delegation format TinyCloud uses for sub-delegations and invocations below the CACAO root.
status: shipped
layer: protocol
resource: https://github.com/ucan-wg/spec
tags: [authz, ucan, delegation, invocation]
timestamp: 2026-06-23
---

# UCAN

**UCAN** (User Controlled Authorization Networks) is the bearer-token [[delegation]] format TinyCloud uses for every capability link **below** the [[cacao|CACAO]] root. After a wallet signs once (SIWE → CACAO), the [[session-keys|session key]] issues and signs UCAN sub-delegations and [[invocation|invocations]] — so the owner's wallet key is never touched again. The chain of UCAN links, terminated by the CACAO root, is what [[cacao-chain-validation]] verifies on every request.

## Role in TinyCloud

In TinyCloud's authorization model:

- The **root** link is always a [[cacao|CACAO]] (the SIWE signature).
- Every **subsequent** link is a UCAN: either a sub-delegation (narrowing scope with [[attenuation]]) or a final invocation.
- `TinyCloudDelegation` in `tinycloud-auth` is a sum type that is **either** a UCAN or a CACAO, handling both link types uniformly.
- `TinyCloudInvocation` is always a UCAN.

## Structure

A UCAN is a JWT-style signed token carrying:
- **`iss`** — issuer DID (`did:key:…` session key).
- **`aud`** — audience DID (next delegatee or node DID for invocations).
- **`att`** — attenuation: the [[capabilities]] being delegated or invoked.
- **`prf`** — proof: CIDs of parent UCANs / the CACAO root.
- **`exp`** — expiry (contained within the parent's window).

## Relationships

Sub-type of [[delegation]]; issued by [[session-keys|session keys]]; constrained by [[attenuation]]; validated as part of the chain in [[cacao-chain-validation]]; rooted in a [[cacao|CACAO]]; the final UCAN in a chain is an [[invocation]].

## Status & drift

Shipped. Sub-delegations and invocations use the UCAN format throughout. The full chain type is `TinyCloudDelegation` in `tinycloud-auth/src/authorization.rs`; invocation is `TinyCloudInvocation`. UCAN verification (signature, issuer/audience linkage, time windows, attenuation) is in `tinycloud-core/src/models/delegation.rs` and `models/invocation.rs`.

## Citations

- UCAN specification: https://github.com/ucan-wg/spec
- UCAN Working Group: https://ucan.xyz
