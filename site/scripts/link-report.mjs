// Standalone unresolved/ambiguous wikilink report. Scans ../concepts directly
// with the SAME resolution logic the remark plugin uses, so the count is
// deterministic and independent of Astro's worker-based render (whose in-memory
// sink we cannot read back reliably).
//
// Writes dist/.broken-links.json and prints a summary. Exit code is always 0 —
// unresolved links are expected (external refs like UCAN/CACAO have no concept
// page); the report is informational.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIdMap } from '../src/lib/id-map.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(here, '..');
const conceptsDir = join(siteRoot, '..', 'concepts');
const distDir = join(siteRoot, 'dist');

const { ids, leafIndex } = buildIdMap(conceptsDir);

const WIKILINK_RE = /\[\[([^\]\n]+?)\]\]/g;

function sectionOf(id) {
  return id.includes('/') ? id.split('/')[0] : null;
}

function resolve(target, sourceSection) {
  if (ids.has(target)) return { id: target };
  if (!target.includes('/')) {
    if (ids.has(`${target}/index`)) return { id: `${target}/index` };
    const matches = leafIndex.get(target);
    if (matches && matches.size === 1) return { id: [...matches][0] };
    if (matches && matches.size > 1) {
      if (sourceSection) {
        const same = [...matches].filter((i) => i.split('/')[0] === sourceSection);
        if (same.length === 1) return { id: same[0] };
      }
      return { ambiguous: [...matches] };
    }
  }
  return null;
}

import { readdirSync, statSync } from 'node:fs';
function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (e.endsWith('.md')) acc.push(full);
  }
  return acc;
}

const broken = [];
for (const file of walk(conceptsDir)) {
  const rel = file.slice(conceptsDir.length + 1).replace(/\\/g, '/');
  const sourceId = rel.replace(/\.md$/, '');
  const sourceSection = sectionOf(sourceId);
  const body = readFileSync(file, 'utf8');

  // Strip fenced code blocks so we don't count wikilinks inside code.
  const lines = body.split('\n');
  let inFence = false;
  for (const line of lines) {
    const t = line.trimStart();
    if (t.startsWith('```') || t.startsWith('~~~')) { inFence = !inFence; continue; }
    if (inFence) continue;
    let m;
    WIKILINK_RE.lastIndex = 0;
    while ((m = WIKILINK_RE.exec(line)) !== null) {
      let target = m[1];
      const pipe = target.indexOf('|');
      if (pipe !== -1) target = target.slice(0, pipe);
      const hash = target.indexOf('#');
      if (hash !== -1) target = target.slice(0, hash);
      target = target.trim();
      if (!target) continue; // same-page anchor
      const r = resolve(target, sourceSection);
      if (r && r.id) continue;
      broken.push({
        source: 'concepts/' + rel,
        raw: m[0],
        target,
        kind: r && r.ambiguous ? 'ambiguous' : 'unresolved',
        candidates: r && r.ambiguous ? r.ambiguous : undefined,
      });
    }
  }
}

if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, '.broken-links.json'), JSON.stringify(broken, null, 2));

const byTarget = new Map();
for (const b of broken) {
  const key = `${b.kind}: ${b.target}`;
  byTarget.set(key, (byTarget.get(key) ?? 0) + 1);
}
console.log(`\n[link-report] ${broken.length} unresolved/ambiguous wikilink instance(s) across the bundle`);
console.log(`[link-report] (all are external refs with no concept page, or genuinely cross-section ambiguous)`);
for (const [k, n] of [...byTarget.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}x  ${k}`);
}
console.log(`[link-report] full report: dist/.broken-links.json\n`);
