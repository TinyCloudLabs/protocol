---
type: concept
title: Architecture Layers
description: The locked three-layer model — protocol (L1), TinyCloud apps (L2), and super-operable applications (L3) — that organizes the whole TinyCloud stack.
status: in-progress
layer: protocol
sources:
  - repo: listen
  - repo: technology-map
tags: [framing, architecture, three-layer]
timestamp: 2026-06-23
---

# Architecture Layers

TinyCloud is organized as **three layers of technology**: a base **[[#layer-1-protocol|protocol]]** (the cryptographic, identity, and permissioning substrate), **[[#layer-2-tinycloud-apps|TinyCloud apps]]** (manifest apps built by TinyCloud that bring data in and enshrine particular spaces), and **[[#layer-3-super-operable-applications|super-operable applications]]** (top-level apps that compose a user's data across every layer into a novel experience). Each layer consumes the one below it.

## Role

This is the canonical map of the stack. It replaces the earlier "four-pillar substrate" framing (rejected — it was never a real model). Every concept in this bundle carries a `layer:` frontmatter value — `protocol`, `tinycloud-app`, or `application` — so the layering is queryable metadata and a [[meta/glossary|vocabulary]] filter without reorganizing the topical directories. Read this concept to know *where* any other concept sits and *what* it is allowed to depend on.

## Members

### Layer 1 — Protocol

The cryptographic + identity + permissioning substrate. Everything else is built on it. Members:

- **The base protocol** — [[autonomic-space|spaces]] (the sovereign data primitive), [[capabilities]] (the unit of authority), [[delegation]] (how authority is passed), [[services]] (kv / sql / encryption / …, the verbs over a space), [[autonomic-space]] addressing (the [[uri-addressing-grammar|URI grammar]] that names every resource), and [[consistency]] (ordering and replication of authorization state).
- **[[openkey|OpenKey]]** — the identity layer: passkey/TEE-backed [[dids|DIDs]] and [[siwe|SIWE]] sign-in that produce the owner key every [[capabilities|capability]] chain roots in.
- **[[policy-engine|policy engine]]** — the permissioning layer: evaluates owner-defined policy over [[capabilities|capabilities]] and [[credentials]]. **`tinycloud-node` consumes the policy engine** at runtime (it is a dependency the node pulls in, not code that lives inside the node).

Layer 1 is what makes authority **portable and server-independent**: a request is authorized by the signatures it carries, not by a backend's mutable state (see [[thesis]]).

### Layer 2 — TinyCloud apps

**Manifest apps built by TinyCloud** that bring data into the protocol and **enshrine particular spaces**. They are ordinary [[manifest-model|manifest]] apps — they declare their data needs and permissions, get a single composed [[capability-composition|capability grant]], and write into the [[system-spaces|system spaces]] — but they are authored by TinyCloud as first-class data sources. Members:

- **[[example-listen|Listen]]** — the conversation/transcript data source.
- **[[credentials|OpenCredentials]]** — verifiable credentials (SD-JWT / W3C VCs) that feed the [[policy-engine|policy engine]].
- **[[secrets|Secrets]]** — the encrypted secret manager backed by the [[system-spaces|`secrets` space]].

Layering note: **Listen is built on top of the other L2 apps** (it consumes credentials and secrets) but is itself an L2 manifest app — sitting atop a peer does not promote it to L3.

### Layer 3 — Super-operable applications

Top-level applications — e.g. **[[apps-feed-listen|Feed]]** — that deliver a novel user experience by composing data across the whole stack.

**Super-operable = TinyCloud-interoperable.** A super-operable app composes the user's *own app data* **plus all their other TinyCloud data** — under the L1 permission/policy layer — into an experience no single data source could provide. Feed, for example, reads a user's Listen data alongside the rest of their TinyCloud-held data, gated by the policy engine, to produce something new. (Fuller definition pending in [[meta/glossary]]; `in-progress`.)

## Adjacencies

The layers form a strict dependency stack, each consuming the one below:

- **L3 → L2 → L1.** Super-operable apps consume TinyCloud apps and the protocol; TinyCloud apps consume the protocol; the protocol depends on nothing above it.
- **L1 internal:** the [[policy-engine|policy engine]] and [[openkey|OpenKey]] are peers of the base protocol within L1, not separate tiers — `tinycloud-node` consumes the policy engine to decide whether a [[capabilities|capability]] [[invocation]] is admitted.
- **Cross-cutting:** [[capabilities]] flow up through every layer — an L3 app's access to an L2 app's data is itself an L1 capability [[delegation]] chain rooted at the user's [[dids|owner DID]].

The [[thesis]] is the one-sentence version of why this stack holds together; the [[trust-model]] describes who you trust for it to hold.

## Status & drift

`in-progress`. The three-layer model is **locked** (Sam, 2026-06-23) and replaces "four-pillar substrate." The L1 base protocol, OpenKey, and the capability core are **shipped**; the generalized [[policy-engine|policy engine]] and the "super-operable" framing for L3 are still being drawn — treat the precise L1-internal boundary of the policy engine, and the full super-operable definition, as design-intent until reflected in code and [[meta/glossary]].

## Sources
- `listen` — team work-session framing (three-layer model; super-operable = TinyCloud-interoperable; Listen as L2 atop other L2 apps)
- `technology-map` — sovereign-core / exosuit positioning this model extends
