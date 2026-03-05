#!/usr/bin/env node
/**
 * validate.js — Data integrity checks for AI-Governance repo
 *
 * Checks:
 *   1. All JSON files parse correctly
 *   2. All controlSlugs in evidence/artifacts resolve to controls/library.json
 *   3. All artifactSlugs in evidence resolve to actual artifacts
 *   4. Risk register math: inherentRisk = likelihood * impact,
 *      residualRisk = residualLikelihood * residualImpact
 *   5. No duplicate control slugs
 *
 * Usage: node validate.js
 */

const fs = require('fs');
const path = require('path');

let pass = 0;
let fail = 0;
let warn = 0;

function ok(msg) { pass++; console.log(`  PASS  ${msg}`); }
function bad(msg) { fail++; console.log(`  FAIL  ${msg}`); }
function warning(msg) { warn++; console.log(`  WARN  ${msg}`); }

function loadJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function findJSONFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
      results.push(...findJSONFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

// ──────────────────────────────────────────────
// 1. Parse all JSON files
// ──────────────────────────────────────────────
console.log('\n=== 1. JSON Parse Check ===');
const root = __dirname;
const jsonFiles = findJSONFiles(root);
const parseErrors = [];

for (const f of jsonFiles) {
  try {
    loadJSON(f);
    ok(path.relative(root, f));
  } catch (e) {
    bad(`${path.relative(root, f)}: ${e.message}`);
    parseErrors.push(f);
  }
}

if (parseErrors.length > 0) {
  console.log(`\n  Stopping early — ${parseErrors.length} files failed to parse.\n`);
  process.exit(1);
}

// ──────────────────────────────────────────────
// 2. Load core data
// ──────────────────────────────────────────────
const library = loadJSON(path.join(root, 'controls/library.json'));
const controlSlugs = new Set(library.controls.map(c => c.slug));

const inventory = loadJSON(path.join(root, 'artifacts/inventory.json'));
const artifactIds = new Set();
for (const cat of inventory.categories || []) {
  for (const a of cat.artifacts || []) {
    artifactIds.add(a.id);
  }
}

const evidenceData = loadJSON(path.join(root, 'evidence/index.json'));

// ──────────────────────────────────────────────
// 3. Duplicate control slugs
// ──────────────────────────────────────────────
console.log('\n=== 2. Duplicate Control Slugs ===');
const slugCounts = {};
for (const c of library.controls) {
  slugCounts[c.slug] = (slugCounts[c.slug] || 0) + 1;
}
const dupes = Object.entries(slugCounts).filter(([, n]) => n > 1);
if (dupes.length === 0) {
  ok(`No duplicate slugs among ${library.controls.length} controls`);
} else {
  for (const [slug, count] of dupes) {
    bad(`Duplicate control slug: "${slug}" appears ${count} times`);
  }
}

// ──────────────────────────────────────────────
// 4. controlSlugs in artifacts resolve
// ──────────────────────────────────────────────
console.log('\n=== 3. Artifact controlSlugs Resolution ===');
let artControlOk = 0;
let artControlBad = 0;
for (const cat of inventory.categories || []) {
  for (const a of cat.artifacts || []) {
    for (const cs of a.controlSlugs || []) {
      if (controlSlugs.has(cs)) {
        artControlOk++;
      } else {
        bad(`Artifact "${a.id}" references unknown control slug: "${cs}"`);
        artControlBad++;
      }
    }
  }
}
if (artControlBad === 0) {
  ok(`All ${artControlOk} artifact -> control references resolve`);
}

// ──────────────────────────────────────────────
// 5. controlSlugs in evidence resolve
// ──────────────────────────────────────────────
console.log('\n=== 4. Evidence controlSlug Resolution ===');
let evControlOk = 0;
let evControlBad = 0;
for (const grp of evidenceData.evidence || []) {
  if (grp.controlSlug) {
    if (controlSlugs.has(grp.controlSlug)) {
      evControlOk++;
    } else {
      bad(`Evidence group references unknown control slug: "${grp.controlSlug}"`);
      evControlBad++;
    }
  }
}
if (evControlBad === 0) {
  ok(`All ${evControlOk} evidence -> control references resolve`);
}

// ──────────────────────────────────────────────
// 6. artifactSlugs in evidence resolve
// ──────────────────────────────────────────────
console.log('\n=== 5. Evidence artifactSlugs Resolution ===');
let evArtOk = 0;
let evArtBad = 0;
for (const grp of evidenceData.evidence || []) {
  for (const item of grp.items || []) {
    for (const aSlug of item.artifactSlugs || []) {
      if (artifactIds.has(aSlug)) {
        evArtOk++;
      } else {
        bad(`Evidence item "${item.id}" references unknown artifact: "${aSlug}"`);
        evArtBad++;
      }
    }
  }
}
if (evArtBad === 0) {
  ok(`All ${evArtOk} evidence -> artifact references resolve`);
}

// ──────────────────────────────────────────────
// 7. Risk register math
// ──────────────────────────────────────────────
console.log('\n=== 6. Risk Register Math ===');
const registerPath = path.join(root, 'risk-management/risk-register.json');
if (fs.existsSync(registerPath)) {
  const register = loadJSON(registerPath);
  let mathOk = 0;
  for (const r of register.risks || []) {
    // inherentRisk = likelihood * impact
    const expectedInherent = r.likelihood * r.impact;
    if (r.inherentRisk !== expectedInherent) {
      bad(`${r.id}: inherentRisk ${r.inherentRisk} != likelihood(${r.likelihood}) * impact(${r.impact}) = ${expectedInherent}`);
    } else {
      mathOk++;
    }

    // residualRisk = residualLikelihood * residualImpact
    const expectedResidual = r.residualLikelihood * r.residualImpact;
    if (r.residualRisk !== expectedResidual) {
      bad(`${r.id}: residualRisk ${r.residualRisk} != residualLikelihood(${r.residualLikelihood}) * residualImpact(${r.residualImpact}) = ${expectedResidual}`);
    } else {
      mathOk++;
    }
  }
  if (mathOk === (register.risks || []).length * 2) {
    ok(`All ${register.risks.length} risks pass math checks (inherent + residual)`);
  }
} else {
  warning('risk-management/risk-register.json not found');
}

// ──────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────
console.log('\n=== Summary ===');
console.log(`  PASS: ${pass}`);
console.log(`  FAIL: ${fail}`);
console.log(`  WARN: ${warn}`);
console.log('');

if (fail > 0) {
  console.log('Validation FAILED');
  process.exit(1);
} else {
  console.log('Validation PASSED');
  process.exit(0);
}
