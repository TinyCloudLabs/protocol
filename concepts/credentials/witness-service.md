---
type: concept
title: Witness Service
description: The OpenCredentials issuer service at witness.credentials.org — a dstack TEE that runs holder-bound acquisitions (8-digit mailbox codes) and signs vc+sd-jwt credentials as did:web:issuer.credentials.org.
status: shipped
layer: tinycloud-app
sources:
  - repo: OpenCredentials
    path: rust/opencredentials_witness/src/credentials/mod.rs@60364a9
  - repo: OpenCredentials
    path: rust/opencredentials_witness/src/main.rs@60364a9
  - repo: OpenCredentials
    path: rust/opencredentials_witness/src/routes.rs@60364a9
  - repo: OpenCredentials
    path: README.md@60364a9
tags: [credentials, witness, issuer]
timestamp: 2026-10-05
---

# Witness Service

The **witness service** is the [[opencredentials|OpenCredentials]] issuer, deployed at `https://witness.credentials.org`. It "witnesses" a claim, such as that a holder controls a mailbox, and signs a credential as **`did:web:issuer.credentials.org`**. Anyone, including the [[nodes|Node]], can later verify that credential against the issuer's published key with no further contact with the witness.

## Role

The witness is the trust anchor of [[opencredentials|OpenCredentials]]: a credential is only as good as its signer. Its identity and key custody are what a Node operator pins when it accepts credentials for [[credential-gated-delegation]]. The issuer's DID document is hosted separately, at `issuer.credentials.org`, so the identity resolves independently of the service that signs.

## Mechanics

### Acquisition protocol (`tinycloud.credentials/acquisition/v1`)

The routes TinyCloud uses live under `/v1/acquisitions`. Discovery is at `/.well-known/opencredentials` and `/v1/credential-types`.

1. **Create.** `POST /v1/acquisitions` with a `holderDid` and a profile. The request lasts 10 minutes.
2. **Interact.** The user follows an interaction page on `credentials.org`. For a mailbox, the witness emails an **8-digit**, uniformly random code. A challenge lasts 5 minutes and allows at most 5 proof attempts.
3. **Prove.** `POST /v1/acquisitions/{id}/proof`.
4. **Holder signature.** `POST /v1/acquisitions/{id}/holder-signature`: the holder signs with the requesting DID's key; `issue` refuses (`holder_signature_required`) until this succeeds.
5. **Issue.** `POST /v1/acquisitions/{id}/issue`, then `GET …/result`, returns a `vc+sd-jwt` credential whose subject and `holderBinding.did` are the requesting DID, with status freshness 300 s.

Two mailbox profiles back TinyCloud shares:

- `tinycloud.email-proof/v1`: for one exact mailbox. It discloses `email` and its `emailDomain`.
- `tinycloud.email-domain-proof/v1`: for shares addressed to a whole domain. The witness **derives** `emailDomain` from the canonical form of the mailbox that passed the code. The acquisition input is only `{email}`, so a client cannot assert a domain. Domain-profile challenges are rate-limited.

### Key custody: dstack TEE

In production the Ed25519 signing key is derived inside a dstack TEE: `dstack::get_key("opencredentials/witness/signing-key")`, selected by `KEYS_TYPE=dstack`. It is never handled as plaintext outside the enclave. This is the same confidential-compute basis as the [[tee-dstack|Node's TEE]].

### Legacy routes

TinyCloud policy admission uses only the acquisition flow above.

## Shape

- **Issuer DID:** `did:web:issuer.credentials.org`; DID document at `issuer.credentials.org`.
- **Service host:** `https://witness.credentials.org`; interaction origin `https://credentials.org`.
- **Signature:** Ed25519 / `EdDSA`, TEE-derived key.
- **Mailbox code:** 8 digits; 5 attempts; 5-minute challenge; 10-minute request.

## Relationships

The issuer half of [[opencredentials|OpenCredentials]]; signs [[sd-jwt-vc|SD-JWT VCs]]; its DID is the trusted issuer the Node pins for [[credential-gated-delegation]] in [[policy-v3-admission]]; feeds [[feeds-policy-engine|the policy engine]]; key protected by a [[tee-dstack|dstack TEE]]; also the audience the Node names when it authorizes a Share email (see [[native-sharing]]); identified by a [[dids|did:web]].

## Example

Bob's browser posts an acquisition for profile `tinycloud.email-domain-proof/v1` and his `did:key`. The witness emails `bob@example.com` a code such as `48213906`. Bob enters it on `credentials.org`, and the witness issues a credential with `email` and the derived `emailDomain: example.com`, signed by its TEE-held key. The Node later verifies it against its pinned copy of `did:web:issuer.credentials.org`'s key.

## Status & drift

`shipped`. The acquisition API and both mailbox profiles back production email and domain shares. Earlier versions of this page said the witness signs as `did:web:issuer.tinycloud.xyz`; that is wrong. The production issuer is `did:web:issuer.credentials.org` (OpenCredentials README; Node production trust-bundle contract). Other flows exist (X `tinycloud.x-verification/v2`, DNS, GitHub, …) but are not accepted by Node policy admission.

## Sources
- `OpenCredentials` (`60364a9`): `rust/opencredentials_witness/src/credentials/mod.rs` (constants :32-70 incl. 8-digit code :64 and profiles :38, 42; routes :856-883; domain derivation :2013-2024; issuance :1790-1950), `rust/opencredentials_witness/src/main.rs` (dstack key derivation), `rust/opencredentials_witness/src/routes.rs:36-45` (legacy routes), `README.md:16-25` (two-host architecture)
- `tinycloud-node` (`05c6a93`): `deploy/share-email/production-trust-bundle-contract.md:42-45`
