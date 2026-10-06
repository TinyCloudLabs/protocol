---
type: concept
title: Delegation
description: Delegation passes authority down a chain — a root SIWE→CACAO (ReCap) grant from the space owner, then child UCAN grants that can only narrow the parent's scope; policy sessions add a two-root first link.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/models/delegation.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-auth/src/authorization.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/util.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/mod.rs@05c6a93
tags: [authz, delegation, ucan, cacao, recap]
timestamp: 2026-10-05
---

# Delegation

**Delegation** is how authority is passed down a chain in TinyCloud: a delegator grants a [[capabilities|capability]] to a delegatee, and the delegatee may in turn re-grant a *narrowed* subset to someone else. The chain's root is a [[siwe|SIWE]]→[[cacao|CACAO]] ([[recap|ReCap]]) grant signed by a [[autonomic-space|space]]'s [[dids|owner DID]]; every child is a [[ucan|UCAN]] signed by the parent's delegatee. A delegation only confers authority if every link verifies — signature, time-bounds, revocation status and scope-containment — back to the owner. A [[policy-v3-admission|policy session]] is a special first link: a Node-signed UCAN whose two parents are the owner's sibling policy roots.

## Actors

- **Delegator** — the principal granting authority; a [[dids|DID]] string (`delegation.delegator`).
- **Delegatee** — the principal receiving it (`delegation.delegatee`); becomes the delegator of any child.
- **Root authority** — the [[autonomic-space|space]]'s [[dids|owner DID]] (an Ethereum [[dids|did:pkh]]). A delegation whose caps all root at a space the delegator owns needs *no* parent (`is_root_authority`).
- **Parent delegation(s)** — for a non-root cap, the prior delegation(s), referenced by CID in the UCAN `proof` field / ReCap `prf` array, that must cover the child's scope.
- **The [[nodes|host node]]** — verifies and records the delegation (`/delegate` route → `delegation::process`).

## Sequence

A delegation is processed in phases — `process()` (`tinycloud-core/src/models/delegation.rs:182`) calls `verify()` → `validate()` → `save()`:

0. **Policy gate** — before anything else, the `/delegate` route runs `ordinary_admission_allowed` (`tinycloud-node-server/src/routes/mod.rs:457`). An ordinary UCAN passes straight through. A policy-session UCAN is admitted only if it is the exact minted first session (two parents) or a descendant with one parent checked against its immediate parent (see [[policy-v3-admission]]). Policy roots can never be imported here; they enter the graph only through policy registration.
1. **Decode** — the `/delegate` request's `Authorization` header is decoded into a `TinyCloudDelegation`, which is *either* a [[ucan|UCAN]] or a [[cacao|CACAO]] (`tinycloud-auth/src/authorization.rs:28`), then lifted into a `DelegationInfo { capabilities, delegator, delegate, parents, expiry, not_before, issued_at }` by `TryFrom<TinyCloudDelegation>` in `tinycloud-core/src/util.rs:175`. For the CACAO arm this runs [[cacao-chain-validation|ReCap extraction]] (`SiweCap::extract_and_verify`) to pull capabilities and parent CIDs; for the UCAN arm it reads `payload().attenuation` and `payload().proof`.
2. **`verify()`** (`:193`) — cryptographic + self-consistent-time check (see [[#crypto]]).
3. **`validate()`** (`:222`) — the chain check (below).
4. **`save()`** (`:799`) — persists the delegation (content-hashed PK, idempotent), its abilities, and its parent-edges into the `delegation` / `abilities` / `parent_delegations` tables.

### The chain check (`validate`)

For each capability in the new delegation:

- It is **root-authorized** if `is_root_authority(cap, delegator)` (`:779`) — the cap's [[autonomic-space|space]]-owner DID matches the delegator (or, for an [[encryption-networks|encryption-network]] URN, the network-owner DID matches). Root caps need no parent.
- Otherwise it is a **dependent cap** and must be backed by a parent.

| dependent caps | parents present | result |
|---|---|---|
| none | — | `Ok` (pure root grant) |
| some | none | `MissingParents` (except a registered policy root, which is stored but never usable alone) |
| some | some | check parents (below) |

When parents are required, the node:

1. Loads every cited parent by **CID, in signed proof order**. A missing parent → `MissingParents`. For an ordinary delegation each parent's **delegatee must equal this delegation's delegator**, else `UnauthorizedDelegator`. (A policy session is exempt: its two parents are the policy roots.)
2. Rejects a **revoked parent or ancestor** — `ParentRevoked` / `AncestorRevoked` (`:156-160`, `ensure_parent_active` `:758-770`), so revocation takes effect for new children immediately (see [[revocation]]).
3. Rejects citing a policy root from anything but a policy session (`PolicyRootRequiresConjunctiveSession`), and checks a policy-session descendant against its parent: same facts, depth minus one, strictly narrower window.
4. Rejects a parent marked **terminal** (`TerminalParentCannotRedelegate`).
5. Filters parents by **time-containment**: child `expiry ≤ parent.expiry` and child `not_before ≥ parent.not_before`, with a `None` parent bound meaning unbounded. All filtered out → `ExpiryExceedsParent` / `NotBeforePrecedesParent`. A policy session needs *both* roots to survive.
6. Requires **every** dependent cap to be covered by some parent ability: `resource.extends(parent)` **and** `ability_matches(parent, child)` (exact, registry alias, or registry implication), **and** the child's caveats contained in the parent's (`:391`, `:425`). Uncovered → `UnauthorizedCapability`; caveat widening → `CaveatsNotContained`. For a policy session each cap must be covered by *every* root. This is [[attenuation]].

## Crypto

`verify()` (`delegation.rs:193`) checks signature and the delegation's *own* time validity (the *relative* time-containment against the parent happens later in `validate`):

- **UCAN child** — `ucan.verify_signature(&AnyDidMethod::default())`, bounded by a DID-resolution timeout, validates the JWT signature against the issuer DID's key, then `payload().validate_time(None)` checks `nbf`/`exp` against now. (`AnyDidMethod::default()` is a `// TODO go back to static DID_METHODS` placeholder.)
- **CACAO root** — `cacao.verify()` runs EIP-191 `personal_sign` recovery (`Eip191::verify` in [[cacao]]): the CACAO payload is converted to a [[siwe|SIWE]] `Message` and the recovered signer must equal the `did:pkh` address. Then `payload().valid_now()` checks `nbf`/`exp`. The [[recap|ReCap]] statement is *also* verified during extraction in `util.rs` — `extract_and_verify` rejects a SIWE whose human-readable statement does not match the encoded `urn:recap:` capabilities (see [[cacao-chain-validation]]).

Replay is bounded by the SIWE `nonce` + the `[nbf, exp]` window; there is no separate nonce-dedup table on the delegation path (the content-hash PK makes re-submission idempotent).

## Edge cases

- **Widening is impossible.** A child can never grant a resource/ability its parent lacked, nor drop a parent's caveat — see [[attenuation]].
- **Wrong delegatee.** A parent granted to DID *A* cannot back a re-grant signed by DID *B*, even with a valid CID (`UnauthorizedDelegator`).
- **Revoked lineage.** A child citing a revoked parent, or a parent with a revoked ancestor, is refused at `/delegate`.
- **Time can only shrink.** Child windows must sit inside parent windows; policy-session descendants must sit *strictly* inside.
- **Unhosted space.** A delegation-only transaction referencing a space that does not yet exist is *skipped*, not errored (the space is created lazily by a `tinycloud.space/host` root grant — see [[space-hosting]]).
- **DID fragments** are stripped before matching (`strip_fragment` → `principal_did`), so `did:key:z6Mk…#z6Mk…` and `did:key:z6Mk…` compare equal.

## Trace

An [[autonomic-space|owner]] `did:pkh:eip155:1:0xf39f…2266` signs a [[siwe|SIWE]] message bearing a `urn:recap:` capability for ability `tinycloud.kv/get` over `tinycloud:pkh:eip155:1:0xf39f…2266:applications/kv/com.listen.app/` with a 24-hour `exp`, audience = a [[session-keys|session key]] `did:key:z6Mk…`. The CACAO is posted to `/delegate`: `verify()` recovers the wallet signature and confirms the ReCap statement matches; `validate()` finds the cap *is* root-authorized (delegator owns the space) so no parent is needed; `save()` records it. The session key then mints a [[ucan|UCAN]] re-delegating `tinycloud.kv/get` over `…/com.listen.app/transcript/` (a strict prefix) to an agent DID, citing the root CACAO's CID in `proof`. On `/delegate`, `validate()` now finds a dependent cap, loads the root by CID (delegatee == session key ✓, not revoked ✓, not terminal ✓), confirms the agent's window ⊆ root window, and that `…/transcript/` `extends` `…/com.listen.app/` with a matching ability ✓. The agent can now [[invocation|invoke]] reads under `transcript/`, nothing more. (See [[example-listen]].)

## Status & drift

Shipped in Node 1.17.3 (`tinycloud-node@05c6a93`). The on-wire ability form is exactly `{namespace}.{service}/{action}` (e.g. `tinycloud.kv/get`). Since TC-119 the coverage check is registry-aware (aliases such as `kv/delete`↔`kv/del`, implications such as `sql/*` ⊃ every SQL action) rather than exact string equality. DID resolution uses `AnyDidMethod::default()` pending a return to a static method allow-list (`// TODO`). Policy-session admission and multi-hop policy descendants are 1.16.0 / 1.17.3 additions (see [[policy-v3-admission]]).

## Sources
- `tinycloud-node` (`05c6a93`, Node 1.17.3): `tinycloud-core/src/models/delegation.rs` (`process` :182, `verify` :193, `validate` :222-470, revoked-parent errors :156-160, `validate_policy_descendant` :624, `caveats_contain_child` :692, `parent_is_terminal` :747, `ensure_parent_active` :758-770, `is_root_authority` :779, `save` :799), `tinycloud-core/src/util.rs:175-230` (`DelegationInfo` extraction, CACAO→ReCap path), `tinycloud-auth/src/authorization.rs:28` (`TinyCloudDelegation`), `tinycloud-node-server/src/routes/mod.rs:457` (`/delegate` policy admission gate)
