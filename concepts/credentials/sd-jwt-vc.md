---
type: concept
title: SD-JWT VC
description: The selectively-disclosable credential format OpenCredentials issues — a signed JWT followed by `~`-separated disclosures — so a holder can prove one claim (an email domain) without revealing the rest.
status: in-progress
layer: tinycloud-app
sources:
  - repo: OpenCredentials
    path: js/opencredentials-client/src/sd_jwt.ts
  - repo: OpenCredentials
    path: rust/opencredentials_sd_jwt/src/lib.rs
tags: [credentials, sd-jwt, vc]
timestamp: 2026-06-23
---

# SD-JWT VC

An **SD-JWT VC** is the credential format [[credentials|OpenCredentials]] issues for selective disclosure: a compact, issuer-signed JWT carrying *digests* of claims, followed by `~`-separated **disclosures** that reveal individual claims, optionally ending in a holder key-binding JWT. The holder chooses which disclosures to attach when presenting, so they can prove exactly one fact — *"my email domain is `tinycloud.xyz`"* — without exposing the address or any other claim. This is the wire format the [[policy-engine/overview|policy engine]] verifies when it [[credential-gated-delegation|gates a delegation]] on credential evidence.

## Role

Selective disclosure is what makes credentials usable as authorization evidence without leaking data. A [[capabilities|capability]] is minimal by construction; a credential should be too. SD-JWT lets [[credentials|OpenCredentials]] issue a rich credential once (every claim digested into the signed JWT) while the holder presents only the slice a [[policy-as-central-primitive|Policy]] demands. It is the privacy hinge of the [[feeds-policy-engine|credentials→policy-engine]] pipeline, sitting in [[architecture-layers#layer-2-tinycloud-apps|Layer 2]].

## Mechanics

The format follows IETF SD-JWT (`sha-256` as `SD_ALG`):

- **Structure** — `<issuer-JWT>~<disclosure_1>~…~<disclosure_n>~[<key-binding-JWT>]`. The issuer JWT is a normal 3-segment compact JWT signed by the [[witness-service|witness]] (`did:web:issuer.tinycloud.xyz`, EdDSA / Ed25519). Each disclosure is base64url of a JSON array `[salt, claimName, value]`; the signed payload holds only the *digests* of these, so a verifier confirms a disclosed claim by hashing the disclosure and matching the digest.
- **Parsing** (`js/opencredentials-client/src/sd_jwt.ts`, `parse_sd_jwt`) — splits on `~`; the first segment is the JWT, a trailing 3-segment value is treated as the **key-binding JWT**, and the middle segments parse as disclosures (`[salt, claimName, value]`).
- **Presentation** (`present_sd_jwt`) — re-emits `jwt ~ selected-disclosures [~ key-binding-jwt]`, defaulting to all disclosures but accepting a chosen subset. This is how a holder drops every disclosure except the email-domain one.
- **Issue/verify (Rust)** — `rust/opencredentials_sd_jwt/src/lib.rs` provides the issuer/holder/verifier side (`Ed25519Signer`/`Ed25519Verifier` over JWKs); the policy engine's verifier reuses this machinery via the `opencredentials-verify` crate.

## Shape

```
SD-JWT  = <compact-JWT> "~" *( <disclosure> "~" ) [ <key-binding-JWT> ]
disclosure = base64url( JSON [ salt, claimName, value ] )
// policy-engine presentation wrapper:
PresentedEvidence.presentation = { "sdJwt": "<SD-JWT string>" }
```

The TinyCloud credential type wired into authorization is **`opencredentials.email/v1`** (the email VCT), which supports a full-`email` disclosure *and* a separate **email-domain** disclosure — and the policy engine specifically requires the domain disclosure, rejecting a presentation that reveals the full email but not the domain.

## Relationships

Issued by the [[witness-service|witness service]] as part of [[credentials|OpenCredentials]]; the W3C-VC profile the [[policy-engine/overview|policy engine]] expects ([[credential-gated-delegation|`w3c.vc/credential/v1`]]); its disclosures are the holder-side privacy control feeding [[feeds-policy-engine|policy evidence]]; signed by a [[dids|did:web]] issuer and optionally key-bound to a [[dids|holder DID]]; an [[architecture-layers#layer-2-tinycloud-apps|L2]] format.

## Example

An issued `opencredentials.email/v1` SD-JWT for `sam@tinycloud.xyz` contains digested claims including `email` and `email_domain`. To satisfy a Policy requiring `emailDomains: ["tinycloud.xyz"]`, the holder calls `present_sd_jwt` selecting **only** the `email_domain` disclosure and wraps it as `{ sdJwt: "…" }`. The [[credential-gated-delegation|verifier]] confirms the witness signature, hashes the one disclosure against the signed digest, sees domain `tinycloud.xyz`, and grants — the full address `sam@` was never transmitted.

## Status & drift

`in-progress`. The SD-JWT parse/present client (`sd_jwt.ts`) and Rust issue/verify (`opencredentials_sd_jwt`) are implemented, and the email-domain selective disclosure is the path verified end-to-end by the policy engine. Key-binding JWTs are parsed/preserved by the client but are not the gate the email-domain policy flow relies on. Other VCTs beyond `opencredentials.email/v1` are design-intent. See [[meta/contradictions]].

## Sources
- `OpenCredentials`: `js/opencredentials-client/src/sd_jwt.ts` (`parse_sd_jwt`/`present_sd_jwt`, `~`-format, disclosure shape, key-binding detection), `rust/opencredentials_sd_jwt/src/lib.rs` (`SD_ALG = sha-256`, `Ed25519Signer`/`Ed25519Verifier`)
