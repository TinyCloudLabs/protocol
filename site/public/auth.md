# Auth.md — TinyCloud authentication

The content on `protocol.tinycloud.xyz`, including the raw protocol knowledge
bundle, is public and does not require authentication.

The hosted TinyCloud MCP at `https://mcp.tinycloud.xyz/mcp` uses OAuth for tools
that operate on a user's TinyCloud. Discover its protected-resource requirements
from [the live OAuth protected-resource metadata](https://mcp.tinycloud.xyz/.well-known/oauth-protected-resource/mcp).
That document identifies OpenKey as the authorization server. Its canonical
[OAuth authorization-server metadata](https://api.openkey.so/.well-known/oauth-authorization-server/api/auth)
publishes the supported authorization, token, registration, and PKCE endpoints.

Clients should follow those live discovery documents and request the
`tinycloud:mcp` scope. Do not send account keys, owner private keys, or long-lived
API keys to the MCP server.
