---
type: concept
title: Replication & Peer Discovery (Future)
description: Planned first-class P2P replication and peer discovery for TinyCloud nodes, modeled on Bitcoin/Ethereum-style peer-to-peer networks.
status: planned
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/lib.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/replication/mod.rs@feat/replication-e2e-bootstrap
  - repo: tinycloud-node
    path: docs/kv-sync.md@d7f511f
  - repo: whitepaper
    path: README.md
provenance_note: no replication module is in production Node 1.17.3 or node main; a P2P prototype exists only on the unmerged feat/replication-e2e-bootstrap branch and the current plan does not port it; peer discovery is not implemented
tags: [future, replication, discovery]
timestamp: 2026-10-05
---

# Replication & Peer Discovery (Future)

**Replication and peer discovery** is the planned subsystem that lets the [[nodes|nodes]] hosting a [[autonomic-space|space]] **find each other and synchronize authorization state** as a first-class peer-to-peer network — modeled on how Bitcoin and Ethereum nodes discover peers and gossip — rather than relying on manually configured hosts.

## Why

A [[autonomic-space|space]]'s [[consistency|consistency]] model already defines *how* events are ordered (epoch-based, hash-linked [[epochs-dag|DAG]], [[conflict-resolution|LWW CRDT]]); replication defines *how those epochs propagate across hosts*, and discovery defines *how a host finds the other hosts to propagate with*. Making both first-class is what turns "trusted nodes you point at each other" into a self-organizing host network, so a user's data stays available and consistent without a central coordinator.

## Current status

**Planned.** No replication module is in production Node 1.17.3 (`05c6a93`) or on node `main` (`d7f511f`). A peer-to-peer prototype (`tinycloud-core/src/replication/`) exists only on the unmerged `feat/replication-e2e-bootstrap` branch, and the current plan does not port it. **Peer discovery is not implemented.** The whitepaper sketches discovery via host-delegation multi-addresses, DID-document service endpoints, and a manifest registry, but no gossip/broadcast or epoch-sync exists. Treat both as design intent.

The work in progress is narrower: **local read replicas** on client devices (Linear TC-12, TC-502), built on the [[kv]] change feed `tinycloud.kv/sync` (node `main`, unreleased) and the SDK's `kv.changes()` (3.1.0 beta). The host node stays the only writer, so this needs neither peer discovery nor cross-node conflict resolution. See [[consistency/replication]].

## See also

The live concept covering both tracks is [[consistency/replication]]; it builds on [[consistency|consistency]], [[epochs-dag|the epoch DAG]], and [[conflict-resolution|conflict resolution]]. The "[[future/light-clients|Recon]]" light-client direction is a related but distinct line of work. Sits in [[architecture-layers|Layer 1]]; see the [[future/roadmap|roadmap]].

## Sources
- `tinycloud-node` @05c6a93 / @d7f511f: no `replication/` module; branch `feat/replication-e2e-bootstrap` (unmerged): `tinycloud-core/src/replication/{mod,recon}.rs` (prototype); @d7f511f `docs/kv-sync.md` (change feed)
- `whitepaper`: `README.md` §5 (peer-to-peer replication / host discovery)
