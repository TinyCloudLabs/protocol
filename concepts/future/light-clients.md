---
type: concept
title: Light Clients (Future)
description: Speculative light-client verification — let a browser verify a space's state from succinct proofs (recursive ZK) instead of the full authorization DAG.
status: planned
layer: protocol
sources:
  - repo: whitepaper
    path: README.md
provenance_note: speculative; research-phase in the whitepaper Future Directions (incl. the "recon" exploration), no implementing code as of 2026-06
tags: [future, light-clients, zk]
timestamp: 2026-06-23
---

# Light Clients (Future)

**Light clients** are a speculative direction that would let a constrained instance — e.g. a browser — **verify a [[autonomic-space|space]]'s current state without holding the full authorization [[epochs-dag|DAG]]**, by checking succinct proofs (recursive ZK proofs over state roots) instead of replaying every [[delegation|delegation]] and [[epochs-dag|epoch]] from genesis. This is the "Recon" exploration in the whitepaper.

## Why

Today verifying a space means validating its event history bottom-up. A light client would instead trust a small recursive proof (optionally anchored on-chain as an L2/L3 state root), so a thin client could confirm "this is the space's authorized state" cheaply — making [[consistency|consistency]] checkable from the edge without [[future/replication-and-discovery|full replication]].

## Current status

**Speculative — research phase.** Named in the whitepaper Future Directions (alongside on-chain state anchoring) and sketched in the `explorations/` "recon" / lite-client drafts; no implementing code. Depends on [[future/zk-vms|ZK-VM]] proving that does not yet exist. Do not treat as committed.

## See also

Builds on [[future/zk-vms|ZK VMs]] (the proof system) and relates to [[future/replication-and-discovery|replication & discovery]] (the full-node counterpart) and [[consistency|consistency]]. Sits in [[architecture-layers|Layer 1]]; see the [[future/roadmap|roadmap]].

## Sources
- `whitepaper`: `README.md` §6 (Light Client Verification; On-Chain State Anchoring); `explorations/` (recon / lite-client drafts)
