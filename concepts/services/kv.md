---
type: concept
title: Key-Value Service
description: The kv service — a per-space, content-addressed key-value blob store, exercised by the tinycloud.kv/* abilities and the most complete service surface in the node. An ordered change feed (tinycloud.kv/sync) is on main, not yet deployed.
status: shipped
layer: protocol
resource: "tinycloud.kv/{action}"
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/models/current_kv.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/models/kv_write.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/mod.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/signed_urls.rs@05c6a93
  - repo: tinycloud-node
    path: CHANGELOG.md@05c6a93
  - repo: tinycloud-node
    path: docs/kv-sync.md@d7f511f
  - repo: js-sdk
    path: packages/sdk-services/src/kv/KVService.ts@d43e51ea
tags: [service, kv, storage]
timestamp: 2026-10-05
---

# Key-Value Service

The **kv service** is a per-[[autonomic-space|space]] key-value store: it maps a path (the resource path of a [[uri-addressing-grammar|`tinycloud:` URI]]) to an opaque content-addressed blob, gated entirely by the `tinycloud.kv/{action}` ability set. It is the most complete and most exercised [[services|service]] in the node — every other system space (`default`, `public`, `account`, `secrets`) is, at bottom, kv keys under a space.

## Role

The kv service lives in [[architecture-layers|Layer 1]]. It is the default data plane of a [[autonomic-space|space]]: the [[capabilities|capability]] `tinycloud.kv/put` over `…:default/kv/notes/` is what an agent invokes to write a blob, and the node performs the write only if the [[invocation]] chain authorizes it. Values are content-addressed: the bytes are stored by their hash in the [[blob-store]] and indexed by `(space, key)` in the [[metadata-db|metadata DB]], so the same authority model ([[delegation]] → [[invocation]] → [[attenuation]]) that protects every resource protects every key without a per-key ACL.

## Shape

### Abilities

The kv ability namespace is `tinycloud.kv/{action}`, dispatched in `SpaceDatabase::invoke` (`tinycloud-core/src/db.rs:1646` @05c6a93). The matcher keys on `(space, "kv", "tinycloud.kv/{action}", path)`:

| Ability | Effect | Outcome (`db.rs`) |
|---|---|---|
| `tinycloud.kv/put` | Stage + persist a blob at `path` | `InvocationOutcome::KvWrite` |
| `tinycloud.kv/get` | Read the blob (+ metadata) at `path` | `KvRead` |
| `tinycloud.kv/del` | Delete the key at `path` (logical delete) | `KvDelete` |
| `tinycloud.kv/list` | List keys under the `path` prefix | `KvList` |
| `tinycloud.kv/metadata` | Fetch metadata only (HEAD) | `KvMetadata` |

`tinycloud.kv/delete` is accepted as an alias of `tinycloud.kv/del`: the matcher resolves deprecated aliases to the canonical action before dispatch, so both spellings behave identically (`db.rs:1814`; `capabilities.json` marks it `deprecated-alias`).

The resource half is `{spaceId}/kv/{path}` per the [[uri-addressing-grammar]]; the `kv` segment is the service, and everything after is the key. The full wire ability strings (`tinycloud.kv/put`, …) are the canonical form — the `kv/get` shorthand sometimes seen in prose is not what the matcher compares against.

### SDK surface

The client `IKVService` (`packages/sdk-services/src/kv/KVService.ts`) is the richest service client. Every method returns a `Result<T>` (no throws) and POSTs to `{host}/invoke`:

- `get<T>(key, opts)` — `tinycloud.kv/get`; parses JSON/text/binary by content-type.
- `put(key, value, opts)` — `tinycloud.kv/put`; binary values (`Blob`/`ArrayBuffer`/typed-array/Node `Buffer`) are sent as raw bytes so they round-trip byte-identically, strings as-is, everything else JSON.
- `batchPut(items, opts)` — many puts in **one** multi-resource invocation (`context.invokeAny`, `FormData` body, one part per key); rejects duplicate post-prefix keys; returns `{ written, count }`.
- `list(opts)` — `tinycloud.kv/list`; optional `removePrefix`.
- `delete(key, opts)` — `tinycloud.kv/del`.
- `head(key, opts)` — `tinycloud.kv/metadata`; returns headers (etag/content-type/last-modified/content-length) with no body.
- `createSignedReadUrl(key, opts)` — POSTs to `{host}/signed/kv` to mint a short-lived, capability-free read URL (see [[#signed-read-urls]]).
- `withPrefix(prefix)` — a prefix-scoped view (`PrefixedKVService`), the basis of app-private key isolation (`/app.{domain}/…`).

A full space reports writes as storage errors (`STORAGE_QUOTA_EXCEEDED` / `STORAGE_LIMIT_REACHED`); see [[quota]].

## Mechanics

### The put two-phase

`tinycloud.kv/put` is the only kv action with input bytes, so it is staged before commit (`db.rs:1822-1838`). For each put capability the node pulls the request body out of `InvocationInputs`, hashes it (`stage.hash()`), and records an `Operation::KvWrite { space, key, metadata, value: hash }`. The [[invocation]] is then verified and the metadata rows committed *inside one transaction*; only after verification passes does the node `storage.persist(space, stage)` the actual bytes to the [[blob-store]] (`db.rs:2021-2031`). So an unauthorized put never lands bytes.

Every write is appended as a `kv_write` row (`tinycloud-core/src/models/kv_write.rs`): primary key `(space, key, invocation)`, plus `seq`, `epoch`, `epoch_seq`, `value` (the content `Hash`), and `metadata`. Because the row is keyed by the invocation hash and ordered by `(epoch, epoch_seq, seq)`, kv history is an append-only, epoch-ordered log per space (see [[epochs-dag]]).

### Current state: the `current_kv` table

Reads do not scan that history. Since the `m20260724_010000_current_kv` migration the node keeps a **`current_kv`** table (`models/current_kv.rs`) with **one row per `(space, key)`**: the latest `invocation`, `seq`/`epoch`/`epoch_seq`, `value` hash, `metadata`, and a `deleted` flag. A delete leaves a **tombstone** (`deleted = true`) rather than removing the row.

- `get` looks up the key's `current_kv` row with `deleted = false` and streams the blob named by its `value` hash (`get_kv` / `get_kv_entity`, `db.rs:3272-3310`).
- `metadata` returns the same row's `Metadata` (content-type, size, etag) with no body — the node side of the SDK `head`.
- `list` returns the keys under a prefix from the same table; `x-tinycloud-limit` (1–1000) bounds a page (`routes/mod.rs:962-974`).
- `del` is **logical**: it records the delete and tombstones the key. Blobs are content-addressed and may be shared by other keys or retained history, so a delete does not remove bytes from the [[blob-store]] (`db.rs:2014-2020`).

### Conditional writes and ETags

Every value's ETag is its strong BLAKE3 content hash, `"blake3-<64 hex>"`. A put may carry `If-Match` with such an ETag to write only if the key still holds that value; anything other than a strong TinyCloud ETag is rejected with 400 (`parse_strong_blake3_etag`, `routes/mod.rs:685`).

### Signed read URLs

Beyond capability invocation, the node can mint a **signed KV ticket** (`POST /signed/kv`): the caller proves a `tinycloud.kv/get` capability once, and the node returns `{ url, ticketId, expiresAt }` whose `GET /signed/kv/{ticket}` serves the blob with no further capability — a TTL-bounded, shareable read link. The node caps a ticket's lifetime at **300 seconds** (`max_ttl_seconds: 300`, `signed_urls.rs:42`). Since Node 1.17.3, minting applies the same [[policy-engine|Policy v3]] gate as `/invoke`, so a revoked or expired policy session cannot mint tickets either (`CHANGELOG.md`, 1.17.3).

### Public-space reads

A `public` [[system-spaces|system space]] is world-readable: `GET /public/{space_id}/kv/{key}` (and HEAD/list) serve kv blobs with **no** authorization (`routes/public.rs`, rate-limited), while writes still require the owner's `tinycloud.kv/put` capability. This is how `readPublicSpace` works from any client. Public spaces have their own default [[quota]] of 10 MiB.

### Storage quota

`put` (including multi-key batches) is the kv action that grows a space, so it is the one the node checks against the space's [[quota]]: 402 when the space is already full, 413 when one upload exceeds what is left. `get`, `list`, `metadata` and `del` are never refused for quota.

## Change feed (`tinycloud.kv/sync`) — in-progress

> **Status: in-progress.** Merged to tinycloud-node `main` (`d7f511f`); not in production Node 1.17.3 and not in the built 1.18.0. Part of the [[replication#local-read-replicas-in-progress|local read-replica]] work.

`tinycloud.kv/sync` is an **ordered, resumable, delete-aware feed of each key's latest state under one prefix**, meant for a device that keeps a local read replica (`docs/kv-sync.md` @d7f511f). Nodes that serve it advertise the feature `kv-sync-v1` in `/info` and `/version` (`routes/mod.rs:138` @d7f511f).

- **Invocation.** A `POST /invoke` carrying **exactly one** capability: `tinycloud.kv/sync` on `{space}/kv/{prefix}` with a non-empty prefix.
- **Never implied.** `tinycloud.kv/sync` and the companion `tinycloud.kv/retain` are never covered by `*` or `tinycloud.kv/*`; a grant must name them.
- **Paging.** `x-tinycloud-limit` and `x-tinycloud-cursor` request headers; omit the cursor to bootstrap. An optional `x-tinycloud-retention-grant` names a delegation carrying `tinycloud.kv/retain` on the prefix.
- **Response.** `{ changes, more, cursor, source, authority }`. Each change is a key with its latest ETag and metadata, or `deleted: true`; content is still fetched with `tinycloud.kv/get` and checked against the ETag.
- **Reset.** HTTP **410** (`RESET_REQUIRED`) tells the replica to discard its sync state and bootstrap again.

The same `main` work caps one invocation at **4096 KV mutations** (400 `TOO_MANY_MUTATIONS`). The SDK side, `kv.changes()`, ships in `@tinycloud/sdk-services` **3.1.0-beta.9**, not in stable 3.0.0.

## Relationships

Exercised by [[invocation|invocations]] of `tinycloud.kv/{action}` [[capabilities]]; its resource path obeys the [[uri-addressing-grammar]]; blobs land in the [[blob-store]] and the index (`kv_write` log + `current_kv` state) in the [[metadata-db]]; writes are ordered by the [[epochs-dag]] and feed [[hooks]]; writes are bounded by the space [[quota]]; the [[vault|vault service]] is built *on top of* kv (encrypted values under kv keys); `secrets` and `account` [[system-spaces|system spaces]] are kv key conventions; the change feed is the base of [[replication|local read replicas]]. Signed read URLs + the `public` space are the unauthenticated read paths.

## Example

An agent holding a [[capabilities|capability]] for ability `tinycloud.kv/get` over resource `tinycloud:pkh:eip155:1:0xf39f…2266:applications/kv/com.listen.app/transcript/` invokes `kv.get("com.listen.app/transcript/2026-06-23.json")`. The node verifies the chain, `extends`-checks the key against the granted prefix, reads the key's live `current_kv` row, and streams the blob from the [[blob-store]] — no account lookup, just the signature chain. (See [[example-listen]].)

## Status & drift

Shipped in production Node 1.17.3, including list paging headers, strong `If-Match` ETags, the 300 s signed-URL cap and the Policy v3 gate on `/signed/kv`. `tinycloud.kv/sync` / `tinycloud.kv/retain` are in-progress (node `main`, SDK beta). The whitepaper writes kv abilities loosely; the enforced strings are exactly `tinycloud.kv/{put,get,del,list,metadata}` plus the `delete` alias — code is canonical (see [[meta/contradictions]]). The per-delete `version` field is threaded through but unused (`TODO` in `get_kv`).

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `tinycloud-core/src/db.rs:1646` (`invoke`), `:1814` (alias resolution), `:1822-1846` (put staging, delete op), `:2003-2036` (list/del/put/metadata outcomes), `:3272-3310` (`get_kv`, `get_kv_entity` over `current_kv`); `tinycloud-core/src/models/current_kv.rs`, `models/kv_write.rs`, `migrations/m20260724_010000_current_kv.rs`; `tinycloud-node-server/src/routes/mod.rs:685` (strong ETag), `:962-974` (list paging headers); `tinycloud-node-server/src/signed_urls.rs:42` (300 s cap); `tinycloud-node-server/src/routes/public.rs` (public reads); `CHANGELOG.md` (1.17.3: `/signed/kv` policy gate)
- `tinycloud-node` @d7f511f (`main`, unreleased): `docs/kv-sync.md` (`tinycloud.kv/sync` wire contract), `tinycloud-node-server/src/routes/mod.rs:138` (`kv-sync-v1` feature)
- `js-sdk` @d43e51ea (stable 3.0.0): `packages/sdk-services/src/kv/KVService.ts` (`IKVService`, signed read URLs, `withPrefix`); `origin/master` (3.1.0 beta): `KVService.changes()`
