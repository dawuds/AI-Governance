# AI Governance Explorer: Compliance & Strategy Base

Multi-framework AI governance reference platform covering 11 international frameworks, with Malaysia's National Guidelines on AI Governance and Ethics (NGAIGE) as the anchor framework.

**Live site:** [dawuds.github.io/AI-Governance](https://dawuds.github.io/AI-Governance/)

---

## ⚖️ One Goal, Two Perspectives

This repository is structured to serve both the **Compliance Auditor** and the **Strategic Decision-Maker**.

| **Track 1: Compliance-as-Code** | **Track 2: The Critical Lens (Gemini-AI)** |
|:--- |:--- |
| **Focus:** Mapping controls (EU AI Act, NIST, ISO) and automated compliance validation. | **Focus:** Analyzing "Governance Theater," regulatory capture, and the systemic risks of checklist-based policy. |
| [frameworks/](frameworks/) — Layer 1 Source Text | [EXECUTIVE_SUMMARY_GOVERNANCE.md](EXECUTIVE_SUMMARY_GOVERNANCE.md) |
| [controls/](controls/) — Layer 2 Unified Library | [doc-perspectives/governance-theater.md](doc-perspectives/governance-theater.md) |
| [risk-management/](risk-management/) — Layer 7 Operational Tools | [doc-perspectives/regulatory-capture-risk.md](doc-perspectives/regulatory-capture-risk.md) |
| [crosswalks/](crosswalks/) — Layer 8 Global Alignment | [doc-perspectives/ethical-imperialism.md](doc-perspectives/ethical-imperialism.md) |

---

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

9-layer data architecture (Layers 1-8 Operational, Layer 9 Strategic):

| Layer | Directory | Description |
|-------|-----------|-------------|
| 1 | `frameworks/` | Source text per framework |
| 2 | `controls/` | Unified control library (22 controls, 11 domains) |
| 3 | `requirements/` | Per-control requirements (legal/technical/governance) |
| 4 | `evidence/` | Per-control evidence items (76 items) |
| 5 | `artifacts/` | Compliance artifacts with control mapping |
| 6 | `risk-taxonomy/` | AI risk domains + framework coverage matrix |
| 7 | `risk-management/` | Risk methodology, register, checklist, treatment options |
| 8 | `crosswalks/` | Cross-framework mappings + gap analysis |
| **9** | **`doc-perspectives/`** | **Strategic Analysis: Critical perspectives on AI policy** |

## Repository Structure

```
AI-Governance/
├── index.html                    # SPA shell
├── app.js                        # Application logic
├── style.css                     # Styles
├── validate.js                   # Data validation script
├── LICENSE                       # CC-BY-4.0
├── CHANGELOG.md                  # Change Tracker
├── EXECUTIVE_SUMMARY_GOVERNANCE.md # Strategic Overview (Track 2)
├── doc-perspectives/             # Track 2: Critical Perspectives
│   ├── governance-theater.md     # Why checklists can hide actual risk
│   ├── regulatory-capture-risk.md # How compliance creates "Moats"
│   ├── ethical-imperialism.md    # Global standards vs. local values
│   └── active-vs-passive-governance.md # Telemetry vs. Checklists
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
│   └── index.json                # 22 controls, 76 evidence items
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
│   ├── malaysia-international.json
│   ├── eu-nist-iso.json
│   ├── gap-analysis.json
│   └── global-comparison.json
└── penalties/                    # Enforcement penalties
    └── index.json
```

## Features

- 11 frameworks (7 Tier 1 full extraction + 4 Tier 2 summary)
- 22 unified controls across 11 governance domains with full requirements, evidence, and artifact mapping
- **Strategic Critical Track**: Analysis of systemic risks like Governance Theater, Regulatory Capture, and Ethical Imperialism.
- 76 evidence items with audit guidance (whatGoodLooksLike, commonGaps)
- 28 compliance artifacts across 8 categories with control-slug mapping
- 20 AI governance risks across 7 categories with 5x5 risk matrix
- Enforcement penalties view (EU AI Act, Malaysia NGAIGE)
- 4 cross-framework crosswalks with gap analysis and global comparison
- Audit Package UI on control detail views (artifacts + evidence checklist)
- Risk Management section (methodology, matrix, register, checklist, treatment options)
- Dark mode toggle
- Data validation script (`validate.js`)
- CC-BY-4.0 license

## Tech Stack

Vanilla HTML/CSS/JS single-page application deployed on GitHub Pages. No build step, no framework dependencies.

- Hash-based routing with lazy-loaded JSON data
- Responsive design with Inter + JetBrains Mono fonts
- Same architectural pattern as [RMIT Explorer](https://github.com/dawuds/RMIT), [PDPA-MY Explorer](https://github.com/dawuds/pdpa-my), [NACSA Explorer](https://github.com/dawuds/nacsa)

## 📈 Latest Updates

- **v1.2.0 (2026-03-08)**: Pivoted to **Dual-Track Architecture**. Added the **Critical Lens (Track 2)**, featuring strategic analysis on Governance Theater, Regulatory Capture, and Ethical Imperialism. See the [CHANGELOG.md](CHANGELOG.md) for full details.

---

## License & Acknowledgments

This is a research knowledge base and compliance platform. All content is original synthesis; source materials are cited inline in the respective documents. This repository includes autonomous AI contributions from **Gemini CLI** (Track 2: The Critical Lens).
