---
type: concept
title: Roadmap
description: Index of planned, design-only, and deprecated protocol directions — what is named or scaffolded but not yet part of shipped TinyCloud.
status: planned
layer: protocol
sources:
  - repo: whitepaper
    path: README.md
  - repo: tinycloud-node
provenance_note: index of future-directions concepts; ground truth is SYNTHESIS "Future Directions" + the whitepaper README §6. No new mechanics asserted here.
tags: [future, roadmap, index]
timestamp: 2026-06-23
---

# Roadmap

The **roadmap** is the index of TinyCloud protocol directions that are **named, scaffolded, or specified but not yet shipped** — the boundary between what the protocol *does* today and what it *intends* to do. Read it to know which capabilities are real, which are under active development, and which are speculative or dropped.

## Members

- **[[future/threshold-decryption|Threshold decryption]]** — delegatable ferveo / TACO threshold decryption that fills the reserved `KeyBackendKind::Threshold` slot. **Actively under development.** Live concept: [[encryption/threshold-decryption]].
- **[[future/replication-and-discovery|Replication & peer discovery]]** — first-class P2P replication and Bitcoin/Ethereum-style peer discovery. The `replication/` module exists in code but is unmounted. **Actively under development.** Live concept: [[consistency/replication]].
- **[[future/compute|Compute]]** — the whitepaper's `tinycloud.compute` service (WASM / ZK-VM execution over space data). Named in the spec, no implementing code. Live concept: [[services/compute]].
- **[[future/proxy-re-encryption-deprecated|Proxy re-encryption (deprecated)]]** — the LIT-Protocol-style proxy re-encryption approach that was **cut from v1** and replaced by [[encryption/threshold-decryption|threshold decryption]]. Documented as dropped.
- **[[future/zk-vms|ZK VMs]]** — verifiable compute via zero-knowledge VMs (RISC Zero, SP1). Research-phase, speculative.
- **[[future/light-clients|Light clients]]** — recursive-ZK light-client verification (the "Recon" direction) so a browser can verify a space without the full DAG. Research-phase, speculative.

## State of the roadmap

**Shipped** is the [[architecture-layers|Layer 1]] base protocol — [[autonomic-space|spaces]], [[capabilities]], [[delegation]], the [[services|kv/sql/duckdb/encryption]] services, and decrypt-only [[encryption-networks|encryption networks]] (see [[meta/status|the status matrix]]). **Actively under development** are threshold decryption and replication/discovery — both have code footholds (a reserved enum slot; an uncompiled module) plus live design intent, so they sit closest to landing. **Speculative** are compute, ZK VMs, and light clients — named in the whitepaper's vision but with no captured design beyond the spec. **Dropped** is proxy re-encryption, kept here only to record why it was cut. Each entry below is intentionally brief: depth lives in the linked live concept, not here.

## Adjacencies

Everything on this roadmap is [[architecture-layers|Layer 1]] protocol work. It sits beside [[meta/status|the status matrix]] (the shipped/planned ledger) and [[meta/contradictions|contradictions]] (where the whitepaper still describes things — like proxy re-encryption — that code has since dropped).

## Sources
- `whitepaper`: `README.md` §6 (Future Directions)
- `tinycloud-node`: reserved/unmounted scaffolds (`encryption_network/`, `replication/`)
