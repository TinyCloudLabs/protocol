---
type: concept
title: Thesis
description: "Signatures Are All You Need: cryptographic access control for AI and applications."
status: shipped
sources:
  - repo: whitepaper
    path: README.md
tags: [framing, thesis]
timestamp: 2026-06-23
---

# Thesis

> **Signatures Are All You Need: Cryptographic Access Control for AI and Applications.**

Bitcoin let people hold and transfer value without banks. TinyCloud lets people
hold and share data without platforms. Both rely on the same primitive:
cryptographic signatures. Show up anywhere with your key — one signature proves
ownership and unlocks access.

## The single primitive

Every access in TinyCloud reduces to verifying a chain of signatures back to a
data owner. There is no platform account and no central registry to consult at
access time. A request is authorized if and only if it carries a self-verifying
signature chain rooted in the owner's key. This is what "signatures are all you
need" means concretely: authorization is a property of the message, not of a
backend's mutable state.

Owner keys need only two properties: they must be **self-custodiable** and able
to **update a public registry**. Any key with those properties can be an owner
key. TinyCloud uses Ethereum keys by default because they satisfy both and
inherit mature tooling for wallets, signatures, recovery, and registry updates —
see [DIDs](../identity/dids.md) and [Sign-In with Ethereum](../identity/siwe.md).

## Why it matters now

As software gets cheap to build, advantage shifts to data ownership. AI tools
need structured, machine-readable data to be useful — you cannot ask an AI "what
did I say yesterday?" without transcripts. That pressure to make data *legible*
collides with the fact that information asymmetry is what preserves value.
Traditional clouds force a choice: structure your data for AI and expose it to a
platform operator, or keep it private and unusable. TinyCloud dissolves the
tradeoff: data is fully legible to *your* agents and applications while remaining
asymmetric to everyone else, because access is gated by owner-rooted signatures
rather than platform terms of service.

In an era of synthetic content and cloneable voices, this verifiability runs
end-to-end. When an AI system operates on your data, the
[capability](../authorization/capabilities.md) it presents proves who authorized
what, all the way back to you.

## How the rest of the protocol follows

- Owners create [spaces](../spaces/autonomic-space.md) — user-controlled data
  containers — and grant scoped, revocable capabilities to delegates
  (applications, services, devices, AI agents, session keys).
- Each grant is a [delegation](../authorization/delegation.md); each access is an
  [invocation](../authorization/invocation.md); access can be withdrawn via
  [revocation](../authorization/revocation.md).
- Authorization events form a hash-linked graph that replicates across trusted
  nodes for eventual consistency without centralized coordination — see the
  [consistency model](../authorization/consistency-model.md).

The companion framings — [sovereign data](./sovereign-data.md), the
[[architecture-layers|three-layer architecture]], and the
[trust model](./trust-model.md) — expand on what this thesis buys the user.

## Sources
- `whitepaper` — `README.md` (Abstract, §1 Introduction)
