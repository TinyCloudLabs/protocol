---
type: concept
title: Policy as Central Primitive
description: The framing that elevates permissioning above storage — a signed Policy, not a bucket, is the unit a TinyCloud owner reasons about, grounded in the `Policy` type and its `when`/`grant`/ceiling structure.
status: in-progress
layer: protocol
sources:
  - repo: policy-engine
    path: src/types.rs
  - repo: policy-engine
    path: src/evaluator.rs
  - repo: policy-engine
    path: src/capability.rs
tags: [policy-engine, framing]
timestamp: 2026-06-23
---

# Policy as Central Primitive

**Policy as central primitive** is the framing that the unit a TinyCloud owner reasons about is not a store or a bucket but a **signed, conditional rule over their authority** — a [[overview|Policy]] that says *who*, *under what evidence*, may receive *what subset* of the owner's [[capabilities|capabilities]], for *how long*. Storage is downstream; permissioning is the thing you author. This is the [[architecture-layers|Layer 1]] elevation of the [[policy-engine/overview|policy engine]] above the service layer.

## Role

In the bare [[capabilities|capability]] model the owner is the only source of authority and must personally sign every [[delegation]]. That is *imperative* permissioning: it does not compose with facts discovered later (a credential the holder will earn, an agent that will be enrolled tomorrow). The central-primitive framing makes the **rule** first-class: the owner signs a Policy once, and the engine becomes a programmable issuer of grants that stays *strictly inside* the owner's authority. The owner's mental model shifts from "I granted Alice read on bucket X" to "anyone proving Y may read X for an hour" — permissioning, not plumbing, is the primitive.

## Mechanics

Three properties in `policy-core` make the framing concrete and *safe*:

### 1. A Policy is a signed rule, not a token

`Policy` (`src/types.rs:49`) carries a `when: Expression` and a `grant: GrantTemplate`, both signed by the owner under the [[overview#shape|Signed Object Profile]]. The Policy is not itself authority — it is a *recipe* for minting authority. Evaluation is pure: `evaluate_expression(expression, eligible_subject_did, satisfied_evidence)` (`src/evaluator.rs:76`) is a total boolean over the `when` tree.

### 2. The `when` grammar is small and total

`Expression` (`src/types.rs:120`) has exactly four shapes:

- **`allOf [Expression]`** — every child must hold.
- **`anyOf [Expression]`** — some child must hold.
- **`subject { did }`** — the request's `eligible_subject_did` must equal this DID.
- **`evidence { EvidenceRequirement }`** — a named requirement (`requirement_id`, a `verifier`, opaque `requirements`, optional `authority`/`freshness`) must appear in the *satisfied* evidence set. The engine only counts evidence it has **independently verified** ([[credential-gated-delegation]]); the holder cannot assert satisfaction.

There are no negations, no time arithmetic, no side effects — the grammar is deliberately decidable, which is what lets a Policy be audited by reading it.

### 3. The grant can only narrow the owner's authority

The Policy's `resource.permissions_ceiling` is a list of [[capabilities|PolicyCapability]] (`src/capability.rs:83`: `{ service, space, path, actions, caveats? }`, services restricted to `tinycloud.kv | tinycloud.sql | tinycloud.vfs`). Every requested capability is checked by **containment** — `PolicyCapability::contains` (`capability.rs:124`): exact `service` and `space`, path-prefix semantics (`tinycloud.sql` requires exact path; others allow trailing-slash prefix), action-subset, and caveat narrowing (a ceiling with no caveats permits any; SQL caveats must themselves contain). A request exceeding the ceiling is rejected `requested-capabilities-exceeded`. So the engine is structurally incapable of emitting more than the owner holds — it is [[attenuation]] expressed declaratively.

## Shape

The primitive, reduced to its load-bearing fields:

```
Policy.when    : Expression   = allOf | anyOf | subject{did} | evidence{EvidenceRequirement}
Policy.grant   : GrantTemplate = { output: portable-delegation, max_ttl_seconds, delegation_mode, revocation }
Policy.resource.permissions_ceiling : [PolicyCapability]   // the hard upper bound on what can be granted
```

`delegation_mode` is `terminal` (grant is a leaf, cannot be re-delegated) or `attenuable`; `revocation` is `refresh-only` or `active-cutoff`. These three fields *are* the policy author's vocabulary.

## Relationships

Is the framing of the [[policy-engine/overview|policy engine]]; its `when` grammar gates a [[capabilities|capability]] grant; its `permissions_ceiling` enforces [[attenuation|containment]] over the owner's authority; `evidence{}` conditions are satisfied by [[credential-gated-delegation|verified credentials]] from [[credentials|OpenCredentials]]; the enrolled-holder dimension is [[agent-transaction-policy]]; it sits beside [[capabilities]] and [[openkey|OpenKey]] in [[architecture-layers|Layer 1]].

## Example

`when = allOf[ subject{ did:key:z6Mk…agent }, evidence{ "email-domain" } ]` with `permissions_ceiling = [ tinycloud.sql/read over …/transcripts.sqlite ]`. Read aloud: *"the grant goes only to this enrolled agent, only if it also proves a trusted email-domain credential, and even then only the read capability I ceiling'd."* The owner authored one signed object; the engine will mint as many one-hour read grants as there are valid presentations, never exceeding that single read capability.

## Status & drift

`in-progress`. The `Policy` type, the `when` grammar, `evaluate_expression`, and `PolicyCapability::contains` are **frozen v0 + shipped** in `policy-core`. The *framing* — permissioning as the protocol's central primitive, above storage — is the [[architecture-layers|locked]] team position; its full realization depends on [[nodes|node]] consumption of the engine, which is still design-intent (see [[overview#status--drift]]). **Repo status:** the cited `policy-engine` repo is not public under TinyCloudLabs, and this design has been superseded by Data Exchange v0 (the `sssoforth/information-sphere` lineage); treat this page as historical context, not the current build target. See [[meta/contradictions]].

## Sources
- `policy-engine`: `src/types.rs:49,120,77` (`Policy`, `Expression`, `GrantTemplate`), `src/evaluator.rs:76` (`evaluate_expression`), `src/capability.rs:83,124` (`PolicyCapability`, `contains`)
