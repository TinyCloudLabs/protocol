---
type: concept
title: Agent Skills
description: Instruction packs that teach coding agents to use TinyCloud — the tc-cli skill shipped inside the CLI package, and app skill packs (tc-publish, tc-secrets) that build on it.
status: shipped
layer: tinycloud-app
sources:
  - repo: js-sdk
    path: packages/cli/skills/tc-cli
  - repo: prompts
    path: skills/tc-publish/SKILL.md
  - repo: prompts
    path: skills/tc-secrets/SKILL.md
  - repo: docs
    path: guides/agent-skills.mdx
tags: [agents, cli, skills]
timestamp: 2026-10-05
---

# Agent Skills

**Agent skills** are instruction packs that coding agents (Claude Code, Codex, OpenCode) load to use TinyCloud correctly through the [[cli|`tc` CLI]]. They encode the parts an agent would otherwise guess at: which profile to use, how to ask the owner for access, what each error code means, and when to stop.

## Role

Skills are the agent-side complement to [[device-authorization]] and the [[mcp|MCP server]]: the protocol guarantees an agent can only do what its delegated [[session-keys|session]] allows; the skill teaches it to request narrow access on its **own** profile, relay the owner's approval link, and never handle private keys or secret values.

## Mechanics

- **`tc-cli`** ships inside the `@tinycloud/cli` npm package (`skills/tc-cli/`: `SKILL.md`, `AUTH.md`, `REFERENCE.md`, `SDK.md`, `INSTALL.md`, `release.json`). It is installed per CLI release with the cross-agent `skills` installer from the CLI's own tarball, so the skill always describes the exact CLI it came with; `release.json` names the compatible CLI range (`>=1.0.0-beta.17 <2.0.0`). It also warns that `tc` on a Linux `PATH` is often iproute2's `/usr/sbin/tc`.
- **App skill packs** build on `tc-cli` for one job and pin their own CLI version:
  - **`tc-publish`** — publish a document or HTML page as an owner-only or public [[native-sharing|Share]] link, with `tc enable share` consent, verification, and lifecycle.
  - **`tc-secrets`** — read API keys the owner keeps in [[secrets-space|Secret Manager]] via a scoped paste login that names each secret; values never pass through chat.
  Packs probe the CLI's features rather than trusting version strings, and never install software themselves.
- Repo-local skills ship with [[tinycloud-app-kit]] (manifest and knowledge authoring) and [[tinyboilerplate]] (scaffolding a new app).

## Relationships

Teaches agents the [[cli|CLI]]; relies on [[device-authorization]] and [[openkey|OpenKey]] consent; `tc-publish` drives [[native-sharing]]; `tc-secrets` reads [[secrets-space|secrets]]; an alternative to the [[mcp|MCP server]] for agents with a shell.

## Status & drift

`shipped` for `tc-cli` (bundled with CLI 1.0.0). `tc-publish` and `tc-secrets` are **preview**: they live on the TinyCloudLabs/prompts default branch and currently pin `@tinycloud/cli` 1.0.x betas. Install steps: https://docs.tinycloud.xyz/guides/agent-skills.

## Sources
- `js-sdk` (`v3.0.0` = `d43e51ea`): `packages/cli/skills/tc-cli/` (`SKILL.md`, `AUTH.md`, `INSTALL.md`, `release.json`)
- `prompts` (`docs/initial-setup-split`): `skills/tc-publish/SKILL.md` (v0.5.1), `skills/tc-secrets/SKILL.md`
- `docs`: `guides/agent-skills.mdx`
