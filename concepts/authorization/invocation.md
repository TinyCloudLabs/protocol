---
type: concept
title: Invocation
description: An invocation is the act of exercising a capability — a UCAN that names an ability over a resource and is admitted only if it traces, through its delegation chain, back to the space owner.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/models/invocation.rs
  - repo: tinycloud-node
    path: tinycloud-auth/src/authorization.rs
tags: [authz, invocation, ucan]
timestamp: 2026-06-23
---

# Invocation

An **invocation** is the act of *exercising* a [[capabilities|capability]]: a [[ucan|UCAN]] token, signed by the invoker, that names an ability over a resource and cites the [[delegation]] that authorizes it. Every read and write in TinyCloud is an invocation — the node admits it only if its signature is valid, it is time-valid, and the capability it claims is `extends`-covered by a parent delegation whose chain traces back to the [[autonomic-space|space]]'s [[dids|owner DID]]. Where a [[delegation]] *grants* authority, an invocation *uses* it.

## Actors

- **Invoker** — the principal exercising the capability; a [[dids|DID]] (`invocation.invoker`), typically a [[session-keys|session key]] or an agent DID.
- **Parent delegation(s)** — the [[delegation|delegations]] (referenced by CID in the UCAN `proof`) that must have granted the invoked ability *to* the invoker.
- **The [[nodes|host node]]** — receives the invocation at `/invoke`, runs `invocation::process`, and on success performs the side-effect ([[kv|KV]] write, [[sql|SQL]] query, …).

## Sequence

`process()` (`tinycloud-core/src/models/invocation.rs:86`) runs `verify()` → `validate()` → `save()`:

1. **Decode** — `TinyCloudInvocation` is a bare [[ucan|UCAN]] (`type TinyCloudInvocation = Ucan`). `TryFrom<TinyCloudInvocation>` builds `InvocationInfo { capabilities, invoker, parents }` by reading `payload().attenuation` (the invoked caps), `payload().issuer` (the invoker, fragment-stripped), and `payload().proof` (parent CIDs).
2. **`verify()`** — UCAN signature + own time-validity (see [[#crypto]]).
3. **`validate()`** — the authorization check against the [[delegation]] chain (below).
4. **`save()`** — records the invocation (content-hash PK, idempotent), its invoked abilities, parent-edges, and any resulting `kv_write`/`kv_delete` rows; then enqueues matching [[hooks|webhook]] deliveries.

### The authorization check (`validate`)

`validate()` (`invocation.rs:115`) mirrors [[delegation|delegation's]] check but is invoker-centric:

- Caps where `is_root_authority(cap, invoker)` (the invoker *owns* the target space, or owns the [[encryption-networks|network]] URN) are self-authorized and need no parent.
- For **dependent** caps:
  1. With no parents → `MissingParents`.
  2. Parents are loaded by **CID** (with their abilities). Each parent must identify the invoker as its delegatee: `did_principal_matches(&p.delegatee, &invocation.invoker)`, else `UnauthorizedInvoker`.
  3. Parents are filtered to those **valid at the invocation time** `now`: `now < parent.expiry` and `now ≥ parent.not_before` (a `None` bound is unbounded).
  4. Every dependent cap must be covered by a surviving parent ability: `c.resource.extends(&pc.resource) && c.ability == pc.ability`. Otherwise `UnauthorizedAction(resource, ability)`.

## Crypto

`verify()` (`invocation.rs:101`) calls `invocation.verify_signature(&AnyDidMethod::default())` (Ed25519 [[session-keys|session-key]] signature over the JWT) then `payload().validate_time(None)`. Each invocation carries a fresh `nonce` (`urn:uuid:…`) minted at creation (`make_invocation`, `tinycloud-auth/src/authorization.rs:154`), but the general `/invoke` path has **no nonce-dedup table** — replay is bounded by `validate_time` + content-hash idempotency + the per-space [[epochs-dag|epoch ordering]]. (The [[encryption-service|encryption decrypt]] path *does* add an `encryption_nonce` replay table; see [[consistency-model]].)

## Edge cases

- **Invoker ≠ delegatee.** A UCAN proving a delegation granted to a *different* DID is rejected (`UnauthorizedInvoker`) — the proof must have been issued to the signer.
- **Expired parent.** Even a syntactically valid invocation fails if its supporting delegation is no longer time-valid at `now` (the parent is filtered out, leaving the cap uncovered → `UnauthorizedAction`).
- **Scope overreach.** Invoking an ability/resource outside the granted prefix fails via `extends` (see [[attenuation]]).
- **Missing KV target.** A `tinycloud.kv/del` against a key with no prior write yields `MissingKvWrite` during `save`.
- **Idempotent re-submission.** The same signed invocation re-posted hits the content-hash PK and is a no-op insert (`RecordNotInserted` → returns the existing hash) — for writes this is harmless; the lack of dedup matters only for replayable read side-effects (see [[consistency-model]]).

## Trace

An agent holds a [[ucan|UCAN]] delegation for `tinycloud.kv/get` over `tinycloud:pkh:eip155:1:0xf39f…2266:applications/kv/com.listen.app/transcript/` (issued to its DID, see [[delegation#trace]]). To read today's transcript it mints an invocation: `attenuation` = `{ "tinycloud:…:applications/kv/com.listen.app/transcript/2026-06-23.json": ["tinycloud.kv/get"] }`, `proof` = the delegation CID, signed by the agent's [[session-keys|session key]]. `/invoke` → `verify()` OK; `validate()` loads the parent by CID, confirms delegatee == invoker, confirms it's time-valid, and confirms `…/transcript/2026-06-23.json` `extends` `…/transcript/` with `tinycloud.kv/get` ✓; the node reads and returns the value. (See [[example-listen]].)

## Status & drift

Shipped. The general `/invoke` path's absence of a nonce-dedup store is a known property (writes are idempotent; reads can be re-driven before `exp`) — flagged in [[capabilities#status--drift]] and [[consistency-model]], not a docs gap. DID method resolution is `AnyDidMethod::default()` (`// TODO`, `invocation.rs:103`).

## Sources
- `tinycloud-node`: `tinycloud-core/src/models/invocation.rs:86-204` (`process`/`verify`/`validate`/`is_root_authority`), `tinycloud-core/src/util.rs:188-198` (`InvocationInfo`), `tinycloud-auth/src/authorization.rs:74-170` (`TinyCloudInvocation`, `make_invocation`, nonce)
