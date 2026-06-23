# Codex validation log

Per-concept ground-truth verdicts from the `cx` validators (read-only, pinned per repo).
Logged for review, not auto-applied. Format: `[ok|wrong|unverified] <claim> — <cx note>`.

## [2026-06-23] architecture-layers

- [wrong] `tinycloud-node` consumes a separate policy-engine crate/repo at runtime — cx(tinycloud-node): there is NO separate `policy-engine` dependency in Cargo.toml/Cargo.lock; policy/authorization logic lives in-tree (`tinycloud-auth/src/authorization.rs`, `tinycloud-node-server/src/authorization.rs`). Authored per the LOCKED design-intent contract anyway; the runtime split is aspirational, not yet in code. Sam to reconcile.
- [ok] L1 base protocol = spaces, capabilities, delegation, services, addressing, consistency; authority is carried by signatures not backend state — matches thesis.md + authorization code.
- [unverified] super-operable = TinyCloud-interoperable; Feed (L3) composes Listen + other TinyCloud data under the policy layer — framing from team transcripts (listen repo), no code surface to check; glossary entry still in-progress.

## [2026-06-23] autonomic-space

- [ok] Space created lazily in `transact()` when a delegation carries `tinycloud.space/host` with no path/query/fragment and service=="space" — cx(tinycloud-node): db.rs:794 (match), db.rs:817 (insert).
- [ok] `SpaceId { base_did: DIDBuf, name: Name }`; `Display` = `tinycloud:{suffix}:{name}`, `suffix = base_did[4..]` — cx: resource.rs:49 / :63 / :262.
- [ok] No `orbit` space concept in code — cx: no `orbit` hits in source crates (only stray CLAUDE.md mention).

## [2026-06-23] uri-addressing-grammar

- [ok] Canonical resource URI = `tinycloud:{did-suffix}:{name}/{service}[/path][?query][#fragment]`; ABNF matches the comment block in core/types/resource.rs; Display at auth/resource.rs:262 — cx confirmed.
- [ok] `ResourceId::extends` path rule (same space/service/fragment + prefix where base ends in '/' or boundary is '/'); base with no path extended by any child; child lacking a path does NOT extend a base with a path (DoesNotExtendPath) — cx: resource.rs:193-200.
- [wrong] `ln:{chain}:{addr}:{name}` "internal short form" — cx(tinycloud-node): `ln:` does NOT appear anywhere in db.rs; canonicalize_did emits `did:pkh:eip155:…`. Older discovery-map claim is stale; authored as code-canonical with drift note.
- [ok] whitepaper Appendix B ABNF drift: spec restricts space/service charset to ALPHA/DIGIT/-/_, code uses looser nchar and does no Name/Service validation (FromStr TODO stubs) — confirmed against resource.rs.

## [2026-06-23] capabilities  (authored by lead; subagents socket-failing — grounded in cx-validated node map + autonomic-space/uri-grammar)

- [ok] Capability = resource × ability × caveats; ability form `{namespace}.{service}/{action}` (e.g. `tinycloud.kv/put`) — node map + uri-addressing-grammar (cx-confirmed).
- [ok] `TinyCloudDelegation` = UCAN | SIWE/CACAO; `TinyCloudInvocation` = UCAN — cx(tinycloud-node) prime: authorization.rs; `Capability` extraction in core/util.rs.
- [ok] Verification = signature + time ⊆ parent + `extends`+ability coverage + root-authority; chain checks in models/{delegation,invocation}.rs; HTTP guard `AuthHeaderGetter` (auth_guards.rs) — node map (cx-validated).
- [unverified] cap-string short form `service:space:path:actions` — asserted from apps map; not re-confirmed live against a parser this run. Flag for a direct cx check before relying on it.

## [2026-06-23] system-spaces  (authored by lead; grounded in cx-validated primitives map + js-sdk orientation)

- [ok] Set = default/public/account/secrets/applications; defined in SDK (`packages/sdk-core/src/manifest.ts`, `AccountService.ts`); spaces formerly "orbits" — js-sdk cx orientation confirms SpaceService/manifest/AccountService surface.
- [ok] `encryption` is a SYNTHETIC label → `urn:tinycloud:encryption:{did}:{name}` (Resource::Other), not a hosted space — primitives map (cx) + uri-addressing-grammar.
- [ok] `account` holds the install registry under `applications/` key-prefix (distinct from the `applications` space); `secrets` holds `vault/secrets/<NAME>` — primitives + apps maps (cx-validated).
- [unverified] "NO backend reserved-name list in tinycloud-node" — asserted from primitives map; a live cx(tinycloud-node) grep would confirm definitively. Flag.
- [ok] whitepaper `apps` vs code `applications` drift — primitives map (cx); recorded in meta/contradictions.
