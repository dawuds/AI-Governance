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

7-layer data architecture:

| Layer | Directory | Description |
|-------|-----------|-------------|
| 1 | `frameworks/` | Source text per framework |
| 2 | `controls/` | Unified control library (~75 controls, 11 domains) |
| 3 | `requirements/` | Per-control requirements (legal/technical/governance) |
| 4 | `evidence/` | Per-control evidence items |
| 5 | `artifacts/` | Compliance artifacts with control mapping |
| 6 | `risk-taxonomy/` | AI risk domains + framework coverage matrix |
| 7 | `crosswalks/` | Cross-framework mappings + gap analysis |

## Repository Structure

```
AI-Governance/
├── index.html                    # SPA shell
├── app.js                        # Application logic (~2000 lines)
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
│   ├── library.json              # ~75 controls grouped by domain
│   ├── domains.json              # 11 domain definitions
│   └── framework-map.json        # Bidirectional control ↔ framework
├── requirements/                 # Layer 3: Per-control requirements
├── evidence/                     # Layer 4: Per-control evidence
├── artifacts/                    # Layer 5: Compliance artifacts
├── risk-taxonomy/                # Layer 6: AI risk domains
├── crosswalks/                   # Layer 7: Cross-framework mappings
└── penalties/                    # Enforcement penalties
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
