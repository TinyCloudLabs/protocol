---
type: concept
title: OpenCredentials
description: TinyCloud's verifiable-credentials system — an issuer identity at did:web:issuer.credentials.org and a TEE witness at witness.credentials.org that issue holder-bound vc+sd-jwt mailbox credentials the Node checks before minting a policy session.
status: shipped
layer: tinycloud-app
sources:
  - repo: OpenCredentials
    path: README.md@60364a9
  - repo: OpenCredentials
    path: rust/opencredentials_witness/src/credentials/mod.rs@60364a9
  - repo: OpenCredentials
    path: rust/opencredentials_witness/src/main.rs@60364a9
  - repo: tinycloud-node
    path: deploy/share-email/production-trust-bundle-contract.md@05c6a93
tags: [credentials, layer, opencredentials]
timestamp: 2026-10-05
---

# OpenCredentials

**OpenCredentials** is TinyCloud's verifiable-credentials system. A **[[witness-service|witness]]** checks a real-world fact, such as control of a mailbox, and issues a signed credential. A separate **issuer identity** publishes the public key that credential verifies against. The credentials are [[sd-jwt-vc|`vc+sd-jwt`]] credentials, bound to the holder's `did:key`. They are the evidence the [[nodes|Node]] checks in [[credential-gated-delegation]].

## Role

OpenCredentials is an [[architecture-layers#layer-2--tinycloud-apps|Layer 2]] app whose output is **portable proofs of attributes**. It is the source side of [[feeds-policy-engine|"credentials feed the policy engine"]]. [[capabilities|Capabilities]] answer "may this key do X?"; credentials answer "does this key's holder control `bob@example.com`?", a fact an owner's [[policy-as-central-primitive|policy]] can require.

## Mechanics

OpenCredentials uses **two hosts** (README):

- **Issuer identity: `issuer.credentials.org`.** A static site serving the DID document, so `did:web:issuer.credentials.org` resolves to the issuer's TEE-derived public key.
- **Witness API: `witness.credentials.org`.** The Phala/dstack TEE service that runs proofs and signs credentials as that issuer DID. The two are separate because a `did:web` must resolve independently of the service that signs under it.

A holder acquires a credential through the acquisition protocol `tinycloud.credentials/acquisition/v1`, described in [[witness-service]]:

1. It creates a request bound to its `holderDid`.
2. It proves the fact; for a mailbox, it enters an 8-digit code.
3. It signs a holder signature with the requesting DID's key.
4. It collects a `vc+sd-jwt` credential whose subject and holder are that DID.

The Node pins the production issuer (DID, VCT, `kid`, key) through operator configuration and verifies credentials itself.

## Shape

- **Issuer DID:** `did:web:issuer.credentials.org`.
- **Witness API:** `https://witness.credentials.org`; user interaction pages are on `https://credentials.org`.
- **Credential type wired to TinyCloud authorization:** `opencredentials.email/v1`, under two profiles, `tinycloud.email-proof/v1` and `tinycloud.email-domain-proof/v1`.
- **Format:** `vc+sd-jwt`, Ed25519 (`EdDSA`), status freshness 300 s.

## Relationships

Issued by the [[witness-service|witness service]]; credentials are [[sd-jwt-vc|SD-JWT VCs]]; consumed by [[credential-gated-delegation]] inside [[policy-v3-admission]]; the end-to-end flow is [[feeds-policy-engine]]; the main product use is email and domain [[native-sharing|Share links]]; issuer and holders are [[dids|DIDs]]; the witness key lives in a [[tee-dstack|dstack TEE]]; an [[architecture-layers#layer-2--tinycloud-apps|L2 app]] peer of [[example-listen|Listen]] and [[secrets-space|Secrets]].

## Example

Bob opens a share addressed to `example.com`. His browser starts an acquisition at `witness.credentials.org` for his `did:key`. He receives an 8-digit code at `bob@example.com`, enters it, and gets an `opencredentials.email/v1` credential under `tinycloud.email-domain-proof/v1`. The credential is signed as `did:web:issuer.credentials.org`, and the issuer derives the domain from the proven mailbox. The Node verifies it against its pinned key and mints Bob's session.

## Status & drift

`shipped`. The two mailbox profiles back production email and email-domain shares (Node 1.17.3). The witness also has other flows, such as X (`tinycloud.x-verification/v2`), DNS and GitHub, and legacy JWT/LD issuance routes; none of these is accepted by the Node's policy admission. Earlier versions of this page named the issuer `did:web:issuer.tinycloud.xyz`; the production issuer is `did:web:issuer.credentials.org`.

## Sources
- `OpenCredentials` (`60364a9`): `README.md:16-25` (two-host architecture, issuer DID), `rust/opencredentials_witness/src/credentials/mod.rs` (protocol and profile constants :32-45, 8-digit mailbox code :64, issuance :1790-2040), `rust/opencredentials_witness/src/main.rs` (dstack key derivation)
- `tinycloud-node` (`05c6a93`): `deploy/share-email/production-trust-bundle-contract.md:42-45` (production issuer identity)
