import { getCollection, type CollectionEntry } from 'astro:content';

export type Concept = CollectionEntry<'concepts'>;

// Ordered section list for the sidebar (spec-defined order).
export const SECTION_ORDER = [
  'foundations',
  'identity',
  'spaces',
  'authorization',
  'policy-engine',
  'services',
  'encryption',
  'storage',
  'consistency',
  'applications',
  'build',
  'secrets',
  'credentials',
  'nodes',
  'sdk',
  'future',
] as const;

export const SECTION_LABELS: Record<string, string> = {
  foundations: 'Foundations',
  identity: 'Identity',
  spaces: 'Spaces',
  authorization: 'Authorization',
  'policy-engine': 'Policy Engine',
  services: 'Services',
  encryption: 'Encryption',
  storage: 'Storage',
  consistency: 'Consistency',
  applications: 'Applications',
  build: 'Build an App',
  secrets: 'Secrets',
  credentials: 'Credentials',
  nodes: 'Nodes',
  sdk: 'SDK',
  future: 'Future',
};

// id -> /url. Section index pages live at the section root.
export function idToUrl(id: string): string {
  if (id.endsWith('/index')) return '/' + id.slice(0, -'/index'.length);
  if (id === 'index') return '/';
  return '/' + id;
}

export function sectionOf(id: string): string {
  return id.includes('/') ? id.split('/')[0] : id;
}

export function isIndex(entry: Concept): boolean {
  return entry.id.endsWith('/index') || entry.data.type === 'index';
}

let _all: Concept[] | null = null;
export async function allConcepts(): Promise<Concept[]> {
  if (_all) return _all;
  _all = await getCollection('concepts');
  return _all;
}

// Build the reverse-link (backlink) graph from rendered wikilink/relative-md
// targets. We re-derive edges from the raw markdown body so it stays in lockstep
// with what the remark plugin resolves.
import { resolveBodyTargets } from './link-graph.mjs';

export interface NavSection {
  key: string;
  label: string;
  index?: Concept;
  pages: Concept[];
}

export async function buildNav(): Promise<NavSection[]> {
  const all = await allConcepts();
  const bySection = new Map<string, Concept[]>();
  const indexBySection = new Map<string, Concept>();

  for (const entry of all) {
    const sec = sectionOf(entry.id);
    if (isIndex(entry)) {
      indexBySection.set(sec, entry);
    } else {
      if (!bySection.has(sec)) bySection.set(sec, []);
      bySection.get(sec)!.push(entry);
    }
  }

  const sections: NavSection[] = [];
  const seen = new Set<string>();
  for (const key of SECTION_ORDER) {
    seen.add(key);
    const pages = (bySection.get(key) ?? []).sort((a, b) =>
      a.data.title.localeCompare(b.data.title)
    );
    sections.push({
      key,
      label: SECTION_LABELS[key] ?? key,
      index: indexBySection.get(key),
      pages,
    });
  }
  // Any unexpected sections not in the canonical order, appended.
  for (const [key, pages] of bySection) {
    if (seen.has(key)) continue;
    sections.push({
      key,
      label: SECTION_LABELS[key] ?? key,
      index: indexBySection.get(key),
      pages: pages.sort((a, b) => a.data.title.localeCompare(b.data.title)),
    });
  }
  return sections;
}

// Returns map: concept id -> array of { id, title } that reference it.
export async function buildBacklinks(): Promise<Map<string, { id: string; title: string }[]>> {
  const all = await allConcepts();
  const ids = new Set(all.map((c) => c.id));
  const titleById = new Map(all.map((c) => [c.id, c.data.title] as const));
  const back = new Map<string, { id: string; title: string }[]>();

  for (const entry of all) {
    const targets = resolveBodyTargets(entry.body ?? '', entry.id, ids);
    const uniq = new Set(targets);
    for (const target of uniq) {
      if (target === entry.id) continue; // ignore self-links
      if (!back.has(target)) back.set(target, []);
      back.get(target)!.push({ id: entry.id, title: titleById.get(entry.id) ?? entry.id });
    }
  }

  // Stable sort backlinks by title.
  for (const list of back.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }
  return back;
}
