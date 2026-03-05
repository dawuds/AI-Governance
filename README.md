# AI Governance Explorer

Multi-framework AI governance reference platform covering 11 international frameworks, with Malaysia's National Guidelines on AI Governance and Ethics (NGAIGE) as the anchor framework.

**Live site:** [dawuds.github.io/AI-Governance](https://dawuds.github.io/AI-Governance/)

## Frameworks Covered

### Tier 1 — Full Extraction
| Framework | Jurisdiction | Type | Binding | Primary Units |
|-----------|-------------|------|---------|--------------|
| Malaysia NGAIGE | MY | Guidelines | No | 7 principles |
| EU AI Act | EU | Legislation | Yes | 113 articles |
| NIST AI RMF 1.0 | US | Framework | No | ~72 subcategories |
| ISO/IEC 42001:2023 | International | Standard | No | 10 clauses + Annex A |
| Singapore MAIGF | SG | Framework | No | Principles + Agentic AI |
| OECD AI Principles | International | Recommendation | No | 10 principles |
| UNESCO AI Ethics | International | Recommendation | No | 4 values, 10 policy areas |

### Tier 2 — Summary
| Framework | Jurisdiction | Type |
|-----------|-------------|------|
| China GenAI Interim Measures | CN | Legislation |
| UK AI White Paper | UK | Framework |
| US AI Policy (EO 14179) | US | Executive Order |
| Canada AIDA | CA | Proposed Legislation |

## Architecture

8-layer data architecture:

| Layer | Directory | Description |
|-------|-----------|-------------|
| 1 | `frameworks/` | Source text per framework |
| 2 | `controls/` | Unified control library (22 controls, 11 domains) |
| 3 | `requirements/` | Per-control requirements (legal/technical/governance) — all 22 controls |
| 4 | `evidence/` | Per-control evidence items — all 22 controls |
| 5 | `artifacts/` | Compliance artifacts with control mapping (28 artifacts, 8 categories) |
| 6 | `risk-taxonomy/` | AI risk domains + framework coverage matrix |
| 7 | `risk-management/` | Risk methodology, register (20 risks), checklist, treatment options |
| 8 | `crosswalks/` | Cross-framework mappings + gap analysis |

## Repository Structure

```
AI-Governance/
├── index.html                    # SPA shell
├── app.js                        # Application logic
├── style.css                     # Styles
├── frameworks/                   # Layer 1: Framework source text
│   ├── index.json                # All 11 framework metadata
│   ├── malaysia-ngaige/          # 7 principles (full depth)
│   ├── eu-ai-act/                # 113 articles, chapters, annexes
│   ├── nist-ai-rmf/              # 4 functions, subcategories
│   ├── iso-42001/                # Clauses + Annex A (constructed-indicative)
│   ├── singapore-maigf/          # Principles + Agentic AI
│   ├── oecd-ai-principles/       # 10 principles
│   ├── unesco-ai-ethics/         # Values + policy areas
│   ├── china-genai/              # Summary
│   ├── uk-ai-framework/          # Summary
│   ├── us-ai-policy/             # Summary
│   └── canada-ai/                # Summary
├── controls/                     # Layer 2: Unified control library
│   ├── library.json              # 22 controls grouped by domain
│   ├── domains.json              # 11 domain definitions
│   └── framework-map.json        # Bidirectional control <-> framework
├── requirements/                 # Layer 3: Per-control requirements
│   └── index.json                # 22 controls x 3 requirement types
├── evidence/                     # Layer 4: Per-control evidence
│   └── index.json                # 22 controls, 78 evidence items
├── artifacts/                    # Layer 5: Compliance artifacts
│   └── inventory.json            # 28 artifacts across 8 categories
├── risk-taxonomy/                # Layer 6: AI risk domains
│   ├── categories.json           # Risk domain taxonomy
│   ├── framework-coverage.json   # Framework risk coverage matrix
│   └── use-cases.json            # High-risk AI use cases
├── risk-management/              # Layer 7: Risk management
│   ├── methodology.json          # AI-specific risk assessment methodology
│   ├── risk-matrix.json          # 5x5 likelihood x impact matrix
│   ├── risk-register.json        # 20 AI governance risks across 7 categories
│   ├── checklist.json            # 18-item risk assessment checklist
│   └── treatment-options.json    # 4 treatment strategies with AI examples
├── crosswalks/                   # Layer 8: Cross-framework mappings
│   └── malaysia-international.json
└── penalties/                    # Enforcement penalties
    └── index.json
```

## Tech Stack

Vanilla HTML/CSS/JS single-page application deployed on GitHub Pages. No build step, no framework dependencies.

- Hash-based routing with lazy-loaded JSON data
- Responsive design with Inter + JetBrains Mono fonts
- Same architectural pattern as [RMIT Explorer](https://github.com/dawuds/RMIT), [PDPA-MY Explorer](https://github.com/dawuds/pdpa-my), [NACSA Explorer](https://github.com/dawuds/nacsa)

## Implementation Status

- [x] Phase 1: Repo setup + Malaysia NGAIGE + initial controls + SPA
- [x] Phase 2: EU AI Act (113 articles) + penalties + first crosswalk
- [x] Phase 3: NIST AI RMF + ISO 42001 + trilateral crosswalk
- [x] Phase 4: Regional frameworks + risk taxonomy
- [x] Phase 5: Tier 2 frameworks + requirements/evidence/artifacts + polish
- [x] Phase 6: Risk management section + complete control coverage (22/22 controls with requirements, evidence, and artifacts)
