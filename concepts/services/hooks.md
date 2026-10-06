---
type: concept
title: Hooks Service
description: A subscribe/webhook service that fires on space writes, letting clients and backends react to changes in real time, via the tinycloud.hooks/{subscribe, register, unregister, list} abilities.
status: shipped
layer: protocol
resource: tinycloud.hooks/*
sources:
  - repo: tinycloud-node
    path: capabilities.json@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/hooks.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/hooks.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/write_hooks.rs@05c6a93
  - repo: js-sdk
    path: packages/sdk-services/src/hooks/HooksService.ts@d43e51ea
tags: [service, hooks, events]
timestamp: 2026-10-05
---

# Hooks Service

The **hooks service** lets a client or backend **react to writes** in a [[autonomic-space|space]] — by subscribing to a live event stream or registering a webhook — exercised through `tinycloud.hooks/*` [[capabilities|capabilities]]. It is how an app gets a push instead of polling when space data changes.

## Role

A [[services|Layer 1 service]] for eventing. It turns the space's ordered write stream (see [[epochs-dag]]) into notifications a [[capabilities|capability]]-holder can consume, without granting it broader access to the data.

## Shape

- **resource** — `{spaceId}/hooks[/{path}]`; a subscription or webhook is scoped to a path prefix.
- **abilities** — four, all `active` in the node's capability registry (`capabilities.json`):

| Ability | Used for |
|---|---|
| `tinycloud.hooks/subscribe` | Live event stream (SSE) for a scope |
| `tinycloud.hooks/register` | Create a webhook subscription |
| `tinycloud.hooks/unregister` | Delete a webhook subscription |
| `tinycloud.hooks/list` | List webhook subscriptions |

### Routes

The HTTP surface is `tinycloud-node-server/src/routes/hooks.rs`:

- `POST /hooks/tickets` — exchange an authorized [[invocation]] for a short-lived **ticket** covering one or more subscriptions (`:32`).
- `GET /hooks/events?ticket=…` — open a **Server-Sent Events** stream for that ticket (`:119`). The stream ends no later than the ticket's expiry.
- `POST /hooks/webhooks` — register a webhook callback URL for a scope (`:214`).
- `GET /hooks/webhooks` — list webhook subscriptions (`:272`).
- `DELETE /hooks/webhooks/<subscription_id>` — remove a webhook (`:309`).

## Mechanics

Writes pass through `tinycloud-core/src/write_hooks.rs`, which emits events to the node's hook runtime (`tinycloud-node-server/src/hooks.rs`); live subscribers receive them over SSE and registered webhooks get deliveries from the webhook dispatcher. Webhook secrets are stored encrypted with the node's [[at-rest]] column encryption. The client is `HooksService` (`packages/sdk-services/src/hooks/`).

## Relationships

A [[services|service]] over an [[autonomic-space|space]]; consumes the same write events ordered by [[epochs-dag]] (including [[kv]] writes); gated by [[capabilities]]; [[example-listen|Listen]] uses `tinycloud.hooks/subscribe` for live transcript updates. For a resumable, ordered history of key state rather than live pushes, see the in-progress [[kv]] change feed.

## Status & drift

Shipped in Node 1.17.3 (`hooks` is in the live `/version` feature list).

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `capabilities.json` (four `tinycloud.hooks/*` abilities), `tinycloud-node-server/src/routes/hooks.rs:32,119,214,272,309` (routes), `tinycloud-node-server/src/hooks.rs` (hook runtime, tickets), `tinycloud-core/src/write_hooks.rs` (write events)
- `js-sdk` @d43e51ea: `packages/sdk-services/src/hooks/HooksService.ts`
