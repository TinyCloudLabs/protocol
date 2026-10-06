---
type: concept
title: Agent Transaction Policy
description: The planned generalization of the policy engine to agents acting for a user — a signed, revocable enrollment binding an agent holder to an eligible subject. Not in production; the shipped agent hand-off is received-share re-delegation.
status: planned
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/policy_v3.rs@05c6a93
  - repo: tinycloud-node
    path: test/m1-realdata-e2e/Cargo.toml@05c6a93
  - repo: js-sdk
    path: packages/web-sdk/src/share/types.ts@d43e51ea
tags: [policy-engine, agents]
timestamp: 2026-10-05
---

# Agent Transaction Policy

**Agent transaction policy** is the planned answer to "who actually holds this grant?" when the requester is an **agent acting for a user** rather than the user's own key. It separates two principals: the **eligible subject** (the user the policy's condition is about) and the **holder** (the agent key that receives and exercises the grant). A signed, revocable enrollment from the subject would link the two. It extends the [[policy-engine/overview|policy engine]] from "grant to the key that proved the credential" to "grant to an agent enrolled by that person".

## Role

In production, a [[credential-gated-delegation|credential-gated]] session goes to the key that proved the credential: the v4 presentation requires `holderDid == subjectDid`. An agent therefore cannot prove a credential *about its user* and receive the grant itself. Agent transaction policy would let the subject enroll the agent once, and revoke that enrollment without touching the subject's identity or the owner's policy.

## Mechanics

### What ships instead: received-share re-delegation

The agent hand-off that ships today needs no enrollment object. The person who proved the credential receives a policy session, then delegates it onward:

1. The recipient opens an addressed share and proves their email credential (see [[native-sharing]]).
2. `ReceivedShare.delegate({ to, expiresAt? })` re-delegates that access, including decryption, to another key, such as an agent's or account [[session-keys|session key]]. `expiresAt` defaults to the longest the parent allows.
3. The [[nodes|Node]] admits each descendant against its immediate parent: same policy facts, one less remaining depth (at most 8 hops), a strictly narrower time window, and contained capabilities (see [[policy-v3-admission]]).
4. Revoking either policy root, or any delegation in the chain, stops the agent on its next invocation ([[revocation]]).

This gives an agent scoped, revocable, credential-rooted access. Its limit is that the subject must first prove the credential with their own key; there is no standing "this agent may act for me" object.

### Planned: holder enrollment

The design keeps a signed `HolderEnrollment { eligible_subject_did, holder_did, scope?, not_before, expires_at? }`, checked before evidence is verified:

- the subject and holder must match the presentation;
- the enrollment must be within its validity window;
- the request must fall within the enrollment's scope;
- a monotonic status chain must not show it revoked (once revoked, never re-admitted).

## Relationships

A planned extension of the [[policy-engine/overview|policy engine]] and [[policy-v3-admission]]; would relax the holder rule in [[credential-gated-delegation]]; today's substitute is re-delegation of a [[native-sharing|received share]] under [[attenuation]] and [[revocation]]; agents get keys via [[device-authorization]] and [[session-keys]]; subjects and holders are [[dids|DIDs]]; [[architecture-layers|Layer 1]].

## Example

Shipped path: Bob receives Alice's domain share, proves `bob@example.com`, and calls `delegate({ to: agentDid })`. His agent can read the document until Bob's session expires, and loses access on its next request if Alice revokes. Planned path: Bob would instead sign an enrollment naming his agent, and the agent would present Bob's credential plus that enrollment directly.

## Status & drift

`planned`. Node 1.17.3 has no enrollment object or holder/subject split; the v4 holder proof requires holder and subject to be the same `did:key`. The agent-transfer use case shipped differently, as received-share re-delegation (SDK 3.0.0 `ReceivedShare.delegate`, Node 1.17.3 multi-hop policy sessions, TC-529).

### History: policy-core v0 enrollment

The `policy-core` v0 engine implemented this design: `HolderEnrollment` (`xyz.tinycloud.policy/holder-enrollment/v0`), `HolderEnrollmentStatus` with anti-rollback `sequence`, and a `HolderBindingProof::EnrolledAgent` variant checked by `validate_enrolled_agent_binding`. It was tested in that standalone workspace but never wired into the Node server. In Node 1.17.3 it is used only by test crates (such as `test/m1-realdata-e2e`), never by the server.

## Sources
- `tinycloud-node` (`05c6a93`, Node 1.17.3): `tinycloud-node-server/src/policy_v3.rs` (descendant admission :295-310; chain walk :553-660), `CHANGELOG.md` (1.17.3, TC-529), `test/m1-realdata-e2e/Cargo.toml:12-15`
- `js-sdk` (`d43e51ea`, SDK 3.0.0): `packages/web-sdk/src/share/types.ts:49-55, 95-108` (`ReceivedShare.delegate`, `ShareDelegateOptions`), `packages/sdk-core/src/policy/credential-admission.ts:360-376` (v4 `holderDid == subjectDid`)
