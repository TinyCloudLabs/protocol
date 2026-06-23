---
type: concept
title: Hosts & Host Delegations
description: A host is a node serving a given space; a host delegation is the capability that binds a space to the node(s) authorized to serve it.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-sdk-wasm/src/host.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs
tags: [nodes, hosts]
timestamp: 2026-06-23
---

# Hosts & Host Delegations

A **host** is a [[nodes|node]] that serves a particular [[autonomic-space|space]]; a **host delegation** is the [[capabilities|capability]] — carrying `tinycloud.space/host` — that binds a space to the node(s) authorized to host it. Hosting and host delegations are how an owner says *"this space lives here"* without a central registry.

## Role

Host delegations are the placement layer of [[architecture-layers|Layer 1]]: they connect the abstract, owner-rooted [[autonomic-space|space]] identity to a concrete serving node. Because the binding is itself a [[capabilities|capability]], an owner can move or multi-host a space by issuing new host delegations.

## Mechanics

The signing client builds a host delegation via host-SIWE (`tinycloud-sdk-wasm/src/host.rs`); when the [[nodes|node]] transacts it, the [[space-hosting|lazy-host path]] in `tinycloud-core/src/db.rs` records the `SpaceId` (see [[space-hosting]] for the exact match rule). The node also runs a **manifest service** so apps can resolve which host serves a space, and uses **libp2p only for its ed25519 node identity** — not for block exchange (there is no active P2P data sync today; see [[replication]]).

## Relationships

Binds an [[autonomic-space|space]] to a [[nodes|node]]; carried as a [[capabilities|capability]] (`tinycloud.space/host`) in a [[delegation]]; the creation mechanic is [[space-hosting]]; future multi-host data sync is [[replication]] / [[future/replication-and-discovery]].

## Status & drift

Shipped. Multi-node replication of a hosted space's data is **planned** (the [[replication]] module is unmounted); today a space is effectively served by its host node.

## Sources
- `tinycloud-node`: `tinycloud-sdk-wasm/src/host.rs`, `tinycloud-core/src/db.rs`
