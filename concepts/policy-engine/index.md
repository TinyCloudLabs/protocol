---
type: index
title: Policy Engine
description: "The central permissioning primitive: owner-signed policies that the Node turns into credential-gated delegations (Policy v3)."
timestamp: 2026-10-05
---

# Policy Engine

The central permissioning primitive: owner-signed policies that the Node turns into credential-gated delegations. In production this is Policy v3, built into Node 1.17.3.

## Concepts

- [Policy Engine Overview](overview.md) — What a policy is, why it is a principal, and how the Node mints sessions from it (shipped; policy-core v0 kept as history).
- [Policy v3 Admission](policy-v3-admission.md) — Registration, sibling roots, challenge and mint, session lifetime, re-delegation, and the per-invocation gate.
- [Policy as Central Primitive](policy-as-central-primitive.md) — The framing that a signed rule is what owners author; one credential requirement ships, a general grammar does not.
- [Credential-Gated Delegation](credential-gated-delegation.md) — The Node verifies an OpenCredentials vc+sd-jwt credential once, at mint.
- [Agent Transaction Policy](agent-transaction-policy.md) — Planned agent enrollment; today's agent hand-off is received-share re-delegation.
