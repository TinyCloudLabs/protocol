---
type: concept
title: Credential-Gated Delegation
description: A delegation whose issuance is gated on a verifiable credential — the policy engine's `evidence{}` conditions, verified by the VC evidence verifier, that turn an OpenCredentials credential into a satisfied condition for minting a grant.
status: in-progress
layer: protocol
sources:
  - repo: policy-engine
    path: crates/policy-evidence-vc/src/lib.rs
  - repo: policy-engine
    path: src/evaluator.rs
  - repo: policy-engine
    path: crates/policy-runtime/src/lib.rs
tags: [policy-engine, credentials]
timestamp: 2026-06-23
---

# Credential-Gated Delegation

**Credential-gated delegation** is a [[delegation]] the [[overview|policy engine]] issues *only* when the requester presents a **verifiable credential** that the engine independently verifies. In the [[policy-as-central-primitive|Policy]]'s `when` rule this is an `evidence{}` condition; at request time the holder attaches a credential presentation; the engine's **VC evidence verifier** (`crates/policy-evidence-vc`) checks it and adds the requirement to the *satisfied* set, after which `when` can pass and the grant is minted. It is the literal pipeline behind [[feeds-policy-engine|"credentials feed the policy engine"]].

## Role

[[policy-as-central-primitive|Policy as central primitive]] lets an owner condition authority on facts. Credential-gating is the most powerful such fact: not "is this a specific key" but "does this holder possess a credential — an email-domain, a membership — issued by a trusted [[witness-service|witness]]." Crucially, the engine **never trusts the holder's claim of satisfaction**: `evaluate_expression` only counts evidence IDs the engine itself verified ([[overview#mechanics]]), so a credential condition is a real cryptographic gate, not a flag. This is the join between [[architecture-layers|Layer 1]] permissioning and the [[credentials|OpenCredentials]] [[architecture-layers#layer-2-tinycloud-apps|Layer 2]] credential app.

## Mechanics

An `evidence{}` requirement names a `verifier` and opaque `requirements`. The v0 verifier is `VcEvidenceVerifier` (`crates/policy-evidence-vc/src/lib.rs`), keyed to verifier profile `w3c.vc/credential/v1` and credential type `opencredentials.email/v1` (the [[sd-jwt-vc|email-domain SD-JWT]] from [[credentials|OpenCredentials]]). Its `verify(requirement, presentation, context)` enforces:

1. **Verifier match** — `requirement.verifier` must be `w3c.vc/credential/v1`; else `evidence-verifier-unsupported`.
2. **Requirements parse** — `requirements` deserializes to `{ type: "opencredentials.email/v1", emailDomains: [...] }`; domains are NFC/ASCII-normalized (`normalize_email_domain`), rejecting non-ASCII (`evidence-domain-invalid`) and empty lists (`evidence-domain-missing`).
3. **Accepted issuers** — the requirement's `authority.accepted_issuers` must be non-empty, and each is looked up in the verifier's issuer-key registry; an issuer with no registered key is `evidence-issuer-untrusted`.
4. **Credential verification** — for each accepted issuer, `EmailCredentialVerifier` (from the upstream `opencredentials-verify` crate, pinned `git rev c9fa2fe`) checks the SD-JWT signature, that its subject equals `context.eligible_subject_did`, that the disclosed **email domain** matches an allowed domain (selective disclosure — the full address is *not* required, and presenting the full email *without* the domain disclosure is rejected), and expiry.
5. **Freshness** — if the requirement sets `freshness.max_status_age_seconds`, a credential older than that is rejected `evidence-freshness-expired`.

On success it returns a `Satisfaction { evidence_ids: [requirement_id], valid_until, provenance }`. The runtime collects every satisfaction, re-runs `evaluate_expression` with the satisfied IDs, and — critically — caps the grant's TTL at `min(max_ttl, presentation.expires_at, every credential's valid_until)` (`grant_expires_at`), so the delegation **cannot outlive the credential that authorized it**.

## Shape

```
// in Policy.when:
evidence { EvidenceRequirement {
  requirement_id: "email-domain",
  verifier:       "w3c.vc/credential/v1",
  requirements:   { type: "opencredentials.email/v1", emailDomains: ["tinycloud.xyz"] },
  authority:      { accepted_issuers: ["did:web:issuer.credentials.org"] },
  freshness?:     { max_status_age_seconds }
}}

// in GrantPresentation.evidence:
PresentedEvidence { requirement_id: "email-domain", presentation: { sdJwt: "<SD-JWT>" } }
```

## Relationships

Implements the `evidence{}` arm of [[policy-as-central-primitive|the `when` grammar]]; verifies [[sd-jwt-vc|SD-JWT credentials]] issued by the [[witness-service|witness service]] as part of [[credentials|OpenCredentials]]; the satisfied requirement lets [[policy-engine/overview|`resolve`]] mint a [[capabilities|portable-delegation]]; runs alongside [[agent-transaction-policy|holder enrollment]]; the end-to-end framing is [[feeds-policy-engine]]; lives in [[architecture-layers|Layer 1]] consuming [[architecture-layers#layer-2-tinycloud-apps|L2]] credentials.

## Example

Policy `when = evidence{"email-domain"}` requiring `opencredentials.email/v1` from `did:web:issuer.credentials.org`, domain `tinycloud.xyz`. A holder presents `{ sdJwt: "<email-domain SD-JWT for sam@tinycloud.xyz>" }`. The verifier confirms the witness signature, that the credential's subject is the eligible subject, and that the disclosed *domain* is `tinycloud.xyz` — **without** the SD-JWT ever revealing `sam@`. `evaluate_expression` now sees `{"email-domain"}` satisfied, `when` passes, and a `tinycloud.sql/read` grant is issued, expiring at the credential's expiry or one hour, whichever is sooner. A wrong domain, wrong issuer, subject mismatch, expired or stale credential each fail with a distinct `evidence-*` error (the verifier's own tests cover all five).

## Status & drift

`in-progress`. The verifier, the `evidence{}` grammar, and TTL-capping are **frozen v0 + shipped + tested** in `policy-evidence-vc` and `policy-runtime`. The only credential profile wired today is **email-domain** (`opencredentials.email/v1`); additional [[credentials|OpenCredentials]] credential types are design-intent. As with the whole engine, the grant it emits is honored by [[nodes|the node]] only once node consumption lands — currently the node does not consume the engine (see [[overview#status--drift]]). See [[meta/contradictions]].

## Sources
- `policy-engine`: `crates/policy-evidence-vc/src/lib.rs` (`VcEvidenceVerifier::verify`, freshness, selective-disclosure tests), `src/evaluator.rs:76` (satisfied-evidence gating), `crates/policy-runtime/src/lib.rs` (`verify_evidence` + `grant_expires_at` TTL cap), `crates/policy-evidence-vc/Cargo.toml` (`opencredentials-verify` git rev c9fa2fe)
