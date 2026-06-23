---
type: concept
title: Cap-String Grammar
description: The two wire forms a capability takes — the ability string {namespace}.{service}/{action} and the compact service:space:path:actions cap-string used in grants and the CLI.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: dependencies/siwe-recap/src/capability.rs
  - repo: js-sdk
    path: packages/sdk-core/src/capabilities.ts
tags: [authz, grammar]
timestamp: 2026-06-23
---

# Cap-String Grammar

A [[capabilities|capability]] is written down in two complementary string forms: the **ability** `{namespace}.{service}/{action}` (the verb) and the **resource** [[uri-addressing-grammar|URI]] (the noun). A compact **cap-string** `service:space:path:actions` bundles a resource+abilities for grants and the [[cli|CLI]], and inside a [[siwe|SIWE]] message capabilities are encoded as a **[[recap|ReCap]]**.

## Role

These are the textual encodings that let a capability cross a wire, a signature, or a command line. They are [[architecture-layers|Layer 1]] surface syntax over the `resource × ability × caveats` model of [[capabilities]].

## Shape

- **Ability** (confirmed): `{namespace}.{service}/{action}` — e.g. `tinycloud.kv/put`, `tinycloud.sql/query`, `tinycloud.space/host`. Namespace is `tinycloud`; service matches the [[services|service]]; action is the verb.
- **Resource**: the [[uri-addressing-grammar|URI]] `{spaceId}/{service}[/path]`.
- **ReCap encoding**: inside a [[siwe|SIWE]] statement, capabilities ride as a `urn:recap:…` object mapping resources → abilities (`dependencies/siwe-recap/src/capability.rs`). This is the form the wallet actually signs.
- **Compact cap-string**: `service:space:path:actions` — used in grant requests and `tc` [[cli|CLI]] flags (e.g. `tinycloud.kv:applications:xyz.tinycloud.listen/:get,list`). Parsed/produced around `packages/sdk-core/src/capabilities.ts`.

## Relationships

Encodes a [[capabilities|capability]]; its resource half follows the [[uri-addressing-grammar]]; its ReCap form is carried by [[siwe|SIWE]]/[[cacao|CACAO]] and validated in [[cacao-chain-validation]]; narrowed per [[attenuation]]; used at the [[cli|CLI]].

## Status & drift

Shipped. The ability form and the ReCap encoding are firm. The compact `service:space:path:actions` cap-string is the SDK/CLI convenience form — confirm exact field order against `packages/sdk-core/src/capabilities.ts` before depending on it programmatically (flagged for follow-up validation in `meta/validation-log.md`).

## Sources
- `tinycloud-node`: `dependencies/siwe-recap/src/capability.rs` (ReCap encoding)
- `js-sdk`: `packages/sdk-core/src/capabilities.ts` (cap-string parse/subset)
