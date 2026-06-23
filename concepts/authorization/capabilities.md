---
type: concept
title: Capabilities
description: A capability is a signed, attenuable grant of one ability over one resource — the atomic unit of authority in TinyCloud, the resource × ability × caveats triple.
status: shipped
layer: protocol
resource: "{namespace}.{service}/{action}"
sources:
  - repo: tinycloud-node
    path: tinycloud-auth/src/authorization.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/util.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/models/delegation.rs
  - repo: tinycloud-node
    path: tinycloud-node-server/src/auth_guards.rs
tags: [authz, capability, ucan, recap]
timestamp: 2026-06-23
---

# Capabilities

A **capability** authorizes one [[dids|principal]] to perform a specific **ability** against a specific **resource**, optionally narrowed by **caveats**. It is the atomic unit of authority in TinyCloud: every read or write is the [[invocation]] of a capability that traces, through a [[delegation]] chain, back to an [[autonomic-space|space]]'s [[dids|owner DID]]. There is no access-control list and no server-side session to consult — the capability *is* the authorization.

## Role

Capabilities are [[architecture-layers|Layer 1]] bedrock. They make authority **portable and verifiable without a server**: a holder presents a capability chain and a node admits the request by checking signatures and scope alone (see [[thesis]]). The same triple is what the [[policy-engine|policy engine]] emits (as a `portable-delegation`) and what an [[invocation]] exercises — so capabilities are the lingua franca that ties L1 authorization to L2/L3 apps.

## Shape

A capability is the triple **resource × ability × caveats**:

- **resource** — `{spaceId}/{service}[/{path}]`, the thing acted on, e.g. `tinycloud:pkh:eip155:1:0xf39f…2266:default/kv/notes/`. Full grammar in [[uri-addressing-grammar]].
- **ability** — `{namespace}.{service}/{action}`, the verb, e.g. `tinycloud.kv/put`, `tinycloud.sql/query`, `tinycloud.space/host`. The service set is enumerated in [[services]].
- **caveats** — narrowing conditions on the grant: time bounds (`nbf`/`exp`), path/prefix restriction, SQL table scope. See [[attenuation]].

In code, a parsed capability is the `Capability` struct produced by `tinycloud-core/src/util.rs`, which normalizes both encodings (below) into `{ resource, ability, caveats }`. The cap-string short form used in grants and the CLI is `service:space:path:actions`.

## Mechanics

### Two encodings, one model

Authority enters the system two ways, both reduced to the same `Capability`:

- **Root delegations** are [[siwe|SIWE]] messages carrying a [[recap|ReCap]], serialized as a [[cacao|CACAO]] — signed directly by the [[dids|owner DID]] (an Ethereum key). This is how a wallet grants authority with one signature.
- **Sub-delegations and invocations** are [[ucan|UCAN]] tokens signed by [[session-keys|session keys]]. `tinycloud-auth/src/authorization.rs` models `TinyCloudDelegation` as *either* a UCAN *or* a SIWE/CACAO, and `TinyCloudInvocation` as a UCAN.

### Verification

A node admits an [[invocation]] only if **every link** of its [[delegation]] chain holds (`tinycloud-core/src/models/delegation.rs` and `models/invocation.rs`):

1. **Signature** — each delegation/invocation is signed by the principal that the parent delegated *to*.
2. **Time** — each link's `[nbf, exp]` window is contained within its parent's.
3. **Scope** — the resource is `extends`-covered by the parent (the path-containment rule defined in [[uri-addressing-grammar]]) **and** the ability is covered by the parent's ability. This is [[attenuation]]: a child can only narrow, never widen.
4. **Root authority** — the chain's root delegation is signed by the DID that *owns* the target [[autonomic-space|space]] (`is_root_authority` compares the space's `base_did` to the root delegator).

The HTTP entry point that runs this is `AuthHeaderGetter` in `tinycloud-node-server/src/auth_guards.rs`, which extracts the capability headers off a request before the route executes.

## Relationships

Granted via [[delegation]]; exercised via [[invocation]]; narrowed by [[attenuation]]; ended by [[revocation]]; rooted at an [[autonomic-space|space]]'s [[dids|owner]]; encoded as [[ucan|UCAN]] or [[siwe|SIWE]]/[[cacao|CACAO]] ([[recap|ReCap]]); its resource half obeys the [[uri-addressing-grammar]] and its ability half names a [[services|service]]; issued in bulk by the [[policy-engine|policy engine]] as portable-delegations.

## Example

An owner delegates to a [[session-keys|session key]] a single capability: ability `tinycloud.kv/get` over resource `tinycloud:pkh:eip155:1:0xf39f…2266:applications/kv/com.listen.app/transcript/` with a 24-hour `exp` caveat. An agent holding the resulting [[ucan|UCAN]] can then `tinycloud.kv/get` any key under that `transcript/` prefix for a day — and nothing else, because `extends` rejects any resource outside the prefix and [[attenuation]] forbids widening the ability. (See [[example-listen]].)

## Status & drift

Shipped. The whitepaper writes the ability loosely as prose; the code form is exactly `{namespace}.{service}/{action}` (e.g. `tinycloud.kv/put`) — code is canonical (see [[meta/contradictions]]). Note the verification path's replay protection rests on time-bounds + the [[delegation]] chain; the general [[invocation]] path has no dedicated nonce-dedup table (tracked separately, not a docs concern here).

## Sources
- `tinycloud-node`: `tinycloud-auth/src/authorization.rs` (`TinyCloudDelegation`/`TinyCloudInvocation`), `tinycloud-core/src/util.rs` (`Capability` extraction), `tinycloud-core/src/models/delegation.rs` + `models/invocation.rs` (verification), `tinycloud-node-server/src/auth_guards.rs` (`AuthHeaderGetter`)
