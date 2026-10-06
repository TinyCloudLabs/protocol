---
type: index
title: Storage
description: Content-addressed blob store, metadata DB, per-space SQL, and storage quota.
timestamp: 2026-10-05
---

# Storage

Content-addressed blob store, metadata DB, per-space SQL, and storage quota.

## Concepts

- [Blob Store](blob-store.md) — Content-addressed blob store (FileSystem or S3) keyed by SpaceId + hash.
- [Metadata DB](metadata-db.md) — SeaORM capabilities/metadata DB (SQLite default, Postgres, or MySQL).
- [Per-Space SQL](per-space-sql.md) — Per-space SQLite SQL database with an optional parallel DuckDB service.
- [Storage Quota](quota.md) — Per-space byte limits: limit resolution, 402/413 on writes, reads always allowed.
