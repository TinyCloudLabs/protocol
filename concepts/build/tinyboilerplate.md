---
type: reference
title: tinyboilerplate
description: The runnable TinyCloud app substrate — a Bun workspace of shared client/server packages, a blank app-starter template, a Notes example, an agent-runtime sidecar, and a scaffold CLI that materializes standalone apps.
status: shipped
layer: tinycloud-app
sources:
  - repo: tinyboilerplate
    path: README.md
  - repo: tinyboilerplate
    path: package.json
  - repo: tinyboilerplate
    path: packages/client/src/index.ts
  - repo: tinyboilerplate
    path: packages/server/src/index.ts
  - repo: tinyboilerplate
    path: scripts/scaffold-app.ts
  - repo: tinyboilerplate
    path: packages/agent-runtime/docker/delegation-endpoint.ts
tags: [applications, reference, boilerplate, sdk]
timestamp: 2026-07-02
---

# tinyboilerplate

[`tinyboilerplate`](https://github.com/TinyCloudLabs/tinyboilerplate) is the **runnable substrate** for building a TinyCloud app: a Bun workspace of shared client/server packages, a blank `app-starter` template, a real `Notes` example, an agent-runtime sidecar, and a scaffold CLI that stamps out standalone apps. Where [[tinycloud-app-kit]] defines the *contract*, this repo is the working code that implements it. The step-by-step run is [[getting-started]]; the architecture it embodies is [[how-apps-work]]. This page encodes the substance; the repo README has the full runbook.

## Layout

```text
tinyboilerplate/
  packages/
    core/            # shared types + constants (DelegationStatus, StoredDelegation, ServerInfo)
    client/          # browser helpers: OpenKey, TinyCloud sign-in, manifest compose, delegation, API client
    server/          # backend helpers: identity, session refresh, delegation store + cache
    agent-runtime/   # Docker sidecar that activates a delegation for the `tc` CLI/agent
  templates/
    app-starter/     # blank starter — frontend :5175, backend :3003
  examples/
    notes/           # first real product example — frontend :5174, backend :3002
  scripts/scaffold-app.ts
  package.json       # Bun workspace root
```

## Packages

**`@tinyboilerplate/client`** (`packages/client/src/index.ts`) — framework-agnostic browser helpers over [[packages|`@tinycloud/web-sdk`]] and [[openkey|`@openkey/sdk`]]:

- `connectWallet(config?)` → OpenKey passkey → an `{ address, web3Provider }` EIP-1193 provider.
- `createTinyCloudWeb(provider, config?)` / `createAndSignIn(provider, config?)` — build a `TinyCloudWeb` and run [[sign-in-flow|sign-in]] with a `manifest` or a pre-composed `capabilityRequest`.
- `loadAppManifest(url)`, `composeManifestWithBackend(manifest, serverInfo)`, `composeManifestWithDelegatees(manifest, infos[])` — load and [[capability-composition|compose]] the app manifest with backend/agent policies.
- `createManifestDelegation(tcw, backendDID, capabilityRequest)`, `sendDelegation`, `checkDelegationStatus`, `revokeDelegation` — materialize and manage the backend's [[delegation-api|PortableDelegation]].
- `SessionStore`, `createApiClient(url, { sessionStore })` — Bearer-token session + a fetch wrapper that clears the session on 401.

**`@tinyboilerplate/server`** (`packages/server/src/index.ts`) — backend helpers over [[packages|`@tinycloud/node-sdk`]]:

- `createBackendIdentity({ privateKey, host?, prefix })` → signs in a `TinyCloudNode` and returns `{ node, did }`. The backend has its **own** [[system-spaces|space]] and a slash-free operational `prefix`.
- `withSessionRefresh(node, fn)` — retry a KV/SQL op once after re-signing-in on a session error (wallet-mode sessions expire after ~1h).
- `DelegationStore` (persists delegations in the backend's own KV under `delegations/<addr>`) and `DelegationCache` (in-memory `DelegatedAccess`, 50-min TTL).
- Re-exports `DelegatedAccess` — the [[tee-backends|delegated]] handle whose `.kv` / `.sql` are the [[data-apis|data APIs]] the backend uses to touch user data.

**`@tinyboilerplate/core`** — shared types: `DelegationStatus = "active" | "expired" | "none" | "stale"`, `StoredDelegation`, `ServerInfo` / `DelegatingServerInfo` (the `/api/server-info` policy shape: `{ did, name, expiry, permissions[], policyHash }`).

## The app-starter template

`templates/app-starter` is the canonical blank app: a `manifest.json` (`defaults: false`, one `tinycloud.kv` probe permission), a React/Vite **frontend** (:5175), and an Express/Bun **backend** (:3003). The frontend's `App.tsx` is the reference wiring of the [[how-apps-work#the-delegation-fan-out|fan-out]]: `connectWallet` → fetch `/api/server-info` + `/api/manifest` → `composeManifestWithBackend` → `createAndSignIn` (one wallet prompt) → `verifySession` → `createManifestDelegation` + `sendDelegation` → operate a KV probe through the delegated backend. The backend advertises exactly the permissions it wants and self-checks (`isCapabilitySubset`) that they are within what the manifest grants — the [[tee-backends|subset rule]].

## The Notes example

`examples/notes` (:5174 / :3002) is the first *real* product example: KV note bodies plus a SQLite `notes` metadata table, with create/list/search/edit/delete. It is the reference for an app-level data model, an OpenAPI contract, and the `stale`-delegation flow when backend policy changes. Its storage layer shows the real [[data-apis|SQL + KV data API]] usage (`access.sql.db(name).query/execute`, `access.kv.get/put/delete`, `Result`-typed).

## The agent runtime

`packages/agent-runtime/docker/delegation-endpoint.ts` is a sidecar that turns a delegation into a working [[cli|`tc` CLI]] session for an agent. On `POST /delegation` it deserializes a `PortableDelegation`, calls `node.useDelegation(delegation)` → a `DelegatedAccess`, writes a `tc`-compatible profile, and runs a 25-min refresh loop before the server-side session expires. It advertises its wanted permissions at `GET /info` in the **same `{ did, name, expiry, permissions }` server-info shape** the backend uses — so the frontend can [[capability-composition|compose the agent into the same one-signature request]]. This is the concrete third-DID path from [[how-apps-work#the-agent]].

## Scaffold a standalone app

`scripts/scaffold-app.ts` (`bun run scaffold:app -- ...`) materializes a standalone app: it copies `templates/app-starter` plus `packages/{core,client,server}`, root `package.json`, `tsconfig.base.json`, `turbo.json`, and `.gitignore`, rewrites ids/package-names/ports/env-examples, and **excludes** generated artifacts (`dist`, `.turbo`, `node_modules`, `*.tsbuildinfo`). A raw template copy alone is *not* standalone (the template uses `workspace:*` deps). Required flags: `--out`, `--app-id`, `--app-name`, `--backend-prefix`, `--frontend-port`, `--backend-port`.

## From scratch

To wire TinyCloud into an existing app instead of scaffolding, follow the package surface above: install [[packages|`@tinycloud/web-sdk` + `@openkey/sdk`]] on the frontend and `@tinycloud/node-sdk` on the backend; `connectWallet` → `createAndSignIn` with your [[manifest-model|manifest]]; expose `/api/server-info`, `/api/manifest`, and `/api/delegations` on the backend; and use `DelegatedAccess` for all user-data reads/writes. The [[getting-started]] page has the copy-paste version.

## Environment & known constraints

App-starter backend env: `BACKEND_PRIVATE_KEY` (required, from `bun run generate-key`), `TINYCLOUD_HOST` (default `https://node.tinycloud.xyz`), `FRONTEND_URL` (CORS origin), `PORT` (3003). Frontend: `VITE_OPENKEY_HOST` (default `https://openkey.so`), `VITE_BACKEND_URL` (derived from page protocol). Constraints worth knowing: OpenKey/WebAuthn fails on TLS-cert-warning pages (use `http://localhost` or trusted `mkcert` certs); wallet-mode sessions cap at ~1h (cache TTL is 50 min); app-starter delegations default to 7 days, after which the user re-grants from the frontend; `@tinycloud/node-sdk-wasm` needs the postinstall ESM patch.

## Validation ladder

`bun run check:app-packages` (manifest/knowledge/secret-safety) → `bun run test` (backend route + contract tests) → `bun run test:browser:app-shell` (unauthenticated render smoke) → `bun run test:real-auth` (human-in-the-loop headed browser: you sign in through OpenKey and Playwright drives the probe on that live session). Build and unit tests are hygiene only — they do **not** prove sign-in, WebAuthn, space creation, or delegation. See [[getting-started]] for running it.

## Deploy targets

Frontend → **Cloudflare Pages** (static build output). Backend → **Phala** (a TEE CVM, for [[tee-backends|attestation]]). Data → the canonical **`node.tinycloud.xyz`** host. Sign-in → **`openkey.so`**. These are locked TinyCloud decisions; the step-by-step deploy runbooks live in the repo's deployment docs.

## Relationships

The runnable counterpart to [[tinycloud-app-kit]]; the scaffold source for [[getting-started]]; implements the [[how-apps-work|full app architecture]] (frontend, [[tee-backends|TEE backend]], agent, and the [[capability-composition|composed]] [[delegation-api|delegation]] fan-out); its client helpers wrap the [[packages|SDK]] and [[sign-in-flow|sign-in]]; its data layer is the [[data-apis]]; the same shape shipped as [[example-listen|Listen]].

## Status & drift

Shipped, tracking the `@tinycloud` 2.6.3 SDK line with zero known staleness in the local dev path. Local run (frontend + backend against `openkey.so` + the canonical node) is fully working. The agent-runtime three-DID path exists as the sidecar above but the single-consent three-way fan-out is still hardening ([[how-apps-work#status--drift]]). Deploy runbooks are evolving in-repo.

## Sources
- `tinyboilerplate`: `README.md` (layout, quick start, packages, env, constraints, validation ladder), `package.json` (workspace + scripts), `packages/client/src/index.ts` (client exports), `packages/server/src/index.ts` (server exports), `scripts/scaffold-app.ts` (scaffold copy set + required flags), `packages/agent-runtime/docker/delegation-endpoint.ts` (`node.useDelegation`, `/info` server-info shape, refresh loop)
- Repo: https://github.com/TinyCloudLabs/tinyboilerplate
