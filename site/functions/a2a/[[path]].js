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

function statusError(httpStatus, status, message, details = [], headers) {
  return response({ error: { code: httpStatus, status, message, details } }, httpStatus, headers);
}

function protocolError(reason, message) {
  return statusError(400, 'FAILED_PRECONDITION', message, [{
    '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
    reason,
    domain: 'a2a-protocol.org',
  }]);
}

function invalidArgument(field, message) {
  return statusError(400, 'INVALID_ARGUMENT', message, [{
    '@type': 'type.googleapis.com/google.rpc.BadRequest',
    fieldViolations: [{ field, description: message }],
  }]);
}

function contentTypeNotSupported() {
  return statusError(400, 'INVALID_ARGUMENT', 'Every message part must contain text/plain content.', [{
    '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
    reason: 'CONTENT_TYPE_NOT_SUPPORTED',
    domain: 'a2a-protocol.org',
  }]);
}

function methodNotAllowed(operation, allowedMethod) {
  return statusError(405, 'METHOD_NOT_ALLOWED', `${operation} requires ${allowedMethod}.`, [], { Allow: allowedMethod });
}

function taskNotFound(taskId) {
  return statusError(404, 'NOT_FOUND', `Task ${taskId} does not exist; this agent does not create tasks.`, [{
    '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
    reason: 'TASK_NOT_FOUND',
    domain: 'a2a-protocol.org',
    metadata: { taskId },
  }]);
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
    && message.parts.length > 0;
}

function textPartsSupported(message) {
  return message.parts.every((part) => {
    if (!part || typeof part.text !== 'string') return false;
    if (['raw', 'url', 'data'].some((field) => field in part)) return false;
    if (!('mediaType' in part)) return true;
    return typeof part.mediaType === 'string'
      && part.mediaType.split(';', 1)[0].trim().toLowerCase() === 'text/plain';
  });
}

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const versionValue = context.request.headers.get('A2A-Version')
    ?? requestUrl.searchParams.get('A2A-Version');
  const version = versionValue || '0.3';
  if (version !== '1.0') {
    return protocolError('VERSION_NOT_SUPPORTED', `A2A protocol version ${version} is not supported; use 1.0.`);
  }

  const path = requestUrl.pathname;
  if (path === '/a2a/message:send') {
    if (context.request.method !== 'POST') return methodNotAllowed('message:send', 'POST');

    let body;
    try {
      body = await context.request.json();
    } catch {
      return invalidArgument('request', 'Request body must be valid JSON.');
    }
    if (!validMessage(body?.message)) {
      return invalidArgument('message', 'A ROLE_USER message with messageId and a non-empty text part is required.');
    }
    if (!textPartsSupported(body.message)) return contentTypeNotSupported();
    if (!requestText(body.message)) {
      return invalidArgument('message.parts', 'At least one non-empty text part is required.');
    }
    if (typeof body.message.taskId === 'string' && body.message.taskId.length > 0) {
      return taskNotFound(body.message.taskId);
    }
    if (body.configuration?.taskPushNotificationConfig != null) {
      return protocolError('PUSH_NOTIFICATION_NOT_SUPPORTED', 'This agent does not support task push notifications.');
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

  if (path === '/a2a/tasks') {
    if (context.request.method !== 'GET') return methodNotAllowed('tasks list', 'GET');
    return response({ tasks: [], nextPageToken: '' });
  }

  const pushCollectionMatch = path.match(/^\/a2a\/tasks\/([^/:]+)\/pushNotificationConfigs$/);
  if (pushCollectionMatch) {
    if (!['GET', 'POST'].includes(context.request.method)) {
      return methodNotAllowed('push notification configuration collection', 'GET, POST');
    }
    return protocolError('PUSH_NOTIFICATION_NOT_SUPPORTED', 'This agent does not support task push notifications.');
  }

  const pushItemMatch = path.match(/^\/a2a\/tasks\/([^/:]+)\/pushNotificationConfigs\/([^/:]+)$/);
  if (pushItemMatch) {
    if (!['GET', 'DELETE'].includes(context.request.method)) {
      return methodNotAllowed('push notification configuration', 'GET, DELETE');
    }
    return protocolError('PUSH_NOTIFICATION_NOT_SUPPORTED', 'This agent does not support task push notifications.');
  }

  const cancelMatch = path.match(/^\/a2a\/tasks\/([^/:]+):cancel$/);
  if (cancelMatch) {
    if (context.request.method !== 'POST') return methodNotAllowed('task cancellation', 'POST');
    return taskNotFound(cancelMatch[1]);
  }

  const taskMatch = path.match(/^\/a2a\/tasks\/([^/:]+)$/);
  if (taskMatch) {
    if (context.request.method !== 'GET') return methodNotAllowed('task retrieval', 'GET');
    return taskNotFound(taskMatch[1]);
  }

  return protocolError('UNSUPPORTED_OPERATION', `Unsupported A2A operation: ${path}`);
}
