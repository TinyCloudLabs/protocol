---
type: concept
title: Hybrid Consistency
description: The intended model — strong consistency for authorization decisions made locally, eventual consistency for propagating state across peers — so security is never sacrificed for availability.
status: in-progress
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/auth_guards.rs
  - repo: tinycloud-core
    path: tinycloud-core/src/models/invocation.rs
tags: [consistency, hybrid]
timestamp: 2026-06-23
---

# Hybrid Consistency

**Hybrid consistency** is TinyCloud's intended posture: **strong** consistency where it matters for security — [[cacao-chain-validation|authorization decisions]] are made against locally-consistent state on the serving [[nodes|node]] — and **eventual** consistency for propagating data and authority events across peers. The principle is *never trade security for availability*: a node would rather refuse than admit a request against stale authority.

## Role

It is the team's stated consistency philosophy for [[consistency-model|authorization state]] and data alike. It explains why [[revocation]] and [[cacao-chain-validation]] are evaluated synchronously and locally, while [[replication]] of the event log is allowed to lag.

## Mechanics (intended vs current)

- **Strong, local (shipped):** every [[invocation]] is authorized synchronously against the node's current view ([[node-architecture|`auth_guards`]]); writes are ordered as [[epochs-dag|epoch events]].
- **Eventual, distributed (design-intent):** cross-peer convergence rides on [[conflict-resolution|LWW]] over the DAG via the [[replication]] subsystem — which is **present but not mounted**, so today the system is effectively single-node-strong.

## Relationships

The umbrella over [[consistency-model]] (authorization) and [[conflict-resolution]] (data); the strong half is enforced by [[cacao-chain-validation]] / [[revocation]]; the eventual half depends on [[replication]] + [[epochs-dag]].

## Status & drift

`in-progress` / design-intent. Single-node strong consistency is real and shipped; the distributed-eventual half is the planned model pending [[replication]]. (Framing sourced from team design discussion; the implemented pieces are the local authorization path.)

## Sources
- `tinycloud-node`: `tinycloud-node-server/src/auth_guards.rs`, `tinycloud-core/src/models/invocation.rs` (the shipped strong-local path)
