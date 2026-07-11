---
type: concept
title: Policy Engine Overview
description: The policy engine evaluates owner-signed Policies whose `when` conditions gate the issuance of a capability grant — a portable-delegation bounded by the owner's permissions ceiling.
status: in-progress
layer: protocol
resource: "xyz.tinycloud.policy/policy/v0"
sources:
  - repo: policy-engine
    path: src/lib.rs
  - repo: policy-engine
    path: src/types.rs
  - repo: policy-engine
    path: crates/policy-runtime/src/lib.rs
  - repo: policy-engine
    path: spec/README.md
tags: [policy-engine, central, authz]
timestamp: 2026-06-23
---

# Policy Engine Overview

The **policy engine** evaluates **owner-signed [[policy-as-central-primitive|Policies]]** (schema `xyz.tinycloud.policy/policy/v0`) and, when a Policy's `when` conditions are satisfied, issues a **grant**: a `portable-delegation` whose [[capabilities|capabilities]] are bounded by the Policy's `permissions_ceiling` through strict **containment**. It is the declarative, evidence-aware layer above raw [[delegation]] — a Policy says *"given this subject and this verifiable evidence, grant this subset of my authority for at most this TTL"* — and it is the concrete mechanism behind [[feeds-policy-engine|"credentials feed the policy engine"]].

## Role

The policy engine is the **permissioning layer of [[architecture-layers|Layer 1]]**, a peer of [[capabilities]] and [[openkey|OpenKey]] within the protocol. Where a bare [[capabilities|capability]] is *imperative* (the owner signs a specific grant to a specific key), a Policy is *declarative*: the owner signs a rule once, and the engine mints grants on demand to any holder who satisfies the rule. This is what lets authority be conditioned on facts the owner cannot know in advance — an [[credentials|OpenCredentials]] [[credential-gated-delegation|credential]] the holder presents at request time, an [[agent-transaction-policy|enrolled agent]] acting for an eligible subject — without the owner being online to sign each grant.

**Design-intent boundary (validated, stated honestly):** the policy engine is a **standalone Rust workspace** (`policy-core` + `crates/policy-runtime` + `crates/policy-evidence-vc`). It is **not yet consumed by [[nodes|tinycloud-node]]** — the node's authorization today is the in-tree [[capabilities]]/[[delegation]] path, and `tinycloud-node` has **no dependency on `policy-core` or `policy-runtime`** (verified: no such Cargo dependency). The [[architecture-layers|locked layer model]] says the node *will* consume the engine at runtime; the v0 contract is **"the policy engine emits native authority"** (`spec/mvp-doc-reconciliation.md`), i.e. it produces a `portable-delegation` the node would honor — but the embedding is design-intent, not shipped wiring. Author and read this concept as `in-progress`.

## Mechanics

A Policy is resolved in two HTTP-shaped round trips (`crates/policy-runtime/src/lib.rs`, `PolicyRuntime`):

1. **Challenge.** `issue_challenge(policy_id, now)` loads the active Policy and returns a nonce-bearing `GrantChallenge` (`xyz.tinycloud.policy/challenge/v0`) — a fresh random nonce, the engine's `audience`, accepted signature suites, and a TTL. The nonce is the replay-protection anchor.
2. **Resolve.** The holder returns a `GrantPresentation` (`xyz.tinycloud.policy/presentation/v0`) — its requested [[capabilities|capabilities]], a `holder_binding` proof, the nonce, and any `evidence`. `resolve(presentation, now)` then, in order: re-loads the active Policy; **consumes the nonce** (a second use is rejected `challenge-nonce-consumed`); runs `validate_grant_presentation` (`src/evaluator.rs`); validates the [[agent-transaction-policy|holder enrollment binding]] (`validate_enrolled_agent_binding`); verifies each `evidence` item via the [[credential-gated-delegation|VC evidence verifier]]; **re-evaluates `when`** with the *satisfied* evidence IDs (`evaluate_expression`); and only then calls `GrantIssuer::issue` to mint the `PortableDelegation`, recording an `IssuanceRecord`.

The grant's expiry is the **minimum** of `policy.grant.max_ttl_seconds`, the presentation's own `expires_at`, and every satisfied credential's `valid_until` (`grant_expires_at`) — so a grant never outlives its evidence.

## Shape

A `Policy` (`src/types.rs:49`) is a signed object with fields:

```
{ schema, policy_id, owner_did, signing_key_did, created_at, expires_at?,
  resource: PolicyResource,        // resource_type, resource_id, permissions_ceiling: [PolicyCapability]
  when: Expression,                // allOf | anyOf | subject{did} | evidence{EvidenceRequirement}
  grant: GrantTemplate,            // output: portable-delegation, max_ttl_seconds, delegation_mode, revocation
  disclosure?, audit?, signature }
```

- **`when`** is the [[policy-as-central-primitive|condition grammar]] — a recursive `Expression` of `allOf` / `anyOf` over `subject{did}` (the eligible subject must match) and `evidence{…}` (a named, verifier-bound credential requirement must be satisfied).
- **`grant`** can only output `portable-delegation`; `delegation_mode` is `terminal` (the grant cannot be re-delegated) or `attenuable`; `revocation` is `refresh-only` or `active-cutoff`.
- **`permissions_ceiling`** is a list of [[policy-as-central-primitive|`PolicyCapability`]] over services `tinycloud.kv | tinycloud.sql | tinycloud.vfs`; every requested capability must be **contained** by some ceiling entry or the request is rejected `requested-capabilities-exceeded`.

Control-plane objects (Policy, challenge, enrollment, …) are signed under the **[[#status--drift|TinyCloud Signed Object Profile]]**: a domain-separated SHA-256 over [RFC 8785 JCS](https://www.rfc-editor.org/rfc/rfc8785) of the body, with two suites (`eddsa-ed25519-sha256-jcs-v1`, `eip191-secp256k1-sha256-jcs-v1`). The `GrantPresentation` is deliberately **nonce-bound, not content-addressed**, in keeping with strict nonce-based replay protection.

## Relationships

Evaluates an owner-signed [[policy-as-central-primitive|Policy]] whose `when` may demand [[credential-gated-delegation|credential evidence]] verified against [[credentials|OpenCredentials]]; emits a `portable-delegation` that is a [[capabilities|capability]] grant bounded by `permissions_ceiling` [[attenuation|containment]]; binds the holder via [[agent-transaction-policy|holder enrollment]]; sits in [[architecture-layers|Layer 1]] as the permissioning peer of [[capabilities]] and [[openkey|OpenKey]]; the satisfied-evidence pipeline is detailed in [[feeds-policy-engine]].

## Example

An owner publishes one Policy `pol_email_domain`: `when` = `evidence{ requirement_id: "email-domain", verifier: "w3c.vc/credential/v1", requirements: { type: "opencredentials.email/v1", emailDomains: ["tinycloud.xyz"] } }`; `permissions_ceiling` = a single `tinycloud.sql/read` capability over a Listen transcript table; `grant` = `portable-delegation`, `max_ttl_seconds: 3600`, `terminal`, `active-cutoff`. Any [[agent-transaction-policy|enrolled agent]] that presents a valid [[sd-jwt-vc|SD-JWT]] proving a `@tinycloud.xyz` email — without revealing the address itself — receives a one-hour, non-re-delegatable read grant over exactly that table. No new owner signature is needed per holder. (This is the runtime's own end-to-end test, `challenge_resolve_native_read_then_active_cutoff_denies`.)

## Status & drift

`in-progress`. The **v0 contracts are frozen** in `spec/` (schemas, test vectors, the Signed Object Profile) and `policy-core` types + canonicalization + containment + grant-presentation validation are shipped; `policy-runtime` and `policy-evidence-vc` exist and pass an end-to-end vector test (despite the spec README still calling the runtime crates "not yet implemented"). **Not implemented here:** any HTTP service, persistence, or [[nodes|node]] embedding; node-side revocation / invocation enforcement (specified in `spec/revocation.md`, not built); and `issue_challenge` currently emits `chal_{nonce}` while the schema expects a `gchal_…` id. The biggest honest caveat is above: **the node does not yet consume the engine** — treat the L1-internal boundary as design-intent. **Repo status:** the cited `policy-engine` repo is not public under TinyCloudLabs, and this design has been superseded by Data Exchange v0 (the `sssoforth/information-sphere` lineage); treat this page as historical context, not the current build target. See [[meta/contradictions]].

## Sources
- `policy-engine`: `src/lib.rs` (public surface), `src/types.rs:49` (`Policy`/`Expression`/`GrantTemplate`), `crates/policy-runtime/src/lib.rs` (`PolicyRuntime::issue_challenge`/`resolve`, end-to-end test), `spec/README.md` + `spec/mvp-doc-reconciliation.md` (frozen v0 contract, "policy-engine emits native authority")
- Verified absence: `tinycloud-node` has no `policy-core`/`policy-runtime` Cargo dependency (node does not yet consume the engine)
