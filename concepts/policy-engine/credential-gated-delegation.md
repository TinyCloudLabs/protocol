---
type: concept
title: Credential-Gated Delegation
description: A delegation the Node mints only after it verifies an OpenCredentials vc+sd-jwt credential itself — exact email or email domain, from a pinned issuer, at most 300 s old — once, at session mint.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/policy_v3.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/lib.rs@05c6a93
  - repo: tinycloud-node
    path: deploy/share-email/production-trust-bundle-contract.md@05c6a93
  - repo: js-sdk
    path: packages/sdk-core/src/policy/credential-admission.ts@d43e51ea
tags: [policy-engine, credentials]
timestamp: 2026-10-05
---

# Credential-Gated Delegation

**Credential-gated delegation** is a [[delegation]] the [[nodes|Node]] mints only after the recipient presents a verifiable credential that the Node checks itself. The owner's Policy v2 names a `credentialRequirement`. The recipient brings an [[opencredentials|OpenCredentials]] [[sd-jwt-vc|`vc+sd-jwt`]] credential and a signed presentation. If both check out, the Node signs a policy session UCAN to the recipient (see [[policy-v3-admission]]). This is the concrete pipeline behind [[feeds-policy-engine|"credentials feed the policy engine"]].

## Role

The gate turns "whoever proves `alice@example.com`" or "anyone at `example.com`" into real authority, with no owner signature per recipient. The Node never trusts a holder's claim that the requirement is met: it parses the SD-JWT, checks the issuer signature against an operator-pinned key, and binds the credential to the presenting key. The credential is checked **once, at mint**. Later invocations rely on the session chain and the policy roots, not on re-presenting the credential.

## Mechanics

### The requirement

A Policy v2 `credentialRequirement` has exactly `{type, version, requirementDigest, descriptorDigest, issuerDid, issuerKid, profile, credentialType}`. `profile` and `credentialType` are versioned identifiers (`{id, version: 1}`). Two profiles are pinned, both with credential type `opencredentials.email/v1`:

| Profile | Matches |
|---|---|
| `tinycloud.email-proof/v1` | one exact mailbox |
| `tinycloud.email-domain-proof/v1` | any mailbox whose issuer-derived domain equals the policy's domain exactly (no subdomains) |

For both profiles the Node pins status freshness at **300 s**, even if a policy omits or relaxes it.

### The trusted issuer

The operator configures one issuer: DID, VCT, key version, `kid`, and a 32-byte Ed25519 public key (`lib.rs:465-479`). In production that issuer is `did:web:issuer.credentials.org` with VCT `opencredentials.email/v1` (production trust-bundle contract). A disabled issuer or key version 0 is `credential-issuer-untrusted`.

### Verification at mint

On `POST /policy/v3/delegations` the Node:

1. Checks the credential envelope: `type: OpenCredentialsIssuedCredential`, `protocol: tinycloud.credentials/acquisition/v1`, `format: "vc+sd-jwt"`. Profile, credential type, issuer DID, `kid` and descriptor digest must equal the requirement. `holderDid` and `subjectDid` must both equal the expected holder.
2. Parses the SD-JWT in-tree. It splits on `~`, requires an `EdDSA` compact JWT whose `typ`/`kid` match, and verifies the issuer signature and disclosures.
3. Verifies the signed presentation, `PolicyCredentialPresentation`:
   - **v3**, account path: binds the account authorization and a recipient-owned `credentialSpaceId`;
   - **v4**, accountless: a holder proof where `holderDid == subjectDid`, both `did:key`. This is the production browser path.
4. Checks the presentation against the challenge, nonce, node audience, expiry and requested capabilities, then mints the session. v4 sessions also record domain-separated digests of the credential ID and presentation JTI for audit, without the raw values.

## Shape

```
credentialRequirement = { type, version, requirementDigest, descriptorDigest,
                          issuerDid: "did:web:issuer.credentials.org", issuerKid,
                          profile: { id: "tinycloud.email-domain-proof/v1", version: 1 },
                          credentialType: { id: "opencredentials.email/v1", version: 1 } }

PolicyCredentialPresentation/v4 = { schema: "xyz.tinycloud.policy/presentation/v4", jti, challengeId, nonce,
                          policyCid, nodeAudience, holderDid, subjectDid, credentialDigest,
                          requirementDigest, descriptorDigest, requestedCapabilities,
                          issuedAt, expiresAt } + holder signature
```

## Relationships

The credential step of [[policy-v3-admission]] and the only shipped condition of [[policy-as-central-primitive|a policy]]; verifies [[sd-jwt-vc|SD-JWT credentials]] issued by the [[witness-service|witness]] for [[opencredentials|OpenCredentials]]; the overview is [[feeds-policy-engine]]; produces a [[delegation]] bounded by [[attenuation]]; powers email and domain [[native-sharing|Share links]]; recipients are [[dids|`did:key`]] holders.

## Example

Alice's policy requires `tinycloud.email-domain-proof/v1` for `example.com`. Bob proves `bob@example.com` to the witness with an 8-digit mailbox code and gets a credential bound to his browser `did:key`. Within 300 s he posts it with a v4 presentation. The Node checks the issuer signature against its pinned `did:web:issuer.credentials.org` key, confirms the issuer-derived domain is exactly `example.com`, and mints Bob's session. A credential for `bob@eu.example.com` fails, because domains must match exactly.

## Status & drift

`shipped` in Node 1.17.3 (`tinycloud-node@05c6a93`): exact-email admission since 1.16.0 (browser holder-bound) and 1.15.0 (accountless v4), domain profile and its 300 s pin in 1.17.3. Only the two mailbox profiles are wired; other OpenCredentials types (X, DNS, …) are not accepted by the Node. Older versions of this page named the issuer `did:web:issuer.tinycloud.xyz`; that is wrong.

### History: policy-core v0

The earlier `policy-core` design expressed this as an `evidence{}` node in a `when` tree, verified by a `policy-evidence-vc` crate with verifier `w3c.vc/credential/v1` and a `GrantPresentation` carrying `{ sdJwt }`. That crate never ran in the Node server; in Node 1.17.3 it is used only by test crates (such as `test/m1-realdata-e2e`), never by the server.

## Sources
- `tinycloud-node` (`05c6a93`, Node 1.17.3): `tinycloud-node-server/src/policy_v3.rs` (presentation schemas :56-59; requirement :4185; profile freshness pin :5847-5855; envelope + SD-JWT verification :5866-5960; v4 admission :5614), `tinycloud-node-server/src/lib.rs:465-479` (issuer key config), `deploy/share-email/production-trust-bundle-contract.md:42-45` (production issuer), `CHANGELOG.md` (1.15.0, 1.16.0, 1.17.3)
- `js-sdk` (`d43e51ea`, SDK 3.0.0): `packages/sdk-core/src/policy/credential-admission.ts:360-376` (v4 holder proof, `holderDid == subjectDid`)
