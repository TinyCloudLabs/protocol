// Custom remark plugin resolving Obsidian-style wikilinks AND relative .md
// links in concept bodies to site URLs, keyed to our concept-id scheme.
//
// Wikilink forms handled:  [[id]] [[id|alias]] [[id#anchor]] [[id#anchor|alias]]
// Relative-md forms:       [text](../section/name.md) [text](./name.md#anchor)
//
// Resolution order for a wikilink target:
//   1. exact full-id match            ("policy-engine/overview")
//   2. unique leaf-name match         ("capabilities" -> "authorization/capabilities")
//   If a bare leaf is AMBIGUOUS (e.g. "threshold-decryption" in two dirs), we do
//   NOT guess — we emit a visible broken-link marker and record it in the report.
//
// Resolved  -> <a href="/<id>#anchor">alias-or-leaf</a>
// Unresolved-> <span class="broken-link" title="...">[[raw]]</span> + report entry.
//
// Per-build unresolved links are collected into BROKEN_LINKS and dumped to
// dist/.broken-links.json by the wrapper in id-map / a postbuild step; the
// plugin also logs each one to the console.
import { visit } from 'unist-util-visit';
import { idToUrl } from '../lib/id-map.mjs';

// Module-level sink so the build can aggregate across files.
export const BROKEN_LINKS = [];

const WIKILINK_RE = /\[\[([^\]]+?)\]\]/g;

function resolveTarget(rawTarget, { ids, leafIndex }) {
  // Returns { id } on success, or { ambiguous } / null on failure.
  if (ids.has(rawTarget)) return { id: rawTarget };

  // Bare name?
  if (!rawTarget.includes('/')) {
    // A bare section name (e.g. "nodes", "services") resolves to that
    // section's index page when one exists.
    if (ids.has(`${rawTarget}/index`)) {
      return { id: `${rawTarget}/index` };
    }
    const matches = leafIndex.get(rawTarget);
    if (matches && matches.size === 1) {
      return { id: [...matches][0] };
    }
    if (matches && matches.size > 1) {
      return { ambiguous: [...matches] };
    }
  }
  return null;
}

function makeBrokenNode(rawLabel, reason) {
  return {
    type: 'html',
    value: `<span class="broken-link" title="${escapeAttr(reason)}">${escapeText(
      rawLabel
    )}</span>`,
  };
}

function makeLinkHtml(href, label) {
  return {
    type: 'html',
    value: `<a class="wikilink" href="${escapeAttr(href)}">${escapeText(label)}</a>`,
  };
}

function escapeText(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return escapeText(s).replace(/"/g, '&quot;');
}

export default function remarkWikilinks(options = {}) {
  const { ids, leafIndex } = options;

  return function transformer(tree, file) {
    const sourcePath = file?.path || file?.history?.[0] || 'unknown';

    // ---- Pass 1: text nodes containing [[wikilinks]] ----
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index == null) return;
      if (!node.value.includes('[[')) return;

      const segments = [];
      let last = 0;
      let m;
      WIKILINK_RE.lastIndex = 0;
      while ((m = WIKILINK_RE.exec(node.value)) !== null) {
        const [full, inner] = m;
        if (m.index > last) {
          segments.push({ type: 'text', value: node.value.slice(last, m.index) });
        }
        segments.push(buildWikilinkNode(inner, full));
        last = m.index + full.length;
      }
      if (segments.length === 0) return; // no real matches
      if (last < node.value.length) {
        segments.push({ type: 'text', value: node.value.slice(last) });
      }
      parent.children.splice(index, 1, ...segments);
      return index + segments.length;
    });

    // ---- Pass 2: standard markdown links to relative .md files ----
    visit(tree, 'link', (node) => {
      const url = node.url;
      if (!url || !/\.md(#|$)/.test(url)) return;
      if (/^https?:\/\//.test(url)) return;

      const [pathPart, anchor] = url.split('#');
      const targetId = resolveRelativeMd(pathPart, sourcePath);
      if (targetId && ids.has(targetId)) {
        node.url = idToUrl(targetId) + (anchor ? '#' + anchor : '');
      } else {
        BROKEN_LINKS.push({
          source: shortSource(sourcePath),
          raw: url,
          kind: 'relative-md',
          reason: 'unresolved relative .md link',
        });
        // Leave url as-is but flag via a data attribute through hProperties.
        node.data = node.data || {};
        node.data.hProperties = { ...(node.data.hProperties || {}), class: 'broken-link' };
      }
    });

    function buildWikilinkNode(inner, full) {
      // inner = "target#anchor|alias" (anchor & alias optional)
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

      // Same-page anchor link: [[#anchor]] / [[#anchor|alias]] — no target id.
      if (target === '' && anchor) {
        return makeLinkHtml('#' + anchor, alias || anchor);
      }

      const resolved = resolveTarget(target, { ids, leafIndex });
      const label = alias || leafLabel(target);

      if (resolved && resolved.id) {
        const href = idToUrl(resolved.id) + (anchor ? '#' + anchor : '');
        return makeLinkHtml(href, label);
      }

      const reason = resolved && resolved.ambiguous
        ? `ambiguous wikilink "${target}" -> ${resolved.ambiguous.join(', ')}`
        : `unresolved wikilink "${target}"`;
      BROKEN_LINKS.push({
        source: shortSource(sourcePath),
        raw: full,
        kind: resolved && resolved.ambiguous ? 'ambiguous' : 'unresolved',
        reason,
      });
      console.warn(`[wikilinks] ${shortSource(sourcePath)}: ${reason}`);
      return makeBrokenNode(full, reason);
    }
  };
}

function leafLabel(target) {
  const leaf = target.split('/').pop();
  return leaf;
}

// Resolve a relative .md path (from a source file) to a concept id.
function resolveRelativeMd(pathPart, sourcePath) {
  // sourcePath is an absolute path under concepts/. Derive the source id dir.
  const idx = sourcePath.lastIndexOf('/concepts/');
  if (idx === -1) return null;
  const relFromConcepts = sourcePath.slice(idx + '/concepts/'.length); // e.g. foundations/thesis.md
  const sourceDir = relFromConcepts.includes('/')
    ? relFromConcepts.slice(0, relFromConcepts.lastIndexOf('/'))
    : '';

  // Normalize the relative path against sourceDir.
  const cleaned = pathPart.replace(/\.md$/, '');
  const parts = (sourceDir ? sourceDir.split('/') : []);
  for (const seg of cleaned.split('/')) {
    if (seg === '.' || seg === '') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

function shortSource(p) {
  const idx = p.lastIndexOf('/concepts/');
  return idx === -1 ? p : 'concepts/' + p.slice(idx + '/concepts/'.length);
}
