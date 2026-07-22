const CONTENT_TYPE = 'application/a2a+json; charset=utf-8';

const SECTIONS = [
  [/identity|did|siwe|openkey|session/, 'Identity', 'https://protocol.tinycloud.xyz/identity/'],
  [/authoriz|capabilit|delegat|revoc|invocation|recap|ucan/, 'Authorization', 'https://protocol.tinycloud.xyz/authorization/'],
  [/encrypt|decrypt|threshold/, 'Encryption', 'https://protocol.tinycloud.xyz/encryption/'],
  [/storage|blob|metadata|sql|kv/, 'Storage and data services', 'https://protocol.tinycloud.xyz/storage/'],
  [/application|manifest|backend|listen/, 'Applications', 'https://protocol.tinycloud.xyz/applications/'],
  [/sdk|cli|build|package|getting started/, 'SDK and build guides', 'https://protocol.tinycloud.xyz/sdk/'],
];

function response(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': CONTENT_TYPE,
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function error(status, code, message, headers) {
  return response({ code, message }, status, headers);
}

function requestText(message) {
  return message.parts
    .map((part) => typeof part?.text === 'string' ? part.text : '')
    .join(' ')
    .trim();
}

function validMessage(message) {
  return message
    && message.role === 'ROLE_USER'
    && typeof message.messageId === 'string'
    && message.messageId.length > 0
    && Array.isArray(message.parts)
    && message.parts.length > 0
    && requestText(message);
}

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (path !== '/a2a/message:send') {
    return error(501, 12, `Unsupported A2A operation: ${path}`);
  }
  if (context.request.method !== 'POST') {
    return error(405, 12, 'message:send requires POST.', { Allow: 'POST' });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return error(400, 3, 'Request body must be valid JSON.');
  }
  if (!validMessage(body?.message)) {
    return error(400, 3, 'A ROLE_USER message with messageId and a non-empty text part is required.');
  }

  const query = requestText(body.message);
  const section = SECTIONS.find(([pattern]) => pattern.test(query.toLowerCase()));
  const guidance = section
    ? `${section[1]} concepts: ${section[2]} Raw Markdown follows /concepts/<section>/<concept>.md.`
    : 'TinyCloud Protocol index: https://protocol.tinycloud.xyz/llms.txt Raw Markdown follows /concepts/<section>/<concept>.md.';
  return response({
    message: {
      messageId: `tinycloud-protocol-${body.message.messageId}`,
      contextId: body.message.contextId || `tinycloud-protocol-context-${body.message.messageId}`,
      role: 'ROLE_AGENT',
      parts: [{ text: guidance }],
    },
  });
}
