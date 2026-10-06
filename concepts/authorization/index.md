---
type: index
title: Authorization
description: The capability model — delegation, invocation, revocation, attenuation, and validation.
timestamp: 2026-10-05
---

# Authorization

The capability model — delegation, invocation, revocation, attenuation, and validation.

## Concepts

- [Capabilities](capabilities.md) — Capability = resource × ability × caveats, the unit of authorization across the protocol.
- [Cap-String Grammar](cap-string-grammar.md) — Capability string form service:space:path:actions and the {namespace}.{service}/{action} ability wire form.
- [CACAO Chain Validation](cacao-chain-validation.md) — The node's algorithm for validating a CACAO/UCAN delegation chain back to root authority.
- [Delegation](delegation.md) — Root SIWE→CACAO (ReCap) delegations and child UCAN delegations attenuating parent scope.
- [Invocation](invocation.md) — UCAN invocations executing an ability against a resource, verified against the delegation chain.
- [Revocation](revocation.md) — Retracting delegations and policy roots; checked chain-wide, failing closed on a revoked ancestor.
- [Attenuation](attenuation.md) — Subset check keeping a child's resources, abilities (with aliases), and caveats within its parent's.
- [Authorization Consistency Model](consistency-model.md) — Hybrid strong/eventual consistency for authorization state; general /invoke has no nonce-dedup table.
