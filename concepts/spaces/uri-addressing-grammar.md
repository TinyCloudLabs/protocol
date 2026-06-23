---
type: concept
title: URI / Addressing Grammar
description: Wire-level resource grammar tinycloud:pkh:eip155:{chain}:{addr}:{space}/{service}/{path} and the ln: short form.
status: shipped
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/types/resource.rs
  - repo: tinycloud-node
    path: tinycloud-auth/src/resource.rs
  - repo: whitepaper
    path: appendix/appendix-b-uri-abnf-grammar.md
tags: [spaces, addressing, top-gap]
timestamp: 2026-06-22
---

# URI / Addressing Grammar

<!-- TODO: author from sources. Validate technical claims with: scripts/cx <repo> "<question>" -->
<!-- Cross-link related concepts with normal markdown links: [Capabilities](../authorization/capabilities.md) -->

> **Status:** shipped. Wire-level resource grammar tinycloud:pkh:eip155:{chain}:{addr}:{space}/{service}/{path} and the ln: short form.

## Sources
- `tinycloud-node`: `tinycloud-auth/resource.rs:262`
