---
type: concept
title: Proxy Re-Encryption (Deprecated)
description: The LIT-Protocol-style proxy re-encryption approach to sharing encrypted data — cut from v1 and replaced by threshold decryption.
status: planned
layer: protocol
sources:
  - repo: whitepaper
    path: appendix/appendix-l-system-spaces.md
provenance_note: deprecated/dropped; this approach was cut from v1 and never implemented in code, replaced by threshold decryption. The whitepaper Appendix L "Vault" still describes it — a tracked drift.
tags: [future, encryption, deprecated]
timestamp: 2026-06-23
---

# Proxy Re-Encryption (Deprecated)

**Proxy re-encryption** was the earlier, now-**dropped** approach to sharing encrypted [[autonomic-space|space]] data: a node would re-encrypt ciphertext from the owner's key to a delegate's key (the **LIT Protocol** model) so a recipient could decrypt without the owner ever sharing a master key. **It was cut from v1** and replaced by [[encryption/threshold-decryption|threshold decryption]].

## Why it was dropped

The v1 [[encryption-networks|encryption networks]] redesign is a **hard break**: the README states v1 has **no node-side encrypt API, no envelope CRUD endpoint, and no proxy re-encryption path** — encryption is **network-scoped and decrypt-only** (`tinycloud.encryption/decrypt`). The sharing problem proxy re-encryption was meant to solve is instead handled by **delegatable [[encryption/threshold-decryption|threshold decryption]]** (ferveo, no blockchain), which keeps decryption [[capabilities|capability]]-gated and splits authority across a node cohort rather than trusting a re-encrypting proxy.

## Current status

**Deprecated — never implemented in code.** No proxy-re-encryption backend ever shipped; the only encryption backend implemented is the user-bound one (see [[user-bound-decrypt|user-bound decryption]]).

## Drift

The whitepaper **Appendix L "Vault"** still describes an encrypt + proxy-re-encryption / `reencrypt` model, and `implementation-status.md` still lists a `reencrypt` ability as "not yet implemented" — both predate the decrypt-only rewrite and are **out of date**. This spec-vs-code divergence is tracked in [[meta/contradictions|contradictions]].

## See also

Replaced by [[encryption/threshold-decryption|threshold decryption]] (and its [[future/threshold-decryption|future-direction note]]). Sits in [[architecture-layers|Layer 1]]; see the [[future/roadmap|roadmap]].

## Sources
- `whitepaper`: `appendix/appendix-l-system-spaces.md` ("Vault"; encrypt + re-encrypt — stale); `README.md` §4 (decrypt-only hard break)
