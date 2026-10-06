---
type: concept
title: Policy Engine Overview
description: The Node's policy engine (Policy v3) lets an owner sign one policy for recipients they don't know yet; a recipient who proves the required credential gets an ordinary, revocable delegation minted by the Node.
status: shipped
layer: protocol
resource: "xyz.tinycloud.policy/policy/v2"
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/policy_v3.rs@05c6a93
  - repo: tinycloud-node
    path: CHANGELOG.md@05c6a93
  - repo: tinycloud-node
    path: test/m1-realdata-e2e/Cargo.toml@05c6a93
  - repo: js-sdk
    path: packages/share-sdk/src/addressed-publish.ts@d43e51ea
tags: [policy-engine, central, authz]
timestamp: 2026-10-05
---

# Policy Engine Overview

The **policy engine** turns an owner-signed rule into delegations for recipients the owner has never met. The owner signs a **policy**: a [[capabilities|capability]] ceiling plus a credential requirement. A recipient proves the credential to the [[nodes|Node]], and the Node mints a short-lived [[delegation]] to the recipient's key. In production this is **Policy v3**, built into Node 1.17.3; its mechanics are in [[policy-v3-admission]].

## Role

A bare [[delegation]] is imperative: the owner signs a specific grant to a specific key. A policy is declarative: the owner signs once, and the Node grants on demand to anyone who satisfies it, with no owner signature per recipient. This is how a share can be addressed to an email address or a whole email domain (see [[native-sharing]]).

Three properties keep this safe:

- **The policy is a principal, not a token.** Its authority root names `did:tinycloud:policy:<digest>` as audience. Nobody presents the policy as a proof at invocation time.
- **The credential is checked once, at mint.** After that the recipient holds an ordinary session UCAN and uses the ordinary `/delegate` and `/invoke` paths (see [[credential-gated-delegation]]).
- **Two roots, both required.** The owner signs a `policy-authority` root and a `policy-enforcement` root. Every session must cite both, and either can be revoked to stop it.

## Mechanics

1. **Publish.** The owner signs the policy document and both roots, and registers them with `POST /policy/v3/policies`. The Node checks that the owner actually holds everything the roots grant.
2. **Prove.** The recipient takes a 300-second challenge, obtains a fresh [[opencredentials|OpenCredentials]] credential, and posts it with a signed presentation to `POST /policy/v3/delegations`.
3. **Mint.** The Node verifies the [[sd-jwt-vc|SD-JWT credential]] itself and signs the first session UCAN to the recipient's DID, with both roots as parents. By default the session lasts 60 s; a requested expiry can extend it up to the policy's and roots' limits.
4. **Use.** The recipient invokes, or re-delegates up to 8 hops. Every invocation re-checks the chain, root liveness and [[revocation]].

## Relationships

Specified in detail by [[policy-v3-admission]]; credential checking is [[credential-gated-delegation]], fed by [[feeds-policy-engine|OpenCredentials]]; the rule-as-primitive framing is [[policy-as-central-primitive]]; mints a [[delegation]] bounded by [[attenuation]]; ended by [[revocation]]; consumed by addressed [[sharing]] links; agent hand-off is covered in [[agent-transaction-policy]]; sits in [[architecture-layers|Layer 1]] beside [[capabilities]] and [[openkey|OpenKey]].

## Example

Alice shares a document with "anyone at `example.com`". Her browser signs one v2 policy with requirement profile `tinycloud.email-domain-proof/v1` and registers it with both roots. Bob opens the link, proves a mailbox at `example.com`, and gets a session UCAN to his `did:key`. Alice never signs anything for Bob. If she revokes the enforcement root, Bob's next read is refused.

## Status & drift

`shipped`. Policy v3 has been embedded in the Node since 1.16.0 and is in production Node 1.17.3 (`tinycloud-node@05c6a93`); the [[sdk/packages|Share SDK]] in SDK 3.0.0 publishes against it. Not shipped: a general condition grammar (`allOf`/`anyOf`/evidence trees). A policy carries one credential requirement (see [[policy-as-central-primitive]]).

### History: policy-core v0

Before Policy v3, the design was a standalone Rust workspace (`policy-core`, `policy-runtime`, `policy-evidence-vc`). Its schema was `xyz.tinycloud.policy/policy/v0`, with a `when` expression, a `GrantPresentation`, holder enrollment, and a `portable-delegation` output. That engine was never wired into the Node server. In Node 1.17.3 it is used only by test crates (such as `test/m1-realdata-e2e`), never by the server. Policy v3 kept the core ideas: an owner-signed rule, a capability ceiling, credential evidence the engine verifies itself, and grants that cannot outlive their evidence. It replaced the transport with Node routes, sibling roots, and ordinary session UCANs.

## Sources
- `tinycloud-node` (`05c6a93`, Node 1.17.3): `tinycloud-node-server/src/policy_v3.rs` (routes :1768, 1962, 2021; sibling roots :3959-4016; session lifetime :802-834; invocation gate :352-420), `CHANGELOG.md` (1.16.0 embedding, 1.17.3 TC-529/TC-597), `test/m1-realdata-e2e/Cargo.toml:12-15` (policy-core used only by test crates)
- `js-sdk` (`d43e51ea`, SDK 3.0.0): `packages/share-sdk/src/addressed-publish.ts:343` (owner creates both roots)
