#!/bin/sh
# lint.sh — minimal OKF bundle lint.
# Asserts every concept .md has a `type:` frontmatter field, reports orphan
# concepts (no inbound or outbound markdown links), and prints a summary count.
# Deps: find, grep, sed. Run from the bundle root or anywhere.

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONCEPTS="$ROOT/concepts"

missing_type=0
orphans=0
total=0

# All concept files (skip index.md — those are directory listings, not concepts).
files="$(find "$CONCEPTS" -name '*.md' ! -name 'index.md' | sort)"

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
echo "orphans:         $orphans"
