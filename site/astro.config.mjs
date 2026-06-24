import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { buildIdMap } from './src/lib/id-map.mjs';
import remarkWikilinks, { BROKEN_LINKS } from './src/plugins/remark-wikilinks.mjs';

const conceptsDir = fileURLToPath(new URL('../concepts', import.meta.url));

// Build the id -> url map ONCE, at config load, by scanning concepts/.
// Shared by the remark plugin (link resolution) and available to pages.
const { ids, leafIndex } = buildIdMap(conceptsDir);

// Astro integration: after build, dump the unresolved/ambiguous link report
// and print a summary so the build surfaces link health.
function brokenLinkReport() {
  return {
    name: 'broken-link-report',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        // De-dupe (the same body can be rendered more than once).
        const seen = new Set();
        const entries = [];
        for (const b of BROKEN_LINKS) {
          const key = `${b.source}|${b.raw}|${b.kind}`;
          if (seen.has(key)) continue;
          seen.add(key);
          entries.push(b);
        }
        const out = fileURLToPath(new URL('.broken-links.json', dir));
        writeFileSync(out, JSON.stringify(entries, null, 2));
        const byTarget = {};
        for (const e of entries) byTarget[e.reason] = (byTarget[e.reason] ?? 0) + 1;
        logger.info(`unresolved/ambiguous links: ${entries.length} (report: dist/.broken-links.json)`);
        for (const [reason, n] of Object.entries(byTarget).sort((a, b) => b[1] - a[1])) {
          logger.info(`  ${n}x  ${reason}`);
        }
      },
    },
  };
}

export default defineConfig({
  output: 'static',
  site: 'https://protocol.tinycloud.xyz',
  integrations: [brokenLinkReport()],
  markdown: {
    remarkPlugins: [[remarkWikilinks, { ids, leafIndex }]],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
