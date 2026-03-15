#!/usr/bin/env node
/**
 * validate.js — AI Governance data integrity validator
 *
 * Checks:
 *   1.  All JSON files parse without errors
 *   2.  Controls library — slug uniqueness and required fields
 *   3.  Controls library — domain coverage
 *   4.  Artifact controlSlug cross-references
 *   5.  Evidence controlSlug cross-references
 *   6.  Framework-map and control-map consistency
 *   7.  Risk register math
 *   8.  No empty arrays or empty strings where data is expected
 *   9.  Domain slug consistency (domains.json vs library.json)
 *   10. Crosswalk and sector file integrity
 *
 * Usage: node validate.js [--verbose]
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const REPO_ROOT = __dirname;
const verbose   = process.argv.includes('--verbose');

let pass = 0;
let fail = 0;
let warn = 0;

function ok(msg)      { pass++; if (verbose) console.log(`  PASS  ${msg}`); }
function bad(msg)     { fail++; console.log(`  FAIL  ${msg}`); }
function warning(msg) { warn++; console.log(`  WARN  ${msg}`); }

function loadJson(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    return null;
  }
}

// ── 1. JSON Parse Check ─────────────────────────────────────────────

console.log('\n=== 1. JSON Parse Check ===');

function findJsonFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...findJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(path.relative(REPO_ROOT, full));
    }
  }
  return results;
}

const jsonFiles = findJsonFiles(REPO_ROOT);
const parsed = {};
let parseErrors = 0;

for (const file of jsonFiles) {
  try {
    parsed[file] = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'));
    ok(`Parsed: ${file}`);
  } catch (e) {
    bad(`JSON parse error: ${file} — ${e.message}`);
    parseErrors++;
  }
}

if (parseErrors === 0) {
  ok(`All ${jsonFiles.length} JSON files parse correctly`);
}

// ── Load core data ──────────────────────────────────────────────────

const controlsLib   = loadJson('controls/library.json');
const domainsFile   = loadJson('controls/domains.json');
const artifactsInv  = loadJson('artifacts/inventory.json');
const controlMap    = loadJson('artifacts/control-map.json');
const frameworkMap  = loadJson('controls/framework-map.json');
const evidence      = loadJson('evidence/index.json');
const requirements  = loadJson('requirements/index.json');
const riskRegister  = loadJson('risk-management/risk-register.json');

// Build control slug set
const libraryControls = (controlsLib && controlsLib.controls) || [];
const controlSlugSet = new Set(libraryControls.map(c => c.slug).filter(Boolean));

// Build domain slug set from domains.json
const libraryDomains = (domainsFile && domainsFile.domains) || [];
const domainSlugSet = new Set(libraryDomains.map(d => d.slug).filter(Boolean));

// Build artifact slug/id set from inventory.json (categories array with nested artifacts)
const allArtifacts = [];
if (artifactsInv && artifactsInv.categories && Array.isArray(artifactsInv.categories)) {
  for (const cat of artifactsInv.categories) {
    if (cat.artifacts && Array.isArray(cat.artifacts)) {
      allArtifacts.push(...cat.artifacts);
    }
  }
}
if (artifactsInv && artifactsInv.gold_standard && Array.isArray(artifactsInv.gold_standard)) {
  for (const cat of artifactsInv.gold_standard) {
    if (cat.artifacts && Array.isArray(cat.artifacts)) {
      allArtifacts.push(...cat.artifacts);
    }
  }
}
const artifactSlugSet = new Set(allArtifacts.map(a => a.slug || a.id).filter(Boolean));

// ── 2. Controls Library — Slug Uniqueness & Required Fields ─────────

console.log('\n=== 2. Control Slug Uniqueness & Required Fields ===');

const slugCounts = {};
for (const ctrl of libraryControls) {
  if (!ctrl.slug) {
    bad(`Control missing "slug": ${(ctrl.name || '').slice(0, 60)}`);
  } else {
    slugCounts[ctrl.slug] = (slugCounts[ctrl.slug] || 0) + 1;
  }
  if (!ctrl.name || ctrl.name.trim() === '') {
    bad(`Control "${ctrl.slug}" has empty or missing "name"`);
  }
  if (!ctrl.domain) {
    bad(`Control "${ctrl.slug}" missing "domain" field`);
  }
}

const duplicates = Object.entries(slugCounts).filter(([, c]) => c > 1);
if (duplicates.length === 0) {
  ok(`No duplicate control slugs (${libraryControls.length} controls)`);
} else {
  for (const [slug, count] of duplicates) {
    bad(`Duplicate control slug "${slug}" appears ${count} times`);
  }
}

// ── 3. Controls Library — Domain Coverage ────────────────────────────

console.log('\n=== 3. Controls Library — Domain Coverage ===');

const controlsByDomain = {};
for (const ctrl of libraryControls) {
  if (ctrl.domain) {
    controlsByDomain[ctrl.domain] = (controlsByDomain[ctrl.domain] || 0) + 1;
  }
}

for (const dom of libraryDomains) {
  if (!controlsByDomain[dom.slug]) {
    bad(`Domain "${dom.slug}" has zero controls in library.json`);
  } else {
    ok(`Domain "${dom.slug}" has ${controlsByDomain[dom.slug]} control(s)`);
  }
}

// Check control domain references point to valid domains
let domainRefErrors = 0;
for (const ctrl of libraryControls) {
  if (ctrl.domain && domainSlugSet.size > 0 && !domainSlugSet.has(ctrl.domain)) {
    bad(`Control "${ctrl.slug}" references unknown domain "${ctrl.domain}"`);
    domainRefErrors++;
  }
}
if (domainRefErrors === 0 && libraryControls.length > 0) {
  ok(`All ${libraryControls.length} controls reference valid domains`);
}

// ── 4. Artifact controlSlug Cross-References ─────────────────────────

console.log('\n=== 4. Artifact controlSlug Cross-References ===');

if (controlMap && controlMap.artifactToControls) {
  let mapErrors = 0;
  let total = 0;
  for (const [artSlug, ctrlSlugs] of Object.entries(controlMap.artifactToControls)) {
    if (Array.isArray(ctrlSlugs)) {
      for (const slug of ctrlSlugs) {
        total++;
        if (!controlSlugSet.has(slug)) {
          bad(`control-map: artifact "${artSlug}" references unknown control "${slug}"`);
          mapErrors++;
        }
      }
    }
  }
  if (mapErrors === 0) {
    ok(`All ${total} artifact-to-control references resolve correctly`);
  }
} else {
  ok('No artifact-to-control map found (skipping)');
}

// ── 5. Evidence controlSlug Cross-References ─────────────────────────

console.log('\n=== 5. Evidence controlSlug Cross-References ===');

let evidenceSlugErrors = 0;
let evidenceSlugTotal = 0;

if (evidence && evidence.evidence && Array.isArray(evidence.evidence)) {
  for (const entry of evidence.evidence) {
    if (entry.controlSlug) {
      evidenceSlugTotal++;
      if (!controlSlugSet.has(entry.controlSlug)) {
        bad(`Evidence entry references unknown controlSlug "${entry.controlSlug}"`);
        evidenceSlugErrors++;
      }
    }
  }
}

if (evidenceSlugErrors === 0) {
  ok(`All ${evidenceSlugTotal} evidence controlSlug references resolve correctly`);
}

// ── 6. Framework-Map & Control-Map Consistency ───────────────────────

console.log('\n=== 6. Framework-Map & Control-Map Consistency ===');

if (frameworkMap && frameworkMap.controlToFrameworks) {
  let fmapErrors = 0;
  for (const slug of Object.keys(frameworkMap.controlToFrameworks)) {
    if (!controlSlugSet.has(slug)) {
      bad(`framework-map: unknown control slug "${slug}"`);
      fmapErrors++;
    }
  }
  if (fmapErrors === 0) {
    ok(`All ${Object.keys(frameworkMap.controlToFrameworks).length} framework-map control references resolve`);
  }
}

if (controlMap && controlMap.controlToArtifacts) {
  let cmapErrors = 0;
  for (const slug of Object.keys(controlMap.controlToArtifacts)) {
    if (!controlSlugSet.has(slug)) {
      bad(`control-map: unknown control slug "${slug}"`);
      cmapErrors++;
    }
  }
  if (cmapErrors === 0) {
    ok(`All ${Object.keys(controlMap.controlToArtifacts).length} control-to-artifact references resolve`);
  }
}

// ── 7. Risk Register Math ────────────────────────────────────────────

console.log('\n=== 7. Risk Register Math ===');

if (riskRegister && riskRegister.risks) {
  let mathErrors = 0;
  for (const risk of riskRegister.risks) {
    if (risk.likelihood != null && risk.impact != null && risk.inherentRisk != null) {
      const expected = risk.likelihood * risk.impact;
      if (risk.inherentRisk !== expected) {
        bad(`${risk.id}: inherentRisk ${risk.inherentRisk} != ${risk.likelihood} x ${risk.impact} = ${expected}`);
        mathErrors++;
      }
    }
    if (risk.residualLikelihood != null && risk.residualImpact != null && risk.residualRisk != null) {
      const expected = risk.residualLikelihood * risk.residualImpact;
      if (risk.residualRisk !== expected) {
        bad(`${risk.id}: residualRisk ${risk.residualRisk} != ${risk.residualLikelihood} x ${risk.residualImpact} = ${expected}`);
        mathErrors++;
      }
    }
  }
  if (mathErrors === 0) {
    ok(`All ${riskRegister.risks.length} risk register entries have correct math`);
  }
} else {
  ok('No risk register with risks array found (skipping)');
}

// ── 8. Data Completeness ─────────────────────────────────────────────

console.log('\n=== 8. Data Completeness ===');

let emptyIssues = 0;

for (const ctrl of libraryControls) {
  if (ctrl.description && ctrl.description.trim() === '') {
    bad(`Control "${ctrl.slug}" has empty description`);
    emptyIssues++;
  }
  if (ctrl.slug && ctrl.slug.trim() === '') {
    bad('Control has empty slug');
    emptyIssues++;
  }
}

for (const artifact of allArtifacts) {
  if (artifact.name && artifact.name.trim() === '') {
    bad(`Artifact "${artifact.slug || artifact.id}" has empty name`);
    emptyIssues++;
  }
}

if (emptyIssues === 0) {
  ok('No empty strings detected in core data');
}

// ── 9. Crosswalk Integrity ───────────────────────────────────────────

console.log('\n=== 9. Crosswalk Integrity ===');

const crosswalkFiles = findJsonFiles(path.join(REPO_ROOT, 'crosswalks'));
for (const file of crosswalkFiles) {
  if (!parsed[file]) {
    bad(`Crosswalk file failed to load: ${file}`);
  } else {
    ok(`Crosswalk loaded: ${file}`);
  }
}

// ── 10. Unique IDs & Sector/Framework Integrity ─────────────────────

console.log('\n=== 10. Unique IDs & Sector/Framework Integrity ===');

if (evidence && evidence.evidence && Array.isArray(evidence.evidence)) {
  const seenSlugs = new Set();
  let dupCount = 0;
  for (const entry of evidence.evidence) {
    if (entry.controlSlug) {
      if (seenSlugs.has(entry.controlSlug)) {
        bad(`Duplicate evidence controlSlug "${entry.controlSlug}"`);
        dupCount++;
      }
      seenSlugs.add(entry.controlSlug);
    }
  }
  if (dupCount === 0) {
    ok(`All ${evidence.evidence.length} evidence entries have unique controlSlugs`);
  }
}

const sectorFiles = findJsonFiles(path.join(REPO_ROOT, 'sectors'));
const frameworkFiles = findJsonFiles(path.join(REPO_ROOT, 'frameworks'));
for (const file of [...sectorFiles, ...frameworkFiles]) {
  if (!parsed[file]) {
    bad(`File failed to load: ${file}`);
  } else {
    ok(`Loaded: ${file}`);
  }
}

// ── Summary ──────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log('Validation complete:');
console.log(`  Pass: ${pass}`);
console.log(`  Fail: ${fail}`);
console.log(`  Warn: ${warn}`);
console.log(`  Total: ${pass + fail + warn}`);
console.log('='.repeat(60));

if (fail > 0) {
  console.error(`\nValidation FAILED with ${fail} error(s).`);
  process.exit(1);
} else if (warn > 0) {
  console.log(`\nValidation passed with ${warn} warning(s).`);
  process.exit(0);
} else {
  console.log('\nAll checks passed.');
  process.exit(0);
}
