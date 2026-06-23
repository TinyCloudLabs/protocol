---
type: concept
title: Capabilities Service
description: The capabilities service — a read-only node service exercised by tinycloud.capabilities/read that lets a holder query the delegations recorded against a space (list with filters, or fetch a delegation chain).
status: shipped
layer: protocol
resource: "tinycloud.capabilities/{action}"
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/db.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/types/capabilities_read_params.rs
  - repo: js-sdk
    path: packages/sdk-core/src/spaces/SpaceService.ts
tags: [service, capabilities, authz]
timestamp: 2026-06-23
---

# Capabilities Service

The **capabilities service** is the read-only [[services|service]] that lets a holder **query the [[delegation|delegations]] recorded against a [[autonomic-space|space]]** — listing them (optionally filtered by direction, path, or ability) or fetching the [[delegation]] chain behind one delegation. It is exercised by the single ability `tinycloud.capabilities/read` and is how the SDK answers "what authority has been granted in this space?" — there is no write or revoke path here (granting happens via [[delegation]], ending via [[revocation]]); the service only *reads* the [[capabilities|capability]] graph the node already stores.

## Role

The capabilities service lives in [[architecture-layers|Layer 1]]. Where [[kv|kv]]/[[sql|sql]] expose a space's *data*, the capabilities service exposes a space's *authority*: it reflects, back to an authorized caller, the [[delegation]] records the node accumulated as authority flowed in (root [[cacao|CACAO]]s and [[ucan|UCAN]] sub-delegations — see [[capabilities]]). Reading them is itself a [[capabilities|capability]]-gated [[invocation]], so a caller sees only what its own `tinycloud.capabilities/read` grant authorizes.

## Shape

### Ability

The namespace is `tinycloud.capabilities/{action}`, dispatched in `SpaceDatabase::invoke` (`tinycloud-core/src/db.rs:640`). The matcher keys on `(space, "capabilities", "tinycloud.capabilities/read", path)` and **requires `path == "all"`**:

| Ability | Effect | Outcome (`db.rs`) |
|---|---|---|
| `tinycloud.capabilities/read` | Query delegations recorded against the space | `OpenSessions` (list) or `DelegationChain` (chain) |

The resource half is `{spaceId}/capabilities/all` per the [[uri-addressing-grammar]]; `capabilities` is the service segment and `all` is the only valid path. `read` is the only action.

### Read parameters (via UCAN facts)

The *kind* of read is selected not by the path but by a `capabilitiesReadParams` object carried in the [[invocation]]'s [[ucan|UCAN]] **facts** field. It is the tagged enum `CapabilitiesReadParams` (`tinycloud-core/src/types/capabilities_read_params.rs`):

- `{ "type": "list", "filters": { direction?, path?, actions? } }` — list delegations. `direction` is `"created"` (invoker is delegator), `"received"` (invoker is delegatee), or `"all"`/absent; `path` filters by resource-path prefix; `actions` filters by ability. Returns `OpenSessions` — a `HashMap<Hash, DelegationInfo>` keyed by delegation CID.
- `{ "type": "chain", "delegation_cid": "<cid>" }` — fetch one delegation's chain. Returns `DelegationChain` — a `Vec<DelegationInfo>` ordered leaf → root.

If **no** `capabilitiesReadParams` fact is present the node is backward-compatible: it returns *all* valid delegations for the space (`get_valid_delegations`).

### SDK surface

The web SDK invokes this through `SpaceService`'s space-scoped delegation operations (`packages/sdk-core/src/spaces/SpaceService.ts`): `delegations.list()` POSTs an [[invocation]] with `facts = [{ capabilitiesReadParams: { type: "list", filters: { direction: "created" } } }]`; `listReceived()` uses `direction: "received"`. Both call `invoke(session, "capabilities", "all", "tinycloud.capabilities/read", facts)` and parse the `{ [cid]: DelegationInfo }` response into `Delegation[]`.

## Mechanics

`tinycloud.capabilities/read` has no input bytes and no DB mutation. In `invoke`, the node extracts `caps_read_params` from the [[invocation]]'s `payload().facts` (looking for the object key `capabilitiesReadParams`), runs the normal [[capabilities|capability]] verification + commit (the read itself is an authorized invocation), then dispatches on the params: `get_valid_delegations` / `get_filtered_delegations` (→ `OpenSessions`) or `get_delegation_chain` (→ `DelegationChain`). Each result is a set of `DelegationInfo` rows (the parsed [[delegation]] metadata the node persisted), so the service is a *projection* of the stored authority graph, not a separate store.

## Relationships

Reads the [[delegation]] records produced by [[capabilities]] flowing into a space; gated by an [[invocation]] of its own `tinycloud.capabilities/read` [[capabilities|capability]]; its resource path obeys the [[uri-addressing-grammar]] (`capabilities/all`); surfaced by the SDK [[spaces|SpaceService]] as `delegations.list()`/`listReceived()`. Complements [[revocation]] (which ends authority) by *observing* it.

## Example

An agent holding `tinycloud.capabilities/read` over `tinycloud:pkh:eip155:1:0xf39f…2266:default/capabilities/all` invokes `delegations.list()`. The SDK POSTs an [[invocation]] whose UCAN facts carry `{ capabilitiesReadParams: { type: "list", filters: { direction: "created" } } }`; the node verifies the chain, calls `get_filtered_delegations` for delegations *it* delegated, and returns `{ <cid>: DelegationInfo, … }` — the outgoing grants for that space, and nothing else.

## Status & drift

Shipped, but minimal: one ability (`read`), one path (`all`), read-only. The selector lives in UCAN **facts** (`capabilitiesReadParams`), not in the resource or ability string — an easy-to-miss detail. No-params is a backward-compat alias for `list`-all. Code is canonical.

## Sources
- `tinycloud-node`: `tinycloud-core/src/db.rs:640-676` (`tinycloud.capabilities/read` dispatch, `OpenSessions`/`DelegationChain`, facts extraction), `tinycloud-core/src/types/capabilities_read_params.rs` (`CapabilitiesReadParams`, `ListFilters`)
- `js-sdk`: `packages/sdk-core/src/spaces/SpaceService.ts:976-1063` (`delegations.list()`/`listReceived()`, `capabilitiesReadParams` facts)
