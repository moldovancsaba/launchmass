#!/usr/bin/env node

/**
 * Documentation Consistency Validation Script
 * 
 * Purpose: Validates version consistency and documentation integrity across the project.
 * Usage: node scripts/verify-docs-consistency.js
 * Exit codes: 0 = pass, 1 = validation failures
 * 
 * Checks:
 * 1. Version consistency across package.json and all documentation
 * 2. Required documentation files exist
 * 3. Timestamp format compliance (ISO 8601 with milliseconds)
 * 
 * This script enforces the version and documentation protocols defined in project rules.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Documentation files that must contain version references
const VERSION_REQUIRED_DOCS = [
  'README.md',
  'ARCHITECTURE.md',
  'TASKLIST.md',
  'LEARNINGS.md',
  'AUTH_CURRENT.md',
  'DOCUMENTATION_REMEDIATION_SUMMARY.md',
];

// Documentation files that must exist
const REQUIRED_DOCS = [
  'README.md',
  'ARCHITECTURE.md',
  'TASKLIST.md',
  'LEARNINGS.md',
  'ROADMAP.md',
  'RELEASE_NOTES.md',
  'AUTH_CURRENT.md',
  'WARP.md',
];

// ISO 8601 timestamp pattern with milliseconds: YYYY-MM-DDTHH:MM:SS.sssZ
const ISO_8601_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;

let exitCode = 0;

/**
 * Reads package.json and extracts the current version
 */
function getPackageVersion() {
  const packagePath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

/**
 * Checks if a file exists
 */
function fileExists(relativePath) {
  return fs.existsSync(path.join(projectRoot, relativePath));
}

/**
 * Reads a file and returns its content
 */
function readFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

/**
 * Validates that required documentation files exist
 */
function validateRequiredDocs() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  REQUIRED DOCUMENTATION FILES${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  let allExist = true;

  for (const doc of REQUIRED_DOCS) {
    if (fileExists(doc)) {
      console.log(`${colors.green}✓${colors.reset} ${doc}`);
    } else {
      console.log(`${colors.red}✗${colors.reset} ${doc} ${colors.red}(MISSING)${colors.reset}`);
      allExist = false;
      exitCode = 1;
    }
  }

  return allExist;
}

/**
 * Validates version consistency across documentation
 */
function validateVersionConsistency() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  VERSION CONSISTENCY${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  const packageVersion = getPackageVersion();
  console.log(`${colors.blue}Package version:${colors.reset} ${packageVersion}\n`);

  let allConsistent = true;

  for (const doc of VERSION_REQUIRED_DOCS) {
    if (!fileExists(doc)) {
      console.log(`${colors.yellow}⚠${colors.reset} ${doc} ${colors.yellow}(SKIPPED - file missing)${colors.reset}`);
      continue;
    }

    const content = readFile(doc);
    
    // Search for version patterns in the document
    const versionMatches = content.match(/version[:\s]+v?(\d+\.\d+\.\d+)/gi);
    
    if (!versionMatches) {
      console.log(`${colors.yellow}⚠${colors.reset} ${doc} ${colors.yellow}(no version found)${colors.reset}`);
      continue;
    }

    // Extract all version numbers found
    const versions = versionMatches.map(match => {
      const versionMatch = match.match(/(\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : null;
    }).filter(Boolean);

    // Check if the latest version matches package version
    const hasMatchingVersion = versions.includes(packageVersion);
    
    if (hasMatchingVersion) {
      console.log(`${colors.green}✓${colors.reset} ${doc} ${colors.green}(${packageVersion})${colors.reset}`);
    } else {
      console.log(`${colors.red}✗${colors.reset} ${doc} ${colors.red}(found: ${versions.join(', ')})${colors.reset}`);
      allConsistent = false;
      exitCode = 1;
    }
  }

  return allConsistent;
}

/**
 * Validates timestamp format in RELEASE_NOTES.md
 */
function validateTimestampFormat() {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  TIMESTAMP FORMAT (ISO 8601)${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  if (!fileExists('RELEASE_NOTES.md')) {
    console.log(`${colors.yellow}⚠${colors.reset} RELEASE_NOTES.md ${colors.yellow}(SKIPPED - file missing)${colors.reset}`);
    return true;
  }

  const content = readFile('RELEASE_NOTES.md');
  const lines = content.split('\n');
  
  let validTimestamps = 0;
  let invalidTimestamps = 0;
  const invalidLines = [];

  // Check each line for timestamp patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for timestamp patterns (both valid and invalid)
    const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\s]*)/);
    
    if (timestampMatch) {
      const timestamp = timestampMatch[1];
      
      if (ISO_8601_PATTERN.test(timestamp)) {
        validTimestamps++;
      } else {
        invalidTimestamps++;
        invalidLines.push({ lineNum: i + 1, timestamp, line: line.trim() });
      }
    }
  }

  console.log(`${colors.green}✓${colors.reset} Valid timestamps: ${validTimestamps}`);
  
  if (invalidTimestamps > 0) {
    console.log(`${colors.red}✗${colors.reset} Invalid timestamps: ${invalidTimestamps}\n`);
    console.log(`${colors.red}Invalid timestamp examples:${colors.reset}`);
    
    invalidLines.slice(0, 5).forEach(({ lineNum, timestamp }) => {
      console.log(`  Line ${lineNum}: ${colors.red}${timestamp}${colors.reset}`);
    });
    
    console.log(`\n${colors.yellow}Expected format:${colors.reset} YYYY-MM-DDTHH:MM:SS.sssZ`);
    console.log(`${colors.yellow}Example:${colors.reset} 2025-12-21T14:30:45.123Z`);
    
    exitCode = 1;
    return false;
  }

  return true;
}

/**
 * Main validation function
 */
function main() {
  console.log(`\n${colors.blue}╔═══════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  DOCUMENTATION CONSISTENCY VALIDATION            ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════════════════╝${colors.reset}`);

  const docsExist = validateRequiredDocs();
  const versionsConsistent = validateVersionConsistency();
  const timestampsValid = validateTimestampFormat();

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  VALIDATION SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  if (exitCode === 0) {
    console.log(`${colors.green}✓ All validation checks passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}✗ Validation failed - please fix the issues above${colors.reset}\n`);
  }

  process.exit(exitCode);
}

main();
