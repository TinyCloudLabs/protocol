---
type: log
title: Change Log
description: Chronological history of updates to the TinyCloud protocol knowledge bundle.
timestamp: 2026-10-05
---

# Change Log

## [2026-10-05] tc-739-refresh | Brought the bundle up to production Node 1.17.3 (release branch `05c6a93`, not `main`), SDK 3.0.0 / CLI 1.0.0, MCP 0.3.3, and `@openkey/sdk` 0.10.2. Policy engine and credentials now describe the Node's in-tree **Policy v3** (two sibling owner roots, `did:tinycloud:policy:` principal, in-node SD-JWT credential checks for exact email and email domain, durable re-delegatable sessions) as shipped, with the standalone engine kept as history; OpenCredentials issuer corrected to `did:web:issuer.credentials.org`. Revocation rewritten (UCAN + CACAO, delegatee/space-owner revokers, chain-wide fail-closed checks, policy-root revocation). New sections **Sharing** (native bearer and addressed links) and **Agents** (MCP server, agent skills); new concepts `identity/device-authorization`, `policy-engine/policy-v3-admission`, `storage/quota`. OpenKey marked shipped (primary key, `/delegate` link policy, raw encryption grants). Session default 30 days; web SDK uses raw EIP-1193 providers. Replication pages corrected (no replication module on `main` or in production; local read replicas over the KV change feed are in progress). Status matrix, contradictions, glossary, and sources reconciled. Linear TC-739.

## [2026-07-31] node-atlas | Published the TinyCloud Node Atlas at `/nodes/node-architecture/atlas/` as an interactive, source-anchored reference. Added its portable JSON Canvas model and linked both artifacts from the canonical Node Architecture concept.

## [2026-07-10] codex-audit | Added the missing Build an App entry to `llms.txt` (after Applications; the section list mirrors `index.md` but was never updated when `concepts/build/` landed). Expanded run-and-verify in `concepts/sdk/getting-started.md`: first-boot provisioning expectation (~1–2 min against the canonical node; backend port refuses connections meanwhile; HTTP readiness authoritative over turbo-buffered logs), a copy-paste health → manifest → server-info acceptance block, and the unattended `bun run test:browser:app-shell` check. Source: clean-room Codex audit of protocol.tinycloud.xyz.

## [2026-07-10] sdk-2.6.3 | Removed the "First boot: expect one backend crash" known-issue callout from `concepts/sdk/getting-started.md` — the fresh-key bootstrap crash (js-sdk#300) is fixed in `@tinycloud` 2.6.3; folded the `PORT` env-var note into the run instructions. Updated the SDK version line from 2.4.0 to 2.6.3 in `sdk/getting-started.md` (install, status & drift, sources), `sdk/packages.md`, and `build/tinyboilerplate.md` (status & drift).

## [2026-07-02] build-an-app | Added the developer track: `concepts/build/` (index + `tinycloud-app-kit` and `tinyboilerplate` reference pages), `concepts/applications/how-apps-work.md` (canonical three-DID app architecture + delegation fan-out), `concepts/sdk/getting-started.md` (install → scaffold → manifest → run/verify → deploy). Added runnable snippets to `sdk/packages.md`, `sdk/data-apis.md`, `sdk/sign-in-flow.md` (validated against tinyboilerplate SDK 2.4.0), a "how it was built" trace to `applications/example-listen.md`, and cross-links from root `index.md` + the applications/sdk indexes.

## [2026-06-22] scaffold | OKF protocol bundle structure created (stubs only)
