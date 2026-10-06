---
type: concept
title: Hosts & Host Delegations
description: A host is a node serving a given space; a host delegation is the capability that binds a space to the node(s) authorized to serve it.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-sdk-wasm/src/host.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs@05c6a93
tags: [nodes, hosts]
timestamp: 2026-10-05
---

# Hosts & Host Delegations

A **host** is a [[nodes|node]] that serves a particular [[autonomic-space|space]]; a **host delegation** is the [[capabilities|capability]] — carrying `tinycloud.space/host` — that binds a space to the node(s) authorized to host it. Hosting and host delegations are how an owner says *"this space lives here"* without a central registry.

## Role

Host delegations are the placement layer of [[architecture-layers|Layer 1]]: they connect the abstract, owner-rooted [[autonomic-space|space]] identity to a concrete serving node. Because the binding is itself a [[capabilities|capability]], an owner can move or multi-host a space by issuing new host delegations.

## Mechanics

The signing client builds a host delegation via host-SIWE (`tinycloud-sdk-wasm/src/host.rs`); when the [[nodes|node]] transacts it, the [[space-hosting|lazy-host path]] in `tinycloud-core/src/db.rs` records the `SpaceId` (see [[space-hosting]] for the exact match rule). The node also runs a **manifest service** so apps can resolve which host serves a space, and uses **libp2p only for its ed25519 node identity** — not for block exchange (the node has no P2P data sync; see [[replication]]).

## Relationships

Binds an [[autonomic-space|space]] to a [[nodes|node]]; carried as a [[capabilities|capability]] (`tinycloud.space/host`) in a [[delegation]]; the creation mechanic is [[space-hosting]]; future multi-host data sync is [[replication]] / [[future/replication-and-discovery]].

## Status & drift

Shipped. Multi-node [[replication]] of a hosted space's data is **planned**; no replication code is in production Node 1.17.3 or on `main`. Today a space is served by its host node; local read replicas on client devices are in progress.

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `tinycloud-sdk-wasm/src/host.rs`, `tinycloud-core/src/db.rs`
