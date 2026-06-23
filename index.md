---
type: index
title: TinyCloud Protocol
description: Canonical agent-readable knowledge bundle for the TinyCloud data protocol.
timestamp: 2026-06-22
---

# TinyCloud Protocol

> **Signatures Are All You Need: Cryptographic Access Control for AI and Applications.**
> Bitcoin let people hold value without banks; TinyCloud lets people hold and share data without platforms.

This is an [Open Knowledge Format](SCHEMA.md) bundle. Read this catalog first, then drill into a
section's `index.md` (progressive disclosure). Each leaf is one concept.

## Foundations & Identity
- [Foundations](concepts/foundations/index.md) — Framing, thesis, and the trust model.
- [Identity](concepts/identity/index.md) — DIDs, SIWE sign-in, session keys, and OpenKey.

## Spaces & Authorization
- [Spaces](concepts/spaces/index.md) — The autonomic space primitive, addressing grammar, and hosting.
- [Authorization](concepts/authorization/index.md) — Capabilities, delegation, invocation, and validation.
- [Policy Engine](concepts/policy-engine/index.md) — The central permissioning primitive.

## Services & Data
- [Services](concepts/services/index.md) — Node-hosted, capability-gated services.
- [Encryption](concepts/encryption/index.md) — At-rest, encryption networks, and threshold decryption.
- [Storage](concepts/storage/index.md) — Blob store, metadata DB, and per-space SQL.
- [Consistency & Replication](concepts/consistency/index.md) — Epochs, conflict resolution, and replication.

## Applications & Identity Layers
- [Applications](concepts/applications/index.md) — Manifests, capability composition, and TEE backends.
- [Secrets](concepts/secrets/index.md) — The secrets space and encrypted vault entries.
- [Credentials](concepts/credentials/index.md) — OpenCredentials feeding the policy engine.

## Infrastructure & Usage
- [Nodes / Hosting](concepts/nodes/index.md) — Node architecture, TEE, and host delegations.
- [SDK](concepts/sdk/index.md) — How to use the protocol from code.
- [Future Directions](concepts/future/index.md) — Roadmap and design-intent items.

## Meta
- [Glossary](meta/glossary.md) — Canonical vocabulary and retired aliases.
- [Contradictions](meta/contradictions.md) — Tracked spec-vs-impl divergences.
- [Sources](meta/sources.md) — Provenance map and known gaps.
- [Status](meta/status.md) — Shipped / in-progress / planned matrix.
