import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequest } from '../functions/_middleware.js';
import { onRequest as onA2aRequest } from '../functions/a2a/[[path]].js';

const text = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const json = async (path) => JSON.parse(await text(path));

const robots = await text('../public/robots.txt');
assert.match(robots, /Allow: \/\nContent-Signal: search=yes, ai-input=yes, ai-train=no/);
assert.match(robots, /Sitemap: https:\/\/protocol\.tinycloud\.xyz\/sitemap\.xml/);

const catalog = await json('../public/.well-known/api-catalog');
assert.equal(catalog.linkset[1].anchor, 'https://mcp.tinycloud.xyz/mcp');
assert.equal(catalog.linkset[1].status[0].href, 'https://mcp.tinycloud.xyz/healthz');

const card = await json('../public/.well-known/mcp/server-card.json');
assert.equal(card.serverInfo.version, '0.3.0');
assert.equal(card.url, 'https://mcp.tinycloud.xyz/mcp');
assert.equal(card.transport.type, 'streamable-http');
assert.equal(card.capabilities.tools, true);

const agentCard = await json('../public/.well-known/agent-card.json');
assert.equal(agentCard.supportedInterfaces[0].protocolBinding, 'HTTP+JSON');
assert.equal(agentCard.supportedInterfaces[0].url, 'https://protocol.tinycloud.xyz/a2a');
assert.equal(agentCard.capabilities.streaming, false);
assert.equal(agentCard.skills[0].id, 'navigate-tinycloud-protocol');

const skill = await text('../public/.well-known/agent-skills/navigate-tinycloud-protocol/SKILL.md');
const skillIndex = await json('../public/.well-known/agent-skills/index.json');
const digest = createHash('sha256').update(skill).digest('hex');
assert.equal(skillIndex.skills[0].digest, `sha256:${digest}`);

const assetBody = await text('../../llms.txt');
const markdownResponse = await onRequest({
  request: new Request('https://protocol.tinycloud.xyz/', { headers: { Accept: 'text/markdown' } }),
  env: { ASSETS: { fetch: () => new Response(assetBody) } },
  next: () => { throw new Error('markdown negotiation should use the static asset binding'); },
});
assert.match(markdownResponse.headers.get('content-type'), /^text\/markdown/);
assert.match(markdownResponse.headers.get('vary'), /Accept/);
assert.equal(await markdownResponse.text(), assetBody);

const htmlResponse = await onRequest({
  request: new Request('https://protocol.tinycloud.xyz/', { headers: { Accept: 'text/html' } }),
  env: {},
  next: () => new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } }),
});
assert.match(htmlResponse.headers.get('link'), /rel="mcp"/);
assert.match(htmlResponse.headers.get('link'), /rel="agent-skills"/);
assert.match(htmlResponse.headers.get('link'), /rel="api-catalog"/);

const a2aResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/message:send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/a2a+json' },
  body: JSON.stringify({ message: { messageId: 'test-1', role: 'ROLE_USER', parts: [{ text: 'How does capability delegation work?' }] } }),
}) });
assert.equal(a2aResponse.status, 200);
assert.match(a2aResponse.headers.get('content-type'), /^application\/a2a\+json/);
const a2aBody = await a2aResponse.json();
assert.equal(a2aBody.message.role, 'ROLE_AGENT');
assert.match(a2aBody.message.parts[0].text, /protocol\.tinycloud\.xyz\/authorization\//);

const invalidA2aResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/message:send', {
  method: 'POST',
  body: JSON.stringify({ message: { role: 'ROLE_USER', parts: [] } }),
}) });
assert.equal(invalidA2aResponse.status, 400);
const unsupportedA2aResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/message:stream', { method: 'POST' }) });
assert.equal(unsupportedA2aResponse.status, 501);

async function countIndexFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const counts = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? countIndexFiles(join(directory, entry.name))
    : Number(entry.name === 'index.html')));
  return counts.reduce((sum, count) => sum + count, 0);
}
const sitemap = await text('../dist/sitemap.xml');
assert.equal((sitemap.match(/<loc>/g) ?? []).length, await countIndexFiles(fileURLToPath(new URL('../dist/', import.meta.url))));

const redirects = await text('../public/_redirects');
assert.ok(redirects.startsWith('/.well-known/oauth-authorization-server https://api.openkey.so/.well-known/oauth-authorization-server/api/auth 302'));
assert.match(await text('../public/webmcp.js'), /registerTool/);
console.log('agent-readiness artifacts: ok');
