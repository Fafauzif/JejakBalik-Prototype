# Requirement traceability

All rows are required unless the row explicitly provides an allowed fallback. Evidence here describes future verification, not checks already performed on an app.

| ID | Requirement | Specification | Expected evidence |
|---|---|---|---|
| R01 | Identity and final-service experience | [BUILD_PROMPT.md](BUILD_PROMPT.md) | Opening, copy audit |
| R02 | ChatGPT Work / Codex execution; GitHub/Vercel handoff | [05-engineering/VERCEL_DEPLOYMENT.md](05-engineering/VERCEL_DEPLOYMENT.md) | Clean build and archive root |
| R03 | No runtime AI calls or keys | [05-engineering/ARCHITECTURE.md](05-engineering/ARCHITECTURE.md) | Network/config inspection |
| R04 | Immediate entry; no login or camera barrier | [01-product/HOUSEHOLD_FLOW.md](01-product/HOUSEHOLD_FLOW.md) | Permission-free mobile flow |
| R05 | City-wide fictional Jakarta composition | [03-world/CITY_ART_DIRECTION.md](03-world/CITY_ART_DIRECTION.md) | Opening desktop/mobile screenshots |
| R06 | Three-dimensional city interaction and route movement | [01-product/TWIN_WORKFLOWS.md](01-product/TWIN_WORKFLOWS.md) | Selection/follow/seek checks |
| R07 | Hub cutaway and meaningful station queues | [03-world/HUB_CUTAWAY.md](03-world/HUB_CUTAWAY.md) | Receipt/triage/routing inspection |
| R08 | All ten device categories, including bulky items | [03-world/ASSET_INSPECTION.md](03-world/ASSET_INSPECTION.md) | Category-by-category inspection |
| R09 | Rotatable device and exploded components | [03-world/ASSET_INSPECTION.md](03-world/ASSET_INSPECTION.md) | Repeated explode/reset and mobile test |
| R10 | Dedicated seven-agent workspace | [01-product/AGENT_STUDIO.md](01-product/AGENT_STUDIO.md) | All agents/artifacts selectable |
| R11 | Actual GPT Image character generation and integration | [02-design/IMAGEGEN_BRIEF.md](02-design/IMAGEGEN_BRIEF.md) | Generation records plus shipped assets/browser view |
| R12 | Concrete agent handoff artifacts and rationale | [01-product/AGENT_STUDIO.md](01-product/AGENT_STUDIO.md) | Artifact-to-entity links |
| R13 | Human safety and data-release gates | [04-simulation/ENGINE_RULES.md](04-simulation/ENGINE_RULES.md) | Approval/hold/seek tests |
| R14 | Complete household registration, tracking, outcome | [01-product/HOUSEHOLD_FLOW.md](01-product/HOUSEHOLD_FLOW.md) | End-to-end request test |
| R15 | Shared state across every role and view | [05-engineering/ARCHITECTURE.md](05-engineering/ARCHITECTURE.md) | Cross-workspace ID/status assertions |
| R16 | Three-minute interactive guided story | [01-product/JUDGE_JOURNEY.md](01-product/JUDGE_JOURNEY.md) | 180-second active timeline and checkpoints |
| R17 | Free exploration and return to guided mode | [04-simulation/TIME_REPLAY.md](04-simulation/TIME_REPLAY.md) | Pause/explore/return/reset |
| R18 | Three authored scenarios | [04-simulation/SCENARIOS.md](04-simulation/SCENARIOS.md) | All scenario positive/held branches |
| R19 | Bounded additional requests and capacity settings | [04-simulation/ENGINE_RULES.md](04-simulation/ENGINE_RULES.md) | Local addition/deferral tests |
| R20 | One clock, deterministic replay, no duplicate custody | [04-simulation/TIME_REPLAY.md](04-simulation/TIME_REPLAY.md) | Seek/replay invariants |
| R21 | Warm light professional/fun consistent design | [02-design/DESIGN.md](02-design/DESIGN.md) | Actual multi-screen visual audit |
| R22 | Shared typography, spacing, controls, semantic colors | [02-design/DESIGN_TOKENS.json](02-design/DESIGN_TOKENS.json) | Component and guide parity |
| R23 | Indonesian default and full English toggle | [08-content/COPY_ID.json](08-content/COPY_ID.json) | Dictionary parity and rendered English audit |
| R24 | Full mobile Household, Twin, Team | [02-design/MOBILE_SPEC.md](02-design/MOBILE_SPEC.md) | 360/390/768 viewport workflow tests |
| R25 | Touch and keyboard alternatives | [02-design/ACCESSIBILITY.md](02-design/ACCESSIBILITY.md) | Keyboard and touch exploration |
| R26 | Reduced motion and WebGL recovery | [02-design/ACCESSIBILITY.md](02-design/ACCESSIBILITY.md) | Reduced-motion/context failure checks |
| R27 | 30 FPS target, 8 GB integrated graphics, 1080p | [05-engineering/PERFORMANCE_BUDGETS.md](05-engineering/PERFORMANCE_BUDGETS.md) | Measured environment/performance record |
| R28 | Instancing, lazy scenes, quality adaptation | [03-world/GRAPHICS_PIPELINE.md](03-world/GRAPHICS_PIPELINE.md) | Profile and scene-switch/resource check |
| R29 | Build-time modeling tool freedom | [03-world/GRAPHICS_PIPELINE.md](03-world/GRAPHICS_PIPELINE.md) | Actual asset provenance |
| R30 | Free standard household pickup and partner-operated model | [01-product/BUSINESS_IMPACT.md](01-product/BUSINESS_IMPACT.md) | Copy and funding logic |
| R31 | Real-organization research or authorized fictional fallback | [08-content/PARTNER_POLICY.md](08-content/PARTNER_POLICY.md) | Identity/provenance audit |
| R32 | Equal-work dedicated-trip comparison | [04-simulation/METRIC_DICTIONARY.md](04-simulation/METRIC_DICTIONARY.md) | Route/baseline cohort reconciliation |
| R33 | Costs, funding, recovered-value share, batch contribution | [01-product/BUSINESS_IMPACT.md](01-product/BUSINESS_IMPACT.md) | Recomputed financial fixture values |
| R34 | Readable report, CSV, JSON and persistence | [05-engineering/PERSISTENCE_EXPORTS.md](05-engineering/PERSISTENCE_EXPORTS.md) | Download/reopen/round-trip checks |
| R35 | 18 genuine curated references with specific borrowing jobs | [09-reference-images/REFERENCE_INDEX.md](09-reference-images/REFERENCE_INDEX.md) | Image and hash verification |
| R36 | Requested Taste resource | [07-tooling/BOOTSTRAP.md](07-tooling/BOOTSTRAP.md) | Bundled relevant skill/source/provenance |
| R37 | Requested Vercel web-design guidelines | [07-tooling/BOOTSTRAP.md](07-tooling/BOOTSTRAP.md) | Skill and underlying guideline audit |
| R38 | Requested awesome-design-md resource | [07-tooling/BOOTSTRAP.md](07-tooling/BOOTSTRAP.md) | Shopify/Stripe source snapshots |
| R39 | Requested Microsoft playwright-cli resource | [07-tooling/BOOTSTRAP.md](07-tooling/BOOTSTRAP.md) | Skill, references, and actual-use record |
| R40 | Rigorous review, independent critic if available, max four rounds | [06-quality/REVIEW_AND_REVISION.md](06-quality/REVIEW_AND_REVISION.md) | Actual private review record |
| R41 | Five scored dimensions, ≥8.5 target, no score inflation | [06-quality/REVIEW_AND_REVISION.md](06-quality/REVIEW_AND_REVISION.md) | Evidence-backed review judgment |
| R42 | Natural precise writing and no drafting residue | [02-design/PRODUCT_COPY.md](02-design/PRODUCT_COPY.md) | Copy/placeholder audit |
| R43 | No fake data, sources, partnerships, approvals, certificates | [02-design/PRODUCT_COPY.md](02-design/PRODUCT_COPY.md) | Provenance/certificate audit |
| R44 | Original vector logo and practical logo pack | [02-design/BRAND_ASSETS.md](02-design/BRAND_ASSETS.md) | SVG/export/open checks |
| R45 | Editable 16-slide brand guide PPTX | [02-design/BRAND_GUIDE_STORYBOARD.md](02-design/BRAND_GUIDE_STORYBOARD.md) | Editability and page-by-page rendering |
| R46 | Matching brand-guide PDF | [02-design/BRAND_GUIDE_STORYBOARD.md](02-design/BRAND_GUIDE_STORYBOARD.md) | PDF/PPTX content and visual parity |
| R47 | Complete source ZIP with package.json at root | [12-delivery/DELIVERABLES.md](12-delivery/DELIVERABLES.md) | Extract and inspect exact archive |
| R48 | Current master and full original context included | [MASTER_CONTEXT.md](MASTER_CONTEXT.md) | Source/master presence and precedence |
| R49 | Builder updates master from actual result | [12-delivery/MASTER_CONTEXT_UPDATE.md](12-delivery/MASTER_CONTEXT_UPDATE.md) | Actual paths/checks/gaps reconciled |
| R50 | Updated master returned as fifth separate output | [12-delivery/DELIVERABLES.md](12-delivery/DELIVERABLES.md) | Five-file final output manifest |
| R51 | No unapproved external publication/outreach | [05-engineering/VERCEL_DEPLOYMENT.md](05-engineering/VERCEL_DEPLOYMENT.md) | Scope and handoff audit |
| R52 | Complete first attempt, revision, affected regression checks | [06-quality/REVIEW_AND_REVISION.md](06-quality/REVIEW_AND_REVISION.md) | Actual verification evidence |
