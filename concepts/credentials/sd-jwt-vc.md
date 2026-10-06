---
type: concept
title: SD-JWT VC
description: The selectively-disclosable credential format OpenCredentials issues — an issuer-signed JWT plus `~`-separated disclosures, wrapped in a vc+sd-jwt envelope that the Node parses and verifies in-tree.
status: shipped
layer: tinycloud-app
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/policy_v3.rs@05c6a93
  - repo: OpenCredentials
    path: rust/opencredentials_witness/src/credentials/mod.rs@60364a9
  - repo: OpenCredentials
    path: js/opencredentials-client/src/sd_jwt.ts@60364a9
  - repo: OpenCredentials
    path: rust/opencredentials_sd_jwt/src/lib.rs@60364a9
tags: [credentials, sd-jwt, vc]
timestamp: 2026-10-05
---

# SD-JWT VC

An **SD-JWT VC** is the credential format [[opencredentials|OpenCredentials]] issues. It is a compact, issuer-signed JWT that carries *digests* of claims, followed by `~`-separated **disclosures** that reveal individual claims. A verifier hashes each disclosure and matches it to a signed digest, so only disclosed claims are visible and none can be forged. TinyCloud receives it inside a `vc+sd-jwt` envelope, which the [[nodes|Node]] verifies when it [[credential-gated-delegation|gates a delegation]].

## Role

SD-JWT lets a credential be issued once, with every claim digested and signed, while the holder reveals only what is needed. In TinyCloud's mailbox credentials it also carries the binding to the holder's key: the credential's subject is the holder's `did:key`. The Node therefore knows the presenter is the person who proved the mailbox. It is the wire format of the [[feeds-policy-engine|credentials → policy engine]] pipeline, in [[architecture-layers#layer-2--tinycloud-apps|Layer 2]].

## Mechanics

- **Structure.** `<issuer-JWT>~<disclosure_1>~…~<disclosure_n>`. The JWT is signed `EdDSA` (Ed25519) by the [[witness-service|witness]] as `did:web:issuer.credentials.org`, with `_sd_alg: sha-256`. Each disclosure is base64url of the JSON array `[salt, claimName, value]`.
- **Issuance.** The witness issues `vc+sd-jwt` credentials of type `opencredentials.email/v1`. `sub` and `holderDid` are the acquiring DID, the status freshness is 300 s, and `email` and `emailDomain` are disclosable.
- **Verification in the Node.** The Node parses SD-JWT itself; no external verifier crate is involved. It:
  1. checks the envelope (`format: "vc+sd-jwt"`, matching `holderDid`/`subjectDid`, profile, issuer, `kid`, descriptor digest);
  2. checks the JWT header (`alg: EdDSA`, `typ`/`kid` if present) and the issuer signature against the operator-pinned key;
  3. hashes every disclosure, which must match a signed digest and may not repeat a claim name;
  4. checks `iss`, `sub`, `vct`, profile and descriptor digest on the disclosed payload.
- **Presentation.** The envelope travels in a signed `PolicyCredentialPresentation` (v3 account path, or v4 accountless with `holderDid == subjectDid`). Older pages described a `GrantPresentation { sdJwt }`; that was the policy-core v0 shape and is not used.
- **Client helpers.** `js/opencredentials-client/src/sd_jwt.ts` (`parse_sd_jwt`/`present_sd_jwt`) and `rust/opencredentials_sd_jwt` provide generic parse/present and issue/verify.

## Shape

```
SD-JWT     = <compact-JWT> "~" *( <disclosure> "~" )
disclosure = base64url( JSON [ salt, claimName, value ] )

envelope   = { type: "OpenCredentialsIssuedCredential", version: 1,
               protocol: "tinycloud.credentials/acquisition/v1", format: "vc+sd-jwt",
               profile, credentialType, schema, issuerDid, issuerKid, subjectDid, holderDid,
               claims, claimsDigest, descriptorDigest, credentialId,
               issuedAt, notBefore, expiresAt, status, credential: "<SD-JWT>" }
```

## Relationships

Issued by the [[witness-service|witness]] for [[opencredentials|OpenCredentials]]; verified by the Node in [[credential-gated-delegation]] during [[policy-v3-admission]]; the overview is [[feeds-policy-engine]]; signed by a [[dids|did:web]] issuer about a [[dids|did:key]] holder.

## Example

Bob's credential for `bob@example.com` under `tinycloud.email-domain-proof/v1` has disclosures for `email` and `emailDomain`. The Node recomputes each disclosure's SHA-256 and finds it in the signed `_sd` list. It checks the signature against the pinned issuer key, sees `sub` equal to Bob's `did:key`, and reads `emailDomain: example.com` to match the policy.

## Status & drift

`shipped`. In-tree SD-JWT verification for `opencredentials.email/v1` is in production Node 1.17.3. Key-binding JWTs are not used; holder binding comes from `sub`/`holderDid` plus the signed presentation. The requirement's claims must match both the disclosed payload and the envelope's `claims` object, which is itself bound by `claimsDigest`. The witness issues `email` as well as `emailDomain` under both mailbox profiles. Other VCTs are not accepted by the Node.

## Sources
- `tinycloud-node` (`05c6a93`, Node 1.17.3): `tinycloud-node-server/src/policy_v3.rs:5866-6060` (envelope keys, SD-JWT parse, signature, disclosure digests, claim checks)
- `OpenCredentials` (`60364a9`): `rust/opencredentials_witness/src/credentials/mod.rs:1790-2045` (issuance, disclosed claims), `js/opencredentials-client/src/sd_jwt.ts`, `rust/opencredentials_sd_jwt/src/lib.rs`
- `js-sdk` (`d43e51ea`): `packages/sdk-core/src/policy/credential-admission.ts:360-376` (v4 presentation)
