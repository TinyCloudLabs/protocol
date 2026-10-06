---
type: concept
title: OpenKey
description: TinyCloud's passkey/TEE-backed identity provider — it produces and custodies owner keys, designates a primary key per account, and brokers sign-in, scoped delegation, and device approval for apps, CLIs, and agents.
status: shipped
layer: protocol
sources:
  - repo: openkey
    path: apps/api/src/routes/keys.ts
  - repo: openkey
    path: apps/api/src/services/primary-key.ts
  - repo: openkey
    path: apps/api/src/routes/delegate.ts
  - repo: openkey
    path: apps/api/src/routes/device-authorization.ts
  - repo: openkey
    path: apps/api/src/routes/delegation-codes.ts
  - repo: openkey
    path: apps/web/src/lib/delegate-link-policy.ts
  - repo: openkey
    path: packages/sdk/src/index.ts
  - repo: openkey
    path: packages/db/prisma/schema.prisma
tags: [identity, openkey, tee]
timestamp: 2026-10-05
---

# OpenKey

**OpenKey** is the identity layer of TinyCloud: a **passkey / TEE-backed** provider that produces and custodies the **owner keys** every [[capabilities|capability]] chain roots in, and brokers [[siwe|SIWE]] sign-in and [[delegation]] issuance for apps, the [[cli|CLI]], and agents. It is how a user gets a self-custodiable [[dids|DID]] without managing raw private keys themselves. It runs in production at `openkey.so` (web) and `api.openkey.so` (API); the browser SDK is `@openkey/sdk` 0.10.2.

## Role

In the [[architecture-layers|locked layer model]] OpenKey sits in **Layer 1** alongside the base protocol and the [[policy-engine|policy engine]] — it is *identity infrastructure*, not an app. It supplies the root [[dids|DID]] that [[cacao-chain-validation|chain validation]] terminates at, and it is the consent surface where an owner sees and approves every capability an app, CLI profile, or agent asks for.

## Keys and the primary key

An OpenKey account holds one or more keys (`packages/db/prisma/schema.prisma`): **`MANAGED`** keys are generated and sealed in OpenKey's TEE; **`EXTERNAL`** keys are linked wallets that sign through the user's own provider. **Each key is a separate owner** — its own `did:pkh`, its own [[autonomic-space|spaces]], its own data.

One active managed key per account is the **primary key** (`services/primary-key.ts`). OpenKey preselects it on `/delegate` approvals when no owner is named, every returned delegation carries a `primary` flag, and OAuth `tinycloud:manage-key` signing uses it. The owner changes it from the dashboard (`POST /api/keys/:keyId/primary`, from a signed-in OpenKey session; external and archived keys are ineligible). Changing the primary key moves no data between owners.

## Mechanics

| Surface | Purpose |
|---|---|
| `/api/keys/*` | Key listing, `sign`, `sign-typed-data`, TEE `quote` (attestation), archive, primary selection |
| `/api/delegate` (`/prepare`, `/complete`, `/sign`, `/host`) | Turn a [[manifest-model|manifest]] or explicit permission request into a signed [[delegation]] after the owner consents; lifetime capped at 30 days |
| `/api/device-authorizations` | [[device-authorization]] — approve a CLI or agent session on another device |
| `/api/delegation-codes` | Short-lived public handoff of a signed delegation by an 8-character code |

**Consent narrowing.** The owner may uncheck capabilities on the consent page; the signed [[siwe|SIWE]] that comes back can therefore be narrower than the prepared one. `/complete` verifies the signature against the address in the *signed* SIWE and reports expiry from it, and clients complete with the returned `signedMessage`.

**Link policy.** An ordinary `/delegate` link may only return to a loopback callback or an exact registered HTTPS callback (today the hosted MCP connector), and never follows redirects. Unrecognized nodes need an explicit acknowledgment.

**Raw encryption grants.** A decrypt grant on an [[encryption-networks|encryption network]] (`urn:tinycloud:encryption:<ownerDid>:<name>`) is signed as a top-level [[recap|ReCap]] resource rather than nested under a space, and only for networks the signing owner controls.

**SDK.** `@openkey/sdk` provides `connect()`, message and typed-data signing, `OpenKeyProvider` (a raw EIP-1193 provider the TinyCloud web SDK signs through), `authorizeTinyCloud()`, and correlated sign-out: `signOut()` resolves `{ requestId, revoked }`, where `revoked` is true only when OpenKey confirmed the old session no longer works. Since 0.10.2 the embedding page never receives an OpenKey session token; bearer session tokens are refused outside OpenKey origins and widgets require an exact `origin`.

## Relationships

Produces the [[dids|owner DIDs]] that root [[capabilities]] / [[cacao-chain-validation]]; brokers [[siwe|SIWE]], [[delegation]], and [[device-authorization]]; issues the session grants [[session-keys]] hold; consent surface for the [[cli|CLI]] and agents; a Layer-1 peer of the [[policy-engine]] (see [[architecture-layers]]).

## Status & drift

`shipped`. Core key custody, `/delegate`, and sign-out have been in production since mid-2026; device authorization shipped for Share publishing in Aug 2026 and gained bounded KV scopes on Oct 2; the `/delegate` link policy, raw encryption grants, primary-key selection, delegation codes, and widget token hardening landed on OpenKey `main` between Oct 2 and Oct 5, 2026. The CLI's use of delegation codes and its primary-key warning ship in `@tinycloud/cli` 1.1.0 beta, not 1.0.0. For passkey/WebAuthn internals and TEE attestation detail, defer to OpenKey's own documentation.

## Sources
- `openkey` (`main`, Oct 5, 2026): `apps/api/src/routes/keys.ts` (keys, primary selection), `apps/api/src/services/primary-key.ts`, `apps/api/src/routes/delegate.ts` (expiry cap, `/complete` binding), `apps/api/src/routes/device-authorization.ts`, `apps/api/src/routes/delegation-codes.ts`, `apps/web/src/lib/delegate-link-policy.ts`, `packages/sdk/src/index.ts` (`OpenKeyProvider`, `signOut`), `packages/db/prisma/schema.prisma` (key types)
