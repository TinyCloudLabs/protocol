---
type: concept
title: Witness Service
description: The OpenCredentials issuer — an axum HTTP service at witness.credentials.org that runs verification flows and issues credentials signed as did:web:issuer.tinycloud.xyz, with its key derived inside a DStack TEE.
status: in-progress
layer: tinycloud-app
sources:
  - repo: OpenCredentials
    path: rust/opencredentials_witness/src/main.rs
  - repo: OpenCredentials
    path: rust/opencredentials_witness/src/routes.rs
  - repo: OpenCredentials
    path: rust/opencredentials_witness/src/config.rs
tags: [credentials, witness, issuer]
timestamp: 2026-06-23
---

# Witness Service

The **witness service** is the [[credentials|OpenCredentials]] **issuer**: an HTTP service (deployed at `https://witness.credentials.org`) that verifies a real-world fact about a subject and, on success, signs a credential as **`did:web:issuer.tinycloud.xyz`**. It "witnesses" a claim — that the subject controls an email address, a DNS record, a GitHub account — and converts that observation into a portable [[sd-jwt-vc|SD-JWT / W3C VC]] that anyone, including the [[policy-engine/overview|policy engine]], can later verify against the issuer's published DID document.

## Role

The witness is the trust anchor of [[credentials|OpenCredentials]] within [[architecture-layers#layer-2-tinycloud-apps|Layer 2]]. A credential is only as trustworthy as the entity that signed it, so the witness's identity (`did:web:issuer.tinycloud.xyz`) and key custody matter: it is the issuer a [[policy-as-central-primitive|Policy]] names in `authority.accepted_issuers` when it [[credential-gated-delegation|gates a delegation]] on credential evidence. The verification logic lives off-chain (talking to email providers, DNS, GitHub APIs); the witness's signature is what makes the result self-verifying afterward.

## Mechanics

The service is an **axum** `Router` (`rust/opencredentials_witness/src/main.rs`) exposing:

- `GET /.well-known/did.json` — the issuer's DID document (Ed25519 verification key, `JsonWebKey2020`), generated from the issuer JWK with the private `d` field stripped (`config::did_document`).
- `GET /capabilities` — which verification flows + credential formats are enabled.
- `POST /instructions` → `POST /statement` → `POST /witness_jwt | /witness_sd_jwt | /witness_ld` — the three-step issuance handshake: the client gets flow instructions, submits a signed statement proving the fact, and receives the issued credential in the requested format.
- `POST /verify` — stateless verification of a presented VC.

Which flows are active is set per deployment by env vars (`config::new_flow`): no-API-key flows (DNS, GitHub, Reddit, same-controller assertion, attestation) default on; API-key flows (email via Resend, NFT via Alchemy, POAP, Twitter, SoundCloud) enable when their key is present.

### Key custody — DStack TEE

The Ed25519 signing key is, in production, **derived inside a DStack TEE** (`KEYS_TYPE=dstack`): `build_issuer_dstack` calls `dstack::get_key("opencredentials/witness/signing-key")` to obtain a TEE-bound seed, so the issuer key is never handled as plaintext outside the enclave. Without `dstack`, the key comes from `OPENCREDENTIALS_SK` (development). This is the same [[nodes|DStack confidential-compute]] basis used elsewhere in TinyCloud.

## Shape

- **Issuer DID:** `did:web:issuer.tinycloud.xyz` (set via `DID_WEB`).
- **Service host:** `https://witness.credentials.org` (the client's `DEFAULT_WITNESS_URL`).
- **Signature:** Ed25519 (`JsonWebKey2020` / `EdDSA`), key derived in a DStack TEE.
- **Issuance handshake:** `instructions → statement → witness_{jwt|sd_jwt|ld}`.

## Relationships

The issuer half of [[credentials|OpenCredentials]]; signs [[sd-jwt-vc|SD-JWT / W3C VCs]]; its DID `did:web:issuer.tinycloud.xyz` is the trusted issuer a [[policy-as-central-primitive|Policy]] lists in `accepted_issuers` for [[credential-gated-delegation|credential-gated delegation]]; its key is protected by the same [[nodes|DStack TEE]] confidential-compute model; identified by a [[dids|did:web]]; an [[architecture-layers#layer-2-tinycloud-apps|L2]] component.

## Example

A client `POST`s an email-verification statement to `https://witness.credentials.org`. The service runs the email flow, confirms the user controls `sam@tinycloud.xyz`, and returns from `/witness_sd_jwt` an SD-JWT credential signed by the TEE-held key of `did:web:issuer.tinycloud.xyz`. Months later the [[policy-engine/overview|policy engine]] resolves that same DID's `/.well-known/did.json`, finds the verification key, and [[credential-gated-delegation|verifies the credential]] with no further contact with the witness.

## Status & drift

`in-progress`. The axum service, the route set, the DStack-derived issuer key, and `did.json` generation are implemented. Many verification flows exist in config, but the **only flow currently wired through to TinyCloud authorization is email** (the policy engine's `opencredentials.email/v1` verifier — see [[credential-gated-delegation]]). The `did:web:issuer.tinycloud.xyz` / `witness.credentials.org` hostnames reflect the intended deployment; treat exact operational endpoints as deployment config. See [[meta/contradictions]].

## Sources
- `OpenCredentials`: `rust/opencredentials_witness/src/main.rs` (axum routes, DStack key derivation), `rust/opencredentials_witness/src/routes.rs` (handler set), `rust/opencredentials_witness/src/config.rs` (`new_flow`, `did_document`, `did:web` issuer)
