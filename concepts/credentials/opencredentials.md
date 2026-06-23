---
type: concept
title: OpenCredentials
description: TinyCloud's verifiable-credentials app — a witness service that issues SD-JWT / W3C VCs plus a client SDK, producing the credentials the policy engine gates delegations on.
status: in-progress
layer: tinycloud-app
sources:
  - repo: OpenCredentials
    path: rust/opencredentials_witness/src/main.rs
  - repo: OpenCredentials
    path: js/opencredentials-client/src/opencredentials_client_wrapper.ts
  - repo: OpenCredentials
    path: opencredentials-protocol.md
tags: [credentials, layer, opencredentials]
timestamp: 2026-06-23
---

# OpenCredentials

**OpenCredentials** is TinyCloud's verifiable-credentials system: a **[[witness-service|witness service]]** that verifies a real-world fact (email control, DNS, GitHub, NFT ownership, …) and issues a signed credential, plus a **client SDK** that drives the witness flow and parses the result. The credentials it issues are [[sd-jwt-vc|SD-JWT / W3C Verifiable Credentials]] signed by a stable issuer DID, and they are exactly the evidence the [[policy-engine/overview|policy engine]] verifies to [[credential-gated-delegation|gate a delegation]].

## Role

OpenCredentials is an [[architecture-layers#layer-2-tinycloud-apps|Layer 2 TinyCloud app]] — a first-class data source built by TinyCloud — whose "data" is **portable proofs of attributes**. It is the source side of the [[feeds-policy-engine|"credentials feed the policy engine"]] pipeline: where [[capabilities|capabilities]] answer *"may this key do X?"*, credentials answer *"is this subject a member / does it control this email?"* — facts an owner's [[policy-as-central-primitive|Policy]] can condition authority on. Because the credentials are W3C-standard and selectively disclosable, they verify the same way regardless of which app presents them.

## Mechanics

OpenCredentials separates two roles, mirroring the classic issuer / holder / verifier triangle:

- **Issuance (witness):** the [[witness-service|witness service]] runs a `WitnessFlow` (`rust/opencredentials_witness/`) — a set of verification flows (email, DNS, GitHub, Reddit, NFT/POAP, attestation, …) selected by environment config. A frontend resolves the issuer's `did.json` and `opencredentials.json` (the discovery document — `opencredentials-protocol.md`), runs the flow's `instructions → statement → witness` round trips, and receives a credential in `jwt`, `ld`, or `sd-jwt` form.
- **Client:** the `opencredentials-client` SDK (WASM-backed TypeScript, `js/opencredentials-client/`) drives that flow against a default witness of `https://witness.tinycloud.xyz` and parses the returned credential ([[sd-jwt-vc|`parse_sd_jwt`/`present_sd_jwt`]]).
- **Verification:** the credential is verified independently by whoever consumes it — for TinyCloud authorization, that consumer is the [[policy-engine/overview|policy engine]]'s [[credential-gated-delegation|VC evidence verifier]].

## Shape

- **Issuer DID:** `did:web:issuer.tinycloud.xyz` (the witness signs as this; its `did.json` carries the Ed25519 verification key).
- **Witness endpoint:** `https://witness.tinycloud.xyz` (`DEFAULT_WITNESS_URL` in the client).
- **Credential formats:** `jwt`, `ld`, `sd-jwt` (`capabilities` map; default `jwt`), with [[sd-jwt-vc|SD-JWT]] the format the policy engine consumes.
- **Discovery:** an `opencredentials.json` next to `did.json` lists supported credential types, requirements, and endpoints.

## Relationships

Issued by the [[witness-service|witness service]] (signing as `did:web:issuer.tinycloud.xyz`); its credentials are [[sd-jwt-vc|SD-JWT / W3C VCs]]; consumed as [[credential-gated-delegation|evidence]] by the [[policy-engine/overview|policy engine]]; the end-to-end flow into authorization is [[feeds-policy-engine]]; an [[architecture-layers#layer-2-tinycloud-apps|L2 app]] peer of [[example-listen|Listen]] and [[secrets|Secrets]]; subjects and issuers are named by [[dids|DIDs]].

## Example

A user runs the OpenCredentials client against `witness.tinycloud.xyz`, completes the email-verification flow for `sam@tinycloud.xyz`, and receives an `opencredentials.email/v1` SD-JWT signed by `did:web:issuer.tinycloud.xyz`. They later present *only the email-domain disclosure* of that credential to a TinyCloud node fronted by a [[policy-as-central-primitive|Policy]] requiring a `@tinycloud.xyz` member — and receive a scoped [[capabilities|capability]] grant, never having revealed the full address.

## Status & drift

`in-progress`. The witness service (axum + DStack TEE issuer derivation), the client SDK, the SD-JWT pipeline, and the email credential consumed by the policy engine are real and wired. The OpenCredentials *protocol* discovery document (`opencredentials-protocol.md`) is a broad spec covering many credential types and issuers; the **TinyCloud authorization path currently uses one credential type end-to-end** (email-domain — see [[credential-gated-delegation#status--drift]]). There is **no dedicated `credentials` system space** in the node; credentials live as ordinary portable artifacts (open design question — see [[meta/contradictions]]).

## Sources
- `OpenCredentials`: `rust/opencredentials_witness/src/main.rs` + `config.rs` (witness flows, formats, `did:web` issuer), `js/opencredentials-client/src/opencredentials_client_wrapper.ts` (`DEFAULT_WITNESS_URL = https://witness.tinycloud.xyz`), `opencredentials-protocol.md` (discovery document)
