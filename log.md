---
type: log
title: Change Log
description: Chronological history of updates to the TinyCloud protocol knowledge bundle.
timestamp: 2026-06-22
---

# Change Log

## [2026-07-04] capability-reference | Added `concepts/authorization/capability-reference.md`: full enumeration of node-enforced ability URNs by service (kv, sql, duckdb, capabilities, hooks, encryption, space, reserved vfs), the no-implication rule (exact-equality ability containment; hierarchy lives on paths), per-service path semantics, the three grant paths (session ReCap, UCAN sub-delegation, escalation), and the sql/read vs encryption/decrypt vs space/host layer contrast. Registered in the authorization index; fixed `services/sql.md` ability drift (`query/execute/batch` → `read/write/schema/admin`).

## [2026-07-02] build-an-app | Added the developer track: `concepts/build/` (index + `tinycloud-app-kit` and `tinyboilerplate` reference pages), `concepts/applications/how-apps-work.md` (canonical three-DID app architecture + delegation fan-out), `concepts/sdk/getting-started.md` (install → scaffold → manifest → run/verify → deploy). Added runnable snippets to `sdk/packages.md`, `sdk/data-apis.md`, `sdk/sign-in-flow.md` (validated against tinyboilerplate SDK 2.4.0), a "how it was built" trace to `applications/example-listen.md`, and cross-links from root `index.md` + the applications/sdk indexes.

## [2026-06-22] scaffold | OKF protocol bundle structure created (stubs only)
