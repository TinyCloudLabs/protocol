---
type: index
title: Storage
description: Content-addressed blob store, metadata DB, and per-space SQL.
timestamp: 2026-06-22
---

# Storage

Content-addressed blob store, metadata DB, and per-space SQL.

## Concepts

- [Blob Store](blob-store.md) — Content-addressed blob store (FileSystem or S3) keyed by SpaceId + hash.
- [Metadata DB](metadata-db.md) — SeaORM capabilities/metadata DB (SQLite default, Postgres, or MySQL).
- [Per-Space SQL](per-space-sql.md) — Per-space SQLite SQL database with optional DuckDB attached.
