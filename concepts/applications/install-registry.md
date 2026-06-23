---
type: concept
title: Install Registry
description: The per-owner record of installed apps — KV records under the applications/ key-prefix in the account space (one per app_id), mirrored into an account SQL index, managed by AccountService.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/sdk-core/src/account/AccountService.ts
  - repo: js-sdk
    path: packages/sdk-core/src/manifest.ts
tags: [applications, registry]
timestamp: 2026-06-23
---

# Install Registry

The **install registry** is the per-owner record of which [[manifest-model|manifest]] apps the user has installed: one KV record per `app_id`, stored under the **`applications/` key-prefix inside the [[system-spaces|`account` space]]**, and mirrored into an `account` SQL index for queryable listing. It is written automatically at [[capability-composition|sign-in]] (one record per composed manifest) and read/managed through `AccountService`. It is the answer to "what apps does this account have, and with what manifests".

## Role

The install registry is [[architecture-layers|Layer 1]] account state — the index an L3 [[architecture-layers|super-operable app]] or a management UI uses to enumerate the user's installed apps and their declared permissions. It closes the loop on the manifest model: [[capability-composition|composition]] produces a `registryRecord` per `app_id`, the user's one signature includes the `account`-space caps needed to write it, and the record persists what was installed so it can later be listed, re-synced, or removed — without re-reading every app's data space.

## Shape

Two stores, both in the `account` space:

- **KV record** — key `applications/<app_id>` (the constant `ACCOUNT_REGISTRY_PATH = "applications/"`, `manifest.ts:260`, inside `ACCOUNT_REGISTRY_SPACE = "account"`, `:257`). Value: `{ app_id, manifests, manifest_hash, updated_at }` — the *composed* manifest payloads for that app, with a content hash for change detection.
- **SQL index** — the `account` index db's `applications` table (`app_id, name, description, updated_at, manifest_json`) plus an `application_state` table (`app_id, manifest_hash, indexed_at`), materialized from the KV records (`AccountService.ts:376-415, 471-491`). Listing prefers this index for speed; the KV records are canonical.

> **Naming overload (read carefully).** The registry lives at `account/…/applications/<app_id>` — the **`applications/` key-prefix in the `account` space**. This is *not* the [[system-spaces|`applications` space]] where app data lives. App data: `applications` space, keyed `<app_id>/…`. Install record: `account` space, key `applications/<app_id>`. Listen's fixtures show both at once. See [[system-spaces]].

## Mechanics

`AccountService.applications` (`packages/sdk-core/src/account/AccountService.ts`):

- **`register(manifest | manifest[])`** (`:177-222`) — runs [[capability-composition|`composeManifestRequest`]], requires at least one `registryRecord`, ensures the `account` space is hosted, then for each record computes `hashJson(manifests)` and **skips the write if the index already holds that hash** (idempotent re-install); otherwise `put`s the `{app_id, manifests, manifest_hash, updated_at}` record at key `applications/<app_id>` and upserts the SQL index.
- **`list()`** (`:136-166`) — by default reads the SQL index, falling back to canonical KV records under the `applications/` prefix.
- **`remove(appId)`** (`:224-232`) — deletes the KV record and the index row.

At [[capability-composition|sign-in]] the SDK performs this registration as part of applying the composed request, which is why the implicit `account`-space caps (`tinycloud.kv` get/put/list on `applications/` and `spaces/`, plus the SQL index db) are injected into every manifest request (`manifest.ts:1199-1215`).

## Relationships

Stored in the [[system-spaces|account space]] under the `applications/` prefix (distinct from the [[system-spaces|applications space]]); records produced by [[capability-composition|capability composition]] (`registryRecords`); one record per [[manifest-model|manifest]] `app_id`; written/read/removed by `AccountService`; the `account`-space write caps come from the same single [[capabilities|capability]] grant the user signs; enumerable by L3 [[architecture-layers|super-operable apps]].

## Example

After [[example-listen|Listen]] signs in, the registry holds KV record `applications/xyz.tinycloud.listen` in the `account` space — value `{ app_id: "xyz.tinycloud.listen", manifests: [ <app manifest>, <backend delegate manifest> ], manifest_hash, updated_at }` — and a matching `applications` row in the account SQL index. A second sign-in with the same manifests is a no-op (hash match). (See [[example-listen]].)

## Status & drift

Shipped. The registry write is `@tinycloud/sdk-core` (`AccountService`) behavior, not enforced by `tinycloud-node`; an app that composes with `includeAccountRegistryPermissions: false` is *not* registered. Idempotency keys on `hashJson(manifests)`, so re-installing identical manifests writes nothing; changing any manifest field changes the hash and rewrites the record.

## Sources
- `js-sdk`: `packages/sdk-core/src/account/AccountService.ts:136-166` (`list`), `:177-232` (`register`/`remove`), `:376-491` (SQL index sync + tables); `packages/sdk-core/src/manifest.ts:257-260` (`ACCOUNT_REGISTRY_SPACE`/`ACCOUNT_REGISTRY_PATH`), `:1199-1215` (implicit account caps), `:1261-1271` (`registryRecords`)
