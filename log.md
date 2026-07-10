---
type: log
title: Change Log
description: Chronological history of updates to the TinyCloud protocol knowledge bundle.
timestamp: 2026-06-22
---

# Change Log

## [2026-07-10] codex-audit | Added the missing Build an App entry to `llms.txt` (after Applications; the section list mirrors `index.md` but was never updated when `concepts/build/` landed). Expanded run-and-verify in `concepts/sdk/getting-started.md`: first-boot provisioning expectation (~1–2 min against the canonical node; backend port refuses connections meanwhile; HTTP readiness authoritative over turbo-buffered logs), a copy-paste health → manifest → server-info acceptance block, and the unattended `bun run test:browser:app-shell` check. Source: clean-room Codex audit of protocol.tinycloud.xyz.

## [2026-07-10] sdk-2.6.3 | Removed the "First boot: expect one backend crash" known-issue callout from `concepts/sdk/getting-started.md` — the fresh-key bootstrap crash (js-sdk#300) is fixed in `@tinycloud` 2.6.3; folded the `PORT` env-var note into the run instructions. Updated the SDK version line from 2.4.0 to 2.6.3 in `sdk/getting-started.md` (install, status & drift, sources), `sdk/packages.md`, and `build/tinyboilerplate.md` (status & drift).

## [2026-07-02] build-an-app | Added the developer track: `concepts/build/` (index + `tinycloud-app-kit` and `tinyboilerplate` reference pages), `concepts/applications/how-apps-work.md` (canonical three-DID app architecture + delegation fan-out), `concepts/sdk/getting-started.md` (install → scaffold → manifest → run/verify → deploy). Added runnable snippets to `sdk/packages.md`, `sdk/data-apis.md`, `sdk/sign-in-flow.md` (validated against tinyboilerplate SDK 2.4.0), a "how it was built" trace to `applications/example-listen.md`, and cross-links from root `index.md` + the applications/sdk indexes.

## [2026-06-22] scaffold | OKF protocol bundle structure created (stubs only)
