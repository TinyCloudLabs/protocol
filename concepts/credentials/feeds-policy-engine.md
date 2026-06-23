---
type: concept
title: Credentials Feed the Policy Engine
description: The connective concept — an OpenCredentials credential, presented at request time, becomes verified evidence{} that satisfies a policy condition, letting the policy engine mint a grant.
status: in-progress
layer: tinycloud-app
sources:
  - repo: policy-engine
    path: crates/policy-evidence-vc/src/lib.rs
  - repo: policy-engine
    path: crates/policy-runtime/src/lib.rs
tags: [credentials, policy-engine]
timestamp: 2026-06-23
---

# Credentials Feed the Policy Engine

This is the join between the two halves of the stack: an **[[credentials|OpenCredentials]] credential** (a [[sd-jwt-vc|SD-JWT VC]] from the [[witness-service|witness]]) presented at request time becomes **verified `evidence`** that satisfies a [[policy-as-central-primitive|Policy]]'s `when` condition, letting the [[policy-engine/overview|policy engine]] mint a [[capabilities|capability]] grant. "Credentials feed the policy engine" is literal: a Layer-2 credential is the input that unlocks Layer-1 authority.

## Role

It is what makes [[policy-as-central-primitive|policy as a primitive]] powerful — authority conditioned not on *which key* but on *what the holder can prove*. The [[credentials|credential]] app ([[architecture-layers#layer-2-tinycloud-apps|Layer 2]]) issues facts; the [[policy-engine/overview|policy engine]] ([[architecture-layers#layer-1-protocol|Layer 1]]) consumes them as gates. This concept names that pipeline so both sides link to one place.

## Mechanics

1. A [[witness-service|witness]] issues the holder an [[sd-jwt-vc|SD-JWT credential]] (e.g. `opencredentials.email/v1`).
2. A [[policy-as-central-primitive|Policy]]'s `when` includes `evidence{ verifier, requirements, authority }`.
3. At request time the holder attaches the credential to a `GrantPresentation`; the engine's **VC evidence verifier** (`crates/policy-evidence-vc/src/lib.rs`) independently verifies signature, issuer, subject, selective-disclosure, and freshness — the holder cannot self-assert satisfaction.
4. The satisfied requirement lets `when` pass and the runtime mints a [[capabilities|portable-delegation]], capped at the credential's `valid_until`.

The detailed verifier behavior is [[credential-gated-delegation]]; this concept is the connective overview.

## Relationships

Connects [[credentials|OpenCredentials]] / [[sd-jwt-vc]] / [[witness-service]] (L2) to the [[policy-engine/overview|policy engine]] / [[credential-gated-delegation]] (L1); produces a [[capabilities|capability]] grant; uses nonce-bound presentations ([[policy-engine/overview]]).

## Status & drift

`in-progress`. The pipeline is implemented and tested in `policy-evidence-vc` + `policy-runtime` for the email-domain credential; broader credential types are design-intent. As with the whole engine, the minted grant is honored by [[nodes|the node]] only once node consumption of the policy engine lands.

## Sources
- `policy-engine`: `crates/policy-evidence-vc/src/lib.rs`, `crates/policy-runtime/src/lib.rs`
