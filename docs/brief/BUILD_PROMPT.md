# Build Jejak Balik

## Assignment

Implement, inspect, improve, and package the full application and all five deliverables listed in START_HERE. Work until the result is concrete and reviewable. The approved goal is a convincing experience of the final service, with substantial interactive 3D, useful operational views, expressive agent teammates, and a complete mobile experience. An impressive opening scene is necessary but not sufficient: the lifecycle, interactions, responsive layouts, characters, exports, and brand system must all be finished.

Use the supplied specifications and actual reference images. Resolve routine implementation and aesthetic choices independently. Preserve approved scope when recovering from tool or dependency problems. A large run is authorized; do not replace the result with a screenshot, one HTML mockup, partial scaffold, decorative dashboard, or a future-work list.

## Product premise

Jejak Balik is an asset-light circular reverse-logistics platform for household and community e-waste. Standard pickup is free to the household and scheduled into windows. Partner-operated backhaul, route-compatible collections, and grouped reverse routes feed a consolidation and triage hub. The platform tracks individual assets, capacity, custody, safety exceptions, downstream assignment, recovery outcomes, and batch economics. It does not own a recycling plant or carry out chemical processing.

The audience should feel: “If this idea existed today, this is how using it would feel.” Use confident, clear product copy and normal operational statuses. Put implementation details and evidence provenance in developer documentation and the updated master context. Do not decorate the interface with “prototype,” “PoC,” “hard-coded,” “validation needed,” “coming soon,” or simulated-partnership disclaimers. Do not invent real contracts, certificates, measurements, reviews, customer counts, or approvals.

## Non-negotiable experiences

- Immediate entry into Twin Studio; no sign-up, login wall, OTP, payment, permission request, or camera requirement. Role switching is instant. If an account affordance exists, it opens an already available sample profile.
- A broad fictional Jakarta city composition, with river, layered roads, skyline, distinct neighborhoods, purposeful active touchpoints, animated collection vehicles, selectable destinations, time controls, and smooth camera focus.
- Three inspection levels: city network, operational hub cutaway, and individual device inspection. The asset view includes rotation, meaningful major-component explosion, condition and data/safety flags, custody history, and final recovery pathway.
- A dedicated Agent Workspace inspired by the warm constellation reference: seven expressive characters, inspectable artifacts, readable statuses, animated handoff links, and a central operator. Use GPT Image to create original character art and immediately implement it. Do not leave emoji, generic avatar placeholders, or unused generated artwork.
- Complete Household flow: choose sample items/photos, review item information, provide a sample address, select a collection window, submit, track collection, and view the final outcome. All required actions can be completed without entering personal information or accessing a camera.
- Three authored scenarios: a complete circular collection day, a battery exception with a human review gate, and a capacity constraint resolved through regrouping or deferral.
- A three-minute guided journey with meaningful click checkpoints, pause/resume, skip narration, replay, and free exploration. User dwell at a checkpoint does not consume the 180-second active story timeline.
- One event/state model drives all views. Replay and seeking must not duplicate collected items, corrupt totals, bypass an approval, or lose selected entities.
- Full Indonesian interface and English toggle, including chart labels, dialogs, tooltips, reports, agent artifacts, device categories, dates, money, and accessibility names.
- Full mobile access to Household, Twin Studio, and Agent Workspace, including touch-friendly 3D and responsive inspectors. Mobile must be a useful product experience.
- Free household pickup, credible batch economics, recovery outcomes, an inspectable dedicated-trip comparison, and working report/data export.
- Warm light visual identity throughout. Consistent type, spacing, controls, shadows, semantic colors, charts, illustration, and motion. No dark theme is required.

## Technical direction

Use React, TypeScript, Vite, Three.js, React Three Fiber, Drei, Zustand, CSS Modules with CSS design tokens, Radix primitives where useful, Motion for interface movement, and i18next/react-i18next. Use Vitest for deterministic state/metric tests and Playwright for browser testing. The requested Microsoft Playwright CLI supports inspection and interaction when available.

The app is client-side with local fixtures and persistence. No AI API, maps API, authentication service, database, paid subscription, or server secret is needed. Verify compatible current dependency versions at build time; pin them in a lockfile. Do not guess version numbers from an old project.

Procedural Three.js is the main 3D pipeline. You may explore CadQuery, rhino3dm, Blender, or other tools at build time when they materially improve a specific asset. Export optimized web assets if used, document their origin, and avoid a heavy CAD runtime in the application. Never turn a modeling-tool detour into a reason to drop the hub or asset inspection.

## Performance and access

Target sustained 30 FPS during active interaction on an 8 GB laptop with integrated graphics at 1920×1080; allow 60 FPS when supported. This is a target until hardware-specific measurement exists. Enforce scene, draw-call, texture, bundle, and loading budgets in PERFORMANCE_BUDGETS. Use instancing, resource reuse, bounded pixel ratio, adaptive detail, appropriate idle rendering, lazy loading, and measured profiling. Quality settings preserve operational state and the meaning of every count.

Keyboard users must be able to select an entity through an equivalent list, inspect its details, operate the journey, switch language, and complete the household flow. Provide usable recovery for WebGL failure, reduced motion, narrow screens, and missing stored state.

## Assets, references, and resources

Inspect all 18 selected images. Rebuild original product components and assets; reference screenshots are not UI backdrops to paste into the app. Use the agent image for composition and warmth, Shopify for operational interaction, the miniature/cutaway images for 3D readability, and the dashboard/chart images for information hierarchy.

Use the four requested source resources through BOOTSTRAP: Leonxlnx/taste-skill, Vercel web-design-guidelines, VoltAgent awesome-design-md, and Microsoft playwright-cli. Relevant offline snapshots, their licenses, and provenance are included where retrieval succeeded. Apply the approved project design when generic skill defaults conflict. Do not install arbitrary scripts without inspecting them. Do not claim a tool or skill was executed merely because its text was read.

## Review-and-revision loop

Apply REVIEW_AND_REVISION to the actual app and brand outputs. Define success from the requirements, create a complete first attempt, obtain an independent critic when available, score applicable dimensions with observable evidence, run checks, rank defects, fix them, and recheck affected areas. Use up to four rounds. Stop early only when every applicable dimension is at least 8.5 and no known critical defect or unmet explicit requirement remains. Never inflate a score to pass. If the cap is reached with a material gap, disclose it outside the product and do not claim success for the unmet requirement.

Scores, criticism exchanges, tool transcripts, and process commentary stay out of app copy, reports, and brand materials. Technical verification records may record executed checks and limitations without presenting subjective scores as facts.

## Finish and deliver

Run a clean install/build, the meaningful state and browser checks, visual inspections at desktop and phone sizes, export/reopen checks, brand-guide rendering, ZIP integrity checks, and output-manifest checks. Reopen the exact delivery archives. Update MASTER_CONTEXT using the actual implementation and evidence. Preserve provenance boundaries and unresolved limitations honestly. Return all five outputs with a brief handoff. Do not claim a Vercel deployment occurred unless it actually did and was separately authorized.
