---
type: concept
title: Threshold Decryption (Future)
description: Planned delegatable threshold decryption — TinyCloud nodes act as TACO nodes running ferveo; the owner picks ≥3 nodes that run a key-gen ceremony, with no blockchain.
status: planned
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/types.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/backend.rs
provenance_note: actively under development; only the KeyBackendKind::Threshold enum slot exists in code as of 2026-06. The full design spec (docs/specs/threshold-decryption-v1.md) lives outside the tracked source repos.
tags: [future, threshold, encryption]
timestamp: 2026-06-23
---

# Threshold Decryption (Future)

**Threshold decryption** is the planned encryption backend in which decryption authority is **split across a cohort of nodes** so that no single node can read a user's data: TinyCloud nodes act as **TACO nodes** running **[ferveo](https://github.com/nucypher/ferveo)**, the user selects a cohort of **≥3 nodes** that perform a distributed **key-generation ceremony**, and decryption shares are combined client-side — **with no blockchain** in the loop.

## Why

It fills the reserved [[encryption-networks|encryption-network]] backend slot `KeyBackendKind::Threshold` (today only the user-bound backend is implemented). The threat model is a **compromised authority**: rather than trusting one node not to peek, the user defines a majority cohort and authority is only reconstituted when enough of them cooperate. Decryption stays **capability-gated** — a [[user-bound-decrypt|decrypt invocation]] still has to carry a valid [[capabilities|capability]] chain — and **network management is owner-only and non-delegatable**.

## Current status

**Actively under development.** As of 2026-06 only the `KeyBackendKind::Threshold` enum slot exists in `encryption_network/` ("not implemented in v1"); the ferveo/TACO backend, the key-gen ceremony, and share-combine are not in the tracked source. The scheme specifics are explicitly out of scope for the whitepaper. Do not treat the cohort size, ceremony, or share-combine as final — they are design intent until reflected in code.

## See also

The live concept tracking the actual work and the reserved slot is [[encryption/threshold-decryption]]. It rides on [[encryption-networks|encryption networks]] and [[consistency/replication|replication]], and it **replaces** the dropped [[future/proxy-re-encryption-deprecated|proxy re-encryption]] approach. Sits in [[architecture-layers|Layer 1]]; see the [[future/roadmap|roadmap]].

## Sources
- `tinycloud-node`: `encryption_network/types.rs`, `encryption_network/backend.rs` (reserved `Threshold` slot)
- design spec `docs/specs/threshold-decryption-v1.md` (outside tracked repos)
