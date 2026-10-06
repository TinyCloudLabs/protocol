---
type: reference
title: Sources & Provenance
description: Which repo/area each section derives from, plus known provenance gaps.
timestamp: 2026-10-05
---

# Sources & Provenance

Provenance map: which repo/area each section's concepts derive from. Validate claims against these
before authoring (see `scripts/cx`).

**Pinned revisions (2026-10-05 refresh).** Production behavior is cited from the deployed releases, not
`main`:

| Component | Production / stable revision | Unreleased |
|-----------|------------------------------|------------|
| TinyCloud Node | `tinycloud-node@05c6a93` (1.17.3, 1.17.x release branch) | 1.18.0 `c99b312` (same branch); `main` |
| js-sdk | `v3.0.0` = `d43e51ea` (SDK 3.0.0, CLI 1.0.0, share-sdk 1.0.0, mcp 0.3.3) | `master` (SDK 3.1.0 beta, CLI 1.1.0 beta, MCP 0.4.0 beta) |
| OpenKey | `openkey@main` (API deploys from `main`; `@openkey/sdk` 0.10.2) | — |
| Share viewer | `share@main` | — |
| OpenCredentials | `OpenCredentials@60364a9` | — |

## Section → source

| Section | Primary source(s) |
|---------|-------------------|
| Foundations | `whitepaper`, `technology-map`, `listen` (team framing) |
| Identity | `tinycloud-node` (`tinycloud-auth/identity.rs`, `manifest.rs`), `js-sdk` (`sdk-core/identity.ts`), `openkey` |
| Spaces | `tinycloud-node` (`tinycloud-auth/resource.rs`), `js-sdk` (`sdk-core/manifest.ts`) |
| Authorization | `tinycloud-node` (`models/delegation.rs`, `models/invocation.rs`, `auth_guards.rs`) |
| Policy Engine | `tinycloud-node` (`tinycloud-node-server/src/policy_v3.rs`, `policy_v3_*` models), `js-sdk` (`sdk-core/src/policy/`), design history: `whitepaper`, `listen`, policy-engine repo |
| Sharing | `js-sdk` (`share-sdk`, `share-envelope`, `web-sdk/src/share/`, `cli/src/commands/share.ts`), `share` (viewer), `registry` (location registry), `tinycloud-node` (`policy_v3.rs`), `docs/specs/sharing-*` |
| Services | `tinycloud-node` (`tinycloud-core`, `sdk-services`) |
| Encryption | `tinycloud-node` (`encryption.rs`, `encryption_network/`), memory `threshold-decryption-v1` |
| Storage | `tinycloud-node` (`tinycloud-core`) |
| Consistency | `tinycloud-node` (`main`: KV change feed `docs/kv-sync.md`), `js-sdk` (`master`: `kv.changes()`), Linear TC-12/TC-50x (local replicas), `listen` |
| Applications | `js-sdk` (`sdk-core/manifest.ts`), `openkey`, `listen`, `tinyboilerplate` (app-starter, agent-runtime) |
| Build (developer track) | `tinyboilerplate` (`README.md`, `packages/{client,server}`, `templates/app-starter`, `examples/notes`, `scripts/scaffold-app.ts`), `tinycloud-app-kit` (`schemas/`, `guides/`, `skills/`), npm registry (`@tinycloud/*`, `@openkey/sdk` package names/versions) |
| Secrets | `tinycloud-node` (primitives), `js-sdk` (apps) |
| Credentials | `OpenCredentials` (issuer, witness), `tinycloud-node` (`policy_v3.rs` SD-JWT verification), `listen` |
| Nodes | `tinycloud-node` (`node-server`) |
| SDK | `js-sdk` (`sdk-core`, `sdk-services`, `node-sdk`, `web-sdk`, `operations`, `cli`) |
| Agents | `js-sdk` (`packages/mcp`, `packages/cli/skills/tc-cli`), `prompts` (`skills/tc-publish`, `skills/tc-secrets`), `docs` (`cli/mcp.mdx`, `guides/agent-skills.mdx`) |
| Identity (OpenKey) | `openkey` (`apps/api/src/routes/{keys,delegate,device-authorization,delegation-codes}.ts`, `packages/sdk`) |
| Future | `listen`, `whitepaper`, memory `threshold-decryption-v1` |

## Known gaps

- **2025 protocol-architecture meeting transcripts: NOT_FOUND in Listen.** Only summaries and 2026
  work sessions are populated. The deepest architecture-rationale source is missing.
  - **Recovery path:** re-transcribe the `audio/<id>/recording.base64` blobs, or pull the original
    recordings from Fireflies via their `source_id`.
- **Miner (design-intent) input pending** — will enrich *Future Directions* and per-concept rationale.
- **Policy engine impl vs design:** resolved for production — the Node's in-tree Policy v3 is what runs;
  the general `when` grammar of the standalone engine is not in production.
- **Hosted service versions** (`mcp.tinycloud.xyz`, `api.openkey.so`) are inferred from their deploy
  pipelines, not read from a version endpoint.
