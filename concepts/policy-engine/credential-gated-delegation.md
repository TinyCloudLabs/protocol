---
type: concept
title: Credential-Gated Delegation
description: Credential-gated delegation v0: delegations conditioned on verifiable credentials.
status: in-progress
sources:
  - repo: data-exchange
    path: proposals/information-sphere-v0/tinycloud-unified-policy-engine-proposal.md
  - repo: tinycloud-node
    path: tinycloud-core/src/models/revocation.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/sql/caveats.rs
provenance_note: design-only for the policy runtime + VC verifier (the planned TinyCloudLabs/policy-engine repo is not yet checked out / has no implementing code as of 2026-06); only the native authority pieces (revocation, SQL caveats) exist in tinycloud-node.
tags: [policy-engine, credentials]
timestamp: 2026-06-22
---

# Credential-Gated Delegation

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** in-progress. Credential-gated delegation v0: delegations conditioned on verifiable credentials.

## Sources
- `policy-engine`
