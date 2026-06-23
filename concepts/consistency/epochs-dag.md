---
type: concept
title: Epochs & DAG
description: The per-space, hash-linked DAG of epochs that totally-orders every authorization and KV event — each epoch a DAG-CBOR object hashed over its parent epoch CIDs and member events, giving each space a verifiable, content-addressed event history.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/events/mod.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/relationships/epoch_order.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/relationships/event_order.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs
tags: [consistency, dag, epochs, ipld, dag-cbor]
timestamp: 2026-06-23
---

# Epochs & DAG

Every state-changing event in a [[autonomic-space|space]] — each [[delegation]], [[invocation]], and [[revocation]], plus the KV operations an invocation performs — is recorded into a per-space, **hash-linked DAG of epochs**. An **epoch** is a batch of events committed together; it is serialized as a **DAG-CBOR** object over (a) the CIDs of its **parent epochs** and (b) the CIDs of its **member events**, then hashed — so the epoch's own ID is a [[blob-store|Blake3]] CID that commits to its entire content and ancestry. Walking the `parent → child` links of these epochs reconstructs the complete, verifiable history of the space, and the sequence numbers assigned along the way give every event a total order. **This ordering is compiled and live** (it runs on every `/delegate` and `/invoke`); the *cross-node* exchange of these epochs is the unmounted [[replication]] subsystem.

## Role

The epoch DAG is the [[architecture-layers|Layer 1]] consistency backbone. Authorization is a graph problem — a [[capabilities|capability]] is valid only relative to the delegations that precede it — and the epoch DAG is the per-space append-only log that fixes "what happened, in what order." It is what makes a space's history *content-addressed and tamper-evident*: change any past event and every descendant epoch CID changes. Concretely, it supplies the `(seq, epoch, epoch_seq)` ordering that the [[metadata-db]] stamps onto each `kv_write`, which is exactly the key [[conflict-resolution|last-writer-wins]] reads sort on.

## Mechanics

### What an epoch hashes over

`epoch_hash(space, events, parents)` (`tinycloud-core/src/events/mod.rs`) builds and hashes a DAG-CBOR `Epoch { parents: Vec<Cid>, events: Vec<OneOrMany> }`:

- **parents** — each prior head epoch's `Hash` lifted to a CID with the **DAG-CBOR codec `0x71`** (`h.to_cid(0x71)`).
- **events** — one entry per event:
  - a **Delegation** or **Revocation** is `OneOrMany::One(hash.to_cid(0x55))` (raw codec `0x55`).
  - an **Invocation** is expanded by `hash_inv`: the invocation's raw CID, plus — if it carried KV `Operation`s for this space — one DAG-CBOR CID per operation (each `KvWrite { key, value: Cid, metadata }` / `KvDelete { key, version }` hashed individually, value hashes lifted with codec `0x71`). With ops it becomes `OneOrMany::Many([inv_cid, op_cid…])`; without, `OneOrMany::One(inv_cid)`.

The serialized object is hashed with `hash(...)` (Blake3-256). So an epoch CID commits to its parents *and* the exact set + content of its events, including each KV mutation — IPLD all the way down.

### How epochs are appended (`transact`)

On each transaction (`db.rs:781`, `transact`), for every space touched:

1. Find the current **heads** — epochs with no child in `epoch_order` (`epoch_order::Column::Child.is_null()`, `db.rs:906-926`). These become the new epoch's `parents` (a space can have multiple heads → the structure is a DAG, not a chain).
2. Find the space's max event `seq` and set the new batch's `seq = max + 1` (`db.rs:890-903`, `934`).
3. Compute `epoch = epoch_hash(space, events, parents)` (`db.rs:933`).
4. Persist: an `epoch` row `{ seq, id: epoch, space }`; an `epoch_order` row `{ parent, child: epoch, space }` per parent (linking the DAG); and an `event_order` row per event `{ event, space, seq, epoch, epoch_seq: index-in-epoch }` (`db.rs:939-996`, inserted `db.rs:999-1025`).

### The ordering tables

Three SeaORM models in `tinycloud-core/src/relationships/` (all keyed by `space: SpaceIdWrap`):

- **`epoch`** — `{ seq, id: Hash, space }`; the DAG nodes.
- **`epoch_order`** — `{ parent: Hash, child: Hash, space }`; the **hash links** (edges). A head epoch is one that appears as no row's `parent`'s child — i.e. has no outgoing child edge.
- **`event_order`** — `{ seq, epoch: Hash, epoch_seq, event: Hash, space }`; places each event at position `epoch_seq` within epoch `epoch`, under batch number `seq`. This `(seq, epoch, epoch_seq)` triple is the **total order**, copied verbatim into every `kv_write`/`kv_delete` row.

## Shape

The hashed object (DAG-CBOR, then Blake3-256 → CIDv1):

```rust
struct Epoch { parents: Vec<Cid>, events: Vec<OneOrMany> }   // OneOrMany = One(Cid) | Many(Vec<Cid>)
// parents: each head epoch hash .to_cid(0x71)   (DAG-CBOR)
// delegation/revocation event: hash .to_cid(0x55)  (raw)
// invocation event: One(inv.to_cid(0x55))  OR  Many([inv.to_cid(0x55), op_cids…])
const CBOR_CODEC: u64 = 0x71;   const RAW_CODEC: u64 = 0x55;
```

The ordering surfaces as the row triple `(seq: i64, epoch: Hash, epoch_seq: i64)`.

## Relationships

Orders the [[capabilities|capability]] events ([[delegation]]/[[invocation]]/[[revocation]]) and KV operations that the [[metadata-db]] stores; built on the same [[blob-store|Blake3 CID]] hashing (codecs raw `0x55` / DAG-CBOR `0x71`) used for content; supplies the `(seq, epoch, epoch_seq)` ordering that [[conflict-resolution]] sorts on for last-writer-wins; rooted per [[autonomic-space|space]]; designed to be exchanged between nodes by the (unmounted) [[replication]] subsystem; the content-addressed history that makes the space tamper-evident (see [[trust-model]]).

## Example

A space with head epoch `E0`. An owner submits a `tinycloud.kv/put photo.jpg` invocation. `transact` reads heads `[E0]`, sets `seq = E0.seq + 1`, and computes `E1 = epoch_hash(space, [put-invocation], [E0])` — DAG-CBOR over `parents:[E0.to_cid(0x71)]` and `events:[Many([inv.to_cid(0x55), kvwrite_op.to_cid(0x71)])]`, Blake3-hashed. It writes `epoch{E1}`, `epoch_order{parent:E0, child:E1}`, and `event_order{event:inv, epoch:E1, epoch_seq:0, seq}`. `E1` is now the sole head; the `kv_write` for `photo.jpg` carries `(seq, E1, 0)` — the ordering a later read uses to pick the latest value.

## Status & drift

**Shipped and compiled** — `events`, `relationships`, and `db.rs::transact` are all declared in `tinycloud-core/src/lib.rs` and run on every write. What is *not* compiled is the cross-node piece: `tinycloud-core/src/replication/` (which would gossip these epochs between peers) is not declared in `lib.rs`. So within a single node the DAG is fully real; multi-node convergence over it is the planned [[replication]] work. See [[future/replication-and-discovery]].

## Sources
- `tinycloud-node`: `tinycloud-core/src/events/mod.rs` (`epoch_hash`, `hash_inv`, `Epoch`/`OneOrMany`, codecs `0x71`/`0x55`), `tinycloud-core/src/relationships/epoch_order.rs` + `event_order.rs` (`epoch_order`/`event_order` models), `tinycloud-core/src/models/epoch.rs`, `tinycloud-core/src/db.rs:781-1025` (`transact`: heads via `epoch_order.Child.is_null()`, `seq`, epoch/order row construction)
