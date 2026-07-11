---
type: concept
title: Encryption Networks
description: An encryption network is an owner-scoped X25519 key custodied by a node so clients can encrypt locally to a public key while decryption stays capability-gated — the node unwraps and rewraps key material but never sees plaintext.
status: in-progress
layer: protocol
resource: "urn:tinycloud:encryption:{ownerDid}:{name}"
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/backend.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/types.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/network_id.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/service.rs
  - repo: js-sdk
    path: packages/sdk-services/src/encryption/networkId.ts
  - repo: js-sdk
    path: packages/sdk-services/src/encryption/envelope.ts
tags: [encryption, networks, x25519]
timestamp: 2026-06-23
---

# Encryption Networks

An **encryption network** is an owner-scoped X25519 keypair that a [[nodes|node]] custodies on behalf of a [[dids|principal]]: clients encrypt **locally** to the network's public key, the node holds the private half sealed at rest, and decryption is a separate **[[user-bound-decrypt|capability-gated invocation]]** in which the node unwraps a wrapped symmetric key and immediately rewraps it to a one-time receiver key — so the node moves key material but **never sees plaintext**. It is identified by the URN `urn:tinycloud:encryption:{ownerDid}:{name}` and, in v1, is realized by the single shipped backend `LocalOneOfOneBackend` (`n=1, t=1`).

## Role

Encryption networks live in [[architecture-layers|Layer 1]]. They are the user-facing encryption primitive, distinct from [[at-rest|at-rest encryption]] (which protects columns the node itself owns). The module "deliberately does not expose a node-side encrypt API — clients encrypt to the network public key locally" (`encryption_network/mod.rs`), which is what keeps plaintext off the node entirely. A network is **[[user-bound-decrypt|user-bound, not space-bound]]**: it is rooted at an `ownerDid`, can hold key custody across many spaces, and its lifecycle (create/revoke) is owner-only. The reserved `KeyBackendKind::Threshold` slot is where [[threshold-decryption|threshold decryption]] will later split this custody across a cohort.

## Shape

### Network identifier

The network URN is parsed by `NetworkId` (`encryption_network/network_id.rs`):

```
urn:tinycloud:encryption:<ownerDid>:<name>
```

- `<ownerDid>` is the **root authority** for the network and may itself contain colons (e.g. `did:key:z6Mk…`), so the parser splits on the **last** `:` — everything before is the owner DID, the final segment is `name` (`network_id.rs:rsplit_once(':')`).
- `<name>` may not contain `:` or `/`. The SDK additionally constrains it to `^[a-z0-9][a-z0-9-]*$` (`networkId.ts:NETWORK_NAME_RE`).
- The owner DID is run through `canonicalize_principal`, so a `did:pkh:eip155` URN round-trips with a checksummed address (test at `network_id.rs:155-168`). This URN is a `Resource::Other` form, **not** a space URI — see [[uri-addressing-grammar]].

### Algorithm and envelope

The ciphersuite is the constant `ALG_X25519_AES256GCM = "x25519-aes256gcm/v1"` (`types.rs`). Data is persisted in an `InlineEnvelope` carried alongside KV/SQL records (`types.rs:131-155`):

```rust
struct InlineEnvelope {
    v: u32,
    networkId: NetworkId,
    alg: String,
    keyVersion: i64,
    encryptedSymmetricKey: Vec<u8>,      // symmetric key sealed to the network public key
    encryptedSymmetricKeyHash: String,
    ciphertext: Vec<u8>,                 // AES-256-GCM payload (client-encrypted)
    aad: Vec<u8>,                        // app-bound AAD; the node never reads it
    metadata: Map<String, Value>,
}
```

### Network descriptor

The public state of a network is `NetworkDescriptor` (`types.rs:96-117`): `networkId`, `ownerDid`, `name`, `members` (node DIDs in custody), `threshold {n, t}`, `state`, `publicEncryptionKey`, `alg`, `keyVersion`, `keyBackend`. Lifecycle states are `Pending → Generating → Active` (plus `Rotating`/`Revoked`/`Failed`); v1 creation jumps straight to `Active`. The `threshold` field is "preserved in the data shape so callers can distinguish V1 from future threshold deployments at parse time" — it is `{n:1, t:1}` today.

## Mechanics

### Local encrypt (client side)

`encryptToNetwork` (`js-sdk envelope.ts`) is fully local and never contacts the node to encrypt: it (1) generates a fresh 32-byte symmetric key, (2) AES-256-GCM-encrypts the payload under that key (optionally with AAD), (3) **wraps** the symmetric key to the discovered network public key via `sealToNetworkKey`, and (4) emits the `InlineEnvelope` with the wrapped key plus its hash. The raw symmetric key is returned only "for caller bookkeeping; do NOT persist."

### ECIES wrap

Wrapping (`backend.rs:wrap_to_public_key`) is X25519 ECIES with AES-256-GCM as the AEAD: generate an ephemeral X25519 keypair, Diffie-Hellman against the recipient public key, key an AES-256-GCM cipher (`ColumnEncryption::new(shared)` — the same AEAD as [[at-rest|at-rest encryption]]) with the shared secret, and emit `ephemeral_pub(32B) || AES-256-GCM(plaintext)`. Unwrapping reverses this: read the peer's ephemeral key off the front, DH against the network secret, and AES-256-GCM-decrypt the remainder.

### Key custody — `LocalOneOfOneBackend`

V1 ships exactly one `KeyBackend`, `LocalOneOfOneBackend` (`backend.rs`). `generate()` produces an X25519 `StaticSecret`, returns the public key, and **seals the private key** with a `ColumnEncryption` derived from `b"tinycloud/encryption/network-seal"` — the same at-rest mechanism used for other sensitive DB columns (in DStack mode this seal is rooted in [[tee-dstack|TEE]] key management; see [[at-rest#status--drift]]). The sealed private key lives in the `encryption_network` row. The trait exposes only `generate`, `unwrap` (sealed private key + wrapped key → raw symmetric key), and `rewrap` (symmetric key + receiver public key → re-sealed key); "higher-level code is responsible for never persisting the raw symmetric key," and the design note for future backends is that they "must avoid ever assembling the full network private key."

### Node unwrap/rewrap (never plaintext)

The node never decrypts the *payload*. On a verified [[user-bound-decrypt|decrypt invocation]], it loads the sealed private key, `unwrap`s the `encryptedSymmetricKey` to the raw symmetric key, then immediately `rewrap`s that key to the caller's **per-request `receiverPublicKey`** and returns only the rewrapped key (`service.rs:570-573`). The transient symmetric key is dropped. The client then DH-unwraps it with its ephemeral receiver secret and AES-256-GCM-decrypts the ciphertext locally (`envelope.ts:decryptEnvelopeWithKey`). So the node sees ciphertext-shaped key material on both sides and never the plaintext.

## Relationships

Identified by a `NetworkId` URN (a [[uri-addressing-grammar|Resource::Other]] form, not a space URI); decryption against it is a [[user-bound-decrypt|user-bound, capability-gated invocation]] checked against a [[capabilities|capability]] chain rooted at the `ownerDid`; reuses the [[at-rest]] `ColumnEncryption` AEAD for both the ECIES wrap and sealing the private key at rest; published for discovery via the `.well-known/encryption/network/<name>` record ([[system-spaces]]); the reserved `Threshold` backend is the seed of [[threshold-decryption]]; one mechanism of the encryption [[overview]].

## Example

A network `urn:tinycloud:encryption:did:pkh:eip155:1:0xf39F…2266:default` is created (`POST /encryption/networks`, owner-authorized), running a one-of-one ceremony that lands the network `Active` with a published X25519 public key. A client encrypts a note: it generates a symmetric key, AES-256-GCM-encrypts the note, wraps the symmetric key to that public key, and stores the `InlineEnvelope` (`v`, `networkId`, `alg = x25519-aes256gcm/v1`, `keyVersion = 1`, `encryptedSymmetricKey`, hash, `ciphertext`) alongside the KV record. To read it back later, the client runs a [[user-bound-decrypt|decrypt invocation]] and the node rewraps the symmetric key to a fresh receiver key — the note's plaintext never leaves the client.

## Status & drift

In-progress. `LocalOneOfOneBackend` (`n=1, t=1`), creation, descriptor, `.well-known` discovery, and the decrypt invocation path are implemented and tested in `encryption_network/`. The `Dstack` backend kind exists; the `Threshold` kind is reserved but "not implemented in v1" (see [[threshold-decryption]]). `NetworkState` enumerates `Rotating` but v1 documents transitions only as `Pending → Generating → Active`, and creation goes straight to `Active`. Key rotation/`keyVersion` bump beyond `1` is modeled in the data shapes but not exercised in v1. The decrypt invocation envelope is "intentionally a self-contained envelope, not the existing TinyCloud CACAO/UCAN invocation" — see [[user-bound-decrypt]] for the two verification paths. Code is canonical.

## Sources
- `tinycloud-node`: `encryption_network/mod.rs` (no node-side encrypt API), `encryption_network/backend.rs` (`KeyBackend`, `LocalOneOfOneBackend`, `wrap_to_public_key`/ECIES, seal-at-rest), `encryption_network/types.rs` (`ALG_X25519_AES256GCM`, `InlineEnvelope`, `NetworkDescriptor`, `NetworkState`, `KeyBackendKind`, `Threshold`), `encryption_network/network_id.rs` (`NetworkId` URN parse), `encryption_network/service.rs:154-245,570-573` (create + unwrap/rewrap)
- `js-sdk`: `packages/sdk-services/src/encryption/networkId.ts` (URN grammar, `NETWORK_NAME_RE`), `packages/sdk-services/src/encryption/envelope.ts` (`encryptToNetwork`, local wrap/decrypt)
