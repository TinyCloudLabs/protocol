---
type: index
title: Encryption
description: At-rest column encryption, user-bound encryption networks, and threshold decryption.
timestamp: 2026-06-22
---

# Encryption

At-rest column encryption, user-bound encryption networks, and threshold decryption.

## Concepts

- [Encryption Overview](overview.md) — How at-rest encryption, encryption networks, and threshold decryption fit together.
- [At-Rest Encryption](at-rest.md) — AES-256-GCM column encryption (0x01||nonce||ct) with legacy-plaintext passthrough.
- [Encryption Networks](encryption-networks.md) — X25519 envelopes; client encrypts locally; node unwraps/rewraps via LocalOneOfOneBackend (n=1,t=1).
- [User-Bound Decryption](user-bound-decrypt.md) — Decrypt as a capability-gated native invocation against node + networkId; node never sees plaintext.
- [Threshold Decryption](threshold-decryption.md) — Delegatable ferveo-based threshold decryption; KeyBackendKind::Threshold slot reserved, not implemented in v1.
