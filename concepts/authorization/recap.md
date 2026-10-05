---
type: concept
title: ReCap
description: EIP-5573 SIWE ReCap — the capability-encoding extension that embeds a structured list of granted abilities into a SIWE message, forming the payload of the CACAO root delegation.
status: shipped
layer: protocol
resource: https://eips.ethereum.org/EIPS/eip-5573
tags: [authz, recap, siwe, cacao, capabilities]
timestamp: 2026-06-23
---

# ReCap

**ReCap** (EIP-5573, SIWE ReCap) is the capability-encoding extension for [[siwe|SIWE]] messages. It encodes the [[capabilities]] being granted — as a `urn:recap:…` statement — into the SIWE message the owner signs. The result is serialized into a [[cacao|CACAO]] that becomes the root [[delegation]] of a TinyCloud session.

## Role in TinyCloud

At sign-in, the SDK assembles the capabilities the app requests and encodes them as a ReCap resource. This happens in `packages/sdk-core/src/userAuthorization.ts` (`prepareSession`):

1. The required [[capabilities]] (resource × ability pairs from the [[manifest-model|manifest]]) are encoded as a `urn:recap:…` URI in the SIWE `resources` list.
2. The owner's wallet signs the SIWE message (which now carries the ReCap).
3. The signed result is wrapped into a [[cacao|CACAO]] (`dependencies/siwe-recap/src/capability.rs` in `tinycloud-node`).
4. The CACAO's `p.resources` field contains the full decoded capability list; [[cacao-chain-validation]] reads these as the root grant.

## Relationships

Embedded in [[siwe|SIWE]] messages; encodes [[capabilities]]; produced by the client in [[sign-in-flow]]; serialized into a [[cacao|CACAO]]; validated by [[cacao-chain-validation]]; defines the scope that [[session-keys|session key]] [[delegation|delegations]] must be [[attenuation|attenuated]] within.

## Status & drift

Shipped. The ReCap encoding is implemented in `dependencies/siwe-recap/` within `tinycloud-node` and the SDK constructs the ReCap payload in `sdk-core/src/userAuthorization.ts`. The singular canonical form is "ReCap" (not "ReCaps") per the [[meta/glossary|glossary]].

## Citations

- EIP-5573 (SIWE ReCap): https://eips.ethereum.org/EIPS/eip-5573
- SIWE EIP-4361: https://eips.ethereum.org/EIPS/eip-4361
