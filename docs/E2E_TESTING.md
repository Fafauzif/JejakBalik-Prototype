# Browser workflow tests

The repository uses `@playwright/test` for browser-level operational workflows. These tests use rendered controls, form fields, dialogs, navigation links, timeline seeking, real downloads, and file upload. They do not import the Zustand store into the page or seed approval decisions.

## Run locally

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

The test configuration starts a loopback Vite server on port 4397 for the run and closes it when Playwright finishes. An existing local test server can be reused outside CI. Override the port with `E2E_PORT` when needed.

For an existing Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its absolute path. In the build executor only, `/tmp/atma-chromium` is automatically used if that file exists. Otherwise Playwright uses its normally installed browser. The repository does not ship that executor binary.

`scripts/e2e-server.mjs` uses Vite's server API. A narrow fallback handles execution environments where `os.networkInterfaces()` fails but loopback networking works. This keeps the server and Playwright in the same command's process environment without requiring an externally running dev server.

## Covered workflows

The suite in `tests/e2e/operations.spec.ts` covers:

1. Starting the guided journey, advancing the shared clock with Playwright's virtual clock, arriving at the hero form, blocking early submission and Enter at 18 seconds, pausing at 32 seconds without decisions, and explicitly submitting the real form.
2. Seeking to the end without auto-approval; reviewing specialist and data gates; checking the resulting network, device passport, household record, impact, and economics views.
3. Specialist-held, data-held, and capacity-deferred branches through actual scenario selection and human decision dialogs; checking downloaded CSV rows against each branch's completed, held, and deferred state.
4. Actual JSON/CSV downloads, scenario reset, file import, local-storage persistence, reload, accepted-decision preservation, and expired review tokens.
5. Rejection of invalid JSON without replacing the active session, followed by graceful recovery from deliberately corrupted persisted input.
6. Keyboard skip link, arrow-key scene tabs, settings-dialog focus containment and Escape dismissal, and English navigation/content switching.

The only direct storage write deliberately injects corrupt JSON to test recovery; it does not create operational records or grant a gate. Operational outcomes are produced through the user-facing form and decision controls. The suite uses one worker and isolated browser contexts.

## Reports and boundaries

Each run writes:

- `test-results/e2e-results.json`: Playwright's machine-readable run report.
- `test-results/html/`: HTML report, opened with `npx playwright show-report test-results/html`.
- `test-results/artifacts/`: failure screenshots and retained traces, plus a completed-session download saved during its export/import test.

The build-time summarized result is recorded separately in `docs/E2E_RESULTS.json`. On 16 October 2026, the final complete run on the frozen, formatted source passed **all 8 cases** in approximately 1.5 minutes with no retries. The raw `test-results/e2e-results.json` reflects that successful final full run. The durable summary also preserves the initial run (7 passed, 1 failed because invalid-import feedback was outside the active modal), the passing focused import regression after the inline alert fix, and the passing focused guided-form timing regression. Do not infer a successful browser run solely from the existence of the test files.

These tests focus on browser-connected operations and keyboard interaction. They are separate from the household responsiveness, team artifact inspection, printable report, and 3D graphics checks. The execution environment used for this suite could not create a WebGL context, so the working operational fallback was active. This run does not establish 3D visual quality, GPU performance, FPS, or complete accessibility conformance. A dedicated graphics run is required for those claims.
