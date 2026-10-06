---
type: index
title: Agents
description: How AI agents reach TinyCloud data — the MCP server, the tc CLI's agent skill, and app skill packs — always through delegated, owner-approved authority.
timestamp: 2026-10-05
---

# Agents

How AI agents reach TinyCloud data — the MCP server, the `tc` CLI's agent skill, and app skill packs — always through delegated, owner-approved authority, never the owner key.

## Concepts

- [MCP Server](mcp.md) — Hosted and local Model Context Protocol server exposing delegated KV, SQLite, and secret operations to AI clients.
- [Agent Skills](agent-skills.md) — The `tc-cli` skill bundled with the CLI, plus app skill packs for publishing and reading secrets.

See also [Device Authorization](../identity/device-authorization.md), how an agent's CLI profile gets owner approval from a phone.
