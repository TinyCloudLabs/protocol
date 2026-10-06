---
type: concept
title: Policy v3 Admission
description: How the Node itself registers an owner-signed policy, checks a recipient's credential once, and mints a policy session UCAN that the recipient then uses on the ordinary /delegate and /invoke paths.
status: shipped
layer: protocol
resource: "xyz.tinycloud.policy/policy/v2"
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/policy_v3.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/mod.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/attestation.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-core/src/models/policy_v3_session.rs@05c6a93
  - repo: tinycloud-node
    path: CHANGELOG.md@05c6a93
  - repo: js-sdk
    path: packages/share-sdk/src/addressed-publish.ts@d43e51ea
tags: [policy-engine, authz, node, sharing]
timestamp: 2026-10-05
---

# Policy v3 Admission

**Policy v3 admission** is the [[nodes|Node]]'s built-in policy engine. An owner registers a signed policy plus two sibling root delegations; a recipient proves a credential once, against a fresh challenge; the Node then mints a **policy session** UCAN to the recipient's key. From that point the recipient is an ordinary delegatee: it uses the normal `/delegate` and `/invoke` paths, and every invocation re-checks the policy's roots. This is the production form of the [[policy-engine/overview|policy engine]], and the authority behind addressed [[native-sharing|Share links]].

## Role

A plain [[delegation]] needs the owner to sign a grant to a key they already know. A policy lets the owner sign once for a recipient they do not yet know ("whoever proves `alice@example.com`", "anyone at `example.com`"). The policy is itself a principal, `did:tinycloud:policy:<digest>`, not a proof the recipient carries to each request. The credential is checked once, when the session is minted (see [[credential-gated-delegation]]).

The Node owns this logic. Since Node 1.16.0 the routes live under `/policy/v3/*` and the old Share-namespace routes (`/share/v1`, `/share/v2`) are unmounted. The earlier standalone `policy-core` engine is used only by test crates (for example `test/m1-realdata-e2e`), never by the server.

## Mechanics

### 1. Two sibling roots

For each policy the owner signs two UCAN roots with identical capabilities, time window and policy facts. Neither can authorize an invocation by itself (`policy-root-cannot-authorize-invocation`). Only a session that cites both can.

| Role | `mode` fact | Audience |
|---|---|---|
| `policy-authority` | `policy-source` | `did:tinycloud:policy:<policyDigestHex>` |
| `policy-enforcement` | `conditional-mint` | the `enforcerDid` |

The enforcer DID defaults to the Node's own DID. `POST /policy/v3/enforcer-bindings` returns an `AttestedEnforcerBinding/v2` — a domain-separated binding of the enforcer DID, the node audience, an attestation digest, and its validity window, signed by the Node key — which the owner embeds at registration. The Node's TDX attestation quote binds the enforcer DID and a nonce (`routes/attestation.rs`), so a client can check that the enforcer key belongs to the attested Node (see [[tee-dstack]]).

### 2. Registration

`POST /policy/v3/policies` takes `{policyCid, policy, policyRoot, enforcementRoot, contentSourceDigestHex, nativeProjectionHashHex, attestedEnforcerBinding}`. The Node:

- accepts `xyz.tinycloud.policy/policy/v1` or `/v2` with an exact key set. v2 adds a required `credentialRequirement`;
- recomputes the CID (CIDv1, raw, SHA-256 of the canonical JSON) and checks the Ed25519 signature by `ownerDid`;
- checks both roots' signatures, role facts, audiences and digests, and that their windows match;
- validates the enforcer binding;
- requires the owner to **hold every capability the roots grant**, as root authority or through its own delegations, by the same rules as an owner invocation (TC-597). A policy session or root never counts as owner authority, so a recipient cannot re-publish a share under a policy of its own;
- in one transaction, writes the roots into the ordinary delegation graph, the `policy_v3_registration` row, and two `policy_v3_root` rows, each with a status checkpoint that stays fresh until the root expires.

### 3. Challenge and mint

1. **Challenge.** `POST /policy/v3/challenges {policyCid, recipientDid, requestedCapabilities?}` returns `{challengeId, nonce, expiresAt, nodeAudience}`. The challenge lasts 300 s.
2. **Mint.** `POST /policy/v3/delegations` carries the challenge, the credential envelope, the requirement, and a signed presentation. Two presentation paths exist:
   - account path, `xyz.tinycloud.policy/presentation/v3`: adds `accountAuthorizationCid` and a recipient-owned `credentialSpaceId`;
   - accountless path, `xyz.tinycloud.policy/presentation/v4`: a holder proof from a `did:key` that is both holder and subject.
3. The Node verifies the [[sd-jwt-vc|`vc+sd-jwt`]] credential itself (see [[credential-gated-delegation]]), the presentation signature, the challenge and nonce, and the recipient binding.
4. It then signs the first session, **S0**, with its own key: `iss` = Node DID, `aud` = `recipientDid`, `prf` = `[policyRoot, enforcementRoot]`, and one fact object with profile `policy-session-ucan/v1`. S0 must have exactly those two parents, in that order.
5. One transaction consumes the challenge, writes S0's graph rows, and writes the admitted `policy_v3_session` row. The response is `{sessionCid, authorization, admitted}`.

### 4. Session lifetime (TC-529)

Without `requestedExpiresAt` a session lasts **60 s**, the original contract. With it, the session ends at the earliest of:

- the requested time;
- the policy's `expiresAt`;
- the roots' expiry minus 1 s;
- on the account path, the account authorization's expiry.

### 5. Using the session

The recipient uses S0 like any other delegation:

- **Invoke.** `/invoke` with S0 (or a descendant) as proof. Each policy invocation may span at most 60 s (`policy-invocation-lifetime-too-long`). It may not exceed the immediate parent's capabilities (`policy-invocation-capability-widening`; see [[attenuation]]). The Node re-walks the chain on every call, up to 8 hops, and re-checks root liveness and revocation. The same gate covers `/signed/kv` and the decrypt route (1.17.3).
- **Re-delegate.** `/delegate` a child UCAN with a single parent. Each descendant is checked against its **immediate** parent:
  - it inherits every policy fact;
  - `remainingRedelegationDepth` drops by one, starting from at most 8;
  - its time window is strictly inside the parent's;
  - its capabilities are contained in the parent's.

  A public `/delegate` of a two-parent session is accepted only when it matches the minted S0 exactly (`routes/mod.rs`, `ordinary_admission_allowed`).

### 6. Root status and revocation

- **Status.** Each root keeps a status checkpoint, fresh until the root's own expiry. `POST /policy/v3/status` advances its sequence, and `GET /policy/v3/status/<rootCid>` reads it.
- **Revocation.** A root is revoked by a signed `xyz.tinycloud.policy/root-revocation/v1` object posted to `/revoke`. The owner signs it, or the enforcer for the enforcement root. Revocation is irreversible and takes effect on the next invocation (see [[revocation]]).

## Shape

```
Policy v2 = { schema: "xyz.tinycloud.policy/policy/v2", policyId, ownerDid, createdAt, expiresAt?,
              contentSource, capabilityCeiling: [...], credentialRequirement,
              signature: { suite: "Ed25519", signerDid: ownerDid, value } }

S0 (policy-session-ucan/v1) = UCAN { iss: nodeDid, aud: recipientDid, prf: [policyRoot, enforcementRoot],
              fct: [{ profile, policyCid, policyDigestHex, enforcerDid, nodeAudience, recipientDid,
                      challengeId, claimDigestHex, vpDigestHex, …, remainingRedelegationDepth ≤ 8 }] }
```

| Route | Purpose |
|---|---|
| `POST /policy/v3/enforcer-bindings` | Node-signed enforcer binding |
| `POST /policy/v3/policies` | register policy + both roots |
| `POST /policy/v3/challenges` | 300 s nonce for one recipient DID |
| `POST /policy/v3/delegations` | verify credential, mint S0 |
| `POST /policy/v3/deliveries/authorize` | authorize a Share email (see [[native-sharing]]) |
| `POST /policy/v3/status`, `GET /policy/v3/status/<cid>` | root status checkpoints |
| `POST /revoke` (JSON body) | root revocation |

Persistence: `policy_v3_registration`, `policy_v3_root`, `policy_v3_session` and `policy_v3_challenge` tables (`tinycloud-core/src/models/`).

## Relationships

The production form of the [[policy-engine/overview|policy engine]]; checks credentials as described in [[credential-gated-delegation]], issued by [[opencredentials|OpenCredentials]]; mints ordinary [[delegation]]s that are then exercised by [[invocation]]; containment is [[attenuation]]; roots end through [[revocation]]; the enforcer is bound to the [[tee-dstack|TEE]] Node identity; the main consumer is addressed [[native-sharing|Share links]] in [[sharing]].

## Example

Alice registers a v2 policy over one KV key with requirement profile `tinycloud.email-domain-proof/v1` and value `example.com`. Bob's browser asks for a challenge for his `did:key` and proves a fresh `example.com` mailbox credential. It posts a v4 presentation with `requestedExpiresAt` one day out. The Node mints S0, which expires at the earlier of that day and Alice's roots. Bob reads with 60-second invocations. When Alice revokes the enforcement root, Bob's next read fails.

## Status & drift

`shipped` in Node 1.17.3 (`tinycloud-node@05c6a93`). Embedded in the Node since 1.16.0; accountless v4 admission since 1.15.0; long-lived sessions, multi-hop re-delegation and the `/signed/kv` + decrypt gate since 1.17.3. `origin/main` of `tinycloud-node` is 1.16.1 and lacks the 1.17.x changes. The policy document has no general condition grammar: a v2 policy has exactly one `credentialRequirement` (see [[policy-as-central-primitive]]).

## Sources
- `tinycloud-node` (`05c6a93`, Node 1.17.3): `tinycloud-node-server/src/policy_v3.rs` — constants :52-59; first admission :177-200; descendant admission :295-310; invocation gate :352-420, chain walk :553-660; owner-holds check :742; session expiry :802-834; containment :836; routes :1342, 1572, 1768, 1962, 2021, 3350, 3516; policy document :4032; root facts :3959-4016; credential requirement :4185; SD-JWT verification :5866-5960
- `tinycloud-node` (`05c6a93`): `tinycloud-node-server/src/routes/mod.rs:457` (`/delegate` admission gate), `tinycloud-node-server/src/routes/attestation.rs:27-34`, `tinycloud-core/src/models/policy_v3_{registration,root,session,challenge}.rs`, `CHANGELOG.md` (1.15.0, 1.16.0, 1.17.1, 1.17.3), `test/m1-realdata-e2e/Cargo.toml:12-15`
- `js-sdk` (`d43e51ea`, SDK 3.0.0): `packages/share-sdk/src/addressed-publish.ts:343` (owner signs both roots)
