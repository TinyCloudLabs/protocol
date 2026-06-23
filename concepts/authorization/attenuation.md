---
type: concept
title: Attenuation
description: Attenuation is the narrowing-only rule — a child capability must be a strict subset of its parent, enforced by ResourceId::extends (path/space/service/fragment containment) plus exact ability match.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-auth/src/resource.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/models/delegation.rs
tags: [authz, attenuation]
timestamp: 2026-06-23
---

# Attenuation

**Attenuation** is the rule that authority can only *shrink* as it flows down a [[delegation]] chain: a child [[capabilities|capability]] must be a strict subset of its parent — never wider. In TinyCloud this is enforced by exactly two checks at every link: `ResourceId::extends` (the resource is within the parent's resource) **and** an exact `ability == ability` match. A delegator can hand out less than it holds, never more.

## Role

Attenuation is the safety property that makes [[capabilities|capability]] [[delegation]] sound. Because grants are *bearer* tokens verified offline by a [[nodes|node]], the only thing standing between a [[session-keys|session key]] and the whole [[autonomic-space|space]] is the guarantee that each re-grant narrowed scope. It is [[architecture-layers|Layer 1]] bedrock, invoked identically in [[delegation]] and [[invocation]] verification.

## Mechanics

The narrowing test is a per-capability predicate run in both `delegation::validate` and `invocation::validate` (`tinycloud-core/src/models/delegation.rs:248`, `invocation.rs:169`):

```rust
c.resource.extends(&pc.resource) && c.ability == pc.ability
```

`c` is the child/invoked cap, `pc` a parent cap. Both halves must hold:

- **Resource containment** — `ResourceId::extends` (`tinycloud-auth/src/resource.rs:193`). The child resource extends the base iff:
  - same [[autonomic-space|space]] (`base.space() == self.space()`), else `IncorrectSpace`;
  - same [[services|service]] (`kv`/`sql`/…), else `IncorrectService`;
  - same fragment, else `IncorrectFragment`;
  - the child **path** is path-prefixed by the base path (below), else `DoesNotExtendPath`.
- **Ability equality** — `c.ability == pc.ability`, an *exact* string compare of the `{namespace}.{service}/{action}` form (e.g. `tinycloud.kv/get`). There is no ability hierarchy in this check — `tinycloud.kv/get` does not satisfy a request for `tinycloud.kv/put` and vice-versa; a grant must enumerate each ability it wants to support.

### The path-prefix rule

The path containment logic (`resource.rs:200-212`) is boundary-aware so prefixes can't bleed across path segments:

| base path | child path | extends? | why |
|---|---|---|---|
| `None` | anything | ✓ | base with no path covers any path |
| `notes/` | `notes/a.txt` | ✓ | base ends in `/`, child `starts_with` it |
| `notes` | `notes` | ✓ | equal length |
| `notes` | `notes/a` | ✓ | boundary char after base is `/` |
| `notes` | `notesxyz` | ✗ | next byte is not `/` — `notes` does not cover `notesxyz` |
| `not` | `notes` | ✗ | same: no `/` boundary |
| `notes/` | (none) | ✗ | base has a path, child lacks one |

Concretely the rule is: `child.starts_with(base)` **and** (`base` ends with `/` **or** the strings are equal length **or** the byte at `base.len()` in `child` is `/`).

## Shape

`extends` returns `Result<(), ResourceCheckError>` with variants `IncorrectSpace | IncorrectService | IncorrectFragment | DoesNotExtendPath`. The chain checks call it as a boolean (`extends(...).is_ok()` semantics via the `&&`). The *only* widening directions are all rejected: different space, different service, different fragment, or a path that escapes the parent's prefix.

## Relationships

Enforced during [[delegation]] and [[invocation]] verification; defined over the [[uri-addressing-grammar|resource URI grammar]] (`extends` is a method on `ResourceId`); the narrowing dimension complementing the **time** narrowing in [[delegation]] (child `[nbf,exp]` ⊆ parent); the guarantee that makes [[capabilities]] safe to delegate; the server-side mirror of the SDK's `isCapabilitySubset` path-containment check (see [[cap-string-grammar]]).

## Example

A parent delegation grants `tinycloud.kv/get` over `…:applications/kv/com.listen.app/`. A child may re-grant `tinycloud.kv/get` over `…/com.listen.app/transcript/` (✓ — `transcript/` is prefixed by the trailing-slash base) but **not** `tinycloud.kv/put` over the same path (✗ — ability mismatch), nor `tinycloud.kv/get` over `…/com.other.app/` (✗ — escapes the prefix), nor the same ability over a *different* [[autonomic-space|space]] (✗ — `IncorrectSpace`). (See [[delegation#trace]].)

## Status & drift

Shipped and exercised by test vectors in `resource.rs`. Note the **ability check is exact-equality, not subset** — there is no `*`/wildcard expansion *inside* the `extends`+`==` chain check itself; a grant intending to cover multiple actions must list each ability (the SDK's short-name expansion happens before this, when building the grant — see [[cap-string-grammar]]). Resource `Name`/`Service`/`Path` parsing currently does no structural validation (`// TODO finish this by doing validation`, `resource.rs:160`), so `extends` operates on whatever strings parsed — code is canonical.

## Sources
- `tinycloud-node`: `tinycloud-auth/src/resource.rs:193-260` (`ResourceId::extends`, `ResourceCheckError`), `tinycloud-core/src/models/delegation.rs:248-252` + `models/invocation.rs:169-174` (the `extends && ability ==` coverage predicate)
