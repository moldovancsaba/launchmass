#!/bin/sh
# Point git at the tracked hooks directory so the version/doc-consistency
# pre-commit hook is active for every contributor.
git config core.hooksPath .githooks 2>/dev/null && \
  echo "✓ Git hooks installed (core.hooksPath=.githooks)" || \
  echo "• Skipped git hooks install (not a git repo)"
