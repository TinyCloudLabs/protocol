---
type: concept
title: ZK VMs (Future)
description: Speculative verifiable-compute direction — run functions in a zero-knowledge VM (RISC Zero, SP1) so results carry a proof anyone can verify.
status: planned
layer: protocol
sources:
  - repo: whitepaper
    path: README.md
provenance_note: speculative; research-phase in the whitepaper Future Directions, no implementing code as of 2026-06
tags: [future, zk, compute]
timestamp: 2026-06-23
---

# ZK VMs (Future)

**ZK VMs** are a speculative direction in which [[future/compute|compute]] functions run inside a **zero-knowledge virtual machine** (e.g. RISC Zero, SP1) so the result comes with a **cryptographic proof** of correct execution that anyone can verify without re-running the function — `verify(proof, function_cid, inputs, outputs)`.

## Why

It would extend TinyCloud's "trust the signature, not the server" stance from *authorization* to *computation*: today a [[capabilities|capability]] proves you were *allowed* to do something; a ZK-VM proof would prove a computation over [[autonomic-space|space]] data was *done correctly*, useful for verifiable authorization (delegation/epoch-transition proofs) and as the basis for [[future/light-clients|light-client verification]].

## Current status

**Speculative — research phase.** Named in the whitepaper Future Directions; no implementing code and no captured design beyond the spec. Do not treat as committed.

## See also

Pairs with [[future/compute|compute]] (the service that would host ZK-VM functions) and underpins [[future/light-clients|light clients]]. Sits in [[architecture-layers|Layer 1]]; see the [[future/roadmap|roadmap]].

## Sources
- `whitepaper`: `README.md` §6 (Verifiable Compute with ZK VMs)
