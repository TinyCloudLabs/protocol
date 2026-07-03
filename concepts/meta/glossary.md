---
type: reference
title: Glossary
description: Canonical vocabulary for the TinyCloud protocol, with retired aliases.
timestamp: 2026-06-22
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
| OpenCredentials | **OpenCredentials** | The credentialing layer (OpenKey). |
| Policy engine | **Policy engine** | The central permissioning primitive. |
| Node | **Node** | A TinyCloud host (Rocket server, DStack TEE). |
| Manifest | **Manifest** | App/data contract declaring namespace, space, perms, and optional delegation target. |
