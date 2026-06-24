// Resolve every outbound concept link in a markdown body to a set of target
// concept ids, using the SAME rules as the remark-wikilinks plugin:
//   - [[id]] / [[id|alias]] / [[id#anchor]] wikilinks
//   - relative-path .md markdown links  [text](../section/name.md)
// Used to derive the reverse-link (backlink) graph at build time.
//
// Returns an array of resolved target ids (may contain duplicates).

const WIKILINK_RE = /\[\[([^\]]+?)\]\]/g;
const MDLINK_RE = /\]\(([^)]+?\.md(?:#[^)]*)?)\)/g;

function buildLeafIndex(ids) {
  const leafIndex = new Map();
  for (const id of ids) {
    const leaf = id.split('/').pop();
    if (leaf === 'index') continue;
    if (!leafIndex.has(leaf)) leafIndex.set(leaf, new Set());
    leafIndex.get(leaf).add(id);
  }
  return leafIndex;
}

function resolveTarget(rawTarget, ids, leafIndex, sourceSection) {
  if (ids.has(rawTarget)) return rawTarget;
  if (!rawTarget.includes('/')) {
    if (ids.has(`${rawTarget}/index`)) return `${rawTarget}/index`;
    const matches = leafIndex.get(rawTarget);
    if (matches && matches.size === 1) return [...matches][0];
    if (matches && matches.size > 1 && sourceSection) {
      const sameSection = [...matches].filter((id) => id.split('/')[0] === sourceSection);
      if (sameSection.length === 1) return sameSection[0];
    }
  }
  return null;
}

function resolveRelativeMd(pathPart, sourceId) {
  const sourceDir = sourceId.includes('/')
    ? sourceId.slice(0, sourceId.lastIndexOf('/'))
    : '';
  const cleaned = pathPart.replace(/\.md$/, '');
  const parts = sourceDir ? sourceDir.split('/') : [];
  for (const seg of cleaned.split('/')) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

export function resolveBodyTargets(body, sourceId, ids) {
  const leafIndex = buildLeafIndex(ids);
  const sourceSection = sourceId.includes('/') ? sourceId.split('/')[0] : null;
  const out = [];

  let m;
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(body)) !== null) {
    let target = m[1];
    const pipe = target.indexOf('|');
    if (pipe !== -1) target = target.slice(0, pipe);
    const hash = target.indexOf('#');
    if (hash !== -1) target = target.slice(0, hash);
    target = target.trim();
    if (!target) continue; // same-page anchor
    const resolved = resolveTarget(target, ids, leafIndex, sourceSection);
    if (resolved) out.push(resolved);
  }

  MDLINK_RE.lastIndex = 0;
  while ((m = MDLINK_RE.exec(body)) !== null) {
    const url = m[1];
    if (/^https?:\/\//.test(url)) continue;
    const pathPart = url.split('#')[0];
    const resolved = resolveRelativeMd(pathPart, sourceId);
    if (ids.has(resolved)) out.push(resolved);
  }

  return out;
}
