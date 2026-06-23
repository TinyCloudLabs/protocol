---
type: concept
title: DIDs
description: TinyCloud identifies every principal by a DID — a did:pkh:eip155 owner/root key plus ephemeral did:key Ed25519 session keys — and these DIDs are the roots and audiences of every capability chain.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-auth/src/identity.rs
  - repo: js-sdk
    path: packages/sdk-core/src/identity.ts
tags: [identity, did]
timestamp: 2026-06-23
---

# DIDs

A **DID** (Decentralized Identifier) is how TinyCloud names a **principal** — the entity that holds, delegates, and exercises authority. TinyCloud uses exactly two DID methods: **`did:pkh:eip155:{chain}:{addr}`** for the **owner** (an Ethereum wallet, the root authority of a [[autonomic-space|space]]), and **`did:key:z…`** for an ephemeral Ed25519 **[[session-keys|session key]]**. Every [[capabilities|capability]] chain traces, through [[delegation]], from a `did:key` audience back to the owner `did:pkh` that owns the target space.

## Role

DIDs are [[architecture-layers|Layer 1]] identity — the substrate [[openkey|OpenKey]] produces and that [[capabilities]], [[delegation]], and [[invocation]] are all keyed on. Because authority is rooted in a DID (not an account row), a [[nodes|node]] can authorize a request from the DIDs and signatures it carries alone, with no lookup (see [[thesis]]). The owner `did:pkh` is the single root every chain must terminate at; the session `did:key` is what apps actually hold, so the owner key is never exposed (see [[session-keys]]).

## Shape

Two methods, canonicalized identically on both sides of the WASM boundary:

- **Owner / root — `did:pkh:eip155:{chainId}:{address}`.** A CAIP-10 EVM account as a DID. `chainId` is a positive integer (e.g. `1`); `address` is a `0x`-prefixed, 40-hex-char, **EIP-55 checksum** Ethereum address. Example: `did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`. This is the DID an [[autonomic-space|space]] is owned by (`tinycloud:pkh:eip155:1:0x…:default`), and the principal a wallet signs as in [[siwe|SIWE]]/[[cacao|CACAO]].
- **Session — `did:key:z6Mk…`.** An Ed25519 public key encoded as a `did:key` (multicodec `0xed01`, base58btc). Created fresh by the WASM session manager. The **DID URL** form carries a fragment equal to the key id: `did:key:z6Mk…#z6Mk…` (`manager.rs:get_did`).

A **DID URL** appends `#fragment` (a verification-method id) to either form. The **principal DID** is the DID URL with its fragment stripped — matching is always done on principal DIDs, so a delegation to `did:…#a` is satisfied by an invocation from `did:…#b`.

## Mechanics

### Canonicalization (the matching contract)

Identity comparison is the bedrock of the auth model: a [[delegation]] is only valid if its delegatee DID **matches** the next link's signer. Both the node and the SDK normalize before comparing (`tinycloud-auth/src/identity.rs`, `packages/sdk-core/src/identity.ts`):

- **`did:pkh:eip155`** is parsed (`parse_pkh_did` / `parsePkhDid`, regex `/^did:pkh:eip155:(\d+):(0x[a-fA-F0-9]{40})$/`), the address is **EIP-55 checksummed** (`canonicalize_eip155_address` / viem `getAddress`), and re-emitted as `did:pkh:eip155:{chainId}:{checksumAddr}`. So two owner DIDs differing only by address case resolve equal (`identity.rs` test: lower-case input → checksum output).
- **Other methods** (chiefly `did:key`) are passed through unchanged — `did:key` is **case-sensitive** (`identity.rs` test asserts `did:key:…Abcd` ≠ `did:key:…abcd`).
- **`did_principal_matches` / `principalDidEquals`** strip any `#fragment`, canonicalize both sides, and compare. This is exactly what root-authority and parent-delegatee checks call (see [[capabilities]] verification).

`chainId` must be `> 0`; a malformed address length errors (`InvalidAddressLength`). Note the owner DID is **chain-scoped** — the same address on a different `chainId` is a different principal and a different space owner.

### How a DID becomes a space address

An owner DID is folded into a [[uri-addressing-grammar|space URI]] by dropping the leading `did:` (4 chars) to form the **did-suffix**: `did:pkh:eip155:1:0x…` → `tinycloud:pkh:eip155:1:0x…:default`. `makePkhSpaceId(address, chainId, name)` builds this directly (`identity.ts`).

## Relationships

The owner `did:pkh` is the root authority of an [[autonomic-space|space]] and the signer of root [[capabilities]] via [[siwe|SIWE]]/[[cacao|CACAO]]; the [[session-keys|session `did:key`]] is the audience that root delegation grants to, and the signer of [[ucan|UCAN]] sub-[[delegation|delegations]] and [[invocation|invocations]]; both are produced/managed by [[openkey|OpenKey]]; the did-suffix of a DID is the prefix of every [[uri-addressing-grammar|resource URI]]; canonicalized DID matching powers the [[capabilities|capability]] chain checks.

## Example

A wallet `0xf39F…2266` on Ethereum mainnet is the owner DID `did:pkh:eip155:1:0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`. At [[sign-in-flow|sign-in]] it grants, via one [[siwe|SIWE]] signature, a [[capabilities|capability]] set to a freshly generated session DID `did:key:z6MkpTHR…` — so the app holds `did:key:z6MkpTHR…` and can `tinycloud.kv/get` on `tinycloud:pkh:eip155:1:0xf39F…2266:default`, while the owner key stays in the wallet. (See [[session-keys]], [[sign-in-flow]].)

## Status & drift

Shipped. The two methods and EIP-55 canonicalization are mirrored in Rust and TypeScript with matching test vectors. Node DID **resolution** during verification currently uses `AnyDidMethod::default()` with a `// TODO go back to static DID_METHODS` note (`models/delegation.rs`, `models/invocation.rs`) — a cleanup, not a behavior gap. `did:pkh` is restricted to the `eip155` namespace in code; other CAIP-2 namespaces are not parsed.

## Sources
- `tinycloud-node`: `tinycloud-auth/src/identity.rs` (`parse_pkh_did`, `canonicalize_eip155_address`, `canonicalize_did`, `principal_did`, `did_principal_matches`, test vectors)
- `js-sdk`: `packages/sdk-core/src/identity.ts` (`pkhDid`, `parsePkhDid`, `canonicalizeDid`, `principalDid`, `principalDidEquals`, `makePkhSpaceId`, `PKH_DID_RE`)
