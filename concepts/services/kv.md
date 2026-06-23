---
type: concept
title: Key-Value Service
description: The kv service — a per-space, content-addressed key-value blob store, exercised by the tinycloud.kv/* abilities and the most complete service surface in the node.
status: shipped
layer: protocol
resource: "tinycloud.kv/{action}"
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/models/kv_write.rs
  - repo: js-sdk
    path: packages/sdk-services/src/kv/KVService.ts
tags: [service, kv, storage]
timestamp: 2026-06-23
---

# Key-Value Service

The **kv service** is a per-[[autonomic-space|space]] key-value store: it maps a path (the resource path of a [[uri-addressing-grammar|`tinycloud:` URI]]) to an opaque content-addressed blob, gated entirely by the `tinycloud.kv/{action}` ability set. It is the most complete and most exercised [[services|service]] in the node — every other system space (`default`, `public`, `account`, `secrets`) is, at bottom, kv keys under a space.

## Role

The kv service lives in [[architecture-layers|Layer 1]]. It is the default data plane of a [[autonomic-space|space]]: the [[capabilities|capability]] `tinycloud.kv/put` over `…:default/kv/notes/` is what an agent invokes to write a blob, and the node performs the write only if the [[invocation]] chain authorizes it. Reads and writes are content-addressed: the value is stored by its hash in the [[blob-store]] and indexed by `(space, key)` in the [[metadata-db|metadata DB]], so the same authority model ([[delegation]] → [[invocation]] → [[attenuation]]) that protects every resource protects every key without a per-key ACL.

## Shape

### Abilities

The kv ability namespace is `tinycloud.kv/{action}`, dispatched in `SpaceDatabase::invoke` (`tinycloud-core/src/db.rs:512`). The matcher keys on `(space, "kv", "tinycloud.kv/{action}", path)`:

| Ability | Effect | Outcome (`db.rs`) |
|---|---|---|
| `tinycloud.kv/put` | Stage + persist a blob at `path` | `InvocationOutcome::KvWrite` |
| `tinycloud.kv/get` | Read the blob (+ metadata) at `path` | `KvRead(Option<(Metadata, Hash, Content)>)` |
| `tinycloud.kv/del` | Delete the blob at `path` | `KvDelete` |
| `tinycloud.kv/list` | List keys under the `path` prefix | `KvList(Vec<Path>)` |
| `tinycloud.kv/metadata` | Fetch metadata only (HEAD) | `KvMetadata(Option<Metadata>)` |

The resource half is `{spaceId}/kv/{path}` per the [[uri-addressing-grammar]]; the `kv` segment is the service, and everything after is the key. The full wire ability strings (`tinycloud.kv/put`, …) are the canonical form — the `kv/get` shorthand sometimes seen in prose is not what the matcher compares against.

### SDK surface

The client `IKVService` (`packages/sdk-services/src/kv/KVService.ts`) is the richest service client. Every method returns a `Result<T>` (no throws) and POSTs to `{host}/invoke`:

- `get<T>(key, opts)` — `tinycloud.kv/get`; parses JSON/text/binary by content-type.
- `put(key, value, opts)` — `tinycloud.kv/put`; binary values (`Blob`/`ArrayBuffer`/typed-array/Node `Buffer`) are sent as raw bytes so they round-trip byte-identically, strings as-is, everything else JSON.
- `batchPut(items, opts)` — many puts in **one** multi-resource invocation (`context.invokeAny`, `FormData` body, one part per key); rejects duplicate post-prefix keys; returns `{ written, count }`.
- `list(opts)` — `tinycloud.kv/list`; optional `removePrefix`.
- `delete(key, opts)` — `tinycloud.kv/del`.
- `head(key, opts)` — `tinycloud.kv/metadata`; returns headers (etag/content-type/last-modified/content-length) with no body.
- `createSignedReadUrl(key, opts)` — POSTs to `{host}/signed/kv` to mint a short-lived, capability-free read URL (a ticket), so a blob can be fetched without the capability chain (see [[#mechanics]]).
- `withPrefix(prefix)` — a prefix-scoped view (`PrefixedKVService`), the basis of app-private key isolation (`/app.{domain}/…`).

## Mechanics

### The put two-phase

`tinycloud.kv/put` is the only kv action with input bytes, so it is staged before commit (`db.rs:535-550`). For each put capability the node pulls the request body out of `InvocationInputs`, hashes it (`stage.hash()`), and records a `Operation::KvWrite { space, key, metadata, value: hash }`. The [[invocation]] is then verified and the metadata row committed *inside one transaction*; only after the transaction's verification passes does the node `storage.persist(space, stage)` the actual bytes to the [[blob-store]] (`db.rs:628-636`). So an unauthorized put never lands bytes, and the index row and the blob are written atomically with respect to verification.

A successful write is recorded as a `kv_write` row (`tinycloud-core/src/models/kv_write.rs`): primary key `(space, key, invocation)`, plus `seq`, `epoch`, `epoch_seq`, `value` (the content `Hash`), and `metadata`. Because the row is keyed by the invocation hash and ordered by `(epoch, epoch_seq, seq)`, kv history is an append-only, epoch-ordered log per space — the substrate for [[consistency-model|last-writer-wins]] resolution and for [[hooks]] change feeds. (A `version: Option<(i64, Hash, i64)>` field is threaded through delete but is currently unused/TODO.)

### Reads, lists, deletes

`get` joins the latest `kv_write` for `(space, key)` to its blob (`get_kv`), returning `(Metadata, Hash, Content)`. `list` enumerates paths under a prefix. `del` looks up the entity, removes the blob from the [[blob-store]], and records a delete. `metadata` returns the `Metadata` (content-type, size, etag) with no body — the node-side of the SDK `head`.

### Signed read URLs

Beyond capability invocation, the node can mint a **signed KV ticket** (`POST /signed/kv`, `routes/mod.rs`): the caller proves a `tinycloud.kv/get` capability once, and the node returns a `{ url, ticketId, expiresAt }` whose `GET /signed/kv/{ticket}` serves the blob with no further capability — a TTL-bounded, shareable read link (default expiry from `DEFAULT_SIGNED_READ_URL_EXPIRY_MS`). This is the primitive behind public sharing without leaking the owner's capability chain.

### Public-space reads

A `public` [[system-spaces|system space]] is world-readable: `GET /public/{space_id}/kv/{key}` (and HEAD/list) serve kv blobs with **no** authorization (`routes/public.rs`, rate-limited), while writes still require the owner's `tinycloud.kv/put` capability. This is how `readPublicSpace` works from any client.

## Relationships

Exercised by [[invocation|invocations]] of `tinycloud.kv/{action}` [[capabilities]]; its resource path obeys the [[uri-addressing-grammar]]; blobs land in the [[blob-store]] and the index in the [[metadata-db]]; the per-key event order feeds [[consistency-model]] and [[hooks]]; the [[vault|vault service]] is built *on top of* kv (encrypted values under kv keys); `secrets` and `account` [[system-spaces|system spaces]] are kv key conventions. Signed read URLs + the `public` space are the unauthenticated read paths.

## Example

An agent holding a [[capabilities|capability]] for ability `tinycloud.kv/get` over resource `tinycloud:pkh:eip155:1:0xf39f…2266:applications/kv/com.listen.app/transcript/` invokes `kv.get("com.listen.app/transcript/2026-06-23.json")`. The node verifies the chain, `extends`-checks the key against the granted prefix, reads the latest `kv_write` for `(applications, com.listen.app/transcript/2026-06-23.json)`, and streams the blob from the [[blob-store]] — no account lookup, just the signature chain. (See [[example-listen]].)

## Status & drift

Shipped; the most complete service. The whitepaper writes kv abilities loosely; the enforced strings are exactly `tinycloud.kv/{put,get,del,list,metadata}` — code is canonical (see [[meta/contradictions]]). Note the delete-versioning field (`db.rs` `version`) is threaded but unused.

## Sources
- `tinycloud-node`: `tinycloud-core/src/db.rs:512-684` (kv dispatch, `InvocationOutcome`), `tinycloud-core/src/models/kv_write.rs` (`kv_write` table), `tinycloud-node-server/src/routes/mod.rs` (`/signed/kv`), `tinycloud-node-server/src/routes/public.rs` (public reads)
- `js-sdk`: `packages/sdk-services/src/kv/KVService.ts` (`IKVService` impl, `KVAction`, signed read URLs, `withPrefix`)
