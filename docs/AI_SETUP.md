# Optional AI demo setup

JejakBalik works without an AI account. Open the optional review panel and use **Local review**. This is explicitly labelled rule-based, never presented as a live model response. The assistant does not change requests, routes, gates, custody, or final outcomes.

## Enable live AI on Vercel

1. In OpenRouter create a **new dedicated API key** and set that key’s spending/credit limit to **USD 1 total**. Keep other projects on separate keys. The provider’s key cap is the budget boundary; our application cannot guarantee a global dollar cap across server instances. Check that your key’s configured limit is total rather than a resetting allowance. Available credits and separate Vercel charges are independent.
2. In Vercel → your project → Settings → Environment Variables, add two server-only values:
   - `OPENROUTER_API_KEY`: the dedicated key from step 1.
   - `AI_DEMO_ACCESS_CODE`: a random presenter passphrase of at least 24 characters (server minimum is 16). Share only with intended presenters/judges.
3. Select Production (and Preview only if you want live AI there), then redeploy. No `VITE_` prefix. Neither secret belongs in GitHub or browser source.
4. In the optional review panel, select **Use live AI**, enter the **demo access code**, and review a sample device description. Never enter the OpenRouter key into this field.

Default model: `google/gemini-2.5-flash-lite`. Optional `OPENROUTER_MODEL` can select that model or `openai/gpt-4.1-nano`. Other values are ignored and default to Flash Lite. At research time both were listed at $0.10/M input and $0.40/M output; pricing can change. No paid model was called while building/testing the ZIP.

## Cost controls

- Only an explicit button click calls the model; typing, touring and scene animation do not.
- One short intake request, maximum 2,000 characters, no full conversation history, maximum 350 output tokens.
- No automatic retry loop. Twelve-second upstream timeout; fifteen-second browser timeout.
- Repeated identical successful prompts are cached in component memory for that page session.
- Presenter access is checked on the server with constant-time comparison of fixed-size hashes.
- Best-effort limit of 12 attempted model calls per hour **per warm server instance**. This limit resets on cold starts and is not globally distributed. It is supplemental abuse friction, not the USD 1 enforcement mechanism.
- Configure the dedicated OpenRouter key cap; turn the feature off by removing `OPENROUTER_API_KEY` and redeploying if necessary.

A shared presenter code is appropriate to this small demonstration. It is not individual-account authentication. Anyone holding that code can call the endpoint. For an unrestricted public rollout use individual authentication and a durable shared quota store first.

## Data and authority

Use synthetic examples without names, addresses, passwords or personal files. Live mode sends the device description and a fixed instruction to OpenRouter and its selected model provider; local mode sends nothing. The model returns provisional category, missing details, review flags, and one suggested next step. Output is schema checked, rendered as text, and grants no operating authority. Data-bearing categories receive a conservative review flag even if the model omits it. Damaged-battery wording also receives specialist review.

If a key/code is missing, authorization fails, the service times out, or the output is invalid, the panel offers **Use local review**. It never silently labels local rules as AI. The same site remains usable without AI.

## Run locally

`npm run dev` serves the frontend and local rules. It does not run Vercel Functions. To exercise the real `/api/assistant` endpoint locally use Vercel CLI’s `vercel dev` with the two Development environment variables, or test the deployed Preview after setting its variables. The test suite mocks the fixed upstream boundary and requires no credentials.

## Endpoint

`POST /api/assistant`, JSON body `{ "task": "intake", "text": "...", "locale": "id" }`, header `X-Demo-Access`. The optional `explain_hold` task uses the same restricted suggestion schema. Client-supplied model, messages, endpoints and extra fields are rejected. Responses are `no-store`; secrets and upstream error bodies are not logged or returned. The SPA rewrite excludes `/api` so API requests reach Vercel Functions.

## Validation

Run `npm test` and `npm run typecheck`. Focused tests cover missing/wrong access, invalid task and oversized input, no client model selection, bounded request, schema rejection, no automatic retries, best-effort rate limiting, transport checks, and local fallback. Live model quality and deployment environment still require one presenter smoke test after configuration. A successful mock does not prove a live provider call.
