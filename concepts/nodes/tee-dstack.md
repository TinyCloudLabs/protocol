---
type: concept
title: TEE / DStack
description: TinyCloud nodes run inside a DStack-managed Trusted Execution Environment so key material and decryption stay confidential even from the operator, with remote attestation.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-node-server/src/dstack.rs@05c6a93
  - repo: tinycloud-node
    path: tinycloud-node-server/src/routes/attestation.rs@05c6a93
tags: [nodes, tee]
timestamp: 2026-10-05
---

# TEE / DStack

TinyCloud [[nodes|nodes]] are deployed inside a **Trusted Execution Environment** managed by **DStack**, so the key material and decryption the node performs stay confidential **even from the node operator**, and a client can **remotely attest** what code is running before trusting it.

## Role

The TEE is what makes the node a trustworthy place to do [[user-bound-decrypt|capability-gated decryption]] under the current `n=1,t=1` [[encryption-networks|encryption-network]] model: the user delegates decrypt authority to *a node they can attest*, not to an operator they must trust by reputation. It underpins the "explicit trust + TEEs" stance of the [[trust-model]].

## Mechanics

`tinycloud-node-server/src/dstack.rs` wires the node into the DStack runtime; `routes/attestation.rs` exposes the attestation endpoint a client uses to verify the enclave's measurement before establishing trust. Inside the enclave the node holds the [[encryption-networks|network]] key it unwraps/rewraps with and serves [[cacao-chain-validation|authorized]] [[user-bound-decrypt|decrypt invocations]]. In DStack mode the node's derived keys, including the seal on network private keys, are rooted in DStack key management (see [[at-rest]]).

### The hosted node

The hosted production node runs in a Phala dstack CVM and is reachable as `node.tinycloud.xyz` and `tee.node.tinycloud.xyz` (the same Node).

It reports `"inTEE": true` and the `tee` feature at `GET /version` (see [[node-architecture]]).

## Relationships

Hosts the [[nodes|node]] runtime; protects [[encryption-networks]] keys + [[user-bound-decrypt|decryption]]; the trust basis described in [[trust-model]]; precondition for the planned [[encryption/threshold-decryption|threshold decryption]] (which removes the single-node trust assumption).

## Status & drift

Shipped — the hosted node (Node 1.17.3) is deployed via DStack. The single-enclave model (`n=1,t=1`) is what [[encryption/threshold-decryption|threshold decryption]] is designed to generalize beyond.

## Sources
- `tinycloud-node` @05c6a93 (Node 1.17.3): `tinycloud-node-server/src/dstack.rs`, `routes/attestation.rs`, `routes/mod.rs:116-160` (`inTEE`, `tee` feature)
- Hosted deployment: DNS for `tee.node.tinycloud.xyz` / `node.tinycloud.xyz`; live `GET /version`
