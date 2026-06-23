---
type: concept
title: Sovereign Data
description: Hold and share data without platforms, the way Bitcoin lets people hold value without banks.
status: shipped
sources:
  - repo: whitepaper
    path: README.md
tags: [framing, data-sovereignty]
timestamp: 2026-06-23
---

# Sovereign Data

Sovereign data is the property that you — not a platform — hold and share your
data, enforced cryptographically rather than by policy. TinyCloud is a protocol
for creating **spaces**: user-controlled data containers in which the owner
retains complete control over their information. Every space has an owner whose
key is the top authority for that space and for any encryption networks attached
to it.

## What "sovereign" buys you

- **No custodian.** Data lives in [spaces](../spaces/autonomic-space.md) you
  control. Hosts serve and replicate it but never become its owner; ownership is
  defined by the key, not by which server holds the bytes.
- **Explicit, revocable sharing.** Owners grant scoped capabilities to delegates
  — applications, services, devices, AI agents, session keys — via
  [delegation](../authorization/delegation.md), and withdraw them via
  [revocation](../authorization/revocation.md). Sharing is a signed grant, not a
  database row a platform can flip.
- **Self-verifying access.** Each delegation proves authorization back to the
  owner without consulting an external registry, so a request can be checked
  anywhere the signature chain travels. See
  [capabilities](../authorization/capabilities.md).

## Legibility without exposure

The central tension TinyCloud resolves: *legibility* (structuring data so AI and
apps can use it) usually destroys *asymmetry* (the privacy that preserves its
value). Conventional systems make you choose. TinyCloud gives you both —
full legibility to your own agents and applications, full asymmetry to everyone
else — because access is mediated by owner-rooted signatures instead of platform
terms of service. This is the operational meaning of the
[thesis](./thesis.md): signatures are all you need.

Confidentiality is layered on top: data can be encrypted client-side and only
decrypted through capability-gated requests, so even a hosting node need not see
plaintext — see [encryption networks](../encryption/encryption-networks.md) and
[user-bound decrypt](../encryption/user-bound-decrypt.md).

## Portability

Because authority is the owner's key and access is a self-verifying signature
chain, the same sovereign data follows the user across applications. Swap one
agent or app for another and it picks up the same data and identity, scoped to
only what you granted. This portability is the foundation the
[four-pillar substrate](./four-pillar-substrate.md) builds on, and the
[trust model](./trust-model.md) explains exactly which parties you must trust to
get it.

## Sources
- `whitepaper` — `README.md` (Abstract, §1 Introduction)
