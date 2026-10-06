---
type: index
title: Credentials
description: OpenCredentials — holder-bound vc+sd-jwt credentials that the Node verifies before minting a policy session.
timestamp: 2026-10-05
---

# Credentials

OpenCredentials: holder-bound `vc+sd-jwt` credentials that the Node verifies before minting a policy session.

## Concepts

- [OpenCredentials](opencredentials.md) — The credentials system: issuer identity did:web:issuer.credentials.org plus the witness API at witness.credentials.org.
- [Witness Service](witness-service.md) — TEE issuer running holder-bound acquisitions (8-digit mailbox codes) for the exact-email and email-domain profiles.
- [SD-JWT VC](sd-jwt-vc.md) — The selectively-disclosable format, wrapped in a vc+sd-jwt envelope the Node verifies in-tree.
- [Feeds the Policy Engine](feeds-policy-engine.md) — How a credential, checked once at mint, becomes a policy session delegation.
