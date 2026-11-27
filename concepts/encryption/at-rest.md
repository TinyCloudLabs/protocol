---
type: concept
title: At-Rest Encryption
description: Node column encryption with authenticated row-bound v2 keyrings and metadata-directed legacy reads; separate from general content sealing.
status: in-progress
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/encryption.rs@622e78cfc989134f6c38f2edebe98a9c8791ee89
tags: [encryption, at-rest]
timestamp: 2026-11-27
---

# At-Rest Encryption

This page describes **sensitive database column encryption** in node commit
`622e78cfc989134f6c38f2edebe98a9c8791ee89`, verified on 2026-11-27.
It establishes merged implementation, not the binary or configuration deployed on
any particular host. The earlier October 5 description covered the v1 format.

`ColumnEncryption` protects selected metadata columns, including stored
delegations/invocations and webhook material. It is distinct from client-encrypted
app payloads, encryption-network key custody, filesystem/bucket encryption and
the general KV/SQL content-sealing work in `tinycloud_core::at_rest`.
Evidence for one layer does not establish the status of the others.

## Current column format

New column writes use AES-256-GCM with this byte layout:

```text
0x02 || kid(1 byte) || nonce(12 bytes) || ciphertext || tag(16 bytes)
```

The minimum encrypted length is 30 bytes. The nonce is freshly generated for
each encryption. `kid` selects a key generation from the read keyring; the writer
uses its selected generation. Missing generations are errors.

Authenticated additional data binds the version and key ID to `RowBinding`:

```text
0x02 || kid
|| u64be(table byte length) || table UTF-8 bytes
|| u64be(column byte length) || column UTF-8 bytes
|| u64be(number of primary-key components)
|| for each component: u64be(component byte length) || raw component bytes
```

Moving a v2 value to another row, table or column, changing its key ID, or
tampering with ciphertext fails authentication. Identity hashes remain based on
plaintext; encryption does not replace the record's content identity.

`storage_keyrings` derives purpose-separated column and webhook keys using
HKDF-SHA256, retains the prior key for v1 compatibility, and applies the configured
strict-read policy. `with_keys` rejects duplicate generations and a missing write
key. `for_kid` selects a writer while retaining read keys; operators must retain
keys needed by existing rows and backups.

## Legacy reads are selected by stored metadata

The authenticated v1 envelope remains:

```text
0x01 || nonce(12 bytes) || ciphertext || tag(16 bytes)
```

It has no row binding. `encrypt_legacy` / `decrypt_legacy` preserve the v1 protocol
envelope used by encryption-network wrapping and legacy compatibility; they do
not define the format of new v2 column writes.

`decrypt` accepts authenticated v1 and v2 envelopes. Empty data and unknown
version bytes are errors, **not an automatic plaintext fallback**.
Database reads use `decrypt_recorded(data, binding, format)`:

| Recorded format | Behavior |
| --- | --- |
| `2` (`FORMAT_V2`) | Requires a v2 envelope and authenticates it against the row binding. |
| `0` (`FORMAT_LEGACY`), strict off | Authenticates data beginning with `0x01` or `0x02`. Other prefixes, including empty data, are accepted as recorded legacy plaintext. |
| `0`, strict on | Requires an authenticated envelope; plaintext is refused. |
| Any other recorded format | `UnsupportedVersion`; no plaintext fallback. |

A decoder must preserve the distinction between recorded format metadata and
envelope version. Do not infer a legacy plaintext record solely from an unknown
first byte in an otherwise current record.

## General content sealing

At the checked commit, `tinycloud_core::at_rest` contains envelope primitives but
is not wired into the node's storage paths. Sensitive-column encryption therefore
does **not** imply that all KV blocks, SQL/DuckDB artifacts or local working files
are sealed. Conversely, unwired general sealing does **not** mean TinyCloud has
no encryption. Bucket/disk settings and actual deployments require their own
evidence. See the node's `docs/at-rest/DELIVERY.md` for the implementation chain.

## Sources

- [Column codec and tests](https://github.com/TinyCloudLabs/tinycloud-node/blob/622e78cfc989134f6c38f2edebe98a9c8791ee89/tinycloud-core/src/encryption.rs)
- [Serving keyring construction and database wiring](https://github.com/TinyCloudLabs/tinycloud-node/blob/622e78cfc989134f6c38f2edebe98a9c8791ee89/tinycloud-node-server/src/lib.rs)
- [General sealing module status](https://github.com/TinyCloudLabs/tinycloud-node/blob/622e78cfc989134f6c38f2edebe98a9c8791ee89/tinycloud-core/src/at_rest/mod.rs)
