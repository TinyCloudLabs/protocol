---
type: concept
title: Device Authorization
description: OpenKey's device flow — an owner approves a CLI or agent session on another device (a phone), for a bounded KV scope in one space, without a browser on the machine that holds the session key.
status: shipped
layer: protocol
sources:
  - repo: openkey
    path: apps/api/src/routes/device-authorization.ts
  - repo: openkey
    path: apps/api/src/services/device-authorization.ts
  - repo: openkey
    path: docs/share-device-authorization.md
  - repo: js-sdk
    path: packages/cli/src/auth/device-auth.ts
  - repo: js-sdk
    path: packages/cli/src/commands/enable.ts
  - repo: js-sdk
    path: packages/cli/src/share/publishing-manifest.ts
tags: [identity, openkey, cli, agents]
timestamp: 2026-10-05
---

# Device Authorization

**Device authorization** lets an owner grant a [[session-keys|session key]] that lives somewhere without a usable browser — a server, a CI box, a coding agent — by approving on another device they control. It is [[openkey|OpenKey]]'s answer to "how does an agent get scoped access without anyone pasting a private key", and it is the flow behind `tc auth login --device` and `tc enable share` in the [[cli|CLI]].

## Role

The ordinary [[sign-in-flow|sign-in]] assumes the wallet or passkey is on the same machine as the session key. Device authorization splits them: the session key stays on the agent's machine; the **owner's** key never leaves OpenKey; the only thing that crosses is a user code the owner types or opens on their phone. Because a device approval can be phished ("approve this code"), the grant is deliberately narrow (below).

## Mechanics

### Sequence

1. The CLI generates a session key and a relay keypair, then calls `POST /api/device-authorizations` with the session `did:key` and public JWK, the relay public key, a PKCE challenge, the requested permissions, the target node and Share origins, and a lifetime.
2. OpenKey returns a `userCode`, a `verificationUri` (`openkey.so/device`), a 600-second transaction window, and a 2-second poll interval. The CLI prints one line: `Approve on your phone: …/device?user_code=ABCD-EFGH`.
3. The owner opens the link, signs in to OpenKey, confirms they started the request themselves, reviews every capability, and approves (`POST /:id/approve`, which requires a signed-in OpenKey session).
4. The CLI polls `POST /token` and receives the signed delegation through an end-to-end encrypted relay.
5. Before saving anything, the CLI checks that the delegation is bound to its own session key, node, and Share origin, that its expiry is within the requested window, and that the approved set and signed [[recap|ReCap]] agree and stay inside the request.

### Scope policy

A device request may only ask for:

- `tinycloud.kv/{get,list,metadata,put,del}` on **explicit relative paths** in **one** ordinary space — no whole-space grants, no overlapping paths, no `secrets/` or `vault/` roots;
- `tinycloud.capabilities/read` on that space's root, which is mandatory;
- at most 16 entries.

The `account`, `applications`, and `secrets` [[system-spaces|system spaces]], SQL, and [[encryption-networks|encryption]] grants are refused (`invalid_scope`). Those need the browser or paste [[siwe|SIWE]] flow, where the owner signs on the same device.

### Lifetime and limits

The delegation lives 60 seconds to 30 days, defaulting to 30 days; the window starts at approval. OpenKey accepts five new device requests per client IP per 10 minutes (`rate_limited`; the CLI reports `DEVICE_AUTH_RATE_LIMITED`) and slows over-eager polling (`slow_down`).

### Share publishing

`tc enable share` is device authorization with the built-in `builtin:share-publishing` manifest: `capabilities/read` on the space root, `kv/get` and `kv/put` on `xyz.tinycloud.share/shares/`, and `kv/get`, `kv/metadata`, `kv/put`, `kv/list` on `shares/` — exactly what `tc share publish` needs (see [[secrets-sharing]]).

## Relationships

Issued by [[openkey|OpenKey]]; grants a [[delegation]] to a [[session-keys|session key]]; a narrower alternative to the [[sign-in-flow]] for the [[cli|CLI]] and agents; scope bounded by [[attenuation]]; used for Share publishing in [[secrets-sharing]].

## Example

An agent on a server needs to publish files. It runs `tc init --name publisher --key-only` then `tc --profile publisher enable share`. The owner gets the approval line in chat, opens it on their phone, approves the three listed grants, and the agent's profile now holds a 30-day session that can write only under Share's two prefixes in the owner's space.

## Status & drift

`shipped`: OpenKey's device API (first for Share publishing in Aug 2026; bounded KV scopes and the consent page on Oct 2, 2026) and the CLI's `--device` and `enable share` in `@tinycloud/cli` 1.0.0. Delegation codes (an 8-character alternative to pasting a full delegation in the non-device paste flow) are on OpenKey `main` but used by the CLI only from 1.1.0 beta.

## Sources
- `openkey` (`main`): `apps/api/src/routes/device-authorization.ts` (routes), `apps/api/src/services/device-authorization.ts` (scope policy, TTL, rate limit), `docs/share-device-authorization.md`
- `js-sdk` (`d43e51ea`, CLI 1.0.0): `packages/cli/src/auth/device-auth.ts` (request, polling, verification), `packages/cli/src/commands/enable.ts`, `packages/cli/src/share/publishing-manifest.ts`
