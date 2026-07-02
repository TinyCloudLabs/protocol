---
type: reference
title: Sources & Provenance
description: Which repo/area each section derives from, plus known provenance gaps.
timestamp: 2026-06-22
---

# Sources & Provenance

Provenance map: which repo/area each section's concepts derive from. Validate claims against these
before authoring (see `scripts/cx`).

## Section → source

| Section | Primary source(s) |
|---------|-------------------|
| Foundations | `whitepaper`, `technology-map`, `listen` (team framing) |
| Identity | `tinycloud-node` (`tinycloud-auth/identity.rs`, `manifest.rs`), `js-sdk` (`sdk-core/identity.ts`), `openkey` |
| Spaces | `tinycloud-node` (`tinycloud-auth/resource.rs`), `js-sdk` (`sdk-core/manifest.ts`) |
| Authorization | `tinycloud-node` (`models/delegation.rs`, `models/invocation.rs`, `auth_guards.rs`) |
| Policy Engine | `whitepaper`, `listen`, policy-engine credential-delegation memory |
| Services | `tinycloud-node` (`tinycloud-core`, `sdk-services`) |
| Encryption | `tinycloud-node` (`encryption.rs`, `encryption_network/`), memory `threshold-decryption-v1` |
| Storage | `tinycloud-node` (`tinycloud-core`) |
| Consistency | `tinycloud-node` (`replication/`, present but not mounted), `listen` |
| Applications | `js-sdk` (`sdk-core/manifest.ts`), `openkey`, `listen`, `tinyboilerplate` (app-starter, agent-runtime) |
| Build (developer track) | `tinyboilerplate` (`README.md`, `packages/{client,server}`, `templates/app-starter`, `examples/notes`, `scripts/scaffold-app.ts`), `tinycloud-app-kit` (`schemas/`, `guides/`, `skills/`), npm registry (`@tinycloud/*`, `@openkey/sdk` package names/versions) |
| Secrets | `tinycloud-node` (primitives), `js-sdk` (apps) |
| Credentials | `openkey` (OpenCredentials, witness service), `listen` |
| Nodes | `tinycloud-node` (`node-server`) |
| SDK | `js-sdk` (`sdk-core`, `sdk-services`, `node-sdk`, `web-sdk`, `cli`) |
| Future | `listen`, `whitepaper`, memory `threshold-decryption-v1` |

## Known gaps

- **2025 protocol-architecture meeting transcripts: NOT_FOUND in Listen.** Only summaries and 2026
  work sessions are populated. The deepest architecture-rationale source is missing.
  - **Recovery path:** re-transcribe the `audio/<id>/recording.base64` blobs, or pull the original
    recordings from Fireflies via their `source_id`.
- **Miner (design-intent) input pending** — will enrich *Future Directions* and per-concept rationale.
- **Policy engine impl vs design** needs codex/miner confirmation of what is implemented vs designed.
