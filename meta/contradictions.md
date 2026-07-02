---
type: reference
title: Contradictions
description: Tracked divergences between the whitepaper (spec) and the code (impl).
timestamp: 2026-06-22
---

# Contradictions

Where the **whitepaper** (spec) and **code** (impl) disagree, the code is treated as canonical.
Each row tracks a divergence and its resolution.

| Topic | Whitepaper says | Code says | Resolution |
|-------|-----------------|-----------|------------|
| App-data space name | `apps` | `applications` | **Canonical = `applications`.** Update prose to match code. |
| Encryption (Appendix L "Vault") | Encrypt + proxy re-encryption | Decrypt-only v1; X25519 envelopes; no node-side encrypt API; PRE not shipped | **Canonical = shipped decrypt-only.** PRE deprecated → threshold decryption (planned). |
| Compute service | Named `tinycloud.compute` | Not present in code | **Mark `planned`.** No captured design intent. |
| Credentials space | (implied dedicated space) | No `credentials` space in code; VCs stored via normal web SDK | **Open design question.** No dedicated space yet. |
| Replication | First-class subsystem | Present in repo but **not compiled/mounted** | **Mark `planned`.** |
| Space vocabulary | namespace / orbit | `Space` only (no `orbit` in code) | **Canonical = "Space".** Retire namespace/orbit. |
| /invoke replay protection | (assumed nonce-protected) | No nonce-dedup table on general `/invoke`; only the encryption-decrypt path dedups | **Flagged security follow-up.** Relies on time-bounds + hash-idempotency today. |
| Witness host + issuer DID | Docs previously said `witness.tinycloud.xyz` / `did:web:issuer.tinycloud.xyz` | Live service is `witness.credentials.org` signing as `did:web:issuer.credentials.org`; the tinycloud.xyz witness host is dead (all production deploys failed) and `issuer.tinycloud.xyz` serves a DID document whose `id` is the credentials.org DID (strict `did:web` resolution fails). Client SDK `DEFAULT_WITNESS_URL` (`js/opencredentials-client/src/opencredentials_client_wrapper.ts`) still points at the dead host | **Canonical = `witness.credentials.org` / `did:web:issuer.credentials.org`** (confirmed by operator 2026-07-02; migration abandoned). Docs updated; client SDK default is a flagged code fix. |
