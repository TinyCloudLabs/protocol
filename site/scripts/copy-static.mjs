// Copies the agent-readable source files into public/ so the build serves them
// verbatim at the deployed site:
//   - concepts/**/*.md  -> public/concepts/**/*.md
//   - llms.txt          -> public/llms.txt
//   - index.md, log.md  -> public/index.md, public/log.md
// concepts/ stays the source of truth; this is a one-way copy into the build.
import { cp, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(here, '..');
const repoRoot = join(siteRoot, '..');
const publicDir = join(siteRoot, 'public');

async function run() {
  await mkdir(publicDir, { recursive: true });

  // Raw concept markdown — recursive copy, keeping directory layout.
  await cp(join(repoRoot, 'concepts'), join(publicDir, 'concepts'), {
    recursive: true,
  });

  // Top-level agent files.
  for (const name of ['llms.txt', 'index.md', 'log.md']) {
    const src = join(repoRoot, name);
    if (existsSync(src)) {
      await copyFile(src, join(publicDir, name));
    }
  }

  console.log('[copy-static] copied concepts/, llms.txt, index.md, log.md into public/');
}

run().catch((err) => {
  console.error('[copy-static] failed:', err);
  process.exit(1);
});
