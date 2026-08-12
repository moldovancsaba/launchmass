#!/usr/bin/env node
/**
 * Secret-scanning guard for staged changes.
 *
 * WHAT: Scans the content of staged (git-added) files for patterns that look like
 *       live credentials (MongoDB connection strings with embedded userinfo, AWS
 *       access key IDs, PEM private key headers) and fails non-zero if any match.
 * WHY:  See GitHub issue #7 — four tracked scripts previously hardcoded plaintext
 *       MongoDB credentials. This is the automated guard that stops a repeat.
 * HOW:  Runs against `git diff --cached` staged content only (never the working
 *       tree or untracked files at large), so it has no network dependency and
 *       adds negligible latency to a commit. Also runnable standalone against any
 *       file path (see below) for manual/fixture verification without a test
 *       framework, per this repo's no-automated-tests rule (WARP.md).
 *
 * Usage:
 *   node scripts/scan-secrets.mjs              # scan staged files (git diff --cached)
 *   node scripts/scan-secrets.mjs <file...>     # scan specific files on disk (fixtures, manual checks)
 *
 * Exit code: 0 = clean, 1 = at least one match found (or a scan error occurred).
 *
 * Security note: never log the matched secret value itself, only the pattern class
 * and file path — the guard must not become a secondary leak vector via terminal/CI
 * logs.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Functional: filename allow-list for intentional placeholder/fixture content, applied
// only to the default (staged-diff or full-tracked-tree) scan modes — see main().
// Strategic:
//   - .env.example documents the shape of a real connection string on purpose (an
//     srv-style Mongo URL with placeholder credential tokens) and must never trip
//     the scanner during a normal commit or CI run.
//   - scripts/__fixtures__/secret-scan-positive.txt intentionally contains a
//     pattern-matching (but fake) secret so the scanner is manually verifiable
//     (issue #7) — it must not fail an ordinary commit/CI run just because it exists
//     in the tree, but an explicit `node scripts/scan-secrets.mjs <path>` invocation
//     against it (the actual verification step) is NOT allow-listed, so that check
//     still exercises real detection.
const DEFAULT_SCAN_ALLOW_LIST = new Set([
  '.env.example',
  'scripts/__fixtures__/secret-scan-positive.txt',
]);

// Functional: named pattern classes checked against file content.
// Strategic: content-based (not filename-based) so a credential leaked into any new
// file, not just a naming-convention match, is still caught.
const PATTERNS = [
  { name: 'MongoDB connection string with embedded credentials', regex: /mongodb(\+srv)?:\/\/[^:'"]+:[^@'"]+@/i },
  { name: 'AWS access key ID', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'PEM private key header', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

function getStagedFiles() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
    encoding: 'utf8',
  });
  return out.split('\n').map((line) => line.trim()).filter(Boolean);
}

function getTrackedFiles() {
  // Functional: full list of git-tracked files (respects .gitignore).
  // Strategic: used as a fallback when nothing is staged — a fresh CI checkout of a
  // push/PR has an empty index (nothing staged relative to itself), so scanning
  // `git diff --cached` there would be a silent no-op. Falling back to the full
  // tracked tree is what makes "the same scan" in CI actually mean something on
  // push/PR, per the issue's Architecture section.
  const out = execFileSync('git', ['ls-files'], { encoding: 'utf8' });
  return out.split('\n').map((line) => line.trim()).filter(Boolean);
}

function getStagedContent(file) {
  // Functional: read the staged (index) blob content, not the working-tree file —
  // matches what will actually be committed even if the working tree has since
  // changed again.
  return execFileSync('git', ['show', `:${file}`], { encoding: 'utf8' });
}

function scanContent(file, content) {
  const matches = [];
  for (const pattern of PATTERNS) {
    if (pattern.regex.test(content)) {
      matches.push(pattern);
    }
  }
  return matches;
}

function main() {
  const explicitFiles = process.argv.slice(2);
  const usingExplicitFiles = explicitFiles.length > 0;

  // Functional: three sources of files to scan, in priority order.
  // Strategic: explicit args (manual/fixture runs) > staged diff (pre-commit hook,
  // the common case) > full tracked tree (fallback for CI, where a fresh checkout
  // has nothing staged so `git diff --cached` would otherwise be a silent no-op).
  let files;
  let readMode; // 'explicit' | 'staged' | 'tracked'
  if (usingExplicitFiles) {
    files = explicitFiles;
    readMode = 'explicit';
  } else {
    try {
      files = getStagedFiles();
      readMode = 'staged';
      if (files.length === 0) {
        files = getTrackedFiles();
        readMode = 'tracked';
      }
    } catch (error) {
      console.error('scan-secrets: failed to read files via git.');
      console.error(error.message);
      process.exit(1);
      return;
    }
  }

  let failed = false;

  for (const file of files) {
    if (readMode !== 'explicit' && DEFAULT_SCAN_ALLOW_LIST.has(file)) {
      continue;
    }

    let content;
    try {
      content = readMode === 'staged' ? getStagedContent(file) : readFileSync(file, 'utf8');
    } catch {
      // Functional: skip files that can't be read as text (binary, deleted, etc.).
      continue;
    }

    const matches = scanContent(file, content);
    for (const match of matches) {
      // Security: never print the matched secret value, only the pattern class and file.
      console.error(`✗ Possible secret matched (${match.name}) in ${file}`);
      failed = true;
    }
  }

  if (failed) {
    console.error('');
    console.error('scan-secrets: blocked — a staged file appears to contain a credential.');
    console.error('Remove the literal and source it from an environment variable instead (see .env.example).');
    process.exit(1);
  }

  console.log('scan-secrets: clean — no credential patterns matched.');
}

main();
