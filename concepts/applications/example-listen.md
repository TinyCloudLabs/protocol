---
type: concept
title: "Example: Listen"
description: Listen is the canonical Layer-2 TinyCloud app — app_id xyz.tinycloud.listen, defaults true — storing SQL conversations and KV transcript blobs in the applications space, operated by a TEE backend through one materialized UCAN delegation.
status: shipped
layer: tinycloud-app
sources:
  - repo: listen
    path: manifest.json
  - repo: listen
    path: SPEC-manifest-and-capability-chain.md
  - repo: listen
    path: backend/src/schema.ts
  - repo: listen
    path: backend/src/services/persist-conversation.ts
  - repo: listen
    path: backend/src/manifest.ts
  - repo: listen
    path: backend/src/delegation-activation.ts
  - repo: listen
    path: packages/client/src/delegation.ts
tags: [applications, example, listen]
timestamp: 2026-06-23
---

# Example: Listen

**Listen** is the canonical [[architecture-layers#layer-2-tinycloud-apps|Layer-2 TinyCloud app]]: a transcript workspace that syncs meeting transcripts (Fireflies, Granola, Google Meet) into the owner's own [[system-spaces|spaces]] and lets a [[tee-backends|TEE backend]] operate on that data through a single [[delegation|UCAN delegation]] — without the backend ever holding the owner's key or seeing secret plaintext. It is the worked example every other applications concept points to, because it exercises the whole stack: a [[manifest-model|manifest]], the `applications` [[system-spaces|space]], [[services|KV + SQL]], [[capability-composition|one-signature capability composition]], a [[tee-backends|delegate backend]], and [[secrets|encrypted secrets]].

## Role

Listen sits in [[architecture-layers#layer-2-tinycloud-apps|Layer 2]] — a manifest app built by TinyCloud that *enshrines* a space. It is the reference instance for [[manifest-model]], [[system-spaces|the `applications` space]], and [[tee-backends]]: where those concepts describe a mechanism in the abstract, Listen is the concrete `app_id`, the concrete tables, and the concrete delegation that make them real. The read-only [[apps-feed-listen|Feed]] explorer is an [[architecture-layers#layer-3-super-operable-applications|L3]] consumer of exactly this data.

## Mechanics

### The manifest

`listen/manifest.json` is the app/data contract ([[manifest-model]]):

```json
{
  "manifest_version": 1,
  "app_id": "xyz.tinycloud.listen",
  "name": "Listen",
  "defaults": true,
  "secrets": {
    "FIREFLIES_API_KEY": ["read"],
    "GRANOLA_API_KEY": ["read"],
    "ASSEMBLYAI_API_KEY": ["read"],
    "DEEPGRAM_API_KEY": ["read"],
    "GOOGLE_MEET_TOKENS": { "scope": "listen", "actions": ["read","write","delete"] }
  },
  "permissions": [
    { "service": "tinycloud.hooks", "path": "sql/conversations/conversation",
      "actions": ["subscribe"], "skipPrefix": true }
  ]
}
```

- `app_id: xyz.tinycloud.listen` is the stable namespace and the default path prefix for everything Listen writes.
- `defaults: true` requests the built-in app-scoped tier — [[services|KV + SQL]] read/write under the `xyz.tinycloud.listen/` prefix — in addition to the one explicit `permissions[]` entry.
- No `space` field, so app data defaults to the **`applications`** [[system-spaces|space]] (`tinycloud:{did-suffix}:applications/…`). No top-level `did`, so the manifest itself is not a [[manifest-model|delegation target]]; the app session key is the actor and the TEE backend is added as a delegate at compose time.
- `secrets{}` declares vault entries; the SDK composer maps each to a `tinycloud.kv/get` grant on `vault/secrets/<NAME>` in the distinct [[secrets|`secrets` space]].
- The lone `permissions[]` entry is a `tinycloud.hooks/subscribe` cap (with `skipPrefix: true`, an absolute service-namespace path) for live conversation-row write events.

### Where the data lives

All app data is in the owner's `applications` [[system-spaces|space]], keyed under `xyz.tinycloud.listen`:

| Data | Service / path | Shape |
|---|---|---|
| Conversations | SQL db `xyz.tinycloud.listen/conversations` | `conversation`, `participant` tables |
| Transcripts | KV `xyz.tinycloud.listen/transcript/<conversationId>` | `TranscriptSentence[]` JSON blob |

The SQL schema is `PRIMARY KEY`-only — TinyCloud's [[sql|SQLite authorizer]] forbids `CREATE INDEX`, `UNIQUE`, and `REFERENCES`, so dedup is done in app code (`backend/src/schema.ts`):

```sql
CREATE TABLE IF NOT EXISTS conversation (
  id TEXT PRIMARY KEY, title TEXT, source TEXT NOT NULL, source_id TEXT,
  source_url TEXT, started_at TEXT, ended_at TEXT, duration_secs REAL,
  summary TEXT, metadata TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS participant (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, name TEXT NOT NULL,
  email TEXT, speaker_label TEXT
);
```

`persistConversation()` writes the conversation row, the participant rows, and then the transcript [[kv|KV]] blob (`backend/src/services/persist-conversation.ts`) at key `xyz.tinycloud.listen/transcript/<conversationId>`.

### The backend is a delegate, never a key-holder

Listen's backend is the canonical [[tee-backends|TEE backend]]. It advertises a DID plus the permissions it wants over `/api/server-info` (`backendDelegationPermissions()` in `backend/src/manifest.ts`): KV get/put/del/list/metadata under the app prefix, SQL read/write on `conversations`, a `tinycloud.kv/get` on each `vault/secrets/<NAME>` in the `secrets` space, and `tinycloud.encryption/decrypt` on the owner's [[encryption-networks|default encryption network]] `urn:tinycloud:encryption:<ownerDid>:default`.

The frontend folds those into the manifest as a backend delegate (same `app_id`, with a `did`, `defaults: false`) and [[capability-composition|composes app + backend into one capability request]] the user signs **once**. After sign-in the SDK *materializes* the backend's [[delegation|UCAN]] from the existing session — `tcw.materializeDelegation(backendDID, capabilityRequest)` — with **no second wallet prompt** (`packages/client/src/delegation.ts`), then POSTs the serialized [[delegation|PortableDelegation]] to `/api/delegations`. The backend activates it against the [[nodes|node]] via `node.useDelegation(...)` and reads secrets only by asking the node to decrypt under the delegated network grant (`backend/src/delegation-activation.ts`) — so it **never sees secret plaintext and never holds the owner's root key**. It also self-checks that its requested caps are a subset of what the manifest grants (`isCapabilitySubset`), which is the [[tee-backends|subset rule]] in action.

## Shape

The on-disk contract is `manifest.json` above. The runtime identity is `app_id = xyz.tinycloud.listen`; the owner DID is `did:pkh:eip155:1:<address>`; the addressable data is `tinycloud:pkh:eip155:1:<addr>:applications/{sql|kv}/xyz.tinycloud.listen/…` (see [[uri-addressing-grammar]]).

## Relationships

Built from a [[manifest-model|manifest]]; enshrines the `applications` [[system-spaces|space]]; stores via [[sql|SQL]] + [[kv|KV]]; authorized through [[capability-composition|composed capabilities]] and one [[delegation]]; operated by a [[tee-backends|TEE backend]]; reads secrets from the [[secrets|`secrets` space]] decrypted on an [[encryption-networks|encryption network]]; registered in the [[install-registry|install registry]] in the `account` space; read downstream by [[apps-feed-listen|Feed]]. The full source trace is [[apps-feed-listen|the apps map]].

## Example

A user signs in to Listen with their wallet ([[openkey|OpenKey]]) once. That single [[siwe|SIWE]]/[[recap|ReCap]] signature authorizes the app session key *and* materializes a UCAN for the TEE backend. Fireflies syncs a meeting: the backend writes a `conversation` row + `participant` rows to SQL `xyz.tinycloud.listen/conversations` and the transcript JSON to KV `xyz.tinycloud.listen/transcript/<id>`, all in the owner's `applications` space, after decrypting `FIREFLIES_API_KEY` from `secrets`/`vault/secrets/FIREFLIES_API_KEY` through the node. Later, [[apps-feed-listen|Feed]] self-grants read caps as the owner and queries the same rows over the `tc` CLI — same data, different identity, all under the owner's capabilities.

## Status & drift

Shipped. Two source-level discrepancies are documented in [[apps-feed-listen|the apps map]] (not resolved here): the `listen-importer` writes without `--space`, so importer-published conversations may land in `default` rather than `applications`; and two transcript KV path conventions (`transcript/<id>` vs `importer/transcripts`) coexist. Treat the backend-written paths above (`persist-conversation.ts`) as canonical for Listen-app data.

## Sources
- `listen`: `manifest.json` (the contract above), `SPEC-manifest-and-capability-chain.md` (manifest semantics, `applications` default, compose→materialize), `backend/src/schema.ts` (SQL schema + `conversations` db routing), `backend/src/services/persist-conversation.ts` (transcript KV path + write pass), `backend/src/manifest.ts` (`backendDelegationPermissions`, `isCapabilitySubset`), `backend/src/delegation-activation.ts` (`node.useDelegation`, secrets-via-node decrypt), `packages/client/src/delegation.ts` (`materializeDelegation`, `prompted`)
- Map: `maps/apps-feed-listen.md`
