---
type: concept
title: Policy as Central Primitive
description: The framing that a signed, conditional rule over the owner's authority, not a bucket, is what an owner authors. Shipped today as a Policy v3 document with one credential requirement; a general condition grammar is not in production.
status: in-progress
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/policy_v3.rs@05c6a93
  - repo: tinycloud-node
    path: test/m1-realdata-e2e/Cargo.toml@05c6a93
tags: [policy-engine, framing]
timestamp: 2026-10-05
---

# Policy as Central Primitive

**Policy as central primitive** is the framing that what a TinyCloud owner authors is a **signed, conditional rule over their authority**. The rule says who may receive which subset of the owner's [[capabilities]], on what evidence, and for how long. Storage sits below it. The [[policy-engine/overview|policy engine]] is the machinery that turns that rule into delegations.

## Role

With bare [[delegation]] the owner must sign every grant to a known key. That does not cover facts that emerge later, such as a recipient who will prove an email address next week. Making the rule first-class means the owner signs once and the [[nodes|Node]] grants on demand, always inside what the owner holds. The owner's mental model shifts from "I granted Bob read on X" to "anyone who proves Y may read X".

## Mechanics

What production Node 1.17.3 implements of this framing:

- **The rule is a signed document and a principal.** A Policy v2 document (`xyz.tinycloud.policy/policy/v2`) is content-addressed and signed by `ownerDid`. Its authority root is delegated to `did:tinycloud:policy:<digest>`, so the policy itself holds the authority it can hand out (see [[policy-v3-admission]]).
- **One condition.** A v2 policy carries exactly one `credentialRequirement`: an exact email or an email domain, from a pinned issuer (see [[credential-gated-delegation]]). A v1 policy has no `credentialRequirement`; its mint takes a signed `claim` plus presentation instead of a credential.
- **A hard ceiling.** `capabilityCeiling` bounds every session. Sessions and their descendants are checked with `capabilities_are_contained` ([[attenuation]]).
- **Owner holds what it shares.** At registration the owner must hold every capability its roots grant (TC-597), so a policy cannot create authority.

## Shape

```
Policy v2 = { schema, policyId, ownerDid, createdAt, expiresAt?,
              contentSource, capabilityCeiling: [...], credentialRequirement, signature }
```

The author's vocabulary today is: which content (`contentSource`), what at most (`capabilityCeiling`), which credential (`credentialRequirement`), and until when (`expiresAt`, plus the roots' window).

## Relationships

The framing behind the [[policy-engine/overview|policy engine]]; implemented by [[policy-v3-admission]]; its only shipped condition is [[credential-gated-delegation]], supplied by [[feeds-policy-engine|OpenCredentials]]; its ceiling is [[attenuation]]; the agent-holder generalization is [[agent-transaction-policy]]; it sits beside [[capabilities]] and [[openkey|OpenKey]] in [[architecture-layers|Layer 1]].

## Example

"Anyone who proves a mailbox at `example.com` may read `notes/plan.md` until Friday." That is a v2 policy whose `capabilityCeiling` is one `tinycloud.kv/get`, whose `credentialRequirement` uses profile `tinycloud.email-domain-proof/v1`, and whose roots expire on Friday. The owner signs it once; the Node mints a session for each person who qualifies.

## Status & drift

`in-progress`. Shipped: signed policy documents, the policy-as-principal root, the capability ceiling, a single credential requirement, and the owner-holds check. Not in production: a general condition grammar that composes `allOf`, `anyOf`, `subject{did}` and multiple `evidence{}` requirements into one tree. Delegation modes (`terminal`/`attenuable`) are also not a policy field; re-delegation depth is fixed by the Node at 8.

### History: the v0 `when` grammar

The `policy-core` v0 design (`xyz.tinycloud.policy/policy/v0`) had a recursive `when` expression (`allOf | anyOf | subject{did} | evidence{…}`), a `permissions_ceiling` of `PolicyCapability` entries, and a `grant` template with `max_ttl_seconds`, `delegation_mode` and `revocation`. That engine was never wired into the Node server. In Node 1.17.3 it is used only by test crates (such as `test/m1-realdata-e2e`), never by the server. Policy v3 kept the ceiling and verified-evidence ideas but not the expression tree.

## Sources
- `tinycloud-node` (`05c6a93`, Node 1.17.3): `tinycloud-node-server/src/policy_v3.rs` (policy schemas :53-54; policy document keys :4032; credential requirement :4185; owner-holds check :742; containment :836), `test/m1-realdata-e2e/Cargo.toml:12-15`
