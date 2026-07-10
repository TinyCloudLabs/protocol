---
type: concept
title: Getting Started
description: The golden path to a working TinyCloud app — install the SDK, scaffold from tinyboilerplate, author a manifest, run and verify locally against OpenKey, then deploy the frontend to Cloudflare Pages and the backend to a Phala TEE.
status: in-progress
layer: tinycloud-app
sources:
  - repo: tinyboilerplate
    path: README.md
  - repo: tinyboilerplate
    path: package.json
  - repo: tinyboilerplate
    path: templates/app-starter/frontend/src/App.tsx
  - repo: tinycloud-app-kit
    path: README.md
tags: [sdk, getting-started, applications]
timestamp: 2026-07-02
---

# Getting Started

This is the golden path from nothing to a **working TinyCloud app running locally** — the north-star acceptance test. You install the SDK, scaffold a full-stack app from [[tinyboilerplate]], author its [[manifest-model|manifest]], run it, and verify sign-in + delegation + a live storage probe against the canonical [[openkey|OpenKey]] service. It ends with a short deploy section. Read [[how-apps-work]] first for the architecture; this page is the runnable version of it.

## Install the SDK

The client SDK is published on npm under the `@tinycloud` scope (current line: **2.6.3**). A browser app needs `@tinycloud/web-sdk`; a server/backend needs `@tinycloud/node-sdk`; both re-export the shared `@tinycloud/sdk-core`. Sign-in uses the OpenKey SDK.

```bash
npm install @tinycloud/web-sdk @openkey/sdk        # frontend
npm install @tinycloud/node-sdk                    # backend
# optional: the `tc` CLI for poking a space from a terminal
npm install -g @tinycloud/cli
```

You rarely install these by hand — the scaffold below pins them for you. Install them directly only when wiring TinyCloud into an existing app.

## The golden path: scaffold from tinyboilerplate

[[tinyboilerplate]] is the runnable substrate. Clone it, build the shared packages, generate a backend key, configure the blank starter, and run it:

```bash
git clone https://github.com/TinyCloudLabs/tinyboilerplate
cd tinyboilerplate
bun install
bun run build
bun run generate-key
cp templates/app-starter/frontend/.env.example templates/app-starter/frontend/.env
bun run dev:app-starter
```

- `bun run generate-key` writes a fresh `BACKEND_PRIVATE_KEY` into `templates/app-starter/backend/.env`. If that file already existed the generator *prints* a key instead of overwriting — paste it into `BACKEND_PRIVATE_KEY` yourself.
- `dev:app-starter` runs the frontend on `http://localhost:5175` and the backend on `http://localhost:3003`. The backend port can be overridden with the `PORT` env var. If trusted local certs exist at `templates/app-starter/frontend/localhost.pem` (+ key), both switch to HTTPS on the same ports.
- The Notes example (`bun run dev:notes`) runs on `:5174` / `:3002` and is the reference for a real data model.

To create an app **outside** the repo, use the scaffold CLI, which materializes the starter plus the shared packages it needs into a standalone workspace:

```bash
bun run scaffold:app -- --out ../my-app --app-id xyz.tinycloud.myapp \
  --app-name "My App" --backend-prefix xyz.tinycloud.myapp-backend \
  --frontend-port 5185 --backend-port 3013
cd ../my-app && bun install && bun run generate-key && bun run build
cp frontend/.env.example frontend/.env && bun run dev
```

## Author the manifest

The [[manifest-model|manifest]] is the app's declarative data contract: its `app_id` namespace and the [[capabilities|capabilities]] it needs. Author it against the [[tinycloud-app-kit]] manifest v1 schema (`https://schemas.tinycloud.xyz/app-manifest/v1.json`). The app-starter's blank manifest declares one explicit KV permission:

```json
{
  "manifest_version": 1,
  "app_id": "xyz.tinycloud.app-starter",
  "name": "TinyCloud App Starter",
  "description": "Blank reusable TinyCloud app substrate with a delegated KV storage probe.",
  "knowledge": true,
  "defaults": false,
  "permissions": [
    {
      "service": "tinycloud.kv",
      "path": "probe/",
      "actions": ["get", "put", "del", "list"],
      "description": "Read and write a tiny storage probe value."
    }
  ]
}
```

Change `app_id`, `name`, and the `permissions[]` to match your app's data. `defaults: true` instead of an explicit `permissions[]` requests the built-in KV + SQL tier over the app prefix. Ship a `knowledge/` bundle (`knowledge: true`) so humans and agents can operate your resources safely — see [[tinycloud-app-kit]] for both.

## Run and verify locally

With the dev servers up, open the frontend and walk the full [[how-apps-work|frontend + backend]] flow. This is the real acceptance check — a build or a passing unit test does **not** prove sign-in works.

1. **Sign in.** Click sign in; complete the [[openkey|OpenKey]] passkey prompt at `openkey.so`. The frontend connects an EIP-1193 provider, fetches the backend policy from `/api/server-info` and the manifest from `/api/manifest`, [[capability-composition|composes]] them, and asks the wallet to sign the [[siwe|SIWE]]/[[recap|ReCap]] message **once**.
2. **Delegate.** After sign-in the frontend materializes the backend's [[delegation-api|PortableDelegation]] from the session key (no second prompt) and `POST`s it to `/api/delegations`. The connection detail panel should show delegation status `active`.
3. **Probe.** Type a value and save it. The backend writes it to the owner's [[kv|KV]] under `xyz.tinycloud.app-starter/probe/value` using only the delegated capability, then reads it back. If the probe round-trips, the whole [[how-apps-work#the-delegation-fan-out|fan-out]] worked.

The scripted human-in-the-loop version is `bun run test:real-auth`, which opens a headed browser for you to sign in and then drives the probe with Playwright. See [[tinyboilerplate]] for the validation ladder.

### Local HTTPS caveat

OpenKey/WebAuthn **fails on a page with a TLS certificate warning**, even if you click through — `WebAuthn is not supported on sites with TLS certificate errors`. Use plain `http://localhost` (WebAuthn allows it) or *trusted* local certs (`mkcert`). Never use HTTPS with an untrusted cert for the sign-in flow.

## Deploy

The blessed deployment (a locked TinyCloud decision):

- **Frontend → Cloudflare Pages.** The frontend is static assets after `bun run build`; publish them to Cloudflare Pages.
- **Backend → Phala (TEE).** The backend runs in a Phala CVM so its behavior is [[tee-backends|attestable]] — the [[how-apps-work#the-backend|reason a user can grant it authority over their data]].
- **Data → the canonical TinyCloud host.** Apps use `https://node.tinycloud.xyz` (the `TINYCLOUD_HOST` default); you do not run your own node.
- **Sign-in → openkey.so.** Apps use the canonical OpenKey service; the frontend's `VITE_OPENKEY_HOST` already defaults to `https://openkey.so`.

The production env surface (`TINYCLOUD_HOST`, `FRONTEND_URL`/CORS, backend `BACKEND_PRIVATE_KEY`) is documented in [[tinyboilerplate]].

## Relationships

Installs the [[packages|SDK packages]]; scaffolds from [[tinyboilerplate]] and authors against [[tinycloud-app-kit]]; the architecture it realizes is [[how-apps-work]]; sign-in is the [[sign-in-flow]] through [[openkey|OpenKey]]; the manifest is the [[manifest-model]] and gets [[capability-composition|composed]]; the backend is a [[tee-backends|TEE backend]] delegate via the [[delegation-api]]; data lands in the owner's [[system-spaces|spaces]] over the [[data-apis]]; worked end-to-end in [[example-listen|Listen]].

## Status & drift

In-progress. Local run (frontend + backend against `openkey.so` and the canonical node) is the shipped, verifiable path today and satisfies the v1 north-star. The deploy section states the blessed targets; the step-by-step Cloudflare Pages + Phala runbooks live in the [[tinyboilerplate]] repo's deployment docs (evolving). Package versions track the `@tinycloud` 2.6.3 line.

## Sources
- `tinyboilerplate`: `README.md` (quick start, scaffold, ports, env vars, validation ladder, local HTTPS constraint), `package.json` (`dev:app-starter`, `generate-key`, `scaffold:app` scripts), `templates/app-starter/frontend/src/App.tsx` (sign-in → compose → delegate → probe flow)
- `tinycloud-app-kit`: `README.md` (manifest + knowledge bundle contract, schema id)
- npm: `@tinycloud/{web-sdk,node-sdk,sdk-core}` 2.6.3, `@openkey/sdk`, `@tinycloud/cli` (package names/versions verified against the registry)
