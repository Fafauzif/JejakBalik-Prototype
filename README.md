# JejakBalik 2.0

A bilingual community electronics collection prototype: a detailed miniature network, a five-step walkthrough at your own pace, household requests and tracking, operator safety/data decisions, and transparent program economics.

**Start at `/network`.** Follow one device, explore the city/hub/device tabs, or create a sample return. The walkthrough stays in one workspace and never grants approvals automatically. The service model below the network explains funded access and lets you test funding and grouped route-order proposals.

All operational records, partners, locations and outcomes are illustrative. The network animation, tutorial batch and annual operating-history dataset are separate demonstrations. No physical collection, processor certification, live carrier feed or partner agreement is claimed.

## Run

Node 24 recommended (minimum 22.12). From the extracted project root:

```bash
npm ci
npm run dev
```

Open `http://localhost:4173`. No account or API key is needed for the website, tour or local review assistant.

## Deploy to an empty GitHub repository and Vercel

Extract the ZIP. Upload **its contents** into the repository root: `package.json`, `src/`, `public/`, `api/`, `server/`, config files and docs must be at root, not inside another folder. Import that repository into Vercel. Use Vite, build command `npm run build`, output `dist`, root `.`. No environment variables are needed for local review and the full walkthrough.

The optional live AI supplement runs through a Vercel Function; it is not part of the browser bundle. To enable it, create a dedicated OpenRouter key capped at **USD 1 total**, then configure `OPENROUTER_API_KEY` and `AI_DEMO_ACCESS_CODE` in Vercel and redeploy. The presenter enters only the demo access code on the site. Follow [AI setup](docs/AI_SETUP.md); `.env.example` contains names only, no real credentials.

The existing public URL supplied by the owner is https://jejakbalik.vercel.app/network . This package has not been deployed by the assistant; a new project may receive a different URL.

## Workspaces

- **Network:** interactive city, six vehicle roles, partner destinations, hub and device inspection; explicit walkthrough; optional program lab and review assistant.
- **Team:** seven coordination roles with state-linked artifacts. Characters do not imply seven live models.
- **Assets:** registry, review queues, filters and exports; explicitly choose operating-history or tutorial records.
- **Impact:** illustrative history and tutorial outcomes, finance and reports. Program-lab sensitivity does not alter these source datasets.
- **Household:** sample return, receiving windows, tracking, partial outcomes and hold states.

The optional model only proposes intake fields, missing facts and a next review step. It cannot change consent, dispatch, payments, capacity or outcome records. The website remains usable when the model is unavailable.

## Verify

```bash
npm run typecheck
npm test
npm run build
npm run check:bundle
npx playwright install chromium
npm run test:e2e
npm run format:check
```

For an existing Chromium executable set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. For live AI locally use `vercel dev`; `npm run dev` serves frontend/local rules only.

## Continuation

Read [the complete master context](Jejak_Balik_Master_Context.md) before extending this project. It records the owner decisions, research, scope, source versions, actual changes, test evidence and limits. The identical repository copy is in `docs/Jejak_Balik_Master_Context.md`. Older reports and brand screenshots are historical evidence and must not be presented as new verification.
