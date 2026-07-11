---
type: concept
title: Agent Transaction Policy
description: The generalization of the policy engine to agent-driven requests — an enrolled agent (holder) acts for an eligible subject, its binding verified before any grant, via the HolderEnrollment / HolderBindingProof machinery.
status: in-progress
layer: protocol
sources:
  - repo: policy-engine
    path: src/enrollment.rs
  - repo: policy-engine
    path: src/types.rs
  - repo: policy-engine
    path: crates/policy-runtime/src/lib.rs
tags: [policy-engine, agents]
timestamp: 2026-06-23
---

# Agent Transaction Policy

**Agent transaction policy** is the policy engine's answer to *"who is actually holding this grant?"* when the requester is an **agent acting on behalf of a user** rather than the user's own key. The engine separates two principals — the **eligible subject** (the DID the [[overview|Policy]]'s `when` is written about, typically the user) and the **holder** (the agent DID that will receive and exercise the grant) — and admits a request only when a signed **`HolderEnrollment`** proves the subject authorized that holder. This is the [[policy-engine/overview|policy engine]] generalized from "grant to a key" to "grant to an enrolled agent transacting for a subject."

## Role

A [[capabilities|capability]] is bearer authority: whoever holds the chain wields it. For autonomous agents that is too blunt — the owner's Policy may say "anyone with credential Y," but the *agent* presenting the credential is not the subject the credential is about. Agent transaction policy closes that gap inside [[architecture-layers|Layer 1]]: the `when` rule still ranges over the **subject**, but the **grant is bound to the holder**, and a revocable enrollment links the two. Revoke the enrollment and the agent stops qualifying — without touching the subject's identity or the Policy.

## Mechanics

The binding is one variant of `HolderBindingProof` (`src/types.rs:348`), `EnrolledAgent { enrollment, status? }`, carried inside every `GrantPresentation`. During `resolve` the runtime calls `validate_enrolled_agent_binding` (`src/enrollment.rs:108`) *after* presentation validation and *before* evidence verification. It enforces, in order:

1. **Identity match** (`validate_enrollment_identity`) — the enrollment's `eligible_subject_did` and `holder_did` must equal the presentation's; otherwise `enrollment-binding-mismatch`.
2. **Time validity** (`validate_enrollment_time`) — `now ≥ not_before` and, if set, `now ≤ expires_at`; else `enrollment-not-yet-valid` / `enrollment-expired`.
3. **Scope** (`check_enrollment_scope`) — if the enrollment carries a `scope`, the request's `policy_id` and the Policy's `resource_id` must be in the allowed lists; else `enrollment-out-of-scope`.
4. **Status / revocation** (`validate_enrollment_status` against an `EnrollmentStatusTracker`) — enrollment statuses are **monotonic and revocation is irreversible**: a `HolderEnrollmentStatus` with a non-increasing `sequence` is `enrollment-status-rollback`; once the tracker has observed a `Revoked` status, a later `Active` status is rejected `enrollment-revoked-irreversible`; and a presentation that omits the status after the engine has seen a revocation is rejected `enrollment-revoked` (omission must not silently re-admit).

Only after this binding holds does the engine verify [[credential-gated-delegation|evidence]], re-evaluate `when` over the **subject**, and issue the `portable-delegation` to the **holder**.

## Shape

```
HolderEnrollment (xyz.tinycloud.policy/holder-enrollment/v0):
  { enrollment_id, eligible_subject_did, holder_did, scope?, not_before, expires_at?, signing_key_did, signature }
HolderEnrollmentScope:    { policy_ids?: [String], resource_ids?: [String] }
HolderEnrollmentStatus:   { status_id, enrollment_id, sequence, disposition: active|revoked, effective_at, … }
HolderBindingProof:       EnrolledAgent { enrollment, status? }   // tagged "type": "enrolled-agent"
```

The enrollment is itself a signed object under the [[overview#shape|Signed Object Profile]]; the subject signs it to delegate "this agent may act for me," and a separate signed `HolderEnrollmentStatus` chain (anti-rollback by `sequence`) revokes it.

## Relationships

Generalizes the [[policy-engine/overview|policy engine]] to agent holders; the subject side feeds [[policy-as-central-primitive|`when`'s `subject{}`]] condition; runs alongside [[credential-gated-delegation|credential evidence]] verification; the grant it produces is a holder-bound [[capabilities|portable-delegation]]; depends on the agent's [[dids|DID]] and the subject's [[dids|DID]]; sits in [[architecture-layers|Layer 1]].

## Example

A user (`did:key:z6Mk…subject`) enrolls their assistant agent (`did:key:z6Mk…holder`) with a `HolderEnrollment` scoped to `pol_email_domain`. The agent later presents that enrollment plus an [[sd-jwt-vc|email-domain credential]] *about the subject*. The engine verifies the enrollment binds subject→holder, confirms the credential, and issues a one-hour transcript-read grant **to the agent**. If the user revokes the enrollment (a `Revoked` status), the next presentation is rejected `enrollment-revoked` even if the credential is still valid — the agent's authority to transact for the subject is gone. (This binding flow is exercised in the runtime's `challenge_resolve_native_read_then_active_cutoff_denies` test.)

## Status & drift

`in-progress`. The enrollment model — `HolderEnrollment`, `HolderEnrollmentStatus`, scope and anti-rollback rules — is **frozen v0** (`spec/holder-enrollment.md`) and implemented + tested in `policy-core` (`enrollment.rs`) and exercised by `policy-runtime`. The single `HolderBindingProof` variant today is `EnrolledAgent`; the broader "agent transaction policy" framing (richer binding kinds, full operational-key role enforcement) is design-intent — the `OperationalKeyRole` types exist but full role-chain enforcement is not complete in core verification. **Repo status:** the cited `policy-engine` repo is not public under TinyCloudLabs, and this design has been superseded by Data Exchange v0 (the `sssoforth/information-sphere` lineage); treat this page as historical context, not the current build target. See [[meta/contradictions]].

## Sources
- `policy-engine`: `src/enrollment.rs:108` (`validate_enrolled_agent_binding` + sub-checks, anti-rollback), `src/types.rs:271,348` (`HolderEnrollment`, `HolderBindingProof`), `crates/policy-runtime/src/lib.rs` (binding called in `resolve`)
