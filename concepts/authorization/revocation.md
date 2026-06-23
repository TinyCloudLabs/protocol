---
type: concept
title: Revocation
description: A revocation is a CACAO event, signed by the original delegator, that retracts a specific delegation by CID before its time-bound expiry.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/models/revocation.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/util.rs
tags: [authz, revocation, cacao]
timestamp: 2026-06-23
---

# Revocation

A **revocation** is a signed event that retracts a previously recorded [[delegation]] *before* its [[capabilities|capability's]] natural `exp` would lapse. It is a [[cacao|CACAO]] whose audience names the target delegation's CID (`ucan:<cid>`) and whose issuer is the **original delegator** — only the principal that granted authority may revoke it. Revocation is how a [[autonomic-space|space]] owner (or any intermediate delegator) cuts off a [[session-keys|session key]] or agent ahead of expiry.

## Role

Revocation is [[architecture-layers|Layer 1]] authorization machinery, the counterpart to [[delegation]]. Because TinyCloud [[capabilities|capabilities]] are *bearer* grants verified offline, the only ways authority ends are (a) the time-bound `exp` lapsing or (b) an explicit revocation event recorded on the [[nodes|node]]. Revocation makes the second case possible without waiting out the grant's lifetime.

## Mechanics

Revocations are processed by `revocation::process` (`tinycloud-core/src/models/revocation.rs:68`). The flow is tighter than [[delegation]]/[[invocation]] — there is one event variant and a single authorization rule:

1. **Decode** — `TinyCloudRevocation::Cacao(SiweCacao)` is the only form (`authorization.rs:85`). `TryFrom<TinyCloudRevocation>` (`util.rs:215`) requires the CACAO's `aud` to be `ucan:<cid>`, splitting on `:` — the suffix parses to the **revoked delegation CID**; the issuer (fragment-stripped) is the `revoker`. A malformed audience → `InvalidTarget`.
2. **Verify** — `c.verify()` runs the EIP-191 SIWE signature recovery (see [[cacao]]) and `c.payload().valid_at(&now)` checks the revocation's own `nbf`/`exp`. Failure → `InvalidSignature` / `InvalidTime`.
3. **Authorize** — the target delegation is fetched by CID (`MissingParents` if absent), and the node enforces that the **revoker is the delegation's delegator**: `did_principal_matches(&delegation.delegator, &r.revoker)`. Anyone else → `UnauthorizedRevoker`. This is the core rule — *you can only revoke what you granted*.
4. **Save** — a `revocation` row `{ id (content-hash), revoker, revoked (delegation CID), serialization }` is inserted (idempotent on-conflict-do-nothing), plus any parent-edges.

## Shape

The `revocation` table model (`revocation.rs:7`):

```rust
pub struct Model {
    pub id: Hash,            // content hash of the revocation, PK
    pub revoker: String,     // DID that issued it (must == delegation.delegator)
    pub revoked: Hash,       // the delegation's CID/hash being retracted
    pub serialization: Vec<u8>,
}
```

The wire object is a [[cacao|CACAO]] with `aud = "ucan:<delegation-cid>"`. The `revocation` entity `belongs_to` the `delegation` it targets (`Relation::Delegation`), and a delegation `has_many` revocations.

## Relationships

Retracts a [[delegation]] (by CID); authorized only for that delegation's delegator (the [[autonomic-space|space]] owner or an intermediate); encoded as a [[cacao|CACAO]] / [[siwe|SIWE]] signature like the root [[delegation]]; complements time-bound expiry as the second way a [[capabilities|capability]] ends; recorded as an event alongside delegations/invocations in the per-space [[epochs-dag|event log]].

## Example

An owner delegated `tinycloud.kv/*` over `…:applications/kv/com.listen.app/` to an agent's [[session-keys|session key]] with a 30-day `exp`. After two days they want it cut off. The owner signs a [[cacao|CACAO]] with `aud = "ucan:bafy…<that-delegation-cid>"` and posts it; `process` recovers the wallet signature, fetches the delegation by CID, confirms the owner *is* its delegator, and records the revocation. (See [[example-listen]].)

## Status & drift

Shipped, but minimal. Two notable properties of the current implementation:

- **Single-level effect.** The recorded revocation row retracts the *named* delegation; the code path does not transitively walk and invalidate that delegation's descendants — children are reachable via `parent_delegations`, but cascade enforcement is not in `revocation::process`. Mark this as a known scope limit (`unverified` cascade semantics — verify against the [[invocation]] read path before relying on it).
- **Only CACAO.** `TinyCloudRevocation` has a single `Cacao` variant — there is no UCAN revocation form, so an intermediate (non-wallet) delegator revoking a re-grant still routes through a CACAO-shaped event.

## Sources
- `tinycloud-node`: `tinycloud-core/src/models/revocation.rs:1-126` (model + `process`), `tinycloud-core/src/util.rs:200-230` (`RevocationInfo`, `ucan:<cid>` audience parse), `tinycloud-auth/src/authorization.rs:85-102` (`TinyCloudRevocation` encode/decode)
