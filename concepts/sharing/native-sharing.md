---
type: concept
title: Native Sharing
description: TinyCloud Share links — read-only bearer links (tc1 tokens) and addressed links whose sealed Policy v3 envelope lets a person who proves an email or email domain read and decrypt one document, re-delegate it, and lose it on revocation.
status: shipped
layer: protocol
sources:
  - repo: js-sdk
    path: packages/sdk-core/src/delegations/SharingService.ts@d43e51ea
  - repo: js-sdk
    path: packages/share-sdk/src/native.ts@d43e51ea
  - repo: js-sdk
    path: packages/share-sdk/src/addressed-publish.ts@d43e51ea
  - repo: js-sdk
    path: packages/share-envelope/src/aead.ts@d43e51ea
  - repo: js-sdk
    path: packages/share-sdk/src/lifecycle.ts@d43e51ea
  - repo: js-sdk
    path: packages/web-sdk/src/share/types.ts@d43e51ea
  - repo: tinycloud-node
    path: tinycloud-node-server/src/policy_v3.rs@05c6a93
  - repo: registry
    path: packages/location-registry/README.md@ea461d9
tags: [sharing, policy-engine, sdk]
timestamp: 2026-10-05
---

# Native Sharing

**Native sharing** is how a TinyCloud owner hands one document to someone else with a link. There are two kinds:

- **Bearer links.** Anyone holding the link can read. The link embeds a private key and a read-only delegation.
- **Addressed links.** The link carries a sealed [[policy-engine/overview|Policy v3]] envelope. The [[nodes|Node]] grants read and decrypt only to someone who proves the named email address or email domain.

Both end in an ordinary [[delegation]] checked by the owner's Node. No Share server holds the authority.

## Role

Sharing is the main product use of [[delegation]], [[policy-v3-admission|policy admission]] and [[credential-gated-delegation]]. Bearer links cover "anyone with the link can view". Addressed links cover "only `alice@example.com`" or "anyone at `example.com`", for recipients who have no TinyCloud account yet. The hosted viewer is `share.tinycloud.xyz`; developers publish from the [[cli|CLI]] or the Share SDK.

## Mechanics

### Bearer links

1. `SharingService` (sdk-core) creates a fresh key, delegates to it, and packs key plus delegation into a `tc1:` token. The default actions are read-only (`tinycloud.kv/get`, `tinycloud.kv/metadata`), there is no decrypt capability, and the default expiry is 7 days.
2. The Share SDK's `createNativeShare` pins exactly one KV key and `tinycloud.kv/get`. It puts the token in the URL fragment, `https://share.tinycloud.xyz/viewer#tc1=…`, so it never reaches a server.
3. Whoever opens the link uses the embedded key to invoke the Node directly. See [[secrets-sharing]] for the `SharingService` API.

### Addressed links

1. **Publish.** `publishAddressedShare` (browser and CLI share the code) builds two capabilities: KV read on the content, and `tinycloud.encryption/decrypt` on the owner's [[encryption-networks|encryption network]]. It creates a Policy v2 with the recipient's credential requirement. The owner signs both policy roots: `policy-authority` to `did:tinycloud:policy:<digest>`, and `policy-enforcement` to the Node's enforcer DID. It then registers them with `POST /policy/v3/policies` (see [[policy-v3-admission]]).
2. **Seal.** The Policy/v3 share envelope, which includes the recipient matcher, is sealed with AES-256-GCM into `version ‖ nonce ‖ ciphertext+tag` and addressed by its CID. The link is `/s/inline#v=2&p=…`; the sealed envelope and its key ride in the **URL fragment**, not on a server.
3. **Locate.** The viewer finds the owner's Node through the location registry (`registry.tinycloud.xyz`). The registry stores only signed DID → node-location records; it is a discovery fallback with no authority over data or permissions.
4. **Claim.** The recipient proves the mailbox with an 8-digit code from the [[witness-service|witness]]. Their browser gets a `vc+sd-jwt` credential bound to its `did:key`. Domain shares match the exact domain, not subdomains.
5. **Mint and read.** The Node verifies the credential and mints a policy session to the recipient key. The recipient reads with ordinary 60-second invocations and decrypts with the generic decrypt capability (see [[user-bound-decrypt]]).

### Email delivery

The owner can have the share emailed. `POST /policy/v3/deliveries/authorize` makes the Node sign an admission for one recipient mailbox, with audience `https://witness.credentials.org`, a window of at most 5 minutes, and a replay-checked JTI. For a domain share the request must come from the policy owner's key. The witness sends the mail. Exact-email delivery exists since Node 1.16.0 (under `/share/v3` from 1.15.0); domain delivery since 1.17.3.

### Re-delegation

A received addressed share can be passed on: `ReceivedShare.delegate({ to, expiresAt? })` delegates its access, including decryption, to another key, such as an agent or the recipient's account [[session-keys|session key]]. `expiresAt` defaults to the longest the parent allows. The Node admits each descendant against its immediate parent, up to 8 hops (see [[agent-transaction-policy]] for the agent use).

### Revocation

The Share SDK's `revokeShare` revokes:

- a bearer link's delegation through ordinary [[revocation]];
- an addressed link's policy root, by signing `xyz.tinycloud.policy/root-revocation/v1`:
  - `scope: "direct"` → the `policy-enforcement` root;
  - `scope: "ancestor"` → the `policy-authority` root.

Either root's revocation stops every session and descendant on its next invocation.

## Relationships

Bearer links are [[delegation]]s created by [[secrets-sharing|SharingService]]; addressed links are [[policy-v3-admission]] policies with a [[credential-gated-delegation|credential requirement]] from [[opencredentials|OpenCredentials]]; decryption uses [[encryption-networks]] and [[user-bound-decrypt]]; narrowing is [[attenuation]]; ending is [[revocation]]; the CLI publish path needs [[device-authorization]]; the content lives in [[kv]].

## Example

From a terminal: `tc enable share` (a device-login approval granting the `builtin:share-publishing` manifest), then publish `notes/plan.md` to `example.com`. The CLI registers the policy on the owner's Node and prints an `/s/inline#v=2&p=…` link. Bob opens it, enters the 8-digit code sent to `bob@example.com`, and reads the decrypted file. He delegates his access to his agent's key for an afternoon. The owner later revokes the share with `ancestor` scope; Bob's and the agent's next reads fail.

Developer how-tos: <https://docs.tinycloud.xyz/cli/share> and <https://docs.tinycloud.xyz/guides/share-viewer>.

## Status & drift

`shipped` in SDK 3.0.0, CLI 1.0.0 and Node 1.17.3. Known gaps:

- The hosted viewer cannot open DID-addressed (`recipientDid`) links yet, although the CLI can publish them.
- Policy-root revocation from SDK 3.0.0 stamps `revokedAt` with milliseconds. The Node requires the exact RFC 3339 form it formats itself, so about 1 in 10 revocations are refused. The fix (TC-601) is only in 3.1.0-beta.3 and later; the hosted Share viewer works around it.
- The legacy Node `/share/v1` and `/share/v2` routes were removed in Node 1.16.0.

## Sources
- `js-sdk` (`d43e51ea`, SDK 3.0.0 / CLI 1.0.0): `packages/sdk-core/src/delegations/SharingService.ts:1-13, 104-117` (`tc1:` token, default read actions), `packages/share-sdk/src/native.ts:2, 24-38` (`#tc1=` viewer link, `tinycloud.kv/get` only), `packages/share-sdk/src/addressed-publish.ts:320-343` (capabilities, two owner roots), `packages/share-envelope/src/aead.ts:47-62` (AES-256-GCM sealed block), `packages/share-sdk/src/credential-invitation.ts:94` (`/s/inline`), `packages/share-sdk/src/lifecycle.ts:52-62` (`revokeShare` scopes), `packages/web-sdk/src/share/types.ts:49-55, 95-108` (`ReceivedShare.delegate`), `packages/node-sdk/src/TinyCloudNode.ts:1470` (publish node location), `packages/sdk-core/src/policy/unified.ts:452` (millisecond `revokedAt`)
- `tinycloud-node` (`05c6a93`, Node 1.17.3): `tinycloud-node-server/src/policy_v3.rs` (delivery authorization :1342-1420; root revocation :3516, 3683-3747; descendant admission :295-310), `CHANGELOG.md` (1.16.0, 1.17.1, 1.17.3)
- `registry` (`ea461d9`): `packages/location-registry/README.md` (signed DID → multiaddr records; discovery only)
