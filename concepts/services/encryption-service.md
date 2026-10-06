---
type: concept
title: Encryption Service
description: The encryption service — the node-side surface of TinyCloud encryption networks, exercised by tinycloud.encryption/* (network.create, network.revoke, decrypt). v1 is decrypt-only — there is no node-side encrypt API; clients encrypt locally.
status: in-progress
layer: protocol
resource: "tinycloud.encryption/{action}"
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/encryption.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/protocol.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/service.rs@05c6a93
tags: [service, encryption]
timestamp: 2026-10-05
---

# Encryption Service

The **encryption service** is the node-side surface of [[encryption-networks|encryption networks]]: it lets an owner *create* a network and a holder *decrypt* against it, gated by the `tinycloud.encryption/*` ability set. It is deliberately **decrypt-only** — there is **no node-side encrypt API**; clients encrypt locally to a network public key, and the node only ever unwraps and rewraps the envelope's symmetric key, so it never sees plaintext (see [[user-bound-decrypt]]). The deep cryptography is covered in the [[encryption/overview|encryption section]]; this concept is just the *service* (abilities + routes).

## Role

The encryption service lives in [[architecture-layers|Layer 1]]. Unlike [[kv|kv]] or [[sql|sql]], a network is **user-bound, not [[autonomic-space|space]]-bound**: its root authority is the owner [[dids|DID]] embedded in the [[encryption-networks|network URN]] (`urn:tinycloud:encryption:<ownerDid>:<name>`), independent of which space the ciphertext lives in. The service backs the [[vault|vault service]]'s network-encrypted mode and any app storing ciphertext-only blobs.

## Shape

### Abilities

The namespace is `tinycloud.encryption/{action}`. The action constants are defined in `tinycloud-core/src/encryption_network/protocol.rs`:

| Ability | Constant | Effect |
|---|---|---|
| `tinycloud.encryption/network.create` | `NETWORK_CREATE_ACTION` | Create a network + run its key-gen ceremony |
| `tinycloud.encryption/decrypt` | `DECRYPT_ACTION` | Unwrap/rewrap an envelope's symmetric key (the only read path) |
| `tinycloud.encryption/network.revoke` | `NETWORK_REVOKE_ACTION` | Admin-revoke a network (placeholder — state flip only) |

Network management (`network.create`/`network.revoke`) is **owner-only and non-delegatable**; `decrypt` is the delegatable, capability-gated action a holder exercises.

A decrypt grant must name the **raw network resource** `urn:tinycloud:encryption:<ownerDid>:<name>` as a **top-level ReCap resource**. The node authorizes decrypt only against that resource; a decrypt ability nested under a space resource is refused with 401. OpenKey's `/delegate` issues decrypt grants in this raw form (see [[user-bound-decrypt]]).

### Routes

The service is exposed over its own HTTP routes (`tinycloud-node-server/src/routes/encryption.rs`), not the generic `/invoke` path — each verifies the [[invocation]] then checks the encryption-specific authorization:

- `POST /encryption/networks` — create + ceremony (`create_one_of_one_network`); body `{ name, ownerDid, threshold }`, `threshold` defaults to `one_of_one()`.
- `GET /encryption/networks/<network_id>` — fetch the authoritative `NetworkDescriptor`.
- `GET /.well-known/encryption/network/<name>` — public discovery record.
- `POST /encryption/networks/<network_id>/decrypt` — the [[user-bound-decrypt|decrypt invocation]] (`decrypt_authorized` → `DecryptResponseBody`). The response carries `wrappedKey`: the envelope's symmetric key re-wrapped to the caller's per-request `receiverPublicKey`, never plaintext (`protocol.rs:50-72`).
- `POST /encryption/networks/<network_id>/revoke` — admin revoke (placeholder).

There is no `encrypt` route — its absence is the design.

## Mechanics

Every route first runs `verify_auth`: the [[invocation]]'s UCAN audience must equal the node's DID, then the node runs the normal [[invocation]] verification (`tinycloud.invoke`). Since Node 1.17.3 the decrypt route also applies the same [[policy-engine|Policy v3]] gate as `/invoke`, so a revoked or expired policy session cannot decrypt (`routes/encryption.rs:167`). Only after that does the service apply the encryption-specific check — `verify_network_admin_authorized(network_id, NETWORK_CREATE_ACTION | NETWORK_REVOKE_ACTION, …)` for management, or `decrypt_authorized(network_id, …)` for decrypt — which confirms the [[capabilities|capability]] names the right network + action. The wire request/result types are `tinycloud.encryption.decrypt/v1` and `tinycloud.encryption.decrypt-result/v1` (`protocol.rs`). The actual envelope mechanics (X25519 unwrap/rewrap, hash/nonce/TTL binding) are in [[user-bound-decrypt]]; the v1 key custody is `LocalOneOfOneBackend` with the reserved `Threshold` slot tracked in [[future/threshold-decryption]].

## Relationships

The service surface of [[encryption-networks]]; decrypt is the [[user-bound-decrypt|user-bound decrypt invocation]]; gated by `tinycloud.encryption/*` [[capabilities]] exercised via [[invocation]]; rooted at the owner [[dids|DID]] in the network URN; backs the network-encrypted mode of the [[vault]] service; full crypto context in [[encryption/overview]].

## Example

An owner POSTs `{ name: "default", ownerDid: "did:pkh:eip155:1:0xf39f…2266", threshold }` to `/encryption/networks`, holding a `tinycloud.encryption/network.create` [[capabilities|capability]]; the node verifies, runs `create_one_of_one_network`, and returns the `NetworkDescriptor`. A client later encrypts a blob *locally* to that network's public key, stores the envelope via [[kv]], and — holding `tinycloud.encryption/decrypt` over the network — POSTs the envelope with a fresh `receiverPublicKey` to `/encryption/networks/<id>/decrypt` and gets back `wrappedKey`, which only it can open. The node never held plaintext.

## Status & drift

In active development. `network.create`/`decrypt` ship with the `LocalOneOfOne` backend; `network.revoke` is a placeholder (state flip, no re-key); `Threshold`/`Dstack` backends are reserved. The decrypt-only stance (no encrypt API) is intentional, not missing. Raw top-level decrypt grants are enforced in production (TC-598); the SDK's storage and reuse of decrypt-only grants (TC-609) is in `@tinycloud` 3.1.0-beta.8, not stable 3.0.0. Code is canonical.

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `tinycloud-node-server/src/routes/encryption.rs` (routes, `verify_auth`, create/decrypt/revoke handlers; `:167` policy gate on decrypt), `tinycloud-core/src/encryption_network/protocol.rs:50-72` (`DecryptResponseBody.wrappedKey`), `:17-22` (`DECRYPT_ACTION`, `NETWORK_CREATE_ACTION`, `NETWORK_REVOKE_ACTION`, wire type constants), `tinycloud-core/src/encryption_network/service.rs` (`EncryptionService`, `verify_network_admin_authorized`, `decrypt_authorized`)
