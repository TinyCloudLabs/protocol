---
type: concept
title: CLI
description: The tc command-line interface — sign in (browser, paste, or device approval), host spaces, request capabilities, publish Share links, and read/write KV/SQL/secrets from a terminal or an agent.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/cli/src/index.ts
  - repo: js-sdk
    path: packages/cli/src/commands
  - repo: js-sdk
    path: packages/cli/src/config/constants.ts
  - repo: js-sdk
    path: packages/cli/skills/tc-cli/REFERENCE.md
tags: [sdk, cli, agents]
timestamp: 2026-10-05
---

# CLI

The **`tc` CLI** (`@tinycloud/cli`, stable 1.0.0) is the terminal interface to a TinyCloud [[nodes|node]]: it wraps the [[sdk/packages|SDK]] so a user, script, or agent can [[sign-in-flow|sign in]], [[space-hosting|host spaces]], request/grant [[capabilities]], publish [[secrets-sharing|Share]] links, and read/write [[data-apis|KV/SQL]] and [[secrets-sharing|secrets]] without writing code.

## Shape

Built on `@tinycloud/node-sdk`, `@tinycloud/operations`, and `@tinycloud/share-sdk` (`packages/cli/`). Command areas at 1.0.0:

- **auth** — `login` (browser, `--paste`, or [[device-authorization|`--device`]]; `--manifest` for a scoped request, `builtin:share-publishing` for Share; `--expiry`, `--owner`, `--replace-session`), `logout` (clears local state only), `rotate`, `status`, `whoami`, and the request/grant exchange: `request --cap "<cap-string>"` or `--manifest`, `grant`, `import`, `retry`, `caps`.
- **enable share** — the [[device-authorization|device login]] with the Share publishing manifest.
- **context** — the selected profile, owner and session DIDs, host, space, and local session state, as JSON.
- **space** — `list`, `create`, `host-request`, `info`, `switch` ([[space-hosting]]).
- **kv**, **sql**, **duckdb** — data access over [[kv]], [[sql]], [[duckdb]] (`--space`, `--db`).
- **share** — `publish` (bearer or addressed: email, email domain, DID), `inspect`, `receive`, `list`, `show`, `notify`, `revoke` ([[secrets-sharing]]).
- **secrets**, **vault**, **vars** — [[secrets-space|secrets]] (including `network init|grant` and `doctor`), the lower-level [[vault]], and plaintext variables.
- **delegation**, **account**, **profile**, **manifest**, **node**, **doctor**, **status**.

Defaults: node `https://tee.node.tinycloud.xyz`, OpenKey `https://openkey.so`, Share origin `https://share.tinycloud.xyz`. Profiles live in `~/.tinycloud/profiles/<name>/` (or `TC_HOME`).

## Mechanics

The CLI holds its own [[session-keys|session]] per profile and signs [[invocation|invocations]] like any SDK client; cap-strings use the [[cap-string-grammar|`service:space:path:actions`]] form. A profile has a **posture** — `owner-openkey`, `local-owner-key`, or `delegate-session` — and agents are expected to use a dedicated delegate profile per purpose, holding only what the owner approved through [[openkey|OpenKey]]. Scoped logins verify the signed proof (session key, owner, expiry, approved set) before saving anything, and refuse to silently narrow or shorten a live session (`SESSION_IN_USE`).

Errors are structured (`{ error: { code, message, hint } }`) with grouped exit codes: `2` usage, `3` authentication required, `4` not found, `5` permission denied, `6` network, `7` node; `tc share` reuses these and adds `8` (unsafe filename or output conflict) and `9` (partial success). The CLI is also the tool the [[example-listen|Feed]] explorer uses to read Listen data via self-granted read [[capabilities]], and the package ships the `tc-cli` [[agent-skills|agent skill]] for coding agents.

## Relationships

A thin client over the [[sdk/packages|SDK]] and [[data-apis]]; uses [[cap-string-grammar|cap-strings]]; signs in through [[openkey|OpenKey]] and [[device-authorization]]; exercises [[space-hosting]], [[kv]], [[sql]], [[secrets-sharing]]; shares its operation layer with the [[mcp|MCP server]]; taught to agents by the `tc-cli` [[agent-skills|skill]]; the bare-`tc` access pattern is demonstrated in [[example-listen]].

## Status & drift

Shipped: 1.0.0 (Oct 3, 2026) added device login, `enable share`, native `share`, `context`, and the bundled skill. The 1.1.0 beta adds a single storage-full result (exit `10`), `AUTH_REQUIRED` with a sign-in hint on expired sessions, OpenKey delegation short codes for `--paste`, and a warning when a non-primary OpenKey key approved a login. The SDK packages remain the source of truth for behavior.

## Sources
- `js-sdk` (`v3.0.0` = `d43e51ea`, CLI 1.0.0): `packages/cli/src/index.ts`, `packages/cli/src/commands/` (auth, enable, context, share, space, secrets, …), `packages/cli/src/config/constants.ts` (default hosts, exit codes), `packages/cli/skills/tc-cli/REFERENCE.md`
- `js-sdk` (`master`, CLI 1.1.0 beta): `packages/cli/CHANGELOG.md`
