---
type: concept
title: Compute (Future)
description: The planned tinycloud.compute service — execute WASM (or ZK-VM) functions over a space's data; named in the whitepaper, no implementing code.
status: planned
layer: protocol
resource: tinycloud.compute
sources:
  - repo: whitepaper
    path: README.md
provenance_note: design-only; the tinycloud.compute service is named in the whitepaper but has no implementing code as of 2026-06. "MPC stuff" was folded into threshold decryption.
tags: [future, compute, service]
timestamp: 2026-06-23
---

# Compute (Future)

**Compute** is the planned `tinycloud.compute` [[services|service]] for **executing functions over a space's data** — WASM (or, later, [[future/zk-vms|ZK-VM]]) functions invoked under a [[capabilities|capability]] like every other service. The whitepaper gives it the abilities `execute` and `deploy` (plus `list`).

## Why

The [[services|service]] set is the verb layer over a [[autonomic-space|space]]: `kv`/`sql`/`duckdb` read and write data, `encryption` protects it. Compute would add **running code against that data in place**, gated by the same [[capabilities|capability]] model, so an agent could be granted `tinycloud.compute/execute` over a space the way it is granted `tinycloud.kv/get` today.

## Current status

**Speculative / planned with no captured design.** `tinycloud.compute` is named in the whitepaper and listed in the [[meta/status|status matrix]] as **not in code**. There is no implementing service, no design intent beyond the spec; the "MPC stuff" once associated with compute was folded into [[future/threshold-decryption|threshold decryption]]. Do not assume the ability shape beyond what the whitepaper states.

## See also

The live service concept is [[services/compute]]. Sits in [[architecture-layers|Layer 1]] alongside the shipped [[services|services]]; see the [[future/roadmap|roadmap]] and [[meta/status|status matrix]].

## Sources
- `whitepaper`: `README.md` (`tinycloud.compute`; `execute`/`deploy`/`list`)
