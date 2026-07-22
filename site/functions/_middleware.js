const DISCOVERY_LINKS = [
  '</llms.txt>; rel="describedby"; type="text/markdown"; title="TinyCloud Protocol agent index"',
  '</.well-known/mcp/server-card.json>; rel="mcp"; type="application/json"; title="TinyCloud MCP server card"',
  '</.well-known/agent-skills/index.json>; rel="agent-skills"; type="application/json"; title="TinyCloud Protocol Agent Skills"',
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"; title="TinyCloud Protocol API catalog"',
  '</.well-known/agent-card.json>; rel="service-desc"; type="application/json"; title="TinyCloud Protocol navigation agent"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"; title="TinyCloud Protocol sitemap"',
].join(', ');

const CONTENT_SIGNAL = 'search=yes, ai-input=yes, ai-train=no';

function acceptsMarkdown(acceptHeader) {
  if (!acceptHeader) return false;
  return acceptHeader.split(',').some((range) => {
    const [mediaType, ...parameters] = range.split(';').map((value) => value.trim());
    if (mediaType.toLowerCase() !== 'text/markdown') return false;
    const qualityParameter = parameters.find((parameter) => parameter
      .split('=', 1)[0]
      .trim()
      .toLowerCase() === 'q');
    if (!qualityParameter) return true;
    const quality = Number(qualityParameter.slice(qualityParameter.indexOf('=') + 1).trim());
    return Number.isFinite(quality) && quality > 0 && quality <= 1;
  });
}

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const wantsMarkdown = acceptsMarkdown(context.request.headers.get('Accept'));

  let response;
  if (requestUrl.pathname === '/' && wantsMarkdown) {
    const markdownUrl = new URL('/llms.txt', requestUrl);
    response = await context.env.ASSETS.fetch(new Request(markdownUrl, context.request));
  } else {
    response = await context.next();
  }

  const headers = new Headers(response.headers);
  if (requestUrl.pathname === '/') {
    headers.set('Link', DISCOVERY_LINKS);
    headers.set('Content-Signal', CONTENT_SIGNAL);
    headers.append('Vary', 'Accept');
  }

  if (requestUrl.pathname === '/' && wantsMarkdown) {
    headers.set('Content-Type', 'text/markdown; charset=utf-8');
  }
  if (requestUrl.pathname === '/.well-known/api-catalog') {
    headers.set('Content-Type', 'application/linkset+json; charset=utf-8');
  }
  if (requestUrl.pathname.startsWith('/.well-known/agent-skills/')) {
    headers.set('Access-Control-Allow-Origin', '*');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
