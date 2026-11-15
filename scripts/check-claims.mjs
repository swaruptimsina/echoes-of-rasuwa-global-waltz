#!/usr/bin/env node
/**
 * Automated Scientific Claim-Integrity & Provenance Linter (scripts/check-claims.mjs)
 *
 * Scans src/ and docs/submission/ to verify:
 * 1. Zero forbidden unverified statistics, fatality/financial-saving claims, or operational-warning claims.
 * 2. REAL_NISAR_PRODUCT is never assigned statically outside the validated manifest gate in src/data/nisarProducts.ts.
 * 3. Required provenance snapshots (public/nisar-catalog/cmr-snapshot-2026-11-13.json and public/nisar-reference/provenance.json) exist and parse cleanly.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const FORBIDDEN_PATTERNS = [
  { regex: /1,400|1400\+/i, reason: 'Unverified 1,400+ displacement/casualty count' },
  { regex: /408\.29/i, reason: 'Fabricated overly precise 408.29 metric' },
  { regex: /99 million|99M m/i, reason: 'Unverified 99 million m³ volume figure' },
  { regex: /NRSC\/NISAR/i, reason: 'Misattributed NRSC/NISAR label on simulated grid' },
  { regex: /LIVE DISASTER CAPTURE/i, reason: 'False live disaster capture claim' },
  { regex: /Operationalized NISAR/i, reason: 'False operationalized NISAR warning claim' },
  { regex: /95 min evacuation/i, reason: 'Unverified 95-minute evacuation lead-time claim' },
  { regex: /prevents phase aliasing/i, reason: 'Overstated physics claim (L-band reduces, not prevents, aliasing)' },
  { regex: /uniquely capable of tracking/i, reason: 'Overstated exclusivity claim' },
];

function walkFiles(dir, exts = ['.ts', '.tsx', '.md', '.json']) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

let errors = 0;

// 1. Scan src/ and docs/submission/ for forbidden patterns
const targets = [
  ...walkFiles(path.join(ROOT, 'src'), ['.ts', '.tsx']),
  ...walkFiles(path.join(ROOT, 'docs', 'submission'), ['.md']),
];

for (const file of targets) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');

  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.regex.test(content)) {
      console.error(`[CLAIM-LINT FAIL] ${rel}: matched forbidden pattern ${rule.regex} (${rule.reason})`);
      errors++;
    }
  }

  // 2. Check that REAL_NISAR_PRODUCT is not hardcoded as a component classification prop in UI components
  if (
    rel.startsWith('src/components/') &&
    rel !== 'src/components/DataPassport.tsx' &&
    /classification:\s*['"]REAL_NISAR_PRODUCT['"]/.test(content)
  ) {
    console.error(
      `[CLAIM-LINT FAIL] ${rel}: hardcoded classification: 'REAL_NISAR_PRODUCT' without manifest validation gate`
    );
    errors++;
  }
}

// 3. Verify required provenance JSON files exist and are valid
const requiredJsons = [
  'public/nisar-catalog/cmr-snapshot-2026-11-13.json',
  'public/nisar-reference/provenance.json',
  'docs/sources-ledger.json',
  'docs/research-ledger.json',
];

for (const relPath of requiredJsons) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    console.error(`[CLAIM-LINT FAIL] Missing required provenance file: ${relPath}`);
    errors++;
  } else {
    try {
      JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (err) {
      console.error(`[CLAIM-LINT FAIL] Invalid JSON in ${relPath}: ${err.message}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\nClaim-Integrity Audit FAILED with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log(
    `[CLAIM-LINT OK] Scanned ${targets.length} source/submission files and ${requiredJsons.length} provenance ledgers with 0 violations.`
  );
}
