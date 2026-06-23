---
type: concept
title: At-Rest Encryption
description: AES-256-GCM column encryption applied by the node to sensitive DB columns; wire format 0x01||nonce||ciphertext+tag, with first-byte version dispatch giving legacy-plaintext passthrough.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption.rs
tags: [encryption, at-rest]
timestamp: 2026-06-23
---

# At-Rest Encryption

**At-rest encryption** is the node's AES-256-GCM protection for sensitive columns it writes to its metadata DB. It is the `ColumnEncryption` type in `tinycloud-core/src/encryption.rs`: a symmetric cipher keyed by a node-derived 32-byte key, with a one-byte version prefix that lets new encrypted writes coexist with pre-existing plaintext. It is an **internal node detail**, distinct from the user-facing [[encryption-networks|encryption networks]].

## Role

At-rest encryption lives in [[architecture-layers|Layer 1]] and is invisible to clients — there is no API for it. The node uses it to encrypt bytes *it* owns: delegation/invocation serializations, webhook secrets and hook tickets, and (critically) the **sealed private keys of [[encryption-networks|encryption networks]]**. So `ColumnEncryption` is both a standalone at-rest mechanism *and* the AEAD building block the network mechanism reuses — see [[encryption-networks#Mechanics]] and the [[overview]].

## Shape

The encrypted wire format is a single version-prefixed byte string:

```
0x01 || nonce(12B) || ciphertext || tag(16B)
```

- **`0x01`** — `VERSION_ENCRYPTED`, the only encrypted version. **Any other first byte is treated as legacy plaintext** and returned as-is on decrypt.
- **nonce** — 12 bytes, freshly generated per encryption (`Aes256Gcm::generate_nonce(&mut OsRng)`).
- **ciphertext + tag** — the AES-256-GCM output (the 16-byte GCM tag is appended by the AEAD; the minimum valid encrypted length is therefore `1 + 12 + 16 = 29` bytes — anything shorter is `EncryptionError::TooShort`).

The key is `[u8; 32]` (256-bit), passed to `ColumnEncryption::new` and never rotated within an instance.

## Mechanics

`ColumnEncryption::decrypt` does **version dispatch on the first byte**:

1. Empty input → returned empty (`Ok`).
2. First byte `!= 0x01` → **legacy plaintext**, returned unchanged. This is the gradual-migration path: old rows written before encryption was enabled still read correctly, because CBOR/DAG-CBOR payloads start with bytes like `0xa_`, never `0x01`.
3. First byte `== 0x01` → split off the 12-byte nonce, AES-256-GCM-decrypt the remainder; a wrong key or tampered ciphertext fails the GCM tag check (`EncryptionError::Decrypt`).

Encryption is unconditional — every `encrypt` call produces a `0x01`-prefixed value with a fresh nonce. The `maybe_encrypt`/`maybe_decrypt` free functions take an `Option<&ColumnEncryption>`: when encryption is not configured they pass bytes through untouched, so call sites stay uniform whether or not a node has encryption keys.

A key node invariant: at call sites, **the content hash is always computed on plaintext, then `maybe_encrypt` is applied** — so enabling/disabling column encryption never changes a record's content-addressed identity.

## Relationships

Reused as the AEAD inside the [[encryption-networks|encryption-network]] ECIES wrap (over the X25519 shared secret) and to seal each network's private key at rest; protects [[delegation]]/[[invocation]] serializations and [[hooks|webhook]] secrets in the [[metadata-db|metadata DB]]; one mechanism of the [[overview|encryption overview]].

## Example

A node writes an encrypted column for plaintext `hello world`:

```
0x01 || <12 random bytes> || AES-256-GCM(key, nonce, "hello world") || <16-byte tag>
```

On read, the first byte `0x01` selects the encrypted path; the node slices bytes `[1..13]` as the nonce and GCM-decrypts `[13..]` back to `hello world`. A row written earlier as raw CBOR (first byte `0xa2`) read through the same `decrypt` is returned verbatim — no key needed.

## Status & drift

Shipped and stable. The seal-at-rest key for [[encryption-networks|network]] private keys is a `ColumnEncryption` derived from `b"tinycloud/encryption/network-seal"`; in DStack mode that derivation is rooted in the dstack-derived key setup, lifting network private keys into [[tee-dstack|TEE]] key management (`tinycloud-node-server/src/lib.rs:216-221`). Code is canonical.

## Sources
- `tinycloud-node`: `tinycloud-core/src/encryption.rs` (`ColumnEncryption`, `VERSION_ENCRYPTED`, `maybe_encrypt`/`maybe_decrypt`, tests at `:99-166`)
