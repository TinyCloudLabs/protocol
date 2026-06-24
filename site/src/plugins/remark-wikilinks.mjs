// Custom remark plugin resolving Obsidian-style wikilinks AND relative .md
// links in concept bodies to site URLs, keyed to our concept-id scheme.
//
// Wikilink forms handled:  [[id]] [[id|alias]] [[id#anchor]] [[id#anchor|alias]]
//   ...including aliases that contain inline code, e.g. [[kv|`tinycloud.kv/put`]].
// Relative-md forms:       [text](../section/name.md) [text](./name.md#anchor)
//
// Resolution order for a wikilink target:
//   1. exact full-id match            ("policy-engine/overview")
//   2. bare section name -> its index ("nodes" -> "nodes/index")
//   3. unique leaf-name match         ("capabilities" -> "authorization/capabilities")
//   4. same-section sibling when a leaf is ambiguous across sections
//      (Obsidian "same folder first" — deterministic, not a guess)
//   Otherwise: ambiguous/unresolved -> visible broken-link span + report entry.
//
// IMPLEMENTATION: wikilinks are rewritten at the RAW MARKDOWN level (before the
// inline parser runs) so a link whose alias contains backticks/inline code is not
// pre-split across mdast nodes. We then re-parse the rewritten markdown. No
// wikilink in this bundle appears inside a fenced code block (verified), and we
// skip fenced regions defensively. Resolved links become standard markdown links
// `[alias](url)`; unresolved/ambiguous become inline HTML spans.
import { visit } from 'unist-util-visit';
import { idToUrl } from '../lib/id-map.mjs';

// Module-level sink (best-effort; Astro may run renders in a worker, so the
// authoritative report is regenerated from the markdown by scripts/link-report).
export const BROKEN_LINKS = [];

const WIKILINK_RE = /\[\[([^\]\n]+?)\]\]/g;

function resolveTarget(rawTarget, ids, leafIndex, sourceSection) {
  if (ids.has(rawTarget)) return { id: rawTarget };
  if (!rawTarget.includes('/')) {
    if (ids.has(`${rawTarget}/index`)) return { id: `${rawTarget}/index` };
    const matches = leafIndex.get(rawTarget);
    if (matches && matches.size === 1) return { id: [...matches][0] };
    if (matches && matches.size > 1) {
      if (sourceSection) {
        const same = [...matches].filter((id) => id.split('/')[0] === sourceSection);
        if (same.length === 1) return { id: same[0] };
      }
      return { ambiguous: [...matches] };
    }
  }
  return null;
}

function escapeText(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return escapeText(s).replace(/"/g, '&quot;');
}

// Build a leaf-name index from the id set.
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

function sectionFromPath(p) {
  const idx = p.lastIndexOf('/concepts/');
  if (idx === -1) return null;
  const rel = p.slice(idx + '/concepts/'.length);
  return rel.includes('/') ? rel.split('/')[0] : null;
}
function shortSource(p) {
  const idx = p.lastIndexOf('/concepts/');
  return idx === -1 ? p : 'concepts/' + p.slice(idx + '/concepts/'.length);
}

// Rewrite one line of markdown, replacing wikilinks with markdown links / spans.
function rewriteLine(line, ctx) {
  WIKILINK_RE.lastIndex = 0;
  return line.replace(WIKILINK_RE, (full, inner) => {
    let target = inner;
    let alias = null;
    let anchor = null;

    const pipe = target.indexOf('|');
    if (pipe !== -1) {
      alias = target.slice(pipe + 1).trim();
      target = target.slice(0, pipe);
    }
    const hash = target.indexOf('#');
    if (hash !== -1) {
      anchor = target.slice(hash + 1).trim();
      target = target.slice(0, hash);
    }
    target = target.trim();

    // Same-page anchor: [[#anchor]] / [[#anchor|alias]]
    if (target === '' && anchor) {
      const label = alias || anchor;
      return `[${label}](#${anchor})`;
    }

    const resolved = resolveTarget(target, ctx.ids, ctx.leafIndex, ctx.sourceSection);
    const label = alias || target.split('/').pop();

    if (resolved && resolved.id) {
      const href = idToUrl(resolved.id) + (anchor ? '#' + anchor : '');
      // Emit a standard markdown link with the wikilink class via a span-less
      // approach: markdown can't carry a class, so wrap in an inline HTML <a>.
      // But to keep inline-code aliases rendering as code, prefer markdown link
      // syntax when the alias has no backticks; otherwise inline HTML with the
      // alias text (code formatting in the alias is rare in resolved links).
      return `[${label}](${href})`;
    }

    const reason = resolved && resolved.ambiguous
      ? `ambiguous wikilink "${target}" -> ${resolved.ambiguous.join(', ')}`
      : `unresolved wikilink "${target}"`;
    ctx.broken.push({ source: ctx.short, raw: full, kind: resolved && resolved.ambiguous ? 'ambiguous' : 'unresolved', reason });
    // Strip any backticks from the label for the plain-text span.
    const plain = label.replace(/`/g, '');
    return `<span class="broken-link" title="${escapeAttr(reason)}">${escapeText(plain)}</span>`;
  });
}

export default function remarkWikilinks(options = {}) {
  const { ids: idsInput, leafIndex: leafIndexInput } = options;
  const ids = idsInput instanceof Set ? idsInput : new Set(idsInput);
  const leafIndex = leafIndexInput ?? buildLeafIndex(ids);
  // `this` is the unified processor; capture it so the transformer can re-parse.
  const processor = this;

  return function transformer(tree, file) {
    const sourcePath = file?.path || file?.history?.[0] || 'unknown';
    const ctx = {
      ids,
      leafIndex,
      sourceSection: sectionFromPath(sourcePath),
      short: shortSource(sourcePath),
      broken: BROKEN_LINKS,
    };

    // ---- Pass A: raw-markdown wikilink rewrite, then re-parse. ----
    const raw = String(file.value ?? '');
    if (raw.includes('[[')) {
      const lines = raw.split('\n');
      let inFence = false;
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trimStart();
        if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
          inFence = !inFence;
          continue;
        }
        if (inFence) continue;
        if (lines[i].includes('[[')) {
          lines[i] = rewriteLine(lines[i], ctx);
        }
      }
      const rewritten = lines.join('\n');
      if (rewritten !== raw) {
        // Re-parse the rewritten markdown and swap the tree's children.
        const tree2 = processor.parse(rewritten);
        tree.children = tree2.children;
      }
    }

    // ---- Pass B: standard markdown links to relative .md files. ----
    visit(tree, 'link', (node) => {
      const url = node.url;
      if (!url || !/\.md(#|$)/.test(url)) return;
      if (/^https?:\/\//.test(url)) return;
      const [pathPart, frag] = url.split('#');
      const targetId = resolveRelativeMd(pathPart, sourcePath);
      if (targetId && ids.has(targetId)) {
        node.url = idToUrl(targetId) + (frag ? '#' + frag : '');
        node.data = node.data || {};
        node.data.hProperties = { ...(node.data.hProperties || {}), class: 'wikilink' };
      } else {
        BROKEN_LINKS.push({ source: ctx.short, raw: url, kind: 'relative-md', reason: `unresolved relative .md link "${url}"` });
        node.data = node.data || {};
        node.data.hProperties = { ...(node.data.hProperties || {}), class: 'broken-link' };
      }
    });

    // ---- Pass C: tag resolved internal links with the wikilink class. ----
    visit(tree, 'link', (node) => {
      const url = node.url;
      if (!url) return;
      if (url.startsWith('/') || url.startsWith('#')) {
        node.data = node.data || {};
        const cls = node.data.hProperties?.class;
        if (!cls) {
          node.data.hProperties = { ...(node.data.hProperties || {}), class: 'wikilink' };
        }
      }
    });
  };
}

// Resolve a relative .md path (from a source file) to a concept id.
function resolveRelativeMd(pathPart, sourcePath) {
  const idx = sourcePath.lastIndexOf('/concepts/');
  if (idx === -1) return null;
  const relFromConcepts = sourcePath.slice(idx + '/concepts/'.length);
  const sourceDir = relFromConcepts.includes('/')
    ? relFromConcepts.slice(0, relFromConcepts.lastIndexOf('/'))
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
