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
