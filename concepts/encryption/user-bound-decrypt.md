---
type: concept
title: User-Bound Decryption
description: Decryption is a capability-gated native invocation against a node + a user's encryption network — the node unwraps for an authorized caller but never exposes the network key, and the data stays bound to the user, not a space.
status: in-progress
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/service.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/encryption.rs
  - repo: tinycloud-core
    path: tinycloud-core/src/encryption_network/protocol.rs
tags: [encryption, user-bound]
timestamp: 2026-06-23
---

# User-Bound Decryption

**User-bound decryption** is the rule that decrypting data in TinyCloud is a **[[capabilities|capability]]-gated [[invocation]]** against a [[nodes|node]] holding a specific **[[encryption-networks|encryption network]]** — and that a network is bound to a **user**, not to a [[autonomic-space|space]]. The node performs the unwrap for an authorized caller but never returns the network key, and the same network can protect data across any of the user's spaces.

## Role

This is the access-control half of [[encryption-networks|encryption networks]]: encryption is local and keyless-to-the-node, while **decryption is an authorized operation**. Making it user-bound (not space-bound) means a user's encrypted data is portable across their spaces under one network, and decrypt authority is something the owner [[delegation|delegates]] like any other [[capabilities|capability]].

## Mechanics

A caller invokes `tinycloud.encryption/decrypt` (the `/decrypt` route, `tinycloud-node-server/src/routes/encryption.rs`) referencing the **network URN** `urn:tinycloud:encryption:{ownerDid}:{name}` and the envelope. The node's encryption-network service (`encryption_network/service.rs`, `protocol.rs`) verifies the [[capabilities|capability]] ([[cacao-chain-validation]]) and the request's **nonce / TTL / hash binding**, then unwraps using the [[tee-dstack|TEE]]-held key via the `LocalOneOfOneBackend` and returns plaintext to the authorized caller only. **Network management (create/rotate) is owner-only and non-delegatable.**

## Relationships

The authorized operation over an [[encryption-networks|encryption network]]; gated by [[capabilities]] + [[cacao-chain-validation]]; key protected by [[tee-dstack|the TEE]]; backs the [[vault]] and [[secrets-sharing|secret sharing]]; generalized (beyond single-node trust) by [[threshold-decryption]].

## Status & drift

`in-progress` / v1. Today the backend is `n=1,t=1` (a single [[tee-dstack|TEE]] node) and there is **no node-side encrypt API** — clients encrypt locally; the node only decrypts. The nonce-bound decrypt path *does* dedup replay (unlike the general invoke path, see [[consistency-model]]).

## Sources
- `tinycloud-node`: `tinycloud-core/src/encryption_network/{service.rs, protocol.rs}`, `tinycloud-node-server/src/routes/encryption.rs`
