---
type: concept
title: Hooks Service
description: A subscribe/webhook service that fires on space writes, letting clients and backends react to changes in real time, via tinycloud.hooks/* capabilities.
status: shipped
layer: protocol
resource: tinycloud.hooks/*
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/hooks.rs
  - repo: tinycloud-node
    path: tinycloud-core/src/write_hooks.rs
  - repo: js-sdk
    path: packages/sdk-services/src/hooks/HooksService.ts
tags: [service, hooks, events]
timestamp: 2026-06-23
---

# Hooks Service

The **hooks service** lets a client or backend **react to writes** in an [[autonomic-space|space]] — by subscribing for live updates or registering a webhook — exercised through `tinycloud.hooks/*` [[capabilities|capabilities]]. It is how an app gets a push instead of polling when space data changes.

## Role

A [[services|Layer 1 service]] for eventing. It turns the space's ordered write stream (see [[epochs-dag]]) into notifications a [[capabilities|capability]]-holder can consume, without granting it broader access.

## Shape

- **resource** — `{spaceId}/hooks[/{path}]` (subscribe scoped to a path/prefix).
- **abilities** — `tinycloud.hooks/{subscribe, …}` (+ webhook registration).

## Mechanics

Writes pass through `tinycloud-core/src/write_hooks.rs`, which fires registered hooks; the HTTP surface (subscribe streams / webhook registration) is `tinycloud-node-server/src/routes/hooks.rs`; the client is `HooksService` (`packages/sdk-services/src/hooks/`). A subscription is itself authorized by a [[capabilities|capability]] over `{spaceId}/hooks`.

## Relationships

A [[services|service]] over an [[autonomic-space|space]]; consumes the same write events ordered by [[epochs-dag]]; gated by [[capabilities]]; [[example-listen|Listen]] uses `tinycloud.hooks/subscribe` for live transcript updates.

## Status & drift

Shipped.

## Sources
- `tinycloud-node`: `tinycloud-node-server/src/routes/hooks.rs`, `tinycloud-core/src/write_hooks.rs`
- `js-sdk`: `packages/sdk-services/src/hooks/HooksService.ts`
