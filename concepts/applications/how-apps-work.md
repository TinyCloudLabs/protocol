---
type: concept
title: How Apps Work
description: The full-shape TinyCloud app — a frontend, a TEE backend, and an agent, each with its own DID — built on TinyCloud as both datastore and communication substrate, wired together by one user-consented delegation fan-out from the frontend.
status: in-progress
layer: tinycloud-app
sources:
  - repo: js-sdk
    path: packages/sdk-core/src/manifest.ts
  - repo: tinyboilerplate
    path: README.md
  - repo: tinyboilerplate
    path: templates/app-starter/frontend/src/App.tsx
  - repo: tinyboilerplate
    path: packages/agent-runtime/docker/delegation-endpoint.ts
tags: [applications, architecture, delegation]
timestamp: 2026-07-02
---

# How Apps Work

A full-shape TinyCloud app has up to **three components, each with its own [[dids|DID]]**: a **frontend** in the browser, a **backend** running in a [[tee-backends|TEE]], and an **agent** on the TinyCloud agent service. They do not talk to each other over bespoke channels — **TinyCloud is both their datastore and their communication substrate**. Every component stores its data in the owner's [[system-spaces|spaces]] and coordinates through those shared spaces. The wiring that makes this safe is a single **delegation fan-out**: the frontend collects *all* the permissions the whole app needs in one user consent, then delegates the backend-requested subset to the backend's DID and the agent-requested subset to the agent's DID — with no further wallet prompts.

This is the **target architecture**. The frontend + backend path is [[example-listen|shipped and worked end-to-end]]; the agent-as-third-DID path is [[#the-agent|in progress]] (the [agent runtime](https://github.com/TinyCloudLabs/tinyboilerplate) exists and advertises its permissions the same way a backend does). Simpler apps are honest subsets of this shape (see [[#simpler-apps-are-subsets]]).

![TinyCloud app architecture: App, Backend, and Agent components, each with its own scoped capabilities, all connected to a central TinyCloud cloud hosting and services hub.](/assets/how-apps-work.png)

*The three components, each holding its own scoped capabilities, with TinyCloud as the shared hub. The permission scopes shown (SQL/KV read and write) are an illustrative example, not normative.*

## The three components

Every component authenticates as its own [[dids|DID]] and holds only [[capabilities|capabilities]] someone delegated to it. No component is a custodian of another's key.

### The frontend

The user-facing app in the browser. It **owns user identity and consent**: the user signs in through [[openkey|OpenKey]] (passkey → an EIP-1193 provider), the frontend runs the [[sign-in-flow|sign-in flow]] with a scoped [[manifest-model|manifest]], and the resulting [[session-keys|session key]] acts for the user. The frontend is the *only* component the user's wallet ever signs for. It is deployed as static assets (the blessed target is Cloudflare Pages).

### The backend

An optional server-side component that ingests data, calls external APIs, or runs long tasks. It has its **own DID** and **never holds the owner's key** — it operates as a subset-checked [[tee-backends|delegate]], exercising exactly the [[capabilities|capabilities]] the frontend delegated to it and nothing more. It runs **inside a [[tee-dstack|TEE]] (Phala)** so its behavior is *attestable*: the attestation proves the backend is running the software it claims to, which is what lets a user grant it authority over their data without trusting the operator. A backend advertises the permissions it wants over an HTTP endpoint (`/api/server-info`); it does not fetch or mint its own authority.

### The agent

An autonomous worker on the **TinyCloud agent service**. Like the backend it has its own DID and holds only delegated authority, and it advertises the permissions it wants the same server-info way (`GET /info`, returning the same `{ did, name, expiry, permissions }` shape the backend uses). The agent operates on the owner's spaces through a [[delegation-api|PortableDelegation]] activated with `node.useDelegation(...)`, refreshing its server-side session before it expires.

## TinyCloud as datastore and communication substrate

The components do not open sockets to each other. They read and write the owner's [[system-spaces|spaces]] (the `applications` space, keyed under the app's `app_id`) and *communicate through that shared state*:

- the **frontend** usually receives communication from the **backend** (results appear in a space the frontend reads),
- the **backend** receives communication from the **agent**,
- the **frontend** can also talk directly to the **agent**.

Because the substrate is the owner's own capability-gated storage ([[kv|KV]] / [[sql|SQL]]), every message is already authorized, addressable ([[uri-addressing-grammar|URI grammar]]), and durable — there is no separate message bus to secure. This is the same [[data-apis|data API]] surface every component uses; "communication" is just a write one component makes and another reads.

## The delegation fan-out

This is the load-bearing idea. Rather than prompt the user once per component, the frontend **composes one capability request covering the entire app graph** and gets **one signature**:

1. The frontend loads its [[manifest-model|manifest]] and asks each downstream component what it needs — the backend via `/api/server-info`, the agent via its `/info` endpoint. Each returns a `{ did, permissions, expiry }` policy.
2. The frontend turns each policy into a *delegate manifest* (same `app_id`, `defaults: false`, a `did`, and the requested `permissions[]`) and folds them together with the app manifest via [[capability-composition|`composeManifestRequest`]]. The union of all permissions becomes **one [[siwe|SIWE]]/[[recap|ReCap]] request**.
3. The user signs **once** ([[sign-in-flow|sign-in]]). That single signature authorizes the app session key *and* pre-authorizes each declared `did` as a delegation target.
4. The frontend then **materializes** each downstream delegation from the session key — `tcw.materializeDelegation(backendDID, request)` for the backend, the equivalent for the agent — **with no second wallet prompt** ([[capability-composition|composition]] explains why: the child [[delegation|UCAN]] is signed by the already-authorized session key). Each component gets a [[delegation-api|PortableDelegation]] scoped to *its* subset, delivered out-of-band (the backend accepts it at `POST /api/delegations`; the agent runtime at `POST /delegation`).

The result: the user consents once to the whole app, and each component ends up holding a least-authority delegation to exactly the DID it runs as. The [[nodes|node]] admits each component's [[invocation|invocations]] only within its delegated subset ([[cacao-chain-validation]]).

## Simpler apps are subsets

Most apps are not the full three-component shape, and that is fine — each smaller shape is a strict subset of the fan-out:

- **Frontend-only.** The manifest declares just the app's own [[capabilities|capabilities]]; sign-in yields a session key; the app reads/writes the owner's spaces directly from the browser. No backend, no agent, no fan-out (this is the `defaults: false` single-permission [app-starter](https://github.com/TinyCloudLabs/tinyboilerplate) probe before you add a server).
- **Frontend + backend.** The fan-out with one downstream DID. This is the [[example-listen|Listen]] shape and what the boilerplate app-starter and Notes example ship today.
- **Frontend + backend + agent.** The full shape above.

Start from the smallest shape that does the job and add components as you need them; the manifest and composition machinery is the same at every size.

## Build it

The runnable path — install, scaffold, author the manifest, run and verify locally, deploy — is the [[getting-started|Getting Started]] track. The two repos it stands on are documented as [[tinycloud-app-kit]] (the manifest + knowledge-bundle contract) and [[tinyboilerplate]] (the runnable substrate). The worked instance of everything on this page is [[example-listen|Listen]].

## Relationships

Realized through [[manifest-model|manifests]] composed by [[capability-composition|capability composition]] and signed once at [[sign-in-flow|sign-in]]; each component is a subset [[delegation|delegate]] via the [[delegation-api]]; the backend runs in a [[tee-dstack|TEE]] as a [[tee-backends|TEE backend]]; identity is per-component [[dids|DIDs]] via [[openkey|OpenKey]]; data and messages live in the owner's [[system-spaces|spaces]] over the [[data-apis|KV/SQL data APIs]]; built following [[getting-started]] on [[tinycloud-app-kit]] + [[tinyboilerplate]]; worked end-to-end in [[example-listen|Listen]].

## Status & drift

In-progress as a whole. Frontend + backend (the fan-out with one downstream DID) is [[example-listen|shipped]] and is the boilerplate's default. The agent as a *third co-equal DID composed into the same one-signature request* is emerging: the agent runtime advertises `{ did, permissions }` in the server-info shape and activates a `PortableDelegation` via `node.useDelegation`, but the canonical single-consent three-way fan-out is still being hardened. The blessed deployment (frontend → Cloudflare Pages, backend → Phala TEE, canonical TinyCloud host) is a locked decision, documented in [[getting-started]].

## Sources
- `js-sdk`: `packages/sdk-core/src/manifest.ts` (`composeManifestRequest`, `additionalDelegates`, `materializeDelegation` path)
- `tinyboilerplate`: `README.md` (three inspectable parts; delegation chain), `templates/app-starter/frontend/src/App.tsx` (compose → sign once → materialize → send delegation), `packages/agent-runtime/docker/delegation-endpoint.ts` (agent advertises server-info-shaped permissions; `node.useDelegation`)
