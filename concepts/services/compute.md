---
type: concept
title: Compute Service
description: A roadmap service for running computation against a space's data — named in the whitepaper, with no implementing code in the node today.
status: planned
layer: protocol
resource: tinycloud.compute
sources:
  - repo: whitepaper
    path: README.md
provenance_note: design-only; no implementing code as of 2026-06
tags: [service, compute, future]
timestamp: 2026-06-23
---

# Compute Service

The **compute service** is a planned [[services|service]] for running computation against an [[autonomic-space|space]]'s data under [[capabilities|capability]] control. It is named in the whitepaper's service list but has **no implementing code** in `tinycloud-node` today.

## Role

It would extend the protocol from *storage* services (kv/sql/…) to *computation* — letting an owner [[delegation|grant]] a scoped right to run logic over their data rather than exporting it. The shape (`tinycloud.compute/{execute, deploy, …}`) is indicative, not specified.

## Status & drift

**Planned / not implemented.** No `compute` service exists in `tinycloud-core`; design intent for it was not captured beyond the whitepaper mention (some "MPC" ideas folded into [[threshold-decryption]] instead). See the roadmap entry [[future/compute]] and [[meta/contradictions]] (whitepaper lists a service the code lacks).

## Relationships

A future [[services|service]]; would be gated like any service by [[capabilities]]; tracked in [[future/roadmap|the roadmap]].

## Sources
- `whitepaper`: `README.md` (service list)
