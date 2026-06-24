#!/bin/sh
# lint.sh — minimal OKF bundle lint.
# Asserts every concept .md has a `type:` frontmatter field, validates that the
# YAML frontmatter of every .md parses, reports orphan concepts (no inbound or
# outbound markdown links), and prints a summary count.
# Deps: find, grep, sed, node (for the YAML-validity check). Run from anywhere.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONCEPTS="$ROOT/concepts"

missing_type=0
orphans=0
bad_yaml=0
total=0

# All concept files (skip index.md — those are directory listings, not concepts).
files="$(find "$CONCEPTS" -name '*.md' ! -name 'index.md' | sort)"
# All markdown files including index.md (frontmatter must parse on every file).
all_md="$(find "$CONCEPTS" -name '*.md' | sort)"

echo "== frontmatter YAML validity check =="
# rumdl is a Markdown *style* linter and does NOT catch malformed YAML
# frontmatter (e.g. an unquoted value containing a colon). This check parses
# each file's frontmatter with a real YAML parser and fails on parse errors.
# Uses the js-yaml that ships with the site/ Astro install.
if command -v node >/dev/null 2>&1 && [ -d "$ROOT/site/node_modules/js-yaml" ]; then
  yaml_out="$(cd "$ROOT/site" && node scripts/check-frontmatter.mjs $all_md 2>&1)"
  yaml_rc=$?
  if [ "$yaml_rc" -ne 0 ]; then
    echo "$yaml_out"
    bad_yaml="$(printf '%s\n' "$yaml_out" | grep -c '^BAD YAML' || true)"
  else
    echo "all frontmatter parses as valid YAML"
  fi
else
  echo "SKIPPED (need node + site/node_modules/js-yaml; run 'cd site && bun install')"
fi
echo ""

echo "== type: frontmatter check =="
for f in $files; do
  total=$((total + 1))
  if ! grep -q '^type:' "$f"; then
    echo "MISSING type: $f"
    missing_type=$((missing_type + 1))
  fi
done
[ "$missing_type" -eq 0 ] && echo "all concepts have a type field"

echo ""
echo "== orphan check (no inbound or outbound md links) =="
for f in $files; do
  base="$(basename "$f")"
  # Outbound: does this file link to another .md ?
  outbound="$(grep -Eo '\]\([^)]+\.md[^)]*\)' "$f" | grep -v '#' | head -n1)"
  # Inbound: does any other file link to this file's basename ?
  inbound="$(grep -rl "($base" "$ROOT" --include='*.md' | grep -v "^$f$" | head -n1)"
  inbound2="$(grep -rl "/$base" "$ROOT" --include='*.md' | grep -v "^$f$" | head -n1)"
  if [ -z "$outbound" ] && [ -z "$inbound" ] && [ -z "$inbound2" ]; then
    echo "ORPHAN: $f"
    orphans=$((orphans + 1))
  fi
done
[ "$orphans" -eq 0 ] && echo "no orphans"

echo ""
echo "== summary =="
echo "concepts:        $total"
echo "missing type:    $missing_type"
echo "bad frontmatter: $bad_yaml"
echo "orphans:         $orphans"

# Non-zero exit if any hard failure (missing type or broken frontmatter YAML).
[ "$missing_type" -eq 0 ] && [ "$bad_yaml" -eq 0 ]
