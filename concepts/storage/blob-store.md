---
type: concept
title: Blob Store
description: The content-addressed object store that holds every KV value as an immutable blob, keyed by SpaceId + content hash, backed by FileSystem or S3 (Either-combined).
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/storage/mod.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/storage/either.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/storage/file_system.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/storage/s3.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/hash.rs
tags: [storage, blobs, content-addressing]
timestamp: 2026-06-23
---

# Blob Store

The **blob store** is TinyCloud's content-addressed object store: it holds the raw bytes of every value a [[autonomic-space|space]] writes through the [[services|KV service]], each addressed by its own **content hash** and never by a mutable name. Blobs are immutable — a write `stage`s bytes, computes their [[#hashing|Blake3]] hash, and `persist`s them under `(SpaceId, hash)`; the [[metadata-db]] is what maps a human key to the hash of its current value. This is the block layer of `tinycloud-core`.

## Role

The blob store is [[architecture-layers|Layer 1]] infrastructure sitting *below* the authorization model: capability checks decide *whether* a [[invocation]] may read or write a key, and the blob store is where the resulting bytes physically live. The split is deliberate — the [[metadata-db]] holds small, ordered, replicable records (who wrote which key, when, pointing at which hash), while the blob store holds the large, dedup-friendly content. Because content is keyed by hash, two keys (or two spaces) holding identical bytes can share storage, and a value can be integrity-checked on read by re-hashing.

## Mechanics

### Trait stack

The store is defined by a set of narrow `async` traits in `tinycloud-core/src/storage/mod.rs`, every method of which is keyed by **`&SpaceId`** + **`&Hash`** — so the space is part of the physical address, giving each space its own content namespace:

- **`ImmutableReadStore`** — `contains`, `read` (returns `Content<Readable>`, an `AsyncRead` + length), and a default `read_to_vec`.
- **`ImmutableStaging`** — `get_staging_buffer` / `stage`, which wraps the writable in a `HashBuffer` that hashes bytes as they stream in.
- **`ImmutableWriteStore<S>`** — `persist` (returns the computed `Hash`) and `persist_keyed` (asserts the staged bytes hash to a caller-supplied `Hash`, else `KeyedWriteError::IncorrectHash`).
- **`ImmutableDeleteStore`** — `remove`.
- **`StoreSize`** — `total_size(space)` for quota accounting.
- **`StorageConfig<S>` / `StorageSetup`** — `open()` a configured store and `create(space)` its per-space container.

### Backends, `Either`-combined

Two production backends implement the stack, both in `tinycloud-node-server/src/storage/`:

- **`FileSystemStore`** (`file_system.rs`) — one file per blob at `{root}/{space.suffix()}/{space.name()}/{base64url(hash)}`. Staging uses a `TempFileSystemStage` (a `NamedTempFile` persisted into place once hashed). `create(space)` makes the per-space directory.
- **`S3BlockStore`** (`s3.rs`) — the AWS SDK backend, namespacing blobs by S3 key prefix.

These are unified by the **`Either<A, B>`** combinator (`storage/either.rs`): `Either` implements every storage trait by delegating to whichever arm is present, surfacing errors as `EitherError<A, B>`. The server pins the concrete type aliases (`tinycloud-node-server/src/lib.rs:65-67`):

```rust
pub type BlockStores = Either<S3BlockStore, FileSystemStore>;
pub type BlockConfig = Either<S3BlockConfig, FileSystemConfig>;
pub type BlockStage  = Either<TempFileSystemStage, MemoryStaging>;
```

so the node is generic over storage and the deployment chooses S3 vs. local (config `BlockStorage::S3 | Local`) and the staging area (`StagingStorage::FileSystem | Memory`) without any code change. A `MemoryStore` (`storage/memory.rs`) implements the same traits for tests.

### Hashing

Content hashes are **Blake3-256** (`tinycloud-core/src/hash.rs`): `hash(data)` returns a `Hash(Multihash<64>)`, and `Hash::to_cid(codec)` lifts it to a CIDv1 (raw codec `0x55`, or DAG-CBOR `0x71`) — the same hashing that anchors the [[epochs-dag|event DAG]]. The HTTP layer surfaces this as a `blake3-…` etag (`auth_guards.rs`). Because the store is content-addressed, the persisted hash *is* the integrity proof: `persist_keyed` rejects bytes that do not match the expected `Hash`.

## Shape

The physical key of any blob is the pair **`(SpaceId, Hash)`**. On the filesystem backend that materializes as the path:

```
{block_root}/{did-suffix}/{space-name}/{base64url(blake3-256 multihash)}
```

e.g. `…/pkh:eip155:1:0xf39f…2266/default/{base64url-hash}`. The value half of a `kv_write` row in the [[metadata-db]] is exactly this `Hash`, and `get_kv` resolves a key by reading the latest `kv_write` (see [[conflict-resolution]]) then streaming `store.read(space, value_hash)`.

## Relationships

Stores the bytes that the [[services|KV service]] reads and writes; addressed per [[autonomic-space|space]] (`SpaceId`) so spaces share a content namespace by hash; its hashes are the `value` fields of `kv_write` records in the [[metadata-db]] and feed the [[epochs-dag|epoch DAG]] CIDs; backend choice (FS/S3) is wired via the `Either` combinator; size feeds [[services|quota]]. Distinct from the [[per-space-sql|SQL service]], which keeps its own on-disk database files rather than content-addressed blobs.

## Example

A `tinycloud.kv/put` of `photo.jpg` under `…:default/kv/`: the node `stage`s the upload, the `HashBuffer` computes Blake3 hash `H`, `persist` writes the bytes to `…/pkh:eip155:1:0x…/default/{base64url(H)}`, and a `kv_write` row is recorded in the [[metadata-db]] mapping key `photo.jpg` → `value = H`. A later `tinycloud.kv/get` looks up the latest non-deleted `kv_write` for that key, gets `H`, and streams it back from the blob store. (See [[uri-addressing-grammar]] for the resource string.)

## Status & drift

Shipped. Note there is **no libp2p/IPFS block exchange** in the compiled path despite the CID-based addressing — `libp2p` is used only for ed25519 / `PeerId` identity (`keys.rs`), and cross-node block transfer belongs to the not-yet-mounted [[replication]] subsystem. So "content-addressed" here means local integrity + dedup, not a networked DHT. See [[meta/contradictions]] and [[future/replication-and-discovery]].

## Sources
- `tinycloud-node`: `tinycloud-core/src/storage/mod.rs` (trait stack), `tinycloud-core/src/storage/either.rs` (`Either`/`EitherError`), `tinycloud-node-server/src/storage/file_system.rs` (`FileSystemStore`, `get_path`), `tinycloud-node-server/src/storage/s3.rs` (`S3BlockStore`), `tinycloud-node-server/src/lib.rs:65-67` (`BlockStores` aliases), `tinycloud-core/src/hash.rs` (Blake3-256 `Hash`/`to_cid`)
