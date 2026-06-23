---
type: concept
title: CLI
description: The tc command-line interface — sign in, host spaces, request capabilities, and read/write KV/SQL/secrets directly from a terminal.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/cli/src/index.ts
  - repo: js-sdk
    path: packages/cli/src/commands
tags: [sdk, cli]
timestamp: 2026-06-23
---

# CLI

The **`tc` CLI** is the terminal interface to a TinyCloud [[nodes|node]]: it wraps the [[sdk/packages|SDK]] so a user or script can [[sign-in-flow|sign in]], [[space-hosting|host spaces]], request/grant [[capabilities]], and read/write [[data-apis|KV/SQL]] and [[secrets-sharing|secrets]] without writing code.

## Shape

Built on `@tinycloud/node-sdk` (`packages/cli/`). Representative command areas:
- **auth** — sign-in, `tc auth request --cap "<cap-string>" --grant` to self-grant or request [[cap-string-grammar|capabilities]].
- **space** — host / list spaces ([[space-hosting]]).
- **kv** — `get`/`put`/`list` (incl. `--space` and `--raw`) over the [[kv|KV service]].
- **sql** — `query` against a space [[sql|SQL]] database (`--db`, `--space`).
- **secrets** — manage [[secrets-space|secrets]] + a doctor flow.

## Mechanics

The CLI holds its own [[session-keys|session]] and signs [[invocation|invocations]] like any SDK client; cap-strings use the [[cap-string-grammar|`service:space:path:actions`]] form. It is the tool the [[example-listen|Feed]] explorer uses to read Listen data via self-granted read [[capabilities]].

## Relationships

A thin client over the [[sdk/packages|SDK]] and [[data-apis]]; uses [[cap-string-grammar|cap-strings]]; exercises [[space-hosting]], [[kv]], [[sql]], [[secrets-sharing]]; the bare-`tc` access pattern is demonstrated in [[example-listen]].

## Status & drift

Shipped. Recently gained space-hosting, auth-request, and secrets-doctor flows; the SDK packages remain the source of truth for behavior.

## Sources
- `js-sdk`: `packages/cli/src/index.ts`, `packages/cli/src/commands/`
