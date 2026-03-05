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
