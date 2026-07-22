(() => {
  const modelContext =
    (typeof document !== 'undefined' && document.modelContext) ||
    (typeof navigator !== 'undefined' && navigator.modelContext);
  if (!modelContext || typeof modelContext.registerTool !== 'function') return;

  const name = 'search_tinycloud_protocol';
  modelContext.registerTool({
    name,
    description: 'Search links on the current TinyCloud Protocol page by concept title or description.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1 },
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute({ query }) {
      const needle = query.trim().toLowerCase();
      const matches = [...document.querySelectorAll('main a[href]')]
        .map((link) => ({
          title: link.textContent.trim(),
          url: new URL(link.getAttribute('href'), location.href).href,
        }))
        .filter((item) => item.title && item.title.toLowerCase().includes(needle))
        .filter((item, index, all) => all.findIndex((other) => other.url === item.url) === index)
        .slice(0, 10);
      return {
        content: [{ type: 'text', text: matches.length
          ? matches.map((item) => `${item.title}: ${item.url}`).join('\n')
          : `No links on this page match "${query}".` }],
        structuredContent: { matches },
      };
    },
  });

  addEventListener('pagehide', () => {
    if (typeof modelContext.unregisterTool === 'function') {
      modelContext.unregisterTool(name);
    }
  }, { once: true });
})();
