---
type: concept
title: Attenuation
description: Attenuation is the narrowing-only rule — a child capability must be contained in its parent, enforced by ResourceId::extends (path/space/service/fragment containment), registry-aware ability matching, and caveat containment.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-auth/src/resource.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/models/delegation.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/models/invocation.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-auth/src/policy_capability.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/policy_v3.rs@05c6a93
tags: [authz, attenuation]
timestamp: 2026-10-05
---

# Attenuation

**Attenuation** is the rule that authority can only *shrink* as it flows down a [[delegation]] chain: a child [[capabilities|capability]] must be contained in its parent — never wider. In TinyCloud this is enforced by three checks at every link: `ResourceId::extends` (the resource is within the parent's resource), `ability_matches` (the parent's ability covers the child's, exactly or through a registry alias or implication), and caveat containment (the child keeps every restriction the parent had). A delegator can hand out less than it holds, never more.

## Role

Attenuation is the safety property that makes [[capabilities|capability]] [[delegation]] sound. Because grants are *bearer* tokens verified offline by a [[nodes|node]], the only thing standing between a [[session-keys|session key]] and the whole [[autonomic-space|space]] is the guarantee that each re-grant narrowed scope. It is [[architecture-layers|Layer 1]] bedrock, invoked identically in [[delegation]] and [[invocation]] verification.

## Mechanics

The narrowing test is a per-capability predicate run in both `delegation::validate` and `invocation::validate` (`tinycloud-core/src/models/delegation.rs:391, 425`, `invocation.rs:414`):

```rust
c.resource.extends(&pc.resource)
    && ability_matches(pc.ability, c.ability)   // registry-aware (TC-119)
// then, among the matching parent caps:
caveats_contain_child(&pc.caveats, &c.caveats)  // else CaveatsNotContained
```

`c` is the child/invoked cap, `pc` a parent cap. All three must hold:

- **Resource containment** — `ResourceId::extends` (`tinycloud-auth/src/resource.rs:193`). The child resource extends the base iff:
  - same [[autonomic-space|space]] (`base.space() == self.space()`), else `IncorrectSpace`;
  - same [[services|service]] (`kv`/`sql`/…), else `IncorrectService`;
  - same fragment, else `IncorrectFragment`;
  - the child **path** is path-prefixed by the base path (below), else `DoesNotExtendPath`.
- **Ability coverage** — `ability_matches(held, required)` (`tinycloud-auth/src/policy_capability.rs:15`) expands the held ability through the generated capability registry and checks that the required ability (alias-resolved) is in that set. Exact matches still match; the registry adds aliases (`kv/delete` ↔ `kv/del`) and implications (`sql/admin` ⊃ `sql/schema`; `sql/*` ⊃ every SQL action). Unrelated abilities never match: `tinycloud.kv/get` does not cover `tinycloud.kv/put`.
- **Caveat containment** — `caveats_contain_child` (`delegation.rs:692`): selector caveats must be contained; SQL constrained-statement caveats use SQL caveat containment; any other caveat must be structurally equal, so a child cannot drop or replace a parent's restriction. Failure is `CaveatsNotContained`.

### Policy sessions

[[policy-v3-admission|Policy sessions]] use the same three parts through `capabilities_are_contained` (`policy_v3.rs:836`): every child cap must be covered by some parent cap by `extends`, `ability_matches` and selector-caveat containment. It is applied:

- at mint, against **both** policy roots (`policy-session-capability-widening`);
- for each re-delegated descendant, against its immediate parent (`policy-session-descendant-invalid`);
- for each invocation, against the immediate parent session (`policy-invocation-capability-widening`).

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

`extends` returns `Result<(), ResourceCheckError>` (`resource.rs:251`) with variants `IncorrectSpace | IncorrectService | IncorrectFragment | DoesNotExtendPath`. The chain checks call it as a boolean. Every widening direction is rejected: different space, service or fragment; a path that escapes the parent's prefix; an ability the registry does not derive from the parent's; or a dropped or loosened caveat.

## Relationships

Enforced during [[delegation]] and [[invocation]] verification, and for [[policy-v3-admission|policy sessions]]; defined over the [[uri-addressing-grammar|resource URI grammar]] (`extends` is a method on `ResourceId`); the narrowing dimension complementing the **time** narrowing in [[delegation]] (child `[nbf,exp]` ⊆ parent); the guarantee that makes [[capabilities]] safe to delegate; the server-side mirror of the SDK's `isCapabilitySubset` path-containment check (see [[cap-string-grammar]]).

## Example

A parent delegation grants `tinycloud.kv/get` over `…:applications/kv/com.listen.app/`. A child may re-grant `tinycloud.kv/get` over `…/com.listen.app/transcript/` (✓ — `transcript/` is prefixed by the trailing-slash base) but **not** `tinycloud.kv/put` over the same path (✗ — ability mismatch), nor `tinycloud.kv/get` over `…/com.other.app/` (✗ — escapes the prefix), nor the same ability over a *different* [[autonomic-space|space]] (✗ — `IncorrectSpace`). A parent holding `tinycloud.sql/*` may re-grant `tinycloud.sql/read` (✓ — registry implication). (See [[delegation#trace]].)

## Status & drift

`shipped` in Node 1.17.3 (`tinycloud-node@05c6a93`) and exercised by test vectors in `resource.rs`. Earlier versions of this page said the ability check is exact string equality; since TC-119 it is registry-aware (alias and implication), and caveat containment was added to both the delegation and invocation checks. The SDK still expands short action names before building a grant (see [[cap-string-grammar]]). Code is canonical.

## Sources
- `tinycloud-node` (`05c6a93`, Node 1.17.3): `tinycloud-auth/src/resource.rs:193-260` (`ResourceId::extends`, `ResourceCheckError`), `tinycloud-auth/src/policy_capability.rs:15` (`ability_matches`), `tinycloud-core/src/models/delegation.rs:391, 425, 692` (coverage predicate, `caveats_contain_child`), `tinycloud-core/src/models/invocation.rs:414` (invocation coverage), `tinycloud-node-server/src/policy_v3.rs:836` (`capabilities_are_contained`)
