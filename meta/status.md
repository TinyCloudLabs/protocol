---
type: reference
title: Status Matrix
description: Shipped / in-progress / planned matrix of all services and subsystems.
timestamp: 2026-10-05
---

# Status Matrix

Reconciled from the canonical concept inventory. Code is canonical where spec and impl disagree.
**Shipped** means deployed on the production Node (1.17.3, `tee.node.tinycloud.xyz`, built from a
release branch rather than `main`) or released in a stable package (SDK 3.0.0, CLI 1.0.0, MCP 0.3.3,
`@openkey/sdk` 0.10.2). Work merged to `main` or released only as a beta is **in-progress**.
Last reconciled 2026-10-05.

## Services

| Service | Ability namespace | Status |
|---------|-------------------|--------|
| Key-Value (KV) | `tinycloud.kv/*` | shipped (most complete) |
| KV change feed | `tinycloud.kv/sync`, `tinycloud.kv/retain` | in-progress (Node `main`, unreleased; SDK 3.1.0 beta) |
| SQL (per-space SQLite) | `tinycloud.sql/*` | shipped |
| DuckDB | `tinycloud.duckdb/*` | shipped (opt-in build; not enabled on the hosted node) |
| Capabilities | `tinycloud.capabilities/*` | shipped |
| Space (hosting) | `tinycloud.space/*` | shipped |
| Hooks (subscribe/register/unregister/list) | `tinycloud.hooks/*` | shipped |
| Encryption (networks) | `tinycloud.encryption/*` | in-progress (v1 decrypt-only) |
| Vault | `tinycloud.vault` (SDK-virtual) | in-progress (SDK-only) |
| Compute | `tinycloud.compute` | planned (not in code) |

## Subsystems

| Subsystem | Status |
|-----------|--------|
| Identity (did:pkh + did:key, SIWE) | shipped (30-day default session since SDK 3.0) |
| OpenKey (managed keys, `/delegate`, primary key) | shipped |
| OpenKey device authorization (KV-only, one space, ≤30 days) | shipped |
| Autonomic spaces + addressing grammar | shipped |
| Authorization (delegation / invocation / revocation / attenuation) | shipped (chain-wide revocation; policy-root revocation) |
| CACAO chain validation | shipped |
| At-rest column encryption (AES-256-GCM) | shipped |
| Encryption networks (X25519, LocalOneOfOneBackend) | in-progress (decrypt-only v1) |
| User-bound decryption | in-progress |
| Threshold decryption (ferveo / TACO) | planned (reserved slot) |
| Blob store + metadata DB + per-space SQL | shipped |
| Hybrid authorization consistency | in-progress |
| Epochs/DAG | shipped |
| Conflict resolution (LWW CRDT) | planned |
| Replication + peer discovery (multi-host) | planned (prototype only on an unmerged branch) |
| Local read replicas (KV change feed) | in-progress |
| Applications / manifest model | shipped |
| TEE backends (subset-checked delegate) | shipped |
| Secrets space + vault entries | shipped |
| Policy engine — Policy v3 credential-gated admission in the Node | shipped (Node 1.17.3) |
| Policy engine — general `when` grammar (allOf/anyOf/evidence) | in-progress (standalone engine; not in production) |
| Native sharing — bearer `tc1` links | shipped (SDK 3.0, CLI 1.0) |
| Native sharing — addressed Policy/v3 links (exact email, email domain) | shipped |
| Native sharing — DID-addressed links in the Share viewer | in-progress (CLI can publish; viewer cannot open yet) |
| Durable, re-delegatable received shares | shipped (Node 1.17.3 + SDK 3.0) |
| Share email delivery authorized at the Node | shipped |
| Location registry (`registry.tinycloud.xyz`) | shipped |
| Legacy broker-backed Share APIs | removed in SDK 3.0 |
| Agent transaction policy | planned |
| Credentials (OpenCredentials / witness; exact email + email domain) | shipped |
| Nodes / hosting (Rocket, DStack TEE) | shipped (Node 1.17.3) |
| Storage quota (402 full / 413 too large; reads keep working) | shipped (Node 1.17.3) |
| Structured storage-full errors, `space/info` usage, non-growing writes when full | in-progress (Node 1.18.0 built, not deployed) |
| SDK unified storage-full errors (`isStorageFullError`) | in-progress (SDK 3.1.0 beta; stable maps KV only) |
| SDK surface | shipped (3.0.0) |
| CLI (`tc`, incl. device login and `tc share`) | shipped (1.0.0) |
| MCP server (stdio + hosted `mcp.tinycloud.xyz`) | shipped (0.3.3) |
| Agent skills — `tc-cli` | shipped (bundled with CLI 1.0.0) |
| Agent skills — `tc-publish`, `tc-secrets` | in-progress (preview packs) |
| Proxy re-encryption (LIT) | planned/deprecated (superseded) |
| ZK VMs, light clients | planned (speculative) |
