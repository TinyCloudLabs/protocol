---
type: concept
title: OpenKey
description: TinyCloud's passkey/TEE-backed identity provider — it produces and custodies the owner key that roots authority, and brokers sign-in and delegation for apps.
status: in-progress
layer: protocol
sources:
  - repo: openkey
    path: apps/api/src/routes/keys.ts
  - repo: openkey
    path: apps/api/src/routes/delegate.ts
  - repo: openkey
    path: README.md
tags: [identity, openkey, tee]
timestamp: 2026-06-23
---

# OpenKey

**OpenKey** is the identity layer of TinyCloud: a **passkey / TEE-backed** provider that produces and custodies the **owner key** every [[capabilities|capability]] chain roots in, and brokers [[siwe|SIWE]] sign-in and [[delegation]] issuance for apps. It is how a user gets a self-custodiable [[dids|DID]] without managing raw private keys themselves.

## Role

In the [[architecture-layers|locked layer model]] OpenKey sits in **Layer 1** alongside the base protocol and the [[policy-engine|policy engine]] — it is *identity infrastructure*, not an app. It supplies the root [[dids|DID]] that [[cacao-chain-validation|chain validation]] terminates at, and it is the trust root for [[credentials|OpenCredentials]] (the witness issuer is an OpenKey-adjacent service).

## Mechanics

OpenKey exposes an API (`apps/api/src/routes/keys.ts`, `delegate.ts`) for passkey-backed key operations and for materializing app/manifest [[delegation|delegations]] — i.e. taking a [[manifest-model|manifest]]'s capability request and returning a signed [[delegation]] without exposing the owner key. TEE backing keeps the key material confidential (cf. [[tee-dstack]]). Sign-in surfaces as the [[siwe|SIWE]] flow the SDK drives in [[sign-in-flow]].

## Relationships

Produces the [[dids|owner DID]] that roots [[capabilities]] / [[cacao-chain-validation]]; brokers [[siwe|SIWE]] and [[delegation]]; trust root for [[credentials|OpenCredentials]]; a Layer-1 peer of the [[policy-engine]] (see [[architecture-layers]]).

## Status & drift

`in-progress` as documented here. **OpenKey has its own repository and is not part of this checkout** — this concept is authored from the protocol-level role it plays (sign-in + delegation brokering + identity custody); for its internal API, passkey/WebAuthn details, and TEE attestation specifics, defer to OpenKey's own documentation. Treat code paths here as indicative.

## Sources
- `openkey`: `apps/api/src/routes/keys.ts`, `apps/api/src/routes/delegate.ts`, `README.md` (not in this checkout — role authored from protocol context)
