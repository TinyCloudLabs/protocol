---
type: concept
title: Replication
description: The planned peer-to-peer replication of a space's event log across hosts — code is present in tinycloud-core but not yet compiled or mounted. Actively under development.
status: planned
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/replication/mod.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/replication.rs
provenance_note: the replication module exists but is not declared in lib.rs (not compiled/mounted) as of 2026-06; actively under development
tags: [consistency, replication, future]
timestamp: 2026-06-23
---

# Replication

**Replication** is the planned mechanism for synchronizing a [[autonomic-space|space]]'s hash-linked event log across multiple [[hosts|hosts]], so the same owner's data can be served by more than one [[nodes|node]] and survive any single host. It is what turns single-host hosting into a resilient, multi-host space.

## Role

Replication is the availability half of [[hybrid-consistency]]: it propagates [[epochs-dag|epoch-ordered]] events between peers and reconciles them by [[conflict-resolution|LWW]], giving eventual convergence. It is the precondition for multi-host [[hosts|host delegations]] to be meaningful for data (not just placement).

## Mechanics

The subsystem (`tinycloud-core/src/replication/mod.rs`, with an HTTP surface `tinycloud-node-server/src/routes/replication.rs`) is **present in the codebase but not declared in `lib.rs`** — i.e. **not compiled or mounted** today. Its design is peer-to-peer sync of the event DAG modeled on Bitcoin/Ethereum-style propagation; note that `libp2p` in the node is currently used **only for ed25519 node identity**, not block exchange. This is **actively under development** outside this checkout.

## Relationships

Propagates [[epochs-dag|epoch events]]; reconciles via [[conflict-resolution]]; realizes the eventual half of [[hybrid-consistency]] / [[consistency-model]]; makes multi-[[hosts|host]] data real; the roadmap framing (incl. peer discovery) is [[future/replication-and-discovery]].

## Status & drift

**Planned / actively under development.** Code present but unmounted; no active P2P data sync ships today. See [[future/replication-and-discovery]].

## Sources
- `tinycloud-node`: `tinycloud-core/src/replication/mod.rs`, `tinycloud-node-server/src/routes/replication.rs` (present, not mounted)
