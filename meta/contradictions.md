---
type: reference
title: Contradictions
description: Tracked divergences between the whitepaper (spec) and the code (impl).
timestamp: 2026-10-05
---

# Contradictions

Where the **whitepaper** (spec) and **code** (impl) disagree, the code is treated as canonical.
Each row tracks a divergence and its resolution.

| Topic | Whitepaper says | Code says | Resolution |
|-------|-----------------|-----------|------------|
| App-data space name | `apps` | `applications` | **Canonical = `applications`.** Update prose to match code. |
| Encryption (Appendix L "Vault") | Encrypt + proxy re-encryption | Decrypt-only v1; X25519 envelopes; no node-side encrypt API; PRE not shipped | **Canonical = shipped decrypt-only.** PRE deprecated → threshold decryption (planned). |
| Compute service | Named `tinycloud.compute` | Not present in code | **Mark `planned`.** No captured design intent. |
| Credentials space | (implied dedicated space) | No `credentials` space in code; the account path passes a recipient-owned `credentialSpaceId` | **Open design question.** No dedicated named system space. |
| Replication | First-class subsystem | Absent from Node `main` and production; a prototype lives only on an unmerged branch. Current direction is local read replicas over the KV change feed | **Mark multi-host `planned`; local read replicas `in-progress`.** |
| Space vocabulary | namespace / orbit | `Space` only (no `orbit` in code) | **Canonical = "Space".** Retire namespace/orbit. |
| /invoke replay protection | (assumed nonce-protected) | Node 1.17.3 records invocations (`invocation_replay`) and rejects duplicates on `/invoke` | **Resolved** in Node 1.17.x. |
| Policy engine placement | Standalone policy engine is the authority | Node 1.17.3 runs Policy v3 itself (in-node credential checks, two-root admission); `policy-core` is test-only | **Canonical = in-node Policy v3.** Standalone engine is design history. |
| Sharing blueprint (`docs/specs/sharing-ux-blueprint.md` §2.4) | Six node capabilities "do not exist today" | All six are in Node 1.17.3 in a different form (policy as a principal, two sibling roots) | **Canonical = Node 1.17.3.** Blueprint section is historical. |
| Share envelope store | IPFS envelope registry (viewer/registry spec §6) | Envelopes travel in the URL fragment; the registry stores only signed DID → node-location records | **Canonical = fragment + location registry.** |
| OpenCredentials issuer DID | `did:web:issuer.tinycloud.xyz` | `did:web:issuer.credentials.org` (witness at `witness.credentials.org`) | **Canonical = credentials.org.** |
| Revocation timestamps | (any RFC 3339) | Node requires `revokedAt` to round-trip its formatter (whole seconds); SDK 3.0.0 stamps milliseconds | **Fixed in SDK 3.1.0 beta (TC-601)**; stable callers retry or use the hosted Share viewer. |
| User-bound decrypt result | Node returns plaintext | Node returns the key re-wrapped to the caller's `receiverPublicKey`; never plaintext | **Canonical = re-wrapped key.** |
| Default node host | — | CLI and MCP default to `https://tee.node.tinycloud.xyz`; node-sdk/web-sdk default to `https://node.tinycloud.xyz` | **Both valid** — two names for the same hosted Node. |
| Node release line | `main` is what ships | Production 1.17.3 is built from a release branch; `main` is 1.16.1 plus unreleased work | **Cite the release branch** for production behavior. |
