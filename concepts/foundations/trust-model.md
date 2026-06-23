---
type: concept
title: Trust Model
description: Sovereign core / exosuit / harness positioning and the explicit-trust threat model the protocol defends against.
status: shipped
sources:
  - repo: technology-map
    path: overview/docs/product-vision.md
  - repo: whitepaper
    path: README.md
tags: [framing, trust-model]
timestamp: 2026-06-23
---

# Trust Model

TinyCloud's trust model has two halves: a **positioning** (who is the center of
the architecture) and a **threat model** (what each party is trusted to do, and
what they cannot do even if malicious).

## Positioning: sovereign core, exosuit, harness

The user and their data are the **sovereign core** — not a layer in someone
else's stack, but the center around which everything orbits. Agents are
**exosuits**: powerful and capable, but worn around the sovereign owner, not
overlords with root access. You decide what an exosuit can access, for how long,
and under what conditions, and you can revoke that access at any time. Agents are
model-agnostic — the **harness** doesn't care which model runs inside (technology-map
`overview/src/content/products.ts`: "the harness doesn't care"); you can
swap exosuits (one for work, one for development, one for personal tasks) and
each interacts with the same sovereign core.

In the broader ecosystem framing: TinyCloud is the core primitive,
[OpenKey](../identity/openkey.md) is how the sovereign authenticates and
delegates, and Lightning is where the exosuits run.

> Note: this "sovereign core / exosuit / harness" language reframes an earlier
> "digital passport" positioning; the digital-passport phrasing still appears in
> some technology-map roadmap docs.

## Threat model: explicit trust, not trustlessness

TinyCloud operates on **explicit trust** rather than economic trustlessness:

| Aspect | TinyCloud | Blockchain systems |
|--------|-----------|--------------------|
| Trust basis | Explicit delegation | Economic incentives |
| Node authorization | Must receive a host delegation | Permissionless |
| Security guarantee | As strong as private-key protection | Consensus mechanism |

The key property: a malicious host **can** refuse to serve data or fail to
propagate updates, but **cannot** forge [delegations](../authorization/delegation.md)
or modify data undetectably. Integrity rests on the owner-rooted signature chain
([capabilities](../authorization/capabilities.md)), not on trusting the host's
honesty.

### What you must trust

- **Your own key.** Security of a space depends on protecting the owner's private
  key; the protocol recommends least-authority grants, time bounds, session keys
  over root keys, and prompt [revocation](../authorization/revocation.md).
- **Hosts for availability only.** Hosts must hold a host delegation to serve a
  [space](../spaces/space-hosting.md); they are trusted to be available, not to
  be honest about authorization.

### Confidentiality vs. integrity

The signature model guarantees **integrity** — hosts cannot forge or silently
alter. It does not by itself guarantee **confidentiality**: a plain host could
observe plaintext during processing. TinyCloud closes that gap two ways:

- **TEEs** ([trusted execution environments](../nodes/tee-dstack.md)) give hosted
  nodes confidentiality guarantees during processing.
- **Encryption networks** let clients encrypt locally so the node handles only
  ciphertext, decrypting only through capability-gated requests — see
  [encryption networks](../encryption/encryption-networks.md) and
  [user-bound decrypt](../encryption/user-bound-decrypt.md).

This trust model is the concrete cost of the [thesis](./thesis.md) and the
[sovereign data](./sovereign-data.md) guarantee; the
[[architecture-layers|three-layer architecture]] layers governance on top of
it.

## Sources
- `technology-map` — `overview/docs/product-vision.md` (sovereign core / exosuit;
  `overview/docs/investor-pitch.md` reinforces it; the model-agnostic "harness
  doesn't care" line is in `overview/src/content/products.ts`)
- `whitepaper` — `README.md` (§7 Security Considerations: explicit-trust table,
  malicious-host bound, POLA, key management, TEEs)
