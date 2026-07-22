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

const authGuide = await text('../public/auth.md');
for (const expected of [
  'POST https://api.openkey.so/api/auth/oauth2/register',
  'https://api.openkey.so/api/auth/oauth2/authorize',
  'POST https://api.openkey.so/api/auth/oauth2/token',
  'POST https://api.openkey.so/api/auth/oauth2/revoke',
  '"token_endpoint_auth_method": "none"',
  'code_challenge_method=S256',
  'Authorization: Bearer <access_token>',
  '`access_token` and may supply a `refresh_token`',
  '`error` and `error_description`',
]) assert.ok(authGuide.includes(expected), `auth.md must contain ${expected}`);

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

const weightedMarkdownResponse = await onRequest({
  request: new Request('https://protocol.tinycloud.xyz/', { headers: { Accept: 'text/html;q=0.2, text/markdown;q=0.8' } }),
  env: { ASSETS: { fetch: () => new Response(assetBody) } },
  next: () => { throw new Error('positive-q Markdown should use the static asset binding'); },
});
assert.match(weightedMarkdownResponse.headers.get('content-type'), /^text\/markdown/);

const rejectedMarkdownResponse = await onRequest({
  request: new Request('https://protocol.tinycloud.xyz/', { headers: { Accept: 'text/markdown;q=0, text/html;q=1' } }),
  env: { ASSETS: { fetch: () => { throw new Error('q=0 Markdown must not use the static asset binding'); } } },
  next: () => new Response('<!doctype html>', { headers: { 'Content-Type': 'text/html' } }),
});
assert.match(rejectedMarkdownResponse.headers.get('content-type'), /^text\/html/);
assert.equal(await rejectedMarkdownResponse.text(), '<!doctype html>');

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
  headers: { 'Content-Type': 'application/a2a+json', 'A2A-Version': '1.0' },
  body: JSON.stringify({ message: { messageId: 'test-1', role: 'ROLE_USER', parts: [{ text: 'How does capability delegation work?' }] } }),
}) });
assert.equal(a2aResponse.status, 200);
assert.match(a2aResponse.headers.get('content-type'), /^application\/a2a\+json/);
const a2aBody = await a2aResponse.json();
assert.equal(a2aBody.message.role, 'ROLE_AGENT');
assert.match(a2aBody.message.parts[0].text, /protocol\.tinycloud\.xyz\/authorization\//);

const invalidA2aResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/message:send', {
  method: 'POST',
  headers: { 'A2A-Version': '1.0' },
  body: JSON.stringify({ message: { role: 'ROLE_USER', parts: [] } }),
}) });
assert.equal(invalidA2aResponse.status, 400);
const invalidA2aBody = await invalidA2aResponse.json();
assert.equal(invalidA2aBody.error.code, 400);
assert.equal(invalidA2aBody.error.status, 'INVALID_ARGUMENT');
assert.equal(invalidA2aBody.error.details[0]['@type'], 'type.googleapis.com/google.rpc.BadRequest');

for (const parts of [
  [{ data: { query: 'authorization' } }],
  [{ text: 'authorization', mediaType: 'application/json' }],
]) {
  const contentResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/message:send', {
    method: 'POST',
    headers: { 'A2A-Version': '1.0' },
    body: JSON.stringify({ message: { messageId: 'content-test', role: 'ROLE_USER', parts } }),
  }) });
  assert.equal(contentResponse.status, 400);
  const contentBody = await contentResponse.json();
  assert.equal(contentBody.error.status, 'INVALID_ARGUMENT');
  assert.equal(contentBody.error.details[0].reason, 'CONTENT_TYPE_NOT_SUPPORTED');
}

const pushResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/message:send', {
  method: 'POST',
  headers: { 'A2A-Version': '1.0' },
  body: JSON.stringify({
    message: { messageId: 'push-test', role: 'ROLE_USER', parts: [{ text: 'authorization' }] },
    configuration: { taskPushNotificationConfig: { url: 'https://example.com/hook' } },
  }),
}) });
assert.equal(pushResponse.status, 400);
const pushBody = await pushResponse.json();
assert.equal(pushBody.error.status, 'FAILED_PRECONDITION');
assert.equal(pushBody.error.details[0].reason, 'PUSH_NOTIFICATION_NOT_SUPPORTED');

const taskBoundMessageResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/message:send', {
  method: 'POST',
  headers: { 'A2A-Version': '1.0' },
  body: JSON.stringify({
    message: { messageId: 'task-message', taskId: 'task-1', role: 'ROLE_USER', parts: [{ text: 'authorization' }] },
  }),
}) });
assert.equal(taskBoundMessageResponse.status, 404);
const taskBoundMessageBody = await taskBoundMessageResponse.json();
assert.equal(taskBoundMessageBody.error.details[0].reason, 'TASK_NOT_FOUND');
assert.equal(taskBoundMessageBody.error.details[0].metadata.taskId, 'task-1');

for (const [path, method] of [
  ['/a2a/message:stream', 'POST'],
  ['/a2a/tasks/task-1:subscribe', 'POST'],
  ['/a2a/extendedAgentCard', 'GET'],
]) {
  const unsupportedA2aResponse = await onA2aRequest({ request: new Request(`https://protocol.tinycloud.xyz${path}`, {
    method, headers: { 'A2A-Version': '1.0' },
  }) });
  assert.equal(unsupportedA2aResponse.status, 400);
  const unsupportedA2aBody = await unsupportedA2aResponse.json();
  assert.equal(unsupportedA2aBody.error.status, 'FAILED_PRECONDITION');
  assert.equal(unsupportedA2aBody.error.details[0].reason, 'UNSUPPORTED_OPERATION');
}

for (const [path, method] of [
  ['/a2a/tasks/task-1/pushNotificationConfigs', 'POST'],
  ['/a2a/tasks/task-1/pushNotificationConfigs', 'GET'],
  ['/a2a/tasks/task-1/pushNotificationConfigs/config-1', 'GET'],
  ['/a2a/tasks/task-1/pushNotificationConfigs/config-1', 'DELETE'],
]) {
  const pushRouteResponse = await onA2aRequest({ request: new Request(`https://protocol.tinycloud.xyz${path}`, {
    method, headers: { 'A2A-Version': '1.0' },
  }) });
  assert.equal(pushRouteResponse.status, 400);
  const pushRouteBody = await pushRouteResponse.json();
  assert.equal(pushRouteBody.error.status, 'FAILED_PRECONDITION');
  assert.equal(pushRouteBody.error.details[0].reason, 'PUSH_NOTIFICATION_NOT_SUPPORTED');
}

const taskListResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/tasks', {
  headers: { 'A2A-Version': '1.0' },
}) });
assert.equal(taskListResponse.status, 200);
assert.deepEqual(await taskListResponse.json(), { tasks: [], nextPageToken: '' });

for (const [path, method] of [
  ['/a2a/tasks/task-1', 'GET'],
  ['/a2a/tasks/task-1:cancel', 'POST'],
]) {
  const taskResponse = await onA2aRequest({ request: new Request(`https://protocol.tinycloud.xyz${path}`, {
    method, headers: { 'A2A-Version': '1.0' },
  }) });
  assert.equal(taskResponse.status, 404);
  const taskBody = await taskResponse.json();
  assert.equal(taskBody.error.code, 404);
  assert.equal(taskBody.error.status, 'NOT_FOUND');
  assert.equal(taskBody.error.details[0].reason, 'TASK_NOT_FOUND');
  assert.equal(taskBody.error.details[0].domain, 'a2a-protocol.org');
  assert.equal(taskBody.error.details[0].metadata.taskId, 'task-1');
}

const missingVersionResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/message:send', { method: 'POST' }) });
assert.equal(missingVersionResponse.status, 400);
const missingVersionBody = await missingVersionResponse.json();
assert.equal(missingVersionBody.error.details[0].reason, 'VERSION_NOT_SUPPORTED');

const oldVersionResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/message:send', {
  method: 'POST', headers: { 'A2A-Version': '0.3' },
}) });
assert.equal(oldVersionResponse.status, 400);
const oldVersionBody = await oldVersionResponse.json();
assert.equal(oldVersionBody.error.details[0].reason, 'VERSION_NOT_SUPPORTED');

const queryVersionResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/message:send?A2A-Version=1.0', {
  method: 'POST',
  body: JSON.stringify({ message: { messageId: 'test-query', role: 'ROLE_USER', parts: [{ text: 'overview' }] } }),
}) });
assert.equal(queryVersionResponse.status, 200);

const methodResponse = await onA2aRequest({ request: new Request('https://protocol.tinycloud.xyz/a2a/message:send', {
  method: 'GET', headers: { 'A2A-Version': '1.0' },
}) });
assert.equal(methodResponse.status, 405);
const methodBody = await methodResponse.json();
assert.equal(methodBody.error.status, 'METHOD_NOT_ALLOWED');

async function countIndexFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const counts = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? countIndexFiles(join(directory, entry.name))
    : Number(entry.name === 'index.html')));
  return counts.reduce((sum, count) => sum + count, 0);
}
const sitemap = await text('../dist/sitemap.xml');
assert.equal((sitemap.match(/<loc>/g) ?? []).length, await countIndexFiles(fileURLToPath(new URL('../dist/', import.meta.url))));

assert.match(await text('../public/webmcp.js'), /registerTool/);
console.log('agent-readiness artifacts: ok');
