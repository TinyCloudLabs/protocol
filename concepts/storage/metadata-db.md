---
type: concept
title: Metadata DB
description: The relational database that records all capability and KV metadata — delegations, invocations, revocations, the epoch/event ordering, the KV write log and current key state — via SeaORM over SQLite (default), Postgres, or MySQL.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/models/mod.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/migrations/mod.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/lib.rs@05c6a93
tags: [storage, metadata, seaorm, database]
timestamp: 2026-10-05
---

# Metadata DB

The **metadata DB** is the relational store that records everything *about* a [[autonomic-space|space]] except the blob bytes themselves: every [[delegation]], [[invocation]] and [[revocation]] event, the [[epochs-dag|epoch/event ordering]] that sequences them, the `kv_write`/`kv_delete` history, and the `current_kv` table that maps each key to the [[blob-store|content hash]] of its current value. It is a single SeaORM database — SQLite by default, Postgres or MySQL by feature — shared across all spaces hosted by a node, with the `SpaceId` as part of the primary key on every per-space table.

## Role

This is the [[architecture-layers|Layer 1]] system of record. The [[blob-store]] holds opaque content; the metadata DB holds the *authorization and ordering facts* a node needs to answer "may this [[capabilities|capability]] act, and what is the current value of this key?" without consulting any external service. Capability verification (`models/delegation.rs`, `models/invocation.rs`) reads parent delegations, abilities, and time-bounds from here; KV reads resolve a key's current value from `current_kv` here. Because these records are small, ordered, and content-hashed, they are also what a future multi-host [[replication]] design would sync — distinct from the bulk-content [[blob-store]].

## Mechanics

### SeaORM over three backends

Models live in `tinycloud-core/src/models/*` (one `DeriveEntityModel` per table) and are driven by SeaORM, which abstracts the SQL dialect. The backend is chosen by `tinycloud-core` Cargo features `sqlite | postgres | mysql`. The server resolves the connection string from config and tunes it (`tinycloud-node-server/src/lib.rs:189-215, 380-390`):

- **SQLite (default)** — a pool of up to 16 connections in **WAL** journal mode with a 5 s busy-timeout, so reads proceed concurrently while the core's shared writer lock serializes mutations.
- **Postgres / MySQL** — `max_connections` from config (`database.max_connections`, default 100).

The `SpaceDatabase` (`db.rs`) wraps the `DatabaseConnection` together with the [[blob-store]] handle and the per-space key source, and optionally a [[services|column-encryption]] key (`with_encryption`) used to encrypt sensitive serialized columns at rest.

### Tables

The schema is built by an ordered migration sequence (`migrations/mod.rs`):

1. `init_tables` — `space`, `delegation`, `invocation`, `revocation`, `actor`, `abilities`, `kv_write`, `kv_delete`, `epoch`, `event_order`, `epoch_order`, `invoked_abilities`, `parent_delegations`.
2. `sql_database`, `hook_tables`, `signed_kv_tickets`, `database_artifacts`, `encryption_networks`, `rename_encryption_owner_did` — adding the [[per-space-sql|SQL]], hooks, signed-URL, [[per-space-sql|artifact]], and encryption-network tables.
3. `policy_authority`, `revocation_timestamp`, `share_email_protocol` (+ `share_policy_presentation_jti`, `policy_status_freshness`), `database_artifact_deltas`, `invocation_replay`, **`current_kv`**, `request_path_indexes`, `owner_share_policy` (+ `_proof`, `_enforcement_bytes`), `policy_v3`, `meeting_legacy_write_guard` — adding [[policy-engine|policy]] and sharing state, SQL artifact deltas, invocation replay records, the current-KV-state table, and request-path indexes.

Three groups matter for the protocol:

- **Authorization** — `space` (PK `SpaceIdWrap`, the space's root identity), `delegation`/`invocation`/`revocation` (the signed [[capabilities|capability]] events, hashed by content), `abilities` + `invoked_abilities` + `parent_delegations` (the relationship rows that let verification walk a [[delegation]] chain by parent CID).
- **Ordering** — `epoch`, `event_order`, `epoch_order`: the [[epochs-dag|epoch DAG]] that totally-orders events within a space (`seq, epoch, epoch_seq`).
- **KV index** — `kv_write` and `kv_delete` are the append-only history: each `kv_write` carries `(space, key, invocation, seq, epoch, epoch_seq, value: Hash, metadata)`, where `value` is the [[blob-store]] content hash. `current_kv` (migration `m20260724_010000_current_kv`) is the read model: one row per `(space, key)` holding the latest write's fields plus a `deleted` tombstone flag. `get`, `metadata` and `list` read `current_kv` (`db.rs:3272-3310`).

## Shape

Every per-space table embeds the space in its primary key via the `SpaceIdWrap` newtype (`tinycloud-core/src/types/space_id_wrap.rs`), e.g. the `kv_write` history model:

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

`current_kv` has the same columns minus `invocation` in the key — its primary key is just `(space, key)` — plus `deleted: bool`.

Events (delegations/invocations/revocations) are keyed by their **content `Hash`**, so re-inserting an identical signed event is idempotent (on-conflict-do-nothing on the hash PK).

## Relationships

Records the [[capabilities|capability]] events ([[delegation]]/[[invocation]]/[[revocation]]) that authorization verification reads; holds the [[epochs-dag|epoch/event ordering]] tables; indexes KV keys to [[blob-store]] content hashes (history in `kv_write`, current state in `current_kv`); is the record set a future multi-host [[replication]] would sync; its SQL/DuckDB artifact sizes count toward the space [[quota]]; distinct from the [[per-space-sql|per-space SQL databases]], which are separate on-disk files (the metadata DB only stores their *artifacts* and pointers). Sensitive columns may be encrypted via the [[services|column-encryption]] key.

## Example

A `/delegate` request inserts one `delegation` row (keyed by the event hash) plus `abilities` and `parent_delegations` rows; a later `tinycloud.kv/put` `/invoke` inserts an `invocation` row, advances the space's [[epochs-dag|epoch]] (`epoch` + `event_order` + `epoch_order` rows), writes a `kv_write` row whose `value` is the new [[blob-store]] hash, and upserts the key's `current_kv` row. A subsequent `tinycloud.kv/get` reads the key's `current_kv` row from the metadata DB, then streams the blob.

## Status & drift

Shipped in Node 1.17.3. SQLite is the default and the common single-node deployment; Postgres/MySQL are feature-gated for larger deployments.

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `tinycloud-core/src/db.rs` (`SpaceDatabase`, `transact`, KV read/write; `:3272-3310` `current_kv` reads), `tinycloud-core/src/models/*` (entity models incl. `current_kv.rs`), `tinycloud-core/src/migrations/mod.rs` (migration sequence + table set), `tinycloud-node-server/src/lib.rs:189-215, 380-390` (connection wiring, SQLite pool/WAL, Postgres/MySQL pool), `:325-326, :431` (column-encryption key)
