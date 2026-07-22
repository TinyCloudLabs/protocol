---
name: navigate-tinycloud-protocol
description: Navigate the TinyCloud Protocol knowledge bundle when a user asks about its identity, authorization, storage, encryption, application, or SDK concepts.
---

# Navigate the TinyCloud Protocol

Use this skill to answer questions grounded in the TinyCloud Protocol knowledge
bundle.

1. Read `/llms.txt` first. It is the curated section map.
2. Fetch raw Markdown under `/concepts/<section>/<concept>.md` instead of
   extracting prose from rendered HTML.
3. Follow a concept's source links and distinguish `shipped`, `in-progress`, and
   `planned` status. Do not present a planned behavior as implemented.
4. Use `/meta/glossary.md` for canonical terms and `/meta/contradictions.md` for
   known specification-versus-implementation differences.
5. For implementation details, continue to the linked source or
   `https://docs.tinycloud.xyz/llms.txt`.
6. User-authorized operations belong to the hosted MCP advertised at
   `/.well-known/mcp/server-card.json`; this public knowledge site itself needs
   no authentication.

Quote sparingly and link the exact concept page used as evidence.
