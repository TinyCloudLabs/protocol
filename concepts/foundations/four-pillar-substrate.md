---
type: concept
title: Four-Pillar Substrate
description: Team framing — sovereign data structures, identity/credentialing, the central policy/permissioning engine, and replication.
status: in-progress
sources:
  - repo: listen
  - repo: technology-map
tags: [framing, substrate]
timestamp: 2026-06-23
---

# Four-Pillar Substrate

The **four-pillar substrate** is the team's framing of what TinyCloud provides
as a base layer for sovereign computing. It names four pillars and, importantly,
elevates one of them — the policy/permissioning engine — as the central
primitive the rest organize around.

> **Status:** in-progress. This is design-intent framing drawn from team work
> sessions. Pillars (1) and (2) map onto shipped protocol surfaces; pillar (3)
> is partially shipped (capabilities) and partially planned (the generalized
> policy engine); pillar (4) is present in the codebase but not yet mounted.

## The four pillars

1. **Sovereign data structures.** User-controlled
   [spaces](../spaces/autonomic-space.md) as the unit of ownership, with
   content-addressed [storage](../storage/blob-store.md) and per-space data
   [services](../services/index.md) (KV, SQL, DuckDB). See
   [sovereign data](./sovereign-data.md).
2. **Identity & credentialing.** Owner [DIDs](../identity/dids.md),
   [SIWE](../identity/siwe.md) sign-in, ephemeral
   [session keys](../identity/session-keys.md), and the distinct
   [credentials](../credentials/index.md) layer (OpenCredentials) that *feeds*
   the policy engine.
3. **The policy / permissioning engine — the central primitive.** The capability
   model ([capabilities](../authorization/capabilities.md),
   [delegation](../authorization/delegation.md),
   [invocation](../authorization/invocation.md),
   [attenuation](../authorization/attenuation.md)) generalizing into an *agent
   transaction policy engine*. The team's position is that the site should
   foreground this engine rather than bury it; see
   [policy engine](../policy-engine/index.md) and
   [policy as central primitive](../policy-engine/policy-as-central-primitive.md).
4. **Replication & peer discovery.** Hash-linked authorization events
   propagating across trusted nodes, modeled on Bitcoin/Ethereum P2P. See
   [consistency](../consistency/index.md) and
   [replication](../consistency/replication.md).

## Why the policy engine is central

The other three pillars exist to be *governed*. Data is only sovereign if access
to it is decided by owner-defined policy; identity and credentials only matter
because they are *inputs* the policy engine evaluates; replication only carries
the authorization events the engine produces. Framing permissioning as the
central primitive is what lets TinyCloud generalize from a data store into a
substrate for agent transactions — every agent action becomes a
capability-checked invocation against owner policy.

## Status of each pillar in code

- Pillars 1 and 2 are largely **shipped** (spaces, identity, SIWE, session keys,
  capability services).
- Pillar 3's capability core is **shipped**; the generalized "agent transaction
  policy engine" is **in-progress / design-intent** —
  see [policy engine overview](../policy-engine/overview.md).
- Pillar 4's replication subsystem is present in the node codebase but
  **not yet mounted**, so it is **planned**. See
  [replication](../consistency/replication.md).

The [thesis](./thesis.md) is the single-sentence version of this substrate; the
[trust model](./trust-model.md) describes who you trust for it to hold.

## Open questions

- The precise boundary between the shipped capability model and the proposed
  generalized "agent transaction policy engine" is still being drawn. Treat the
  generalized engine as design-intent until reflected in node code.

## Sources
- `listen` — team work-session framing (policy engine as central primitive;
  four-pillar substrate; replication as first-class future work)
- `technology-map` — sovereign-core / exosuit positioning that this framing
  extends
