# Deploy JejakBalik 2.0

1. Extract the release ZIP into an empty folder and upload its **contents** to an empty GitHub repository. `package.json`, `src`, `public`, `api`, `server` and `vercel.json` belong directly at repository root.
2. In Vercel import that repository. Select Vite, root `.`, build `npm run build`, output `dist`. Use Node24. Deploy.
3. Open `/network`, `/household`, `/assets` and `/impact` directly and refresh each once. SPA rewrites preserve these routes; `/api` is excluded for server functions.
4. Check 3D startup and use the interactive 2D view if the device cannot render WebGL. Test the five-step walkthrough and both approval/hold branches.

No secrets are required for the website and its local rule-based review. Optional live AI uses server-only `OPENROUTER_API_KEY` plus `AI_DEMO_ACCESS_CODE`. Create a dedicated OpenRouter key with **USD1 total cap**. Set both in Vercel Project Settings → Environment Variables, choose Production (and Preview if desired), then redeploy. Do not prefix secrets with `VITE_` or put them in GitHub. Full instructions: [AI_SETUP.md](AI_SETUP.md).

The presenter enters the demo access code in the optional assistant panel, never the OpenRouter key. Missing credentials or failed calls leave local review available. This controlled demonstration uses best-effort warm-instance request limits; only the provider's dedicated key cap enforces the total spend boundary. Vercel usage charges are separate.

The owner-provided current website is https://jejakbalik.vercel.app/network . No deployment, domain change or account mutation was made while preparing this package. A new Vercel project can have a different URL.

Before showing the demo, use the presentation device to check camera, controls, keyboard, language, and the local fallback. If enabling paid AI, perform one synthetic presenter smoke test after configuration. Live API quality cannot be verified without the owner's configured key; no credential is included in this ZIP.
