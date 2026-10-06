---
type: concept
title: Credentials Feed the Policy Engine
description: The connective concept — an OpenCredentials vc+sd-jwt credential, verified once by the Node at mint time, satisfies a policy's credential requirement and yields an ordinary policy session delegation.
status: shipped
layer: tinycloud-app
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/policy_v3.rs@05c6a93
  - repo: OpenCredentials
    path: rust/opencredentials_witness/src/credentials/mod.rs@60364a9
  - repo: js-sdk
    path: packages/sdk-core/src/policy/credential-admission.ts@d43e51ea
tags: [credentials, policy-engine]
timestamp: 2026-10-05
---

# Credentials Feed the Policy Engine

This is where the two halves of the stack join. A credential from **[[opencredentials|OpenCredentials]]**, an [[sd-jwt-vc|SD-JWT VC]] issued by the [[witness-service|witness]], satisfies a policy's `credentialRequirement`. The [[nodes|Node]] then mints a [[delegation]] to the holder. "Credentials feed the policy engine" is literal: a Layer 2 credential unlocks Layer 1 authority.

## Role

This pipeline is what makes [[policy-as-central-primitive|a policy]] more than a grant to a known key. Authority depends on what the holder can prove, not on which key they hold. The credential app ([[architecture-layers#layer-2--tinycloud-apps|Layer 2]]) issues facts; the [[policy-engine/overview|policy engine]] ([[architecture-layers#layer-1--protocol|Layer 1]]) consumes them as gates. This page names that pipeline so both sides link to one place.

## Mechanics

1. The owner registers a Policy v2 whose `credentialRequirement` names a profile (`tinycloud.email-proof/v1` or `tinycloud.email-domain-proof/v1`), the issuer `did:web:issuer.credentials.org`, and the expected claims.
2. The recipient's browser uses a `did:key`. It acquires a credential bound to that DID from the [[witness-service|witness]] with an 8-digit mailbox code, and takes a 300-second Node challenge.
3. The recipient posts the `vc+sd-jwt` envelope and a signed `PolicyCredentialPresentation` (v3 or v4) to `POST /policy/v3/delegations`.
4. The Node verifies everything itself: the issuer signature against its pinned key, the disclosures, the holder binding, 300 s freshness, the challenge, and the claims. It then mints a session UCAN with both policy roots as parents.
5. From then on the credential is out of the loop. The session, and anything re-delegated from it, is checked on each [[invocation]] against the policy roots and [[revocation]].

The detailed checks are in [[credential-gated-delegation]]; the session machinery is in [[policy-v3-admission]].

## Relationships

Connects [[opencredentials|OpenCredentials]], [[sd-jwt-vc]] and [[witness-service]] (L2) to the [[policy-engine/overview|policy engine]], [[credential-gated-delegation]] and [[policy-v3-admission]] (L1); produces a [[delegation]]; the main product use is email and domain [[native-sharing|Share links]].

## Status & drift

`shipped` in Node 1.17.3 for the two mailbox profiles: exact email since Node 1.16.0 (accountless v4 since 1.15.0) and email domain since 1.17.3. Other credential types are not accepted.

## Sources
- `tinycloud-node` (`05c6a93`, Node 1.17.3): `tinycloud-node-server/src/policy_v3.rs` (mint :2021; requirement :4185; freshness pin :5847-5855; SD-JWT verification :5866-5960)
- `OpenCredentials` (`60364a9`): `rust/opencredentials_witness/src/credentials/mod.rs` (profiles :38, 42; 8-digit code :64)
- `js-sdk` (`d43e51ea`, SDK 3.0.0): `packages/sdk-core/src/policy/credential-admission.ts:360-376`
