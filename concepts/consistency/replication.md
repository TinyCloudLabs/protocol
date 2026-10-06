---
type: concept
title: Replication
description: Copying a space's data beyond its host node. Multi-host peer-to-peer replication is planned (a prototype exists only on an unmerged branch); local read replicas on client devices, built on the KV change feed, are in progress.
status: planned
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/lib.rs@05c6a93
  - repo: tinycloud-node
    path: docs/kv-sync.md@d7f511f
  - repo: tinycloud-node
    path: tinycloud-core/src/replication/mod.rs@feat/replication-e2e-bootstrap
  - repo: js-sdk
    path: packages/sdk-services/src/kv/KVService.ts@origin/master
provenance_note: no replication module is in production Node 1.17.3 (05c6a93) or node main (d7f511f); the P2P prototype lives only on the unmerged feat/replication-e2e-bootstrap branch and the current plan does not port it
tags: [consistency, replication, future]
timestamp: 2026-10-05
---

# Replication

**Replication** is copying a [[autonomic-space|space]]'s data beyond the one [[nodes|node]] that hosts it. There are two tracks with different status:

- **Multi-host replication** (planned): synchronizing a space's hash-linked event log between [[hosts]], so more than one node can serve the same owner's data and survive the loss of any one host.
- **Local read replicas** (in-progress): a client device keeps a local, read-only copy of keys under a prefix, kept current through the [[kv]] change feed.

## Role

Multi-host replication is the availability half of [[hybrid-consistency]]: it would propagate [[epochs-dag|epoch-ordered]] events between peers and reconcile them by [[conflict-resolution|LWW]], giving eventual convergence. It is the precondition for multi-host [[hosts|host delegations]] to mean anything for data, not just placement.

Local read replicas are narrower. The host node stays the only writer and the only authority; a device copies the latest state of keys it is allowed to read, so apps can read offline and with low latency.

## Mechanics

### Multi-host replication (planned)

The node has **no replication subsystem**. `tinycloud-core/src/replication/` is in neither production Node 1.17.3 (`05c6a93`) nor `main` (`d7f511f`). A peer-to-peer prototype (`replication/{commit, recon, snapshots, …}.rs`) exists only on the unmerged `feat/replication-e2e-bootstrap` branch, and the current plan does not port it. `libp2p` in the node is used only for ed25519 node identity, not for block exchange. The design direction is in [[future/replication-and-discovery]].

### Local read replicas (in-progress)

The current direction (Linear TC-12; milestones M1 and M2 in TC-502) is local read replicas built on the KV change feed:

1. **Node:** `tinycloud.kv/sync` (TC-732), merged to `main`, not released. It returns an ordered, resumable, delete-aware list of each key's latest state under one prefix, with an opaque cursor; HTTP 410 tells the replica to discard its state and bootstrap again (`docs/kv-sync.md` @d7f511f). See [[kv]].
2. **SDK:** `kv.changes()` (TC-736) in `@tinycloud/sdk-services` 3.1.0-beta.9. It pages the feed; the client then fetches changed values with `tinycloud.kv/get` and checks them against the returned ETags.

A replica is only a cache: every page of the feed is authorized as a normal [[invocation]], and the replica holds nothing the caller could not read directly. The feed needs an explicit `tinycloud.kv/sync` grant, which `*` and `tinycloud.kv/*` never imply.

## Relationships

Multi-host replication would propagate [[epochs-dag|epoch events]], reconcile them via [[conflict-resolution]], realize the eventual half of [[hybrid-consistency]] / [[consistency-model]], and make multi-[[hosts|host]] data real; peer discovery is framed in [[future/replication-and-discovery]]. Local read replicas consume the [[kv]] change feed through the SDK and are bounded by the caller's [[capabilities]].

## Status & drift

- **Multi-host P2P replication: planned.** Not in production or on `main`; a prototype sits on an unmerged branch that the plan does not port.
- **Local read replicas: in-progress.** Node feed on `main` (unreleased); SDK `kv.changes()` in 3.1.0-beta.9; not in stable SDK 3.0.0 or production Node 1.17.3.

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3) and @d7f511f (`main`): `tinycloud-core/src/lib.rs` and tree (no `replication/` module)
- `tinycloud-node` @d7f511f: `docs/kv-sync.md` (`tinycloud.kv/sync` contract, TC-732)
- `tinycloud-node` branch `feat/replication-e2e-bootstrap` (unmerged): `tinycloud-core/src/replication/*` (P2P prototype)
- `js-sdk` `origin/master` (3.1.0-beta.9): `packages/sdk-services/src/kv/KVService.ts` (`changes()`, TC-736)
