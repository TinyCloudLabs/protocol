#!/bin/sh
# build-viz.sh — render the OKF bundle as a self-contained viz.html.
#
# INTENT (not yet implemented): produce a single self-contained `viz.html` (no
# backend, no install, no data leaving the browser) rendering the bundle as a
# force-directed knowledge graph:
#   - nodes = concepts, colored by frontmatter `type`
#   - edges = markdown cross-links between concept docs
#   - detail panel renders frontmatter + body, with "Cited by" backlinks
#   - search box + type filters
# Model the implementation on `scaccogatto/okf-skills` or the
# `GoogleCloudPlatform/knowledge-catalog` OKF `visualize` subcommand.

echo "TODO: implement OKF visualizer"
exit 0
