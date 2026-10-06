---
type: concept
title: Revocation
description: A revocation is a signed CACAO or UCAN event that retracts a delegation by CID before it expires; the delegator, the delegatee, or the targeted space's owner may revoke, and the cut-off applies to the whole chain below it. Policy roots have their own signed root-revocation object.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/models/revocation.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-auth/src/authorization.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/models/invocation.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/models/delegation.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/policy_v3.rs@05c6a93
  - repo: js-sdk
    path: packages/share-sdk/src/lifecycle.ts@d43e51ea
tags: [authz, revocation, cacao, ucan]
timestamp: 2026-10-05
---

# Revocation

A **revocation** is a signed event that retracts a recorded [[delegation]] *before* its `exp` lapses. TinyCloud [[capabilities]] are bearer grants, so authority ends in only two ways: the time bound runs out, or the [[nodes|Node]] records a revocation. Once recorded, the revoked delegation and **everything delegated from it** stop working: invocations fail closed, and new children are refused.

## Role

Revocation is the counterpart to [[delegation]] in [[architecture-layers|Layer 1]]. It lets an owner, an intermediate delegator, or the holder cut off a [[session-keys|session key]], an agent, or a [[native-sharing|Share link]] without waiting for expiry. [[policy-v3-admission|Policy]] roots use a separate signed root-revocation object, because a policy session descends from two sibling roots rather than one parent.

## Mechanics

### Ordinary delegations (`revocation::process`)

1. **Decode.** `TinyCloudRevocation` has two forms (`tinycloud-auth/src/authorization.rs:86-94`):
   - `Cacao`, a [[siwe|SIWE]] / [[cacao|CACAO]] signature from a wallet;
   - `Ucan`, a `did:key` UCAN that cites the target as `urn:cid:<cid>` in its attenuation.

   Both name the target in the audience as `ucan:<cid>`. A malformed target is `InvalidTarget`.
2. **Verify.** The Node checks the signature (EIP-191 for CACAO; DID-resolved, with a timeout, for UCAN) and the revocation's own time window (`InvalidSignature` / `InvalidTime`).
3. **Find the target.** The delegation is fetched by CID; if it is unknown, the result is `MissingParents`.
4. **Authorize** (`revoker_is_authorized`, `revocation.rs:328`). The acting principal is the signer itself, or, if the revocation cites one proof, that proof's delegator. In the proof case, the proof must be live and unrevoked, delegated to the signer, and carry `tinycloud.delegation/revoke` over the target. The principal may revoke if it is:
   - the target's **delegator**;
   - the target's **delegatee**, so a recipient can give a grant up; or
   - the **owner of any space** the target's abilities point at, so the owner can cut off any grant on their data.

   Anyone else gets `UnauthorizedRevoker` (`revocation.rs:274-360`).
5. **Save.** A `revocation` row `{id, revoker, revoked, serialization, revoked_at}` is inserted idempotently.

### Effect across the chain

Revocation is enforced on read, not by deleting rows:

- **Invocations fail closed.** Each [[invocation]] re-loads its cited chain. A revoked leaf is `DelegationRevoked`; a revoked ancestor is `DelegationAncestorRevoked` (`invocation.rs:88-95, 334-340`). "Chain OK" is never cached across a revocation.
- **No new children.** `/delegate` refuses a child whose parent or any ancestor is revoked: `ParentRevoked` / `AncestorRevoked` (`delegation.rs:156-160, 758-770`).

### Policy roots

A [[policy-v3-admission|Policy v3]] root is revoked with `POST /revoke`, using a JSON body `xyz.tinycloud.policy/root-revocation/v1`:

```
{ schema, targetCid, targetRole, ownerDid, nodeAudience, revokedAt, reason, issuerDid, signature }
```

- The **owner** signs. For the `policy-enforcement` root, the **enforcer** may sign instead.
- `revokedAt` must round-trip the Node's own RFC 3339 formatter exactly and be at most 60 s in the future.
- Root revocation is irreversible (`root-revocation-irreversible`). Every policy invocation re-checks root liveness, so all sessions and descendants stop on their next call.

The Share SDK's `revokeShare` maps its `scope` onto this:

- `direct` → the `policy-enforcement` root;
- `ancestor` → the `policy-authority` root;
- bearer links → ordinary delegation revocation.

## Shape

```rust
pub struct Model {               // revocation table (revocation.rs:16-24)
    pub id: Hash,                // content hash of the revocation event
    pub revoker: String,         // signing DID
    pub revoked: Hash,           // the delegation being retracted
    pub serialization: Vec<u8>,
    pub revoked_at: Option<OffsetDateTime>,
}
```

Policy roots keep their own `revoked_at` and `revocation_bytes` on the `policy_v3_root` row.

## Relationships

Retracts a [[delegation]] and, transitively, everything below it; checked on every [[invocation]]; may be signed by a wallet ([[siwe|SIWE]] CACAO) or a [[session-keys|session key]] (UCAN); policy roots are revoked as part of [[policy-v3-admission]]; the user-facing control is Share revocation in [[native-sharing]]; complements expiry as the second way a [[capabilities|capability]] ends.

## Example

An owner delegated `tinycloud.kv/get` on `…/com.listen.app/` to an agent's session key for 30 days, and the agent re-delegated a sub-path to a helper. On day two the owner, as owner of the targeted space, signs a revocation for the agent's delegation and posts it. The agent's next read fails with `delegation-revoked`. The helper's next read fails with `delegation-ancestor-revoked`, and any new child the agent tries to register is refused with `ParentRevoked`. (See [[example-listen]].)

## Status & drift

`shipped` in Node 1.17.3 (`tinycloud-node@05c6a93`). Earlier versions of this page said only the delegator can revoke, only CACAO is accepted, and children are not affected; all three are out of date.

Known issue: SDK 3.0.0 stamps policy-root `revokedAt` with milliseconds (`toISOString()`), which fails the Node's exact-format check, so about 1 in 10 root revocations are refused. The fix (TC-601) is in 3.1.0-beta.3 and later only; the hosted Share viewer works around it.

## Sources
- `tinycloud-node` (`05c6a93`, Node 1.17.3): `tinycloud-core/src/models/revocation.rs` (model :16-24; control proofs :137-210; `process` :234; `revoker_is_authorized` :274-360), `tinycloud-auth/src/authorization.rs:86-94` (`TinyCloudRevocation::{Cacao, Ucan}`), `tinycloud-core/src/models/invocation.rs:88-95, 334-340` (fail-closed), `tinycloud-core/src/models/delegation.rs:156-160, 758-770` (`ParentRevoked`/`AncestorRevoked`), `tinycloud-node-server/src/policy_v3.rs:3516, 3683-3747` (root revocation, `revokedAt` rule :3733)
- `js-sdk` (`d43e51ea`, SDK 3.0.0): `packages/share-sdk/src/lifecycle.ts:52-62` (`revokeShare` scopes), `packages/sdk-core/src/policy/unified.ts:452` (millisecond `revokedAt`)
