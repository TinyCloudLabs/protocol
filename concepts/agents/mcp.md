---
type: concept
title: MCP Server
description: The TinyCloud Model Context Protocol server — 16 canonical, delegated operations over KV, SQLite, account discovery, and secrets, served locally over stdio or hosted at mcp.tinycloud.xyz behind OpenKey OAuth.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/mcp
  - repo: js-sdk
    path: packages/operations
  - repo: docs
    path: cli/mcp.mdx
  - repo: docs
    path: hosting/mcp.mdx
tags: [agents, mcp, sdk]
timestamp: 2026-10-05
---

# MCP Server

The **TinyCloud MCP server** (`@tinycloud/mcp`, stable 0.3.3) lets AI clients that speak the Model Context Protocol read and change a user's TinyCloud data through **delegated** authority. It exposes the same canonical operations as the [[cli|CLI]] — both are built on `@tinycloud/operations` — so an agent gets exactly the reach its delegate profile was granted, and asks the owner for more instead of widening it silently.

## Role

MCP is the agent-facing door of the [[architecture-layers|protocol layer]]: where [[how-apps-work|apps]] hold a [[session-keys|session key]] delegated at sign-in, an agent holds a **delegate profile** whose capabilities the owner approved request by request in [[openkey|OpenKey]]. Every tool call is an ordinary [[invocation]] bounded by [[attenuation]]; nothing in MCP bypasses [[capabilities|capability]] checks.

## Mechanics

### Transports

- **Local stdio** — `tinycloud-mcp --profile <delegate-profile>`. Keys and data stay on the user's machine; the CLI's profile store holds the delegated session.
- **Hosted** — Streamable HTTP at `https://mcp.tinycloud.xyz/mcp`, an OAuth resource server behind [[openkey|OpenKey]] OAuth (`tinycloud:mcp` scope). It adds a `tinycloud_connect` tool: the user approves a one-time OpenKey link and the service stores a distinct delegated session key per OAuth subject. It only accepts delegations from an owner DID carried in that subject's resource-bound access token, and refuses an approval signed by another account (`approval_owner_mismatch`). It never receives an owner private key, but it **does** see plaintext inputs and results while executing — part of the data trust boundary (see [[trust-model]]).

### Tools

Sixteen canonical tools: status and auth inspection; `tinycloud_auth_request` / `tinycloud_auth_import` for the exact request → owner grant → import exchange; account space and application discovery; [[kv]] list/get/head/put/delete with strong ETag preconditions; [[sql|SQLite]] schema inspection, one bounded read-only query, and one positional-parameterized `INSERT`/`UPDATE`/`DELETE`; and `tinycloud_secrets_get` for one delegated [[secrets-space|secret]]. Generic KV tools refuse the protected `account` and `secrets` [[system-spaces|system spaces]].

### Asking for more

A tool that lacks authority returns `authority_required` with an exact permission request and approval URL; the owner approves exactly that request, the agent imports it, and retries the same tool unchanged. A missing secret returns `setup_required` with a [[secrets-space|Secret Manager]] link. Owner-profile execution is off unless the host passes both `--profile <owner>` and `--allow-owner-profile`.

## Relationships

Shares its operation layer with the [[cli|CLI]]; authorizes through [[delegation]] and [[openkey|OpenKey]] OAuth; calls [[kv]], [[sql]], and [[secrets-space|secrets]]; discovery reads the [[install-registry|account registry]]; taught alongside the [[agent-skills|tc-cli skill]].

## Status & drift

`shipped`: `@tinycloud/mcp` 0.3.3 (stdio and hosted, owner-bound hosted approvals). The 0.4.0 beta adds a non-retryable `STORAGE_QUOTA_EXCEEDED` result (see [[quota]]), reports an expired stored session as `AUTH_REQUIRED`, and lists skipped stored grants as warnings. Setup and the full tool reference live in the developer docs: https://docs.tinycloud.xyz/cli/mcp.

## Sources
- `js-sdk` (`v3.0.0` = `d43e51ea`): `packages/mcp` (`@tinycloud/mcp` 0.3.3; bins `tinycloud-mcp`, `tinycloud-mcp-http`), `packages/operations` (shared contracts, error mapping)
- `js-sdk` (`master`): `packages/mcp/CHANGELOG.md` (0.4.0 beta)
- `docs`: `cli/mcp.mdx` (tools, transports, owner profiles), `hosting/mcp.mdx` (OAuth resource server, approval callback)
