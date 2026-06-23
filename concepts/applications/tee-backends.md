---
type: concept
title: TEE Backends
description: An app's server-side component runs as a subset-checked capability delegate — it holds a delegated UCAN, never the user's key, and can be attested — so a backend can act on a user's data without custody of their authority.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/node-sdk/src/delegation.ts
  - repo: openkey
    path: apps/api/src/routes/delegate.ts
tags: [applications, tee, authz]
timestamp: 2026-06-23
---

# TEE Backends

A **TEE backend** is an app's server-side component that acts on a user's data as a **subset-checked [[delegation|delegate]]**, not a key-holder: at [[sign-in-flow|sign-in]] the user delegates a least-authority [[capabilities|capability]] set to the backend's [[dids|DID]], materialized as a [[delegation-api|PortableDelegation]] (a [[ucan|UCAN]]) — so the backend can read/write exactly what it was granted and **nothing more**, and it never possesses the user's [[dids|owner key]].

## Role

This is what lets an app have a real server (ingesting data, running agents) inside the [[architecture-layers|capability model]] without becoming a trusted custodian. Running that backend in a [[tee-dstack|TEE]] means even the operator can't exceed the delegated authority — the backend is a verifiable, attestable subset-delegate.

## Mechanics

The app + backend [[manifest-model|manifests]] are composed into one [[capability-composition|capability request]] at sign-in (single wallet prompt); the backend's grant is materialized as a [[delegation-api|PortableDelegation]] with **no second prompt** (`packages/node-sdk/src/delegation.ts`), and brokered by [[openkey|OpenKey]]'s `/delegate` endpoint (`apps/api/src/routes/delegate.ts`). The backend then signs [[invocation|invocations]] with its own session key; the [[nodes|node]] admits them only within the delegated subset ([[cacao-chain-validation]]). It can [[user-bound-decrypt|decrypt]] only what it holds a decrypt [[capabilities|capability]] for.

## Relationships

A subset [[delegation|delegate]] of the user's [[capabilities]]; provisioned via [[capability-composition]] + [[delegation-api]]; brokered by [[openkey|OpenKey]]; runs in a [[tee-dstack|TEE]]; the canonical example is [[example-listen|Listen]]'s backend.

## Status & drift

Shipped. The backend is never a key-holder — this is the core security property of the [[manifest-model|manifest]] app model.

## Sources
- `js-sdk`: `packages/node-sdk/src/delegation.ts` (PortableDelegation materialization)
- `openkey`: `apps/api/src/routes/delegate.ts` (delegation broker — OpenKey repo, not in this checkout)
