---
type: concept
title: Autonomic Space
description: The sovereign data primitive — a named, owner-rooted container of services, created lazily by a delegation carrying the tinycloud.space/host ability.
status: shipped
layer: protocol
resource: tinycloud.space/*
sources:
  - repo: tinycloud-node
    path: tinycloud-auth/src/resource.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs
  - repo: tinycloud-node
    path: tinycloud-sdk-wasm/src/host.rs
tags: [spaces, primitive]
timestamp: 2026-06-23
---

# Autonomic Space

An **autonomic space** is the sovereign data primitive of TinyCloud: a **named container, rooted in an owner [[dids|DID]]**, that holds the data exposed by its [[services]] (kv, sql, encryption, …). A space is `SpaceId { base_did, name }` — an account *is* the namespace root, and spaces are its named children. It is "autonomic" because it governs its own access entirely through [[capabilities|capability]] signatures rooted at its owner, with no external account or registry to consult.

## Role

Spaces live in [[architecture-layers|Layer 1]] and are the unit of **ownership and addressing**. Every resource in TinyCloud is named relative to a space (see [[uri-addressing-grammar]]), every [[capabilities|capability]] is scoped to a space, and every [[invocation]] resolves to a space's owner via its [[delegation]] chain. The fixed-name [[system-spaces|system spaces]] (`default`, `public`, `account`, `secrets`, `applications`) are just conventional space names off the same owner DID.

## Mechanics

A space is **created lazily**, never by an explicit "create" call. When a [[delegation]] is transacted, the node scans its [[capabilities|capabilities]] for one whose ability is exactly `tinycloud.space/host` against a bare space resource — service `space`, **no path, no query, no fragment** — and inserts that `SpaceId` into the space table (idempotently, on-conflict-do-nothing). This is the `transact` path in `tinycloud-core/src/db.rs:~795`:

```rust
(Resource::TinyCloud(r), "tinycloud.space/host")
    if r.path().is_none()
        && r.service().as_str() == "space"
        && r.query().is_none()
        && r.fragment().is_none()
=> Some(SpaceIdWrap(r.space().clone()))
```

So "hosting a space" *is* holding (or being delegated) the `tinycloud.space/host` capability for it. The owner of a space is whoever the `SpaceId`'s `base_did` resolves to — checked by [[capabilities|root-authority]] verification in [[delegation]] (`is_root_authority` compares the space's DID to the delegator). The SDK drives this through `ensureSpaceExists` / host-SIWE on first use (see [[sdk/sign-in-flow|sign-in flow]]).

## Shape

`SpaceId` is defined in `tinycloud-auth/src/resource.rs`:

```rust
pub struct SpaceId { base_did: DIDBuf, name: Name }
```

- **`base_did`** — the owner DID, e.g. `did:pkh:eip155:1:0xf39F…2266` (canonicalized; see [[dids]]).
- **`name`** — a free `Name` string (validation is a TODO in code — any string parses today).
- **Wire form** (`Display`): `tinycloud:{suffix}:{name}` where `suffix` is the base DID with the leading `did:` (4 chars) stripped — e.g. `tinycloud:pkh:eip155:1:0xf39f…2266:default`. Full resource grammar in [[uri-addressing-grammar]].
- A space's content identifier is `SpaceId::get_cid()` — a CIDv1 (raw codec, Blake2b-256) over its display string.

## Relationships

Owned by a [[dids|DID]]; addressed via the [[uri-addressing-grammar|URI grammar]]; the fixed names are the [[system-spaces|system spaces]]; exposes [[services]]; access is granted by [[capabilities]] scoped to it and passed via [[delegation]]; hosted/created by the `tinycloud.space/host` ability; data lives in content-addressed [[storage]] keyed by `SpaceId` + hash; ordering of its events is handled by [[consistency]].

## Example

A user signs in and the SDK ensures `…:default` exists: a [[siwe|SIWE]] delegation carrying `tinycloud.space/host` over `tinycloud:pkh:eip155:1:0xf39f…2266:default/space` is transacted, the node inserts that `SpaceId`, and subsequent `tinycloud.kv/put` [[invocation|invocations]] against `…:default/kv/notes/` are admitted because their [[delegation]] chain roots at the same owner DID.

## Status & drift

Shipped. Vocabulary is **locked to "space"** — "namespace" and "orbit" are retired (no `orbit` exists in code). Space `name` validation is an open TODO in `resource.rs` (`Name::from_str` accepts any string).

## Sources
- `tinycloud-node`: `tinycloud-auth/src/resource.rs` (`SpaceId`, `Display`, `get_cid`), `tinycloud-core/src/db.rs:~795` (`transact` lazy-host), `tinycloud-sdk-wasm/src/host.rs`
