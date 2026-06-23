---
type: concept
title: Space Hosting
description: The act of bringing a space into existence on a node, performed lazily when a delegation carries the tinycloud.space/host ability.
status: shipped
layer: protocol
resource: tinycloud.space/host
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs
  - repo: tinycloud-node
    path: tinycloud-sdk-wasm/src/host.rs
tags: [spaces, hosting]
timestamp: 2026-06-23
---

# Space Hosting

**Hosting** is how an [[autonomic-space|space]] comes to exist on a [[nodes|node]]: there is no "create space" call — a space is materialized **lazily** the first time the node transacts a [[delegation]] carrying the **`tinycloud.space/host`** [[capabilities|ability]] over that space. To "host a space" is simply to hold (or be delegated) that capability for it.

## Role

Space hosting is the bootstrap step of [[architecture-layers|Layer 1]]: before any [[services|service]] [[invocation]] can target `{spaceId}/{service}`, the `{spaceId}` must be hosted. Hosting binds a space's name to its owner [[dids|DID]] on a node without any registry — the [[capabilities|capability]]'s root authority *is* the proof of ownership.

## Mechanics

When a delegation is transacted, the node scans its capabilities for one whose ability is exactly `tinycloud.space/host` against a **bare** space resource (service `space`, no path/query/fragment) and inserts that `SpaceId` idempotently (`tinycloud-core/src/db.rs` `transact`). The signing client builds the host delegation via host-SIWE in `tinycloud-sdk-wasm/src/host.rs`; the high-level SDK drives this through `ensureSpaceExists` / `hostOwnedSpace` on first use (see [[sign-in-flow]]). The exact match rule and insert are detailed in [[autonomic-space]].

## Relationships

Creates an [[autonomic-space|space]] addressed by the [[uri-addressing-grammar|URI grammar]]; carried as a [[capabilities|capability]] inside a [[delegation]]; driven by the SDK [[sign-in-flow]]; performed by a [[nodes|node]] / [[hosts|host]]; ownership rooted at a [[dids|DID]].

## Example

On first sign-in the SDK ensures `…:default` exists by transacting a host-SIWE [[delegation]] carrying `tinycloud.space/host` over `tinycloud:pkh:eip155:1:0xf39f…2266:default/space`; the node inserts the `SpaceId`, and subsequent [[kv|`tinycloud.kv/put`]] [[invocation|invocations]] on `…:default/kv/…` are admitted.

## Status & drift

Shipped. Vocabulary: "host" is the protocol verb; there is no separate "create" operation.

## Sources
- `tinycloud-node`: `tinycloud-core/src/db.rs` (`transact` host-insert), `tinycloud-sdk-wasm/src/host.rs` (host-SIWE)
