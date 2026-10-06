---
type: concept
title: User-Bound Decryption
description: Decryption is a capability-gated native invocation against a node + a user's encryption network — the node re-wraps the envelope's symmetric key to the caller's one-time receiver key and never returns plaintext or the network key; the data stays bound to the user, not a space.
status: in-progress
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/service.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/encryption.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/protocol.rs@05c6a93
  - repo: tinycloud-node
    path: CHANGELOG.md@05c6a93
tags: [encryption, user-bound]
timestamp: 2026-10-05
---

# User-Bound Decryption

**User-bound decryption** is the rule that decrypting data in TinyCloud is a **[[capabilities|capability]]-gated [[invocation]]** against a [[nodes|node]] holding a specific **[[encryption-networks|encryption network]]** — and that a network is bound to a **user**, not to a [[autonomic-space|space]]. For an authorized caller the node unwraps the envelope's symmetric key and immediately re-wraps it to a key only the caller holds; it never returns plaintext or the network key, and the same network can protect data across any of the user's spaces.

## Role

This is the access-control half of [[encryption-networks|encryption networks]]: encryption is local and keyless-to-the-node, while **decryption is an authorized operation**. Making it user-bound (not space-bound) means a user's encrypted data is portable across their spaces under one network, and decrypt authority is something the owner [[delegation|delegates]] like any other [[capabilities|capability]].

## Mechanics

A caller generates a fresh X25519 **receiver key pair** and invokes `tinycloud.encryption/decrypt` with `POST /encryption/networks/<id>/decrypt` (`tinycloud-node-server/src/routes/encryption.rs`), sending the envelope's wrapped symmetric key, its hash, and the per-request `receiverPublicKey`. The node:

1. verifies the [[invocation]] (audience = the node's DID) and its [[capabilities|capability]] chain ([[cacao-chain-validation]]);
2. since Node 1.17.3, applies the same [[policy-engine|Policy v3]] gate as `/invoke`, so a revoked or expired policy session cannot decrypt (`routes/encryption.rs:167`);
3. checks the request's **TTL and hash binding** (`encryption_network/service.rs`, `decrypt_authorized`);
4. unwraps the symmetric key with the [[tee-dstack|TEE]]-held network key via `LocalOneOfOneBackend`, re-wraps it to `receiverPublicKey`, and returns it as **`wrappedKey`** in a node-signed `DecryptResponseBody` (`protocol.rs:50-72`).

The client opens `wrappedKey` with its receiver secret and decrypts the ciphertext locally. **The node never returns plaintext.** Network management (create/revoke) is owner-only and non-delegatable.

### Decrypt grants are raw network resources

The node authorizes decrypt only against the **raw network resource** `urn:tinycloud:encryption:<ownerDid>:<name>` carried as a **top-level ReCap resource** in the delegation. A `tinycloud.encryption/decrypt` ability nested under a space resource is refused with **401**. OpenKey's `/delegate` signs decrypt grants in the raw form (TC-598, shipped). The SDK's storage and reuse of decrypt-only grants (TC-609) is in `@tinycloud` 3.1.0-beta.8 only, not stable 3.0.0.

## Relationships

The authorized operation over an [[encryption-networks|encryption network]], exposed by the [[encryption-service]]; gated by [[capabilities]] + [[cacao-chain-validation]] + the [[policy-engine|policy]] gate; key protected by [[tee-dstack|the TEE]]; backs the [[vault]] and [[secrets-sharing|secret sharing]]; generalized (beyond single-node trust) by [[threshold-decryption]].

## Status & drift

`in-progress` / v1 (decrypt-only). Today the backend is `n=1,t=1` (a single [[tee-dstack|TEE]] node) and there is **no node-side encrypt API** — clients encrypt locally; the node only re-wraps keys for decryption. The decrypt route, raw-grant enforcement and policy gate are in production Node 1.17.3.

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `tinycloud-core/src/encryption_network/service.rs` (`decrypt_authorized` from `:680`, unwrap/rewrap around `:788-815`), `tinycloud-core/src/encryption_network/protocol.rs:50-72` (`DecryptResponseBody.wrappedKey`), `tinycloud-node-server/src/routes/encryption.rs:145-197` (decrypt route; `:167` policy gate), `CHANGELOG.md` (1.17.3)
