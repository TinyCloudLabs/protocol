---
type: index
title: Services
description: Node-hosted services exposed over capability-gated abilities.
timestamp: 2026-06-22
---

# Services

Node-hosted services exposed over capability-gated abilities.

## Concepts

- [Key-Value Service](kv.md) — Per-space key-value store, the most complete service surface.
- [SQL Service](sql.md) — Per-space SQLite SQL service.
- [DuckDB Service](duckdb.md) — Optional per-space DuckDB analytics service.
- [Hooks Service](hooks.md) — Subscribe/webhook service for reacting to space events.
- [Capabilities Service](capabilities-service.md) — Service for managing and querying capabilities.
- [Encryption Service](encryption-service.md) — Encryption-networks service; v1 is decrypt-only with no node-side encrypt API.
- [Vault Service](vault.md) — SDK-virtual service composing kv + encryption for encrypted secret storage.
- [Compute Service](compute.md) — Roadmap compute service named in the whitepaper but not present in code.
