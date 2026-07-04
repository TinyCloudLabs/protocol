---
type: reference
title: Capability Reference
description: Every ability URN the node enforces, service by service — what each authorizes, how abilities relate (no implication hierarchy; paths carry the containment), and the three ways a capability is granted.
status: shipped
layer: protocol
resource: "{namespace}.{service}/{action}"
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/sql/parser.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/models/delegation.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/policy_capability/mod.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/protocol.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/mod.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/hooks.rs
  - repo: js-sdk
    path: packages/sdk-core/src/manifest.ts
  - repo: js-sdk
    path: packages/sdk-core/src/capabilities.ts
tags: [authz, capability, reference]
timestamp: 2026-07-04
---

# Capability Reference

This page enumerates every **ability URN** the TinyCloud node enforces, grouped by
[[services|service]], with what each one authorizes, how abilities relate to one another, and how a
holder comes to possess one. It is the reference companion to [[capabilities]] (the model) and
[[cap-string-grammar]] (the encodings).

A [[capabilities|capability]] is the triple **resource × ability × caveats**. The resource is
`{spaceId}/{service}[/{path}]` per the [[uri-addressing-grammar]]; the ability is
`{namespace}.{service}/{action}`, the verb this page enumerates. Every request a node admits is an
[[invocation]] of one of these abilities, verified against a [[delegation]] chain that roots at the
[[autonomic-space|space]] owner's [[dids|DID]] (or, for encryption, at the network owner's DID).

## No ability hierarchy — paths carry the containment

There is **no implication between abilities**. Chain validation compares the ability by **exact
string equality**: a child capability is covered only when its resource `extends` the parent's
*and* its ability string equals the parent's (`tinycloud-core/src/models/delegation.rs`,
`c.resource.extends(&pc.resource) && c.ability == pc.ability`). The SDK's pre-flight subset check
(`isCapabilitySubset`, `packages/sdk-core/src/capabilities.ts`) applies the same rule: action sets
are compared as literal URN sets.

Two consequences:

- Holding `tinycloud.sql/admin` does **not** let you exercise or sub-delegate `tinycloud.sql/read`
  — a grant must enumerate every action the holder will use. (Intended admin-superset semantics
  are tracked as a bug, Linear TC-109; see the SQL section.)
- All hierarchy lives on the **resource path**: a parent path ending in `/` covers any child path
  under that prefix (the `extends` rule in [[uri-addressing-grammar]], mirrored by `pathContains`
  in the SDK). [[attenuation|Attenuation]] narrows paths and time bounds; abilities can only be
  dropped, never mapped to "lesser" ones.

Path containment is service-specific in practice, because each service interprets its path
differently:

| Service | Path meaning | Containment |
|---|---|---|
| `kv`, `hooks` | hierarchical key / scope prefix | prefix match on `/` boundaries |
| `sql`, `duckdb` | database name (e.g. `default/memory.db`) | **exact** name; only a grant at `"/"` (or no path) covers all databases |
| `capabilities` | fixed segment `all` | grant with no path covers it |
| `encryption` | the network URN | exact network |
| `space` | none (bare `{spaceId}/space`) | n/a |

## How capabilities are granted

Three grant paths, all producing links in the same [[delegation]] chain:

1. **Sign-in session** — an app declares `PermissionEntry[]` in its manifest
   ([[manifest-model]]); the SDK composes one [[siwe|SIWE]]/[[recap|ReCap]] request covering the
   union, the wallet signs once, and the session key holds the granted set
   ([[sign-in-flow]]). Short action names (`"get"`, `"read"`, `"schema"`) are expanded to full
   URNs at composition time (`expandActionShortNames`); `"delete"` normalizes to `kv/del`.
2. **UCAN sub-delegation** — a session holder grants a subset onward to another [[dids|DID]] with
   `delegateTo(did, PermissionEntry[])` or a raw abilities map ([[delegation-api]]). The SDK
   subset-checks the request against the session's ReCap; if derivable, it signs a
   [[session-keys|session-key]] [[ucan|UCAN]] with no wallet prompt. Multi-resource grants (one
   delegation covering several service/path pairs) are the normal shape.
3. **Escalation** — if the subset check fails, the SDK raises `PermissionNotInManifestError` and
   the app can call `requestPermissions(missing)` to prompt for a fresh signature covering the
   missing entries.

Worked example (the agents.tinycloud.xyz flow): a user delegates to an agent DID one
multi-resource UCAN in the `agents` space — `tinycloud.kv` at prefix `default/` with
`get, put, list, del`; `tinycloud.sql` at **exact** path `default/memory.db` with
`read, write, admin`; and `tinycloud.capabilities` (no path) with `read`. The KV entry is a
prefix because kv paths are hierarchical; the SQL entry must name the exact database handle
because sql paths are not.

## tinycloud.kv

Per-space key-value store ([[kv]]). Path is a hierarchical key prefix: `"/"` = whole space,
`"foo/"` = prefix, `"foo"` = exact key. Dispatched in `SpaceDatabase::invoke`
(`tinycloud-core/src/db.rs`).

| Ability | Authorizes |
|---|---|
| `tinycloud.kv/get` | Read the blob (and metadata) at a key |
| `tinycloud.kv/put` | Write a blob at a key (two-phase staged write) |
| `tinycloud.kv/del` | Delete the blob at a key |
| `tinycloud.kv/list` | List keys under the path prefix |
| `tinycloud.kv/metadata` | Read metadata only (HEAD) |

`tinycloud.kv/del` is the canonical action the node dispatches. The policy-capability v0 contract
(`tinycloud-core/src/policy_capability/mod.rs`) accepts `tinycloud.kv/delete` instead — the SDK's
manifest normalizer maps the short name `"delete"` to `del`, but the two full URNs are distinct
strings and do not match each other in chain validation.

## tinycloud.sql

Per-space SQLite databases ([[sql]]). Path is the **exact database name/file**
(e.g. `data.sqlite`, `default/memory.db`); the node resolves the database as the last path
segment, defaulting to `default`. A grant at `"/"` covers all databases via path containment,
but a grant at `foo/` does *not* make sql hierarchical — the invocation still names one database.
Ability-vs-statement validation is in `tinycloud-core/src/sql/parser.rs`; request-level admin
gating in `tinycloud-node-server/src/routes/mod.rs`.

| Ability | Authorizes |
|---|---|
| `tinycloud.sql/read` | Read-only statements (SELECT); any write or DDL is rejected |
| `tinycloud.sql/write` | DML and DDL statements |
| `tinycloud.sql/schema` | **DDL only** — a batch mixing DDL with non-DDL is rejected |
| `tinycloud.sql/admin` | Everything `write` allows, plus PRAGMA statements (the only requests that *require* admin) |
| `tinycloud.sql/*` | Literal wildcard string; the executor treats it as full access. It is not a matcher — it only works if granted as this exact string |

`tinycloud.sql/select` is a legacy alias the node still accepts with `read` semantics. The SDK
additionally defines `insert`, `update`, `delete`, `execute`, and `export` constants
(`packages/sdk-services/src/sql/types.ts`); those URNs are **not** in the node's accepted ability
set and should not be used in grants.

**Known bug (Linear TC-109):** because ability comparison has no implication, a session granted
only `admin` cannot exercise `read`/`write`/`schema`, and as of node-sdk 2.4.0 `admin` does not
imply `schema` in the SDK's subset check either. Current behavior: enumerate every action
(`["read", "write", "schema", "admin"]` for full access). The intended semantics — `admin` as a
strict superset — is tracked but not implemented.

Caveats: SQL grants can carry caveats ([[attenuation]]) restricting tables, columns, or read-only
mode, and the [[policy-engine]]'s constrained-statement caveat pins the exact named statements a
delegate may run (enforced from the validated delegation chain, not the invocation envelope).

## tinycloud.duckdb

Optional per-space DuckDB analytics ([[duckdb]]); nodes built without the `duckdb` feature return
`501` for these. Path semantics match sql (exact database name).

| Ability | Authorizes |
|---|---|
| `tinycloud.duckdb/read` | Read-only queries (`select` is the legacy alias) |
| `tinycloud.duckdb/write` | Mutating statements |
| `tinycloud.duckdb/admin` | Admin-gated requests, analogous to sql/admin |
| `tinycloud.duckdb/import` | Bulk import into a database |
| `tinycloud.duckdb/export` | Export a database |
| `tinycloud.duckdb/*` | Literal wildcard, as in sql |

The SDK also names `describe` and `execute` for DuckDB; like the extra sql constants, they are not
in the node's accepted set.

## tinycloud.capabilities

Read-only introspection of a space's authority graph ([[capabilities-service]]).

| Ability | Authorizes |
|---|---|
| `tinycloud.capabilities/read` | Query the delegations recorded against the space — list with filters, or fetch one delegation's chain |

The invocation resource is always `{spaceId}/capabilities/all`; grants typically carry no path
(which covers `all`). The kind of read (list vs chain) is selected by a `capabilitiesReadParams`
UCAN fact, not by the ability or path. There is no write action — authority is granted via
[[delegation]] and ended via [[revocation]], never through this service.

## tinycloud.hooks

Eventing on space writes ([[hooks]]). The path scopes what may be watched:
`{watched-service}/{path…}` (e.g. `sql/conversations/conversation`), contained on `/` segment
boundaries; a grant with no path covers all scopes in the space
(`tinycloud-node-server/src/routes/hooks.rs`).

| Ability | Authorizes |
|---|---|
| `tinycloud.hooks/subscribe` | Open a live event stream for a scope |
| `tinycloud.hooks/register` | Register a webhook for a scope |
| `tinycloud.hooks/list` | List webhook registrations in a scope |
| `tinycloud.hooks/unregister` | Remove a webhook registration |

## tinycloud.encryption

The node-side surface of [[encryption-networks]] ([[encryption-service]]). Unlike every other
service, the resource is **user-bound, not space-bound**: the path is the network URN
`urn:tinycloud:encryption:{ownerDid}:{name}`, and root authority is the owner DID in that URN
(`tinycloud-core/src/encryption_network/protocol.rs`).

| Ability | Authorizes |
|---|---|
| `tinycloud.encryption/decrypt` | Unwrap/rewrap an envelope's symmetric key against the network ([[user-bound-decrypt]]) — the only delegatable action |
| `tinycloud.encryption/network.create` | Create a network and run its key ceremony — owner-only, non-delegatable |
| `tinycloud.encryption/network.revoke` | Revoke a network — owner-only, non-delegatable (v1 placeholder) |

There is deliberately no `encrypt` ability: clients encrypt locally to the network public key, so
the node never sees plaintext.

## tinycloud.space

Space lifecycle. The one node-enforced action:

| Ability | Authorizes |
|---|---|
| `tinycloud.space/host` | Materialize and serve the space on a node ([[space-hosting]]) |

There is no "create space" call — a space exists on a node once the node transacts a
[[delegation]] carrying `tinycloud.space/host` over the bare resource `{spaceId}/space` (no path).
At bootstrap the SDK issues this delegation to the node's host key for each of the user's spaces;
"who hosts my space" is exactly "which node's key holds this capability".

The SDK also invokes `tinycloud.space/create`, `tinycloud.space/list`, and `tinycloud.space/info`
(`packages/sdk-core/src/spaces/SpaceService.ts`), but tinycloud-node `main` has no dispatch for
these URNs — they are SDK-declared surface whose node-side handling could not be verified in code
at the time of writing.

## tinycloud.vfs (reserved)

`tinycloud.vfs/{get, list, metadata, put, delete}` appear only in the policy-capability v0
accepted-action contract (`tinycloud-core/src/policy_capability/mod.rs`); there is no vfs service
dispatch in the node. Reserved, not yet a live service.

## Strings that look like abilities but are not

- `xyz.tinycloud.policy/delegationMode` — a UCAN **fact key** marking a delegation's policy mode
  ([[policy-engine]]), not an ability.
- `xyz.tinycloud.policy/PolicyCapability/v0` — the domain separator for policy-capability hashing.
- `tinycloud.delegation/{create, revoke, list, get, check}` — SDK `DelegationManager` operation
  labels; revocation on the wire is a signed revocation event ([[revocation]]), not an invocation
  of these.
- `tinycloud.vault` — an SDK-virtual service ([[vault]]) that expands to kv (and encryption)
  entries at manifest composition; never encoded in a ReCap.

## Three abilities, three layers

The same grant machinery covers very different layers of the stack. Contrast:

| | `tinycloud.sql/read` | `tinycloud.encryption/decrypt` | `tinycloud.space/host` |
|---|---|---|---|
| **Layer** | data access | data secrecy | infrastructure / availability |
| **Resource** | one database in one space | an encryption network URN (user-bound) | a whole space (bare, no path) |
| **Authorizes** | running read-only SQL against that database | turning ciphertext enveloped to that network into plaintext | materializing and serving the space on a node |
| **Rooted at** | space owner DID | network owner DID | space owner DID |
| **Typical holder** | an app session or agent | a vault/secrets session, a delegated reader | a node's host key |

They compose rather than overlap: a node holding `space/host` stores and serves blobs but cannot
read network-encrypted content (it lacks `decrypt`); a delegate holding `decrypt` can render
ciphertext it obtains but cannot fetch it without a storage ability like `kv/get` or `sql/read`;
and a `sql/read` holder sees rows in one database but has no say over where the space lives or
what ciphertext means. See [[example-listen]] for these layers in one application.

## Status & drift

Shipped, enumerated against tinycloud-node `main` (July 2026). Known drift, in one place:

- **TC-109** — no admin-superset implication for sql/duckdb; grants must enumerate actions
  (documented above as current behavior).
- `tinycloud.kv/del` (node dispatch) vs `tinycloud.kv/delete` (policy-capability v0 contract) are
  distinct, non-matching URNs.
- `tinycloud.sql/select` and `tinycloud.duckdb/select` are legacy read aliases; prefer `read`.
- SDK action constants beyond the node's accepted set (`sql/{insert, update, delete, execute,
  export}`, `duckdb/{describe, execute}`) and the `tinycloud.space/{create, list, info}`
  invocations have no node-side dispatch on `main`.

## Sources

- `tinycloud-node`: `tinycloud-core/src/db.rs` (kv/capabilities dispatch, host-insert),
  `tinycloud-core/src/sql/parser.rs` (sql ability-vs-statement validation),
  `tinycloud-node-server/src/routes/mod.rs` (sql/duckdb invoke, admin gating, accepted sets),
  `tinycloud-node-server/src/routes/hooks.rs` (hooks abilities + scope containment),
  `tinycloud-core/src/encryption_network/protocol.rs` +
  `tinycloud-node-server/src/routes/encryption.rs` (encryption actions),
  `tinycloud-core/src/models/delegation.rs` (exact-equality ability containment),
  `tinycloud-core/src/policy_capability/mod.rs` (v0 accepted-action contract, vfs)
- `js-sdk`: `packages/sdk-core/src/manifest.ts` (PermissionEntry, defaults tiers, action
  expansion), `packages/sdk-core/src/capabilities.ts` (subset check),
  `packages/sdk-core/src/spaces/SpaceService.ts` (space/list-create-info invocations),
  `packages/sdk-services/src/sql/types.ts` + `packages/sdk-services/src/duckdb/types.ts` (SDK
  action constants)
- `listen`: `SPEC-manifest-and-capability-chain.md` (manifest → ReCap → session → UCAN chain)
- `tinycloud-agents`: `docs/agents-api.md` (multi-resource agent delegation example)
