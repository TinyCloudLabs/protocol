---
type: concept
title: Feed (Listen Explorer)
description: Feed is the Layer-3 super-operable app that reads conversation data from the Listen applications space — an example of cross-app data access under the user's own capabilities.
status: shipped
layer: application
tags: [applications, listen, feed, super-operable]
timestamp: 2026-06-23
---

# Feed (Listen Explorer)

**Feed** is a [[architecture-layers#layer-3-super-operable-applications|Layer-3 super-operable app]] that reads conversation data produced by [[example-listen|Listen]] (the canonical Layer-2 app) directly from the owner's [[system-spaces|`applications` space]] — without going through the Listen app itself. It demonstrates that TinyCloud data is owned by the user, not the app: a separate application can read the same space if the owner grants it the capability, using the same [[cacao-chain-validation|authorization chain]] with no special API or backend cooperation from Listen.

## Role

Feed is the concrete example of [[architecture-layers|Layer-3]] super-operability — an app that composes across other apps' data. It:

1. Self-grants read capabilities as the owner over the [[system-spaces|`applications`]] space.
2. Queries the same `conversations` SQL table and `transcript/<id>` KV keys that [[example-listen|Listen]] writes.
3. Presents a read-only explorer view of meeting transcripts, independently of the Listen app.

This is the same data, a different identity (the Feed app session key), and all of it authorized under the owner's [[capabilities]] — illustrating why [[system-spaces]] are the user's, not the app's.

## Source discrepancies

Two transcript path conventions coexist in the [[example-listen|Listen]] backend (documented here as known drift):
- `transcript/<id>` — the path `persist-conversation.ts` writes.
- `importer/transcripts/<id>` — the path the `listen-importer` uses.

The `listen-importer` also currently writes without `--space`, which may land conversations in `default` rather than `applications`. Feed reads the backend-written paths (`persist-conversation.ts`) as canonical.

## Relationships

Layer-3 consumer of [[example-listen|Listen]] data; reads the [[system-spaces|`applications` space]]; authorized via [[capabilities]] + [[cacao-chain-validation]]; demonstrates [[architecture-layers|super-operability]]; the data schema it reads is defined in [[example-listen]]; the policy governing cross-app reads is [[capability-composition]].

## Status & drift

Shipped. Feed is an operational read-only explorer. See the two importer-path discrepancies above as known, non-blocking drift.
