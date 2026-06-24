// Builds the canonical id set + leaf-name index used for wikilink and
// relative-.md-link resolution. Scans concepts/ directly so it can run at
// astro.config load time (before the content layer is queried).
//
// id  = path under concepts/ minus .md  (e.g. "authorization/capabilities",
//       "authorization/index").
// URL = "/" + id, EXCEPT index ids which map to their section dir
//       (e.g. "authorization/index" -> "/authorization").
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else if (entry.endsWith('.md')) {
      acc.push(full);
    }
  }
  return acc;
}

export function idToUrl(id) {
  // Section index files live at the section root URL.
  if (id.endsWith('/index')) return '/' + id.slice(0, -'/index'.length);
  if (id === 'index') return '/';
  return '/' + id;
}

export function buildIdMap(conceptsDir) {
  const files = walk(conceptsDir);
  const ids = new Set();
  // leaf name -> Set of full ids ending in that leaf (excluding "index")
  const leafIndex = new Map();

  for (const file of files) {
    const rel = relative(conceptsDir, file).split(sep).join('/');
    const id = rel.replace(/\.md$/, '');
    ids.add(id);

    const leaf = id.split('/').pop();
    if (leaf === 'index') continue;
    if (!leafIndex.has(leaf)) leafIndex.set(leaf, new Set());
    leafIndex.get(leaf).add(id);
  }

  return { ids, leafIndex };
}
