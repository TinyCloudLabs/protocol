---
type: concept
title: Replication & Peer Discovery (Future)
description: Planned first-class P2P replication and peer discovery for TinyCloud nodes, modeled on Bitcoin/Ethereum-style peer-to-peer networks.
status: planned
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/replication/mod.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/replication/recon.rs
provenance_note: actively under development; the replication module exists in tinycloud-core but is not declared in lib.rs (not compiled or mounted) and peer discovery is not implemented as of 2026-06
tags: [future, replication, discovery]
timestamp: 2026-06-23
---

# Replication & Peer Discovery (Future)

**Replication and peer discovery** is the planned subsystem that lets the [[nodes|nodes]] hosting a [[autonomic-space|space]] **find each other and synchronize authorization state** as a first-class peer-to-peer network — modeled on how Bitcoin and Ethereum nodes discover peers and gossip — rather than relying on manually configured hosts.

## Why

A [[autonomic-space|space]]'s [[consistency|consistency]] model already defines *how* events are ordered (epoch-based, hash-linked [[epochs-dag|DAG]], [[conflict-resolution|LWW CRDT]]); replication defines *how those epochs propagate across hosts*, and discovery defines *how a host finds the other hosts to propagate with*. Making both first-class is what turns "trusted nodes you point at each other" into a self-organizing host network, so a user's data stays available and consistent without a central coordinator.

## Current status

**Actively under development.** The `replication/` module exists in `tinycloud-core` but is **not declared in `lib.rs`** — it is not compiled or mounted — and **peer discovery is not implemented** as of 2026-06. The whitepaper sketches discovery via host-delegation multi-addresses, DID-document service endpoints, and a manifest registry, but no gossip/broadcast or epoch-sync is wired up. Treat the discovery mechanism as design intent.

## See also

The live concept tracking the unmounted module is [[consistency/replication]]; it builds on [[consistency|consistency]], [[epochs-dag|the epoch DAG]], and [[conflict-resolution|conflict resolution]]. The "[[future/light-clients|Recon]]" light-client direction is a related but distinct line of work. Sits in [[architecture-layers|Layer 1]]; see the [[future/roadmap|roadmap]].

## Sources
- `tinycloud-node`: `replication/mod.rs`, `replication/recon.rs` (present, not mounted in `lib.rs`)
- `whitepaper`: `README.md` §5 (peer-to-peer replication / host discovery)
