# JejakBalik 3.0

An interactive electronics-return network. Compare available capacity on existing journeys, approve a feasible collection plan, and resolve changes through one shared scenario.

All transport providers, places, journeys, devices, prices and operating events are fictional demonstration inputs. Calculated plans respond to those inputs; no collection, partner agreement, sanitization, treatment, income or environmental benefit is represented as a field result.

## Replace the current repository

Extract the contents of the release ZIP into the existing repository root and replace matching files. `package.json`, `src`, `public`, `api`, `server` and configuration files belong directly at the root. No manual deletion of retired source files is required. The new entry point owns the active experience; retained earlier modules are historical implementation material.

Use Node 24 (minimum 22.12):

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. If your environment cannot enumerate network interfaces, use `node scripts/e2e-server.mjs` and its printed loopback URL instead.

## Deployment

Vercel: framework Vite, build `npm run build`, output directory `dist`, repository root `.`. The provided SPA rewrite preserves `/api`. No credentials are needed for the planning experience. This release does not push to GitHub or deploy a site.

## Optional intake assistance

The existing controlled server endpoint can provide provisional intake assistance through OpenRouter. See `docs/AI_SETUP.md`. Use a dedicated provider key with a USD 1 total spending cap and a separate presenter access code. Never expose the provider key through a `VITE_` variable or client code. The planning algorithm and approval controls do not depend on model access. A presenter code is for a controlled demo, not production identity.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run check:bundle
npm run format:check
npm run test:e2e
```

Browser tests require a compatible Chromium executable; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when using an existing browser. `docs/V3_VERIFICATION.json` records the exact checks actually executed for this release and their boundaries. Earlier verification documents are dated history.

## Continue development

Read `Jejak_Balik_Master_Context.md`, `DESIGN.md`, `UX-CONTRACT.md` and `docs/V3_ARCHITECTURE.md`. The master is duplicated byte-for-byte in `docs/Jejak_Balik_Master_Context.md`. It records the adopted idea, source lineage, implemented behavior, assumptions, evidence limits and remaining work. The full previous master is retained under `docs/history/v2_COMPLETE_MASTER_CONTEXT.md`.
