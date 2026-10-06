---
type: reference
title: Glossary
description: Canonical vocabulary for the TinyCloud protocol, with retired aliases.
timestamp: 2026-10-05
---

# Glossary

Canonical vocabulary. Prefer the canonical term; retired aliases are listed for recognition only.

| Term | Canonical | Notes / retired aliases |
|------|-----------|-------------------------|
| Space | **Space** | The sovereign data primitive. Retired: *namespace*, *orbit*. |
| ReCap | **ReCap** | Singular ("ReCap"), not "ReCaps". SIWE capability-resource extension. |
| applications | **applications** | The app-data system space. Retired: *apps* (whitepaper term). |
| Capability | **Capability** | `resource × ability × caveats`. |
| Ability | **Ability** | `{namespace}.{service}/{action}`, e.g. `tinycloud.kv/put`. |
| Resource | **Resource** | `{spaceId}/{service}[/path]`. |
| Delegation | **Delegation** | Root = SIWE→CACAO (ReCap); child = UCAN. |
| Invocation | **Invocation** | UCAN action executing an ability against a resource. |
| Revocation | **Revocation** | Retraction of a prior delegation. |
| Attenuation | **Attenuation** | Subset-check; child scope ⊆ parent (`ResourceId::extends`). |
| did:pkh | **did:pkh** | Owner root authority (`did:pkh:eip155:{chain}:{addr}`). |
| did:key | **did:key** | Ephemeral Ed25519 session key. |
| Encryption network | **Encryption network** | User-bound key network (`urn:tinycloud:encryption:{did}:{name}`). Not a hosted space. |
| Threshold decryption | **Threshold decryption** | Ferveo-based delegatable decryption (TACO nodes). Reserved slot in v1. |
| OpenCredentials | **OpenCredentials** | The credentialing layer; issuer `did:web:issuer.credentials.org`. |
| Policy engine | **Policy engine** | The central permissioning primitive; in production as the Node's Policy v3. |
| Node | **Node** | A TinyCloud host (Rocket server, DStack TEE). |
| Manifest | **Manifest** | App/data contract declaring namespace, space, perms, and optional delegation target. |
| Session | **Session** | A `did:key` session key plus the owner's root grant to it; 30 days by default since SDK 3.0. |
| Primary key | **Primary key** | The OpenKey key an account uses by default; each key is a separate owner. |
| Device authorization | **Device authorization** | OpenKey approval of a CLI/agent session on another device; KV data access (plus `capabilities/read`) in one space, ≤30 days. |
| Delegate profile | **Delegate profile** | A CLI/MCP profile (`delegate-session` posture) holding only what the owner approved. |
| Share | **Share** | Native file sharing: a bearer link or an addressed link opened in the Share viewer. Retired: broker-backed share links, `?tc2` links. |
| Bearer link | **Bearer link** | `#tc1=` link; anyone holding the complete URL can read until expiry. |
| Addressed share | **Addressed share** | Sealed Policy/v3 envelope (`#v=2&p=`); only the named email address or domain can open it after proving a credential. |
| Policy v3 | **Policy v3** | The Node's credential-gated admission: two sibling owner roots, the policy as a `did:tinycloud:policy:` principal, sessions minted on proof. |
| Storage full | **Storage full** | Quota state: reads keep working; writes get 402 (full) or 413 (too large). |
| MCP | **MCP** | Model Context Protocol server exposing delegated TinyCloud operations to AI clients. |
| Agent skill | **Agent skill** | Instruction pack teaching a coding agent to use the CLI (`tc-cli`, app packs). |
