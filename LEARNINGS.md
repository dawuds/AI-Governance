# AI Governance Platform — Learnings

Observations, data quality findings, and design decisions captured during implementation.

## 1. Framework Data Quality

### Malaysia NGAIGE
- Source: Official MOSTI document (September 2024)
- 7 principles extracted at full depth
- Principles are high-level guidance without specific compliance obligations — mapped to controls via interpretation

### ISO/IEC 42001:2023
- Standard is paywalled (ISO paywall)
- All content marked `sourceType: "constructed-indicative"` — synthesized from publicly available summaries, not from the standard itself
- Users should verify against the purchased standard

## 2. Design Decisions

### Unified Controls as Primary Unit
- Controls are the central organizing concept, not frameworks
- Each control maps to multiple frameworks via `frameworkMappings`
- This enables cross-framework comparison without duplicating content

### 7-Layer Architecture
- Extended from the 5-layer pattern used in RMIT/PDPA-MY/NACSA repos
- Added Layer 6 (Risk Taxonomy) and Layer 7 (Crosswalks) for multi-framework support
- Layers 3-5 (requirements/evidence/artifacts) are per-control, not per-framework

### Tier System
- Tier 1: Full article/clause extraction — enables provision-level cross-referencing
- Tier 2: Summary with key provisions — sufficient for comparison but not drill-down

## 3. SPA Architecture

### Hash Routing
- 6 top-level tabs: Overview, Frameworks, Controls, Risk Taxonomy, Crosswalks, Search
- Drill-down views: `#framework/{id}`, `#control/{slug}`
- Same vanilla JS pattern as RMIT/PDPA-MY/NACSA — no build step, no framework

---

## 4. Audit Package — Best Practice Design Pattern

### What It Is

The "Audit Package" is a reusable UI component on the control detail view that links controls to their required artifacts and evidence items. It answers three questions an auditor asks when reviewing a control:

1. **What must I implement?** → Key Activities + Maturity Levels (existing)
2. **What documents must exist?** → Required Artifacts (new)
3. **How do I verify it works?** → Evidence Checklist (new)

### Architecture

```
Control (slug)
  └─ controlSlugs[] on artifacts → direct semantic mapping
       │
       ├─ artifacts/inventory.json → full artifact objects
       │    └─ each with keyContents[], mandatory flag
       │
       └─ evidence/index.json[slug] → evidenceItems[]
            └─ each with artifactSlugs[], whatGoodLooksLike[], commonGaps[]
```

**AI-Governance-specific join key:** Framework refs via `frameworkMappings` on each control. But artifacts and evidence use **direct `controlSlugs[]`** mapping, not framework-based joins.

### Why Direct Mapping Over Section-Based Joins

Section-based joins (via provision maps) explode on broad provisions. In the PDPA-MY repo, s6 (General Principle) mapped to 19 of 60 artifacts — producing 20 results for a single control. Direct `controlSlugs[]` on each artifact provides curated, semantically relevant mappings (median 2 per control, max 6).

**Rule of thumb:** If a join key can match >5 items, the join is too broad and needs direct curation.

### Implementation Checklist

1. Ensure the repo has `controls/`, `artifacts/`, `evidence/` directories with the standard structure
2. Add `controlSlugs[]` to each artifact in `artifacts/inventory.json` — curate 1-4 control slugs per artifact
3. Add `artifactSlugs[]` to each evidence item in `evidence/index.json` — link 1-2 artifact slugs per item
4. In `renderControlDetail()`, load artifacts + evidence data (use existing state cache)
5. Filter artifacts where `controlSlugs` includes the current control's slug
6. Filter evidence items by artifact overlap (evidence linked to artifacts that are linked to the control)
7. Sort artifacts mandatory-first
8. Render the Audit Package HTML using the shared CSS classes
9. Ensure nested accordion click handlers work (reuse existing `[data-accordion]` handler)

### UI Components (CSS classes — shared across all repos)

| Class | Purpose |
|-------|---------|
| `.audit-package` | Wrapper — accent top border, light blue background |
| `.audit-package-title` | "AUDIT PACKAGE" uppercase label |
| `.audit-package-summary` | "N artifacts required, M evidence items" |
| `.artifact-link-card` | Compact artifact card with hover |
| `.artifact-link-card-checklist` | Checkbox-styled keyContents list |
| `.evidence-checklist-item` | Evidence item card |
| `.evidence-good` | Green-bordered "What Good Looks Like" list |
| `.evidence-gap` | Red-bordered "Common Gaps" list |

### Design Decisions

- **Direct `controlSlugs[]` mapping chosen over framework-based joins:** Curated semantic mappings prevent broad framework refs from flooding results.
- **`artifactSlugs[]` on evidence items:** Evidence filtered by artifact overlap ensures only relevant evidence appears per control.
- **Mandatory artifacts sorted first:** Auditors prioritize mandatory items.
- **Evidence sub-accordions collapsed by default:** "What Good Looks Like" and "Common Gaps" are verbose — show on demand.
- **Checkbox-styled artifact contents:** Makes artifact cards feel like an auditor's checklist.

### Current State (AI-Governance)

The Audit Package pattern is **documented and data-ready** in this repo:

- `artifacts/inventory.json`: 16 artifacts with `controlSlugs[]` field (renamed from `controls[]` for cross-repo consistency)
- `evidence/index.json`: 10 evidence groups with all items enriched with `artifactSlugs[]`, `whatGoodLooksLike[]`, and `commonGaps[]` fields
- `controls/library.json`: 22 controls across 11 domains — structure ready
- `app.js`: Audit Package UI implemented in `renderControlDetail()` with accordion-based artifact table and evidence cards

**Fixed issues:**
- **6 control slug mismatches resolved** — all files (inventory, evidence, requirements, control-map) now use canonical slugs from `controls/library.json`:
  - `incident-response-ai` changed to `ai-incident-response`
  - `bias-testing-mitigation` changed to `bias-detection-mitigation`
  - `human-oversight-mechanisms` changed to `human-oversight-mechanism`
  - `transparency-disclosure` changed to `ai-transparency-disclosure`
  - `fundamental-rights-impact` changed to `human-rights-impact`
  - `training-data-governance` changed to `data-quality-governance`
- Artifact field renamed from `controls[]` to `controlSlugs[]` across all 16 artifacts
- All 40 evidence items now have `artifactSlugs[]` linking 1-2 relevant artifacts, plus `whatGoodLooksLike[]` (2-3 bullets) and `commonGaps[]` (2-3 bullets)

**Remaining work:**
- Only 10 of 22 controls have requirements/evidence/artifacts populated
- `app.js` Audit Package rendering code not yet implemented

### Reference Implementation

See `dawuds/pdpa-my` repo — `app.js` `renderControlDetail()` and `style.css` Audit Package section. Pattern is designed for copy-adapt across all compliance repos.
