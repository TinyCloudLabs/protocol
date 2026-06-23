---
type: concept
title: Manifest Model
description: The app manifest is a declarative app/data contract — app_id namespace, a default applications space, declared permissions and secrets, and an optional did marking the manifest as a delegation target.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/sdk-core/src/manifest.ts
tags: [applications, manifest]
timestamp: 2026-06-23
---

# Manifest Model

A **manifest** is the declarative **app/data contract** a TinyCloud app declares: a stable `app_id` namespace, the [[system-spaces|spaces]] and [[services|services]]/paths/actions it needs, the named [[vault-secrets|secrets]] it reads, and an optional `did` that marks the manifest as a [[delegation]] target. It is *not* backend config — it describes *what app, which spaces/services/paths/actions, and why* — and it is the single input that `resolveManifest` expands into the [[capabilities|capability]] set a user signs at sign-in. The SDK never fetches manifests; an app composes its own (optionally with backend/agent addenda) and hands it in.

## Role

The manifest is [[architecture-layers|Layer 1]] machinery that the L2 [[architecture-layers|TinyCloud apps]] use to declare themselves. It is the bridge between an app's *stated* data needs and the [[capabilities|capabilities]] the protocol enforces: a `Manifest` resolves to `ResourceCapability[]`, those become a single [[capability-composition|composed]] [[siwe|SIWE]]/[[recap|ReCap]] request, the user grants once, and the same manifest record is written to the [[install-registry|install registry]]. A manifest that declares a `did` doubles as a *pre-authorized delegation* — at sign-in the user approves a downstream grant to that DID (a [[tee-backends|TEE backend]], an agent) in the same prompt.

## Shape

The `Manifest` interface (`packages/sdk-core/src/manifest.ts:91-133`):

```ts
interface Manifest {
  manifest_version?: 1;
  app_id: string;                 // required: namespace + default path prefix
  name: string;                   // required
  description?: string;
  did?: string;                   // delegate target; required ONLY for delegation materialization
  icon?: string;
  appVersion?: string;
  expiry?: string;                // ms-format ("30d", "2h"), default "30d"
  space?: string;                 // default "applications"
  prefix?: string;                // path prefix, default app_id; "" disables
  defaults?: boolean | "admin" | "all";  // default true → standard tier
  includePublicSpace?: boolean;   // default true
  permissions?: PermissionEntry[];
  secrets?: Record<string, ManifestSecretActions>;
}
```

Field semantics that matter:

- **`app_id`** — the namespace and, by default, the `prefix` prepended to every permission path. Whitepaper convention is reverse-DNS `xyz.tinycloud.*` (e.g. `xyz.tinycloud.listen`); code enforces only non-empty (`validateManifest`, `:613`).
- **`space`** — omitted → `DEFAULT_MANIFEST_SPACE = "applications"` (`:254`). App data lands in the [[system-spaces|applications space]], keyed under the `app_id` prefix.
- **`defaults`** — the built-in tier: `true`/standard = KV (`get/put/del/list/metadata`) + SQL (`read/write`) over the space `/`; `"admin"` adds `sql/ddl`; `"all"` adds DuckDB. `false` = explicit permissions only (`:325-383`).
- **`permissions[]`** — explicit [[capabilities|capability]] entries (`PermissionEntry`: `service`, `space?`, `path`, `actions[]`, `skipPrefix?`, `expiry?`, `description?`) for cross-space access, DuckDB, or `skipPrefix:true` absolute paths.
- **`secrets{}`** — declared [[vault-secrets|secrets]]; each entry (`true` | action | actions[] | `{name,scope,actions,expiry,description}`) expands to a `tinycloud.vault` read on the [[secrets-space|secrets space]] (see [[secrets-space]]).
- **`did`** — present → the manifest's full resolved permission set becomes an `additionalDelegate` (`:846-856`), i.e. a [[delegation]] target the user pre-authorizes.

## Mechanics

`resolveManifest(input)` (`:820-867`) validates the manifest, then unions three sources in order — **default-tier** entries (per `defaults`), **explicit** `permissions[]`, and **secret** entries (`secretEntriesForManifest`) — applying the `prefix` to each path, expanding short action names to URNs (`tinycloud.kv/get`), expanding the `tinycloud.vault` and `tinycloud.encryption` shorthands, and adding a `tinycloud.capabilities/read` per touched space (`withCapabilitiesReadForSpaces`). The result is a `ResolvedCapabilities` carrying `app_id`, effective `space`, the `ResourceCapability[]`, `expiryMs`, `includePublicSpace`, and (if `did` set) the `additionalDelegates`. Multiple manifests are then folded together by [[capability-composition|composeManifestRequest]].

## Relationships

Resolved by `resolveManifest` into [[capabilities|capabilities]]; merged by [[capability-composition|capability composition]] into one [[siwe|SIWE]]/[[recap|ReCap]] request; its `app_id` namespaces data in the [[system-spaces|applications space]] and its record is stored in the [[install-registry|install registry]]; its `secrets{}` block targets the [[secrets-space|secrets space]] via [[vault-secrets|vault secrets]]; a manifest with a `did` becomes a [[delegation]] target, typically a [[tee-backends|TEE backend]]; worked end-to-end in [[example-listen|Listen]].

## Example

[[example-listen|Listen]]'s `manifest.json`: `app_id: "xyz.tinycloud.listen"`, `defaults: true`, a `secrets{}` block (`FIREFLIES_API_KEY: ["read"]`, …), and one explicit `tinycloud.hooks/subscribe` permission with `skipPrefix: true`. No `space` → app data routes to `applications` under `xyz.tinycloud.listen/…`; no `did` on the app manifest → the app itself is not a delegation target (the backend's *separate* delegate manifest carries the `did`). (See [[example-listen]] and [[tee-backends]].)

## Status & drift

Shipped. The canonical spec is the SDK's `.claude/specs/manifest.md`; code is canonical here. `app_id` format is convention only — `validateManifest` requires just a non-empty string, so test fixtures use forms like `com.listen.app` while the production app uses `xyz.tinycloud.listen`. Unknown `defaults` strings silently fall back to `true`.

## Sources
- `js-sdk`: `packages/sdk-core/src/manifest.ts:91-133` (`Manifest`), `:140-217` (`ResourceCapability`/`ResolvedCapabilities`/`ComposedManifestRequest`), `:254-383` (space/tier constants + default entries), `:613` (`validateManifest`), `:820-867` (`resolveManifest`), `:971-999` (`secretEntriesForManifest`)
