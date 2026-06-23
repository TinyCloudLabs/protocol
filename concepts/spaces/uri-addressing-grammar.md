---
type: concept
title: URI / Addressing Grammar
description: The wire-level resource grammar — tinycloud:{did-suffix}:{space}/{service}[/{path}][?query][#fragment] — that names every resource in TinyCloud.
status: shipped
layer: protocol
sources:
  - repo: tinycloud-node
    path: tinycloud-core/src/types/resource.rs
  - repo: tinycloud-node
    path: tinycloud-auth/src/resource.rs
  - repo: whitepaper
    path: appendix/appendix-b-uri-abnf-grammar.md
tags: [spaces, addressing, top-gap]
timestamp: 2026-06-23
---

# URI / Addressing Grammar

Every resource in TinyCloud is named by a single string of the form **`tinycloud:{did-suffix}:{space}/{service}[/{path}][?{query}][#{fragment}]`** — a [[autonomic-space|space]] (owner DID + name) followed by a [[services|service]] and an optional path. This URI is the resource half of every [[capabilities|capability]]; getting it exactly right is what makes [[invocation|invocations]] and [[delegation]] chains verifiable.

## Role

The grammar is [[architecture-layers|Layer 1]] bedrock. It is parsed and emitted by `ResourceId` / `SpaceId` in `tinycloud-auth/src/resource.rs` and wrapped by the `Resource` enum in `tinycloud-core/src/types/resource.rs`. Because a resource string fully identifies *which owner, which space, which service, which path*, a node can authorize a request from the URI plus its signature chain alone — no lookup. This concept is the precise spelling of the addressing referenced by [[autonomic-space]], [[capabilities]], and [[attenuation]].

## Shape

### Canonical ABNF (code-grounded)

The authoritative grammar is the comment block in `tinycloud-core/src/types/resource.rs` (the [[#status--drift|whitepaper Appendix B]] mirrors it with minor drift):

```abnf
id        = "tinycloud:" method-name ":" method-specific-id ":" name
resource  = id "/" service [ "/" path ] [ "?" query ] [ "#" fragment ]

method-name        = 1*method-char
method-char        = %x61-7A / DIGIT                 ; lowercase letter or digit
method-specific-id = *( *idchar ":" ) 1*idchar
idchar             = ALPHA / DIGIT / "." / "-" / "_" / pct-encoded
pct-encoded        = "%" HEXDIG HEXDIG

name      = 1*nchar
service   = 1*nchar
path      = *( segment "/" ) segment
segment   = *pchar
pchar     = nchar / ":"
nchar     = unreserved / pct-encoded / sub-delims / "@"
unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
sub-delims = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
query     = *( pchar / "/" / "?" )
fragment  = *( pchar / "/" / "?" )
```

### The two parse targets

- **`SpaceId`** (`id` only): `tinycloud:{did-suffix}:{name}`. Parsed by splitting on the *last* `:` — everything before is the DID suffix, after is the space name. Must have **no** `/`, query, or fragment, must be URI-normalized, and the name must be non-empty (`resource.rs:307-329`). The DID is reconstructed as `did:{suffix}` then canonicalized.
- **`ResourceId`** (full `resource`): adds the service and optional path/query/fragment. Parsed (`resource.rs:338-376`) by requiring scheme `tinycloud`, no authority, normalization, and a `/` in the path; it splits `space/rest`, then `service/path`. The leading `{did-suffix}:{name}` of the space part is recovered with `rsplit_once(':')`.

### Forms you will see

- **Canonical / wire form** (`Display`): `tinycloud:pkh:eip155:1:0xf39f…2266:default/kv/notes/photo.jpg`. The DID-suffix is the base DID minus its leading `did:` (4 chars).
- **DID-relative `did-suffix`**: e.g. `pkh:eip155:1:0xf39f…2266` (an EIP-155 [[dids|did:pkh]]) or `key:z6Mk…` (an Ed25519 [[session-keys|did:key]]).
- **Encryption network URN** (a *separate* `Resource::Other` form, NOT a space URI): `urn:tinycloud:encryption:{ownerDid}:{network}` — see [[system-spaces]] and the encryption [[services|service]].

## Mechanics

A `Resource` is the enum `TinyCloud(ResourceId) | Other(UriString)` (`core/src/types/resource.rs:14-20`). The `Other` arm carries non-space URIs, chiefly the encryption-network URN. **Scope containment** is `ResourceId::extends` (`auth/src/resource.rs:193`): a child resource extends a base iff same space, same service, same fragment, and the child path is path-prefixed by the base path — where prefix means `child.starts_with(base)` *and* the base ends in `/`, or the boundary is a `/` (so `notes` does not extend `not`, but `notes/a` extends `notes/`). A base with no path is extended by any path; a base with a path is **not** extended by a child lacking one. This `extends` check is the engine of [[attenuation]] and is invoked during [[delegation]] verification.

EIP-155 addresses are checksum-canonicalized and `did:pkh:eip155:…` DIDs are normalized on parse (`tinycloud-auth/src/identity.rs:canonicalize_did`), so two URIs differing only by address case resolve to the same space (test vectors at `resource.rs:455-470`).

## Relationships

Identifies an [[autonomic-space|space]] + [[services|service]] + path; the `{name}` segment names a [[system-spaces|system space]]; the resource is half of a [[capabilities|capability]] (the other half is the [[capabilities|ability]] `{namespace}.{service}/{action}`); `extends` powers [[attenuation]] and [[delegation]] subset-checks; the `did-suffix` is a [[dids|DID]].

## Example

`tinycloud:pkh:eip155:1:0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266:applications/kv/com.listen.app/transcript/2026-06-23.json`

parses to: space `…:applications` (owner `did:pkh:eip155:1:0xf39f…2266`), service `kv`, path `com.listen.app/transcript/2026-06-23.json`. A [[capabilities|capability]] over `…:applications/kv/com.listen.app/` (note trailing slash) `extends`-covers it, so a [[delegation]] of that prefix authorizes a `tinycloud.kv/get` [[invocation]] on this exact key. (See [[example-listen]].)

## Status & drift

Shipped and stable; this is **Sam's top documentation gap**, now pinned to code. Drift vs the **whitepaper Appendix B** ABNF: the spec restricts `space`/`service` to `ALPHA / DIGIT / "-" / "_"`, but the code's `name`/`service` are the looser `nchar` set (and `Name`/`Service` parsing currently does **no** validation — both `FromStr` impls are TODO stubs accepting any string, `resource.rs:30-42,127-130`). The spec also writes the DID-suffix split as fixed fields; the code recovers it positionally via `rsplit_once(':')`. Code is canonical. The `ln:{chain}:{addr}:{name}` "internal short form" claimed in older discovery notes was **not** found in current `db.rs` (`canonicalize_did` emits `did:pkh:eip155:…`, not `ln:`) — see [[meta/contradictions]].

## Sources
- `tinycloud-node`: `tinycloud-core/src/types/resource.rs:90-111` (ABNF + `Resource` enum), `tinycloud-auth/src/resource.rs:169-376` (`ResourceId`/`SpaceId`, `extends`, `FromStr`, test vectors :455-470), `tinycloud-auth/src/identity.rs` (`canonicalize_did`)
- `whitepaper`: `appendix/appendix-b-uri-abnf-grammar.md` (spec ABNF; drift noted)
