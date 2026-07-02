---
type: index
title: Applications
description: The manifest model, capability composition, install registry, and TEE backends.
timestamp: 2026-06-22
---

# Applications

The manifest model, capability composition, install registry, and TEE backends.

## Concepts

- [How Apps Work](how-apps-work.md) — The full-shape app: frontend + TEE backend + agent, each its own DID, wired by one user-consented delegation fan-out. Start here to build.
- [Manifest Model](manifest-model.md) — App/data contract: namespace, default applications space, declared perms, optional did delegation target.
- [Capability Composition](capability-composition.md) — App + backend manifests composed into one capability request and a single wallet prompt.
- [Install Registry](install-registry.md) — App-install registry under the account space (applications/ key-prefix) plus an account SQL index.
- [TEE Backends](tee-backends.md) — TEE backend acts as a subset-checked UCAN delegate, never the key-holder.
- [Example: Listen](example-listen.md) — Listen as a worked example of an application built on the protocol, with a "how it was built" trace.

See also the [Build an App](../build/index.md) developer track: [Getting Started](../sdk/getting-started.md), [tinycloud-app-kit](../build/tinycloud-app-kit.md), and [tinyboilerplate](../build/tinyboilerplate.md).
