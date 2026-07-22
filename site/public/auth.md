# Auth.md — TinyCloud OAuth registration

## Audience and discovery

This guide is for agents and MCP clients connecting to the real hosted TinyCloud
MCP. The protocol knowledge bundle is public; OAuth is required only for tools
that operate on a user's TinyCloud.

- MCP resource: [https://mcp.tinycloud.xyz/mcp](https://mcp.tinycloud.xyz/mcp)
- Protected-resource metadata: [https://mcp.tinycloud.xyz/.well-known/oauth-protected-resource/mcp](https://mcp.tinycloud.xyz/.well-known/oauth-protected-resource/mcp)
- Authorization-server metadata: [https://api.openkey.so/.well-known/oauth-authorization-server/api/auth](https://api.openkey.so/.well-known/oauth-authorization-server/api/auth)
- Scope: `tinycloud:mcp`

Read the live metadata before starting. The protected-resource document names
OpenKey as the authorization server.

## Register a public client

Registration endpoint: `https://api.openkey.so/api/auth/oauth2/register`

Send JSON using Dynamic Client Registration:

```http
POST https://api.openkey.so/api/auth/oauth2/register HTTP/1.1
Content-Type: application/json

{
  "redirect_uris": ["https://client.example/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "client_name": "Example TinyCloud agent"
}
```

Use the registration response `client_id`. Public clients use token endpoint
authentication method `none`; do not invent, request, or send a client secret.
If the response nevertheless includes a `client_secret`, do not use it for this
public-client flow. Treat any returned `registration_access_token` as sensitive
and use it only with the registration management URI supplied in that response.

## Authorize the user with PKCE

Authorization endpoint: `https://api.openkey.so/api/auth/oauth2/authorize`

Generate an unguessable `state` and high-entropy PKCE `code_verifier`; derive its
S256 `code_challenge`. Open the authorization endpoint with these parameters:

```text
response_type=code
client_id=<registered client_id>
redirect_uri=<an exact registered redirect URI>
scope=tinycloud:mcp
resource=https://mcp.tinycloud.xyz/mcp
state=<unguessable value>
code_challenge=<S256 challenge>
code_challenge_method=S256
```

On callback, require the exact redirect URI and compare `state` before accepting
the authorization `code`.

## Exchange the code and call MCP

Token endpoint: `https://api.openkey.so/api/auth/oauth2/token`

```http
POST https://api.openkey.so/api/auth/oauth2/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=<code>&client_id=<client_id>&redirect_uri=<exact redirect URI>&code_verifier=<verifier>&resource=https%3A%2F%2Fmcp.tinycloud.xyz%2Fmcp
```

The token response supplies an `access_token` and may supply a `refresh_token`.

Send the access token only to the MCP resource:

```http
POST /mcp HTTP/1.1
Host: mcp.tinycloud.xyz
Authorization: Bearer <access_token>
Content-Type: application/json
```

Never put the token in a URL or send it to another origin.

## Refresh, revoke, and protect keys

- Refresh at the token endpoint with `grant_type=refresh_token`, the
  `refresh_token`, `client_id`, scope `tinycloud:mcp`, and the MCP resource.
- Revoke with `POST https://api.openkey.so/api/auth/oauth2/revoke` using an
  `application/x-www-form-urlencoded` body with `token`, `client_id`, and an
  appropriate `token_type_hint`.
- Validate state and redirect URIs on every authorization response.
- Never request, expose, or share TinyCloud account keys or owner private keys.

## Errors

For any non-2xx registration, token, refresh, or revocation response, stop and
handle the OAuth `error` and `error_description`; do not call MCP or retry
blindly. Never log authorization codes, PKCE verifiers, access tokens, refresh
tokens, client secrets, or registration access tokens.
