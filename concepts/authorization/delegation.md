---
type: concept
title: Delegation
description: Delegation passes authority down a chain — a root SIWE→CACAO (ReCap) grant from the space owner, then child UCAN grants that can only narrow the parent's scope.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/models/delegation.rs
  - repo: tinycloud-node
    path: tinycloud-auth/src/authorization.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/util.rs
tags: [authz, delegation, ucan, cacao, recap]
timestamp: 2026-06-23
---

# Delegation

**Delegation** is how authority is passed down a chain in TinyCloud: a delegator grants a [[capabilities|capability]] to a delegatee, and the delegatee may in turn re-grant a *narrowed* subset to someone else. The chain's root is a [[siwe|SIWE]]→[[cacao|CACAO]] ([[recap|ReCap]]) grant signed by a [[autonomic-space|space]]'s [[dids|owner DID]]; every child is a [[ucan|UCAN]] signed by the parent's delegatee. A delegation only confers authority if every link verifies — signature, time-bounds, and scope-containment — back to the owner.

## Actors

- **Delegator** — the principal granting authority; a [[dids|DID]] string (`delegation.delegator`).
- **Delegatee** — the principal receiving it (`delegation.delegatee`); becomes the delegator of any child.
- **Root authority** — the [[autonomic-space|space]]'s [[dids|owner DID]] (an Ethereum [[dids|did:pkh]]). A delegation whose caps all root at a space the delegator owns needs *no* parent (`is_root_authority`).
- **Parent delegation(s)** — for a non-root cap, the prior delegation(s), referenced by CID in the UCAN `proof` field / ReCap `prf` array, that must cover the child's scope.
- **The [[nodes|host node]]** — verifies and records the delegation (`/delegate` route → `delegation::process`).

## Sequence

A delegation is processed in three phases — `process()` calls `verify()` → `validate()` → `save()` (`tinycloud-core/src/models/delegation.rs:128`):

1. **Decode** — the `/delegate` request's `Authorization` header is decoded into a `TinyCloudDelegation`, which is *either* a [[ucan|UCAN]] (string contains `.`) or a [[cacao|CACAO]] (base64url DAG-CBOR), then lifted into a `DelegationInfo { capabilities, delegator, delegate, parents, expiry, not_before, issued_at }` by `TryFrom<TinyCloudDelegation>` in `tinycloud-core/src/util.rs`. For the CACAO arm this runs [[cacao-chain-validation|ReCap extraction]] (`SiweCap::extract_and_verify`) to pull capabilities and parent CIDs; for the UCAN arm it reads `payload().attenuation` and `payload().proof`.
2. **`verify()`** — cryptographic + self-consistent-time check (see [[#crypto]]).
3. **`validate()`** — the chain check (below) — splits caps into root vs. dependent, looks up parents, enforces time-containment and scope-coverage.
4. **`save()`** — persists the delegation (content-hashed PK, idempotent on-conflict-do-nothing), its abilities, and its parent-edges into the `delegation` / `abilities` / `parent_delegations` tables.

### The chain check (`validate`)

`validate()` (`delegation.rs:167`) is the heart of delegation. For each capability in the new delegation:

- It is **root-authorized** if `is_root_authority(cap, delegator)` — the cap's [[autonomic-space|space]]-owner DID matches the delegator (or, for an [[encryption-networks|encryption-network]] URN, the network-owner DID matches). Root caps need no parent.
- Otherwise it is a **dependent cap** and must be backed by a parent.

The branch table (`delegation.rs:181`):

| dependent caps | parents present | result |
|---|---|---|
| none | — | `Ok` (pure root grant) |
| some | none | `MissingParents` |
| some | some | check parents (below) |

When parents are required, the node:

1. Loads candidate parents by **CID** *and* **delegatee == this delegation's delegator** (`Column::Delegatee.eq(delegator)`) — a parent only counts if it was granted *to* the one now re-granting. No match → `MissingParents`.
2. Filters parents by **time-containment**: child `expiry ≤ parent.expiry` and child `not_before ≥ parent.not_before`, with a `None` parent bound meaning unbounded. All parents filtered out → `ExpiryExceedsParent` or `NotBeforePrecedesParent`.
3. Loads each surviving parent's abilities and requires **every** dependent cap to be `extends`-covered by some parent ability: `c.resource.extends(&pc.resource) && c.ability == pc.ability`. Any uncovered cap → `UnauthorizedCapability(resource, ability)`. This is [[attenuation]].

## Crypto

`verify()` (`delegation.rs:142`) checks signature and the delegation's *own* time validity (the *relative* time-containment against the parent happens later in `validate`):

- **UCAN child** — `ucan.verify_signature(&AnyDidMethod::default())` validates the JWT signature against the issuer DID's key, then `payload().validate_time(None)` checks `nbf`/`exp` against now. (`AnyDidMethod::default()` is a `// TODO go back to static DID_METHODS` placeholder.)
- **CACAO root** — `cacao.verify()` runs EIP-191 `personal_sign` recovery (`Eip191::verify` in [[cacao]]): the CACAO payload is converted to a [[siwe|SIWE]] `Message` and `verify_eip191(sig)` recovers the signer and checks it equals the `did:pkh` address. Then `payload().valid_now()` checks `nbf`/`exp`. The [[recap|ReCap]] statement is *also* verified during extraction in `util.rs` — `extract_and_verify` rejects a SIWE whose human-readable statement does not match the encoded `urn:recap:` capabilities (see [[cacao-chain-validation]]).

Replay is bounded by the SIWE `nonce` + the `[nbf, exp]` window; there is no separate nonce-dedup table on the delegation path (the content-hash PK makes re-submission idempotent).

## Edge cases

- **Widening is impossible.** A child can never grant a resource/ability its parent lacked — [[attenuation]] via `ResourceId::extends` + exact `ability ==` is the only coverage rule.
- **Wrong delegatee.** A parent granted to DID *A* cannot back a re-grant by DID *B*, even with a valid CID (the `Column::Delegatee` filter).
- **Time can only shrink.** Child windows must sit inside parent windows; a child claiming a later `exp` or earlier `nbf` than its parent is rejected.
- **Unhosted space.** A delegation-only transaction referencing a space that does not yet exist is *skipped*, not errored (the space is created lazily by a `tinycloud.space/host` root grant — see [[space-hosting]]).
- **DID fragments** are stripped before matching (`strip_fragment` → `principal_did`), so `did:key:z6Mk…#z6Mk…` and `did:key:z6Mk…` compare equal.

## Trace

An [[autonomic-space|owner]] `did:pkh:eip155:1:0xf39f…2266` signs a [[siwe|SIWE]] message bearing a `urn:recap:` capability for ability `tinycloud.kv/get` over `tinycloud:pkh:eip155:1:0xf39f…2266:applications/kv/com.listen.app/` with a 24-hour `exp`, audience = a [[session-keys|session key]] `did:key:z6Mk…`. The CACAO is posted to `/delegate`: `verify()` recovers the wallet signature and confirms the ReCap statement matches; `validate()` finds the cap *is* root-authorized (delegator owns the space) so no parent is needed; `save()` records it. The session key then mints a [[ucan|UCAN]] re-delegating `tinycloud.kv/get` over `…/com.listen.app/transcript/` (a strict prefix) to an agent DID, citing the root CACAO's CID in `proof`. On `/delegate`, `validate()` now finds a dependent cap, loads the root by CID (delegatee == session key ✓), confirms the agent's window ⊆ root window, and that `…/transcript/` `extends` `…/com.listen.app/` with the same ability ✓. The agent can now [[invocation|invoke]] reads under `transcript/`, nothing more. (See [[example-listen]].)

## Status & drift

Shipped. The on-wire ability form is exactly `{namespace}.{service}/{action}` (e.g. `tinycloud.kv/get`); the whitepaper's looser prose is non-canonical (see [[meta/contradictions]]). DID resolution uses `AnyDidMethod::default()` pending a return to a static method allow-list (`// TODO`, `delegation.rs:145`).

## Sources
- `tinycloud-node`: `tinycloud-core/src/models/delegation.rs:128-283` (`process`/`verify`/`validate`/`is_root_authority`), `tinycloud-core/src/util.rs:112-163` (`DelegationInfo` extraction, CACAO→ReCap path), `tinycloud-auth/src/authorization.rs:27-70` (`TinyCloudDelegation` encode/decode)
