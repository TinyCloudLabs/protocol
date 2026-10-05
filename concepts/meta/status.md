---
type: reference
title: Status Matrix
description: Shipped / in-progress / planned matrix of all services and subsystems.
timestamp: 2026-06-22
---

# Status Matrix

Reconciled from the canonical concept inventory. Code is canonical where spec and impl disagree.

## Services

| Service | Ability namespace | Status |
|---------|-------------------|--------|
| Key-Value (KV) | `tinycloud.kv/*` | shipped (most complete) |
| SQL (per-space SQLite) | `tinycloud.sql/*` | shipped |
| DuckDB | `tinycloud.duckdb/*` | shipped |
| Capabilities | `tinycloud.capabilities/*` | shipped |
| Space (hosting) | `tinycloud.space/*` | shipped |
| Hooks (subscribe/webhooks) | `tinycloud.hooks/*` | shipped |
| Encryption (networks) | `tinycloud.encryption/*` | in-progress (v1 decrypt-only) |
| Vault | `tinycloud.vault` (SDK-virtual) | in-progress (SDK-only) |
| Compute | `tinycloud.compute` | planned (not in code) |

## Subsystems

| Subsystem | Status |
|-----------|--------|
| Identity (did:pkh + did:key, SIWE) | shipped |
| Autonomic spaces + addressing grammar | shipped |
| Authorization (delegation / invocation / revocation / attenuation) | shipped |
| CACAO chain validation | shipped |
| At-rest column encryption (AES-256-GCM) | shipped |
| Encryption networks (X25519, LocalOneOfOneBackend) | in-progress (decrypt-only v1) |
| User-bound decryption | in-progress |
| Threshold decryption (ferveo / TACO) | planned (reserved slot) |
| Blob store + metadata DB + per-space SQL | shipped |
| Hybrid authorization consistency | in-progress |
| Epochs/DAG, conflict resolution (LWW CRDT) | planned |
| Replication + peer discovery | planned (present, not mounted) |
| Applications / manifest model | shipped |
| TEE backends (subset-checked delegate) | shipped |
| Secrets space + vault entries | shipped |
| Policy engine | in-progress (central primitive) |
| Agent transaction policy | planned |
| Credentials (OpenCredentials / witness) | in-progress |
| Nodes / hosting (Rocket, DStack TEE) | shipped |
| SDK surface | shipped |
| Proxy re-encryption (LIT) | planned/deprecated (superseded) |
| ZK VMs, light clients | planned (speculative) |
