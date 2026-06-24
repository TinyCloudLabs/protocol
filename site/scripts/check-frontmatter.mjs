// Frontmatter YAML-validity check. Parses the YAML frontmatter of each markdown
// file passed as an argument and reports any that fail to parse. This catches
// bugs a Markdown *style* linter (rumdl/markdownlint) misses — e.g. an unquoted
// scalar containing a colon, which YAML reads as a malformed nested mapping.
//
// Usage:  node scripts/check-frontmatter.mjs <file.md> [<file.md> ...]
// Exit:   0 if all parse, 3 if any fail. Prints "BAD YAML <file> -> <reason>".
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const files = process.argv.slice(2);
let bad = 0;

for (const file of files) {
  let txt;
  try {
    txt = readFileSync(file, 'utf8');
  } catch (e) {
    console.log(`BAD YAML ${file} -> cannot read: ${e.message}`);
    bad++;
    continue;
  }
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue; // no frontmatter is allowed
  try {
    yaml.load(m[1]);
  } catch (e) {
    console.log(`BAD YAML ${file} -> ${String(e.message).split('\n')[0]}`);
    bad++;
  }
}

process.exit(bad > 0 ? 3 : 0);
