import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { buildIdMap } from './src/lib/id-map.mjs';
import remarkWikilinks from './src/plugins/remark-wikilinks.mjs';

const conceptsDir = fileURLToPath(new URL('../concepts', import.meta.url));

// Build the id -> url map ONCE, at config load, by scanning concepts/.
// Shared by the remark plugin (link resolution) and available to pages.
const { ids, leafIndex } = buildIdMap(conceptsDir);

export default defineConfig({
  output: 'static',
  site: 'https://protocol.tinycloud.xyz',
  markdown: {
    remarkPlugins: [[remarkWikilinks, { ids, leafIndex }]],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
