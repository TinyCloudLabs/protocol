---
type: concept
title: Metadata DB
description: The relational database that records all capability and KV metadata — delegations, invocations, revocations, the epoch/event ordering, and key→hash mappings — via SeaORM over SQLite (default), Postgres, or MySQL.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/models/mod.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/migrations/mod.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/lib.rs
tags: [storage, metadata, seaorm, database]
timestamp: 2026-06-23
---

# Metadata DB

The **metadata DB** is the relational store that records everything *about* a [[autonomic-space|space]] except the blob bytes themselves: every [[delegation]], [[invocation]] and [[revocation]] event, the [[epochs-dag|epoch/event ordering]] that sequences them, and the `kv_write`/`kv_delete` rows that map a key to the [[blob-store|content hash]] of its current value. It is a single SeaORM database — SQLite by default, Postgres or MySQL by feature — shared across all spaces hosted by a node, with the `SpaceId` as part of the primary key on every per-space table.

## Role

This is the [[architecture-layers|Layer 1]] system of record. The [[blob-store]] holds opaque content; the metadata DB holds the *authorization and ordering facts* a node needs to answer "may this [[capabilities|capability]] act, and what is the current value of this key?" without consulting any external service. Capability verification (`models/delegation.rs`, `models/invocation.rs`) reads parent delegations, abilities, and time-bounds from here; KV reads resolve the latest write from here (see [[conflict-resolution]]). Because these records are small, ordered, and content-hashed, they are also the unit that [[replication]] is designed to sync — distinct from the bulk-content [[blob-store]].

## Mechanics

### SeaORM over three backends

Models live in `tinycloud-core/src/models/*` (one `DeriveEntityModel` per table) and are driven by SeaORM, which abstracts the SQL dialect. The backend is chosen by `tinycloud-core` Cargo features `sqlite | postgres | mysql`. The server resolves the connection string from config and tunes it (`tinycloud-node-server/src/lib.rs:192-210`):

- **SQLite (default)** — `max_connections(1)` (a single connection serializing writes, because two concurrent DEFERRED transactions deadlock on writer upgrade) plus **WAL** journal mode and a 5 s busy-timeout so reads stay concurrent.
- **Postgres / MySQL** — `max_connections(100)`.

The `SpaceDatabase` (`db.rs`) wraps the `DatabaseConnection` together with the [[blob-store]] handle and the per-space key source, and optionally a [[services|column-encryption]] key (`with_encryption`) used to encrypt sensitive serialized columns at rest.

### Tables

The schema is built by an ordered migration sequence (`migrations/mod.rs`):

1. `init_tables` — `space`, `delegation`, `invocation`, `revocation`, `actor`, `abilities`, `kv_write`, `kv_delete`, `epoch`, `event_order`, `epoch_order`, `invoked_abilities`, `parent_delegations`.
2. `sql_database`, `hook_tables`, `signed_kv_tickets`, `database_artifacts`, `encryption_networks`, `rename_encryption_owner_did` — adding the [[per-space-sql|SQL]], hooks, signed-URL, [[per-space-sql|artifact]], and encryption-network tables.

Three groups matter for the protocol:

- **Authorization** — `space` (PK `SpaceIdWrap`, the space's root identity), `delegation`/`invocation`/`revocation` (the signed [[capabilities|capability]] events, hashed by content), `abilities` + `invoked_abilities` + `parent_delegations` (the relationship rows that let verification walk a [[delegation]] chain by parent CID).
- **Ordering** — `epoch`, `event_order`, `epoch_order`: the [[epochs-dag|epoch DAG]] that totally-orders events within a space (`seq, epoch, epoch_seq`).
- **KV index** — `kv_write` and `kv_delete`: each `kv_write` carries `(space, key, invocation, seq, epoch, epoch_seq, value: Hash, metadata)`; `value` is the [[blob-store]] content hash, and the `seq/epoch/epoch_seq` columns are what make reads [[conflict-resolution|last-writer-wins]].

## Shape

Every per-space table embeds the space in its primary key via the `SpaceIdWrap` newtype (`tinycloud-core/src/types/space_id_wrap.rs`), e.g. the `kv_write` model:

```rust
#[sea_orm(table_name = "kv_write")]
pub struct Model {
    #[sea_orm(primary_key)] pub space: SpaceIdWrap,
    #[sea_orm(primary_key)] pub key: Path,
    #[sea_orm(primary_key)] pub invocation: Hash,
    pub seq: i64, pub epoch: Hash, pub epoch_seq: i64,
    pub value: Hash,        // → blob-store content hash
    pub metadata: Metadata,
}
```

Events (delegations/invocations/revocations) are keyed by their **content `Hash`**, so re-inserting an identical signed event is idempotent (on-conflict-do-nothing on the hash PK).

## Relationships

Records the [[capabilities|capability]] events ([[delegation]]/[[invocation]]/[[revocation]]) that authorization verification reads; holds the [[epochs-dag|epoch/event ordering]] tables; indexes KV keys to [[blob-store]] content hashes; its rows are resolved [[conflict-resolution|last-writer-wins]] on read; is the replicable record set targeted by [[replication]]; distinct from the [[per-space-sql|per-space SQL databases]], which are separate on-disk files (the metadata DB only stores their *artifacts* and pointers). Sensitive columns may be encrypted via the [[services|column-encryption]] key.

## Example

A `/delegate` request inserts one `delegation` row (keyed by the event hash) plus `abilities` and `parent_delegations` rows; a later `tinycloud.kv/put` `/invoke` inserts an `invocation` row, advances the space's [[epochs-dag|epoch]] (`epoch` + `event_order` + `epoch_order` rows), and writes a `kv_write` row whose `value` is the new [[blob-store]] hash. A subsequent `tinycloud.kv/get` reads only the metadata DB to find the latest `kv_write`, then streams the blob.

## Status & drift

Shipped. SQLite is the default and the common single-node deployment; Postgres/MySQL are feature-gated for larger deployments. One subtlety: in `app()` the `with_encryption` column key is currently the **webhook-secrets-derived** key reused for delegation/invocation column encryption (`lib.rs:235`) — whether that context reuse is intentional vs. a dedicated context is an open question, not user-facing. See [[meta/contradictions]].

## Sources
- `tinycloud-node`: `tinycloud-core/src/db.rs` (`SpaceDatabase`, `transact`, KV read/write), `tinycloud-core/src/models/*` (entity models), `tinycloud-core/src/migrations/mod.rs` (migration sequence + table set), `tinycloud-node-server/src/lib.rs:192-210` (connection wiring, SQLite single-conn/WAL, Postgres/MySQL pool)
