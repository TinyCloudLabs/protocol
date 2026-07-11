---
type: concept
title: Encryption Overview
description: TinyCloud has two encryption mechanisms — AES-256-GCM at-rest column encryption and X25519 envelope encryption networks — both user-bound, with v1 decrypt-only (no node-side encrypt API).
status: in-progress
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/mod.rs
tags: [encryption, overview]
timestamp: 2026-06-23
---

# Encryption Overview

TinyCloud has **two distinct encryption mechanisms**: (a) **[[at-rest|at-rest column encryption]]** — AES-256-GCM applied by the node to sensitive DB columns — and (b) **[[encryption-networks|encryption networks]]** — X25519 envelope encryption where the *client* encrypts data locally to a network public key and the node only ever *unwraps and rewraps* the symmetric key. The two solve different problems and do not share key material beyond a derivation root.

## Role

Both mechanisms sit in [[architecture-layers|Layer 1]] and are implemented in `tinycloud-core`. At-rest encryption is an internal node detail: it protects bytes the node itself writes to its metadata DB. Encryption networks are a user-facing protocol surface — the [[encryption-service|encryption service]] — that lets app data be stored ciphertext-only on the node, decryptable only through a [[user-bound-decrypt|capability-gated decrypt invocation]].

The defining property of the network mechanism is that it is **user-bound, not [[autonomic-space|space]]-bound**. A network's root authority is its owner [[dids|DID]] (embedded in the [[encryption-networks|network URN]]), independent of which space the ciphertext lives in. And v1 is **decrypt-only**: the node deliberately exposes no encrypt API — clients encrypt locally — so the node never holds plaintext (see [[encryption-networks#mechanics|the module note]]).

## Mechanics

The two mechanisms, at a glance:

| | [[at-rest]] | [[encryption-networks]] |
|---|---|---|
| Algorithm | AES-256-GCM | `x25519-aes256gcm/v1` envelope (ECIES-style wrap + AES-256-GCM) |
| Who encrypts | the **node** | the **client**, locally |
| Key custody | node-derived static key | network X25519 keypair (private key sealed at rest) |
| Bound to | the node instance | the **owner [[dids|DID]]** (user-bound) |
| Node sees plaintext? | yes (it owns the data) | **never** — only unwraps/rewraps a symmetric key |
| Access control | none (internal) | [[capabilities|capability]]-gated [[user-bound-decrypt|decrypt invocation]] |

The two are not unrelated in code: the X25519 ECIES wrap reuses `ColumnEncryption` (the at-rest AES-256-GCM type) as its AEAD over the Diffie-Hellman shared secret, and the network's private key is *sealed* at rest with a `ColumnEncryption` derived from `b"tinycloud/encryption/network-seal"` (`tinycloud-node-server/src/lib.rs:219-221`). So at-rest encryption is the building block that protects the network mechanism's own secrets.

## Members

- **[[at-rest|At-rest column encryption]]** — `ColumnEncryption` (AES-256-GCM, `0x01||nonce||ct` format, legacy-plaintext passthrough). The node's internal at-rest protection.
- **[[encryption-networks|Encryption networks]]** — the X25519 envelope protocol: `NetworkId`, the `LocalOneOfOneBackend` key custody, and client-side local encryption.
- **[[user-bound-decrypt|User-bound decryption]]** — how a holder actually decrypts: a capability-gated native [[invocation]] against `node + networkId`, with the node unwrapping/rewrapping under strict hash/nonce/TTL binding.
- **[[future/threshold-decryption|Threshold decryption]]** *(planned)* — the reserved `KeyBackendKind::Threshold` slot for future ferveo-style threshold custody. Actively under development; see [[threshold-decryption]].

## Relationships

Implements the [[encryption-service]] surface; at-rest seals the [[encryption-networks|network]] private key and webhook/delegation columns; networks store ciphertext via the [[kv|KV]]/[[vault|vault]] services; decrypt is a [[capabilities|capability]]-gated [[invocation]] rooted at the owner [[dids|DID]].

## Status & drift

At-rest is **shipped**. Encryption networks are **wired and mounted but in active development** — the `LocalOneOfOne` backend ships; `Threshold` and `Dstack` backends are reserved/partial. Revoke is a placeholder (state flip only). Code is canonical throughout.

## Sources
- `tinycloud-node`: `tinycloud-core/src/encryption.rs`, `tinycloud-core/src/encryption_network/mod.rs`, `tinycloud-node-server/src/lib.rs:219-227` (service wiring + seal derivation)
