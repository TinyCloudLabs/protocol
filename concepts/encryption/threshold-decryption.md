---
type: concept
title: Threshold Decryption
description: Planned delegatable threshold decryption — a user-chosen cohort of nodes (ferveo/TACO) jointly decrypt, removing the single-node trust assumption. A reserved KeyBackendKind slot today; actively under development.
status: planned
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption_network/types.rs
provenance_note: only the KeyBackendKind::Threshold enum slot exists in code; no implementing backend as of 2026-06. Design spec lives outside the tracked repos and is actively under development.
tags: [encryption, threshold, future]
timestamp: 2026-06-23
---

# Threshold Decryption

**Threshold decryption** is the planned generalization of [[encryption-networks|encryption networks]] beyond the current single-[[tee-dstack|TEE]] (`n=1,t=1`) backend: a **user-chosen cohort of nodes** jointly holds the network key (via a key-generation ceremony) and a **threshold** of them must cooperate to decrypt. This removes the assumption that any one node is trustworthy.

## Role

It is the security endgame for [[user-bound-decrypt|user-bound decryption]]: where v1 trusts one attested enclave, threshold decryption distributes that trust so a compromised minority cannot decrypt. It keeps the capability-gated model — decrypt is still an authorized [[invocation]] — but changes *who* can perform the unwrap.

## Design (intended)

- **ferveo / TACO** threshold cryptography; **no blockchain**.
- The owner **selects ≥3 nodes** that run a **distributed key-generation ceremony**; shares are combined **client-side** on decrypt.
- Threat model = a **compromised authority/minority**; the owner defines the majority cohort.
- **Delegatable** decrypt (the hard requirement driving the design) while **network management stays owner-only and non-delegatable**.

## Status & drift

**Planned / actively under development** (outside this checkout). In the tracked node, only the **`KeyBackendKind::Threshold` enum slot is reserved** (`tinycloud-core/src/encryption_network/types.rs`) — "not implemented in v1"; there is no threshold backend yet. The full design spec lives outside the tracked source repos. Author/read this as forward-looking; see the roadmap entry [[future/threshold-decryption]].

## Relationships

Generalizes [[encryption-networks]] + [[user-bound-decrypt]]; removes the [[tee-dstack|single-TEE]] trust assumption; still gated by [[capabilities]] / [[cacao-chain-validation]]; tracked in [[future/roadmap]]; replaces the cut [[future/proxy-re-encryption-deprecated|proxy re-encryption]] approach.

## Sources
- `tinycloud-node`: `tinycloud-core/src/encryption_network/types.rs` (`KeyBackendKind::Threshold` reserved slot)
