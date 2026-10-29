# v1.2 browser workflow verification

The v1.2 suite has 19 Playwright cases. It preserves the original eight authored-scenario workflows and the five continuous-Network cases, then adds six workspace cases. Assets and Impact now default to operating history, so the original scenario assertions explicitly select **Batch tutorial** before comparing their 48-device tutorial outcomes. The historical evidence in `docs/E2E_RESULTS.json` and `docs/UPDATED_E2E_RESULTS.json` is retained unchanged.

## Added coverage

- **Playback and authorization:** select 10× and 30× through the live speed control, check elapsed-time scaling and pause, then accelerate Tutorial to its exact 32-second request checkpoint without granting a decision. The live speed and elapsed clock remain separate from tutorial decisions.
- **Guided Next:** step through 8, 18, 32, 38, 50, 62, 74, 86, 108, 115, 130, 138, 158, 166, and 180 seconds using the displayed Next control. Submit the actual request form, review and explicitly approve the two dialogs, and acknowledge each artifact/device/outcome interaction before continuing. Virtual time is paused while inspecting exact manual Next boundaries so 30× playback cannot run ahead between clicks. Exports prove that reaching a checkpoint did not grant its decision.
- **Historical asset registry:** default 2026 CSV has 2,812 unique historical IDs. January has 188 records. Search narrows the export to one ID, and its real link opens the matching historical passport and custody trail while retaining the period.
- **Historical impact:** October's 284-row asset CSV reconciles with period JSON for completed count, recovered mass and revenue minus expenses. The monthly summary, actual report popup, retained period on the economics view, and English mobile accessibility are checked.
- **Team:** task bubbles change with the operating frame. Pause freezes both the clock and captions, Network shows the same paused time, and resuming at 10× advances the shared frame. The live guardian offers no tutorial decision button. The changed English Team view is checked at 360 pixels.
- **Household:** the actual one-item request's Happening now counts remain scoped to that request. Next advances collection, hub intake and completion, requires both explicit reviews, and downloads a one-item custody record with cleared data.

All operational state changes use rendered controls, real forms, navigation, review dialogs, downloads, or uploads. No store is imported into the browser and no approval or operational state is injected. The existing corrupt-storage recovery case deliberately supplies malformed persisted JSON only. Short Playwright `clock.runFor()` intervals verify successive rendered updates. Long-duration cases use `clock.fastForward()` and therefore do not establish physical endurance, memory stability, or a measured 26-hour runtime.

## Accessibility and rendering scope

The suite scans the English mobile live Network, historical Impact and Team views with axe rules tagged WCAG 2 A/AA and 2.1 A/AA. These are scoped automated checks, not complete accessibility certification. The configured executor Chromium (`/tmp/atma-chromium`) cannot initialize WebGL, so its operational SVG fallback is active. Real WebGL, occlusion, label placement, fleet geometry and moving-hub visual checks are separate graphics evidence; workflow passes do not establish target-device FPS.

## Independent history evidence

A separate browser capture used actual downloads and report printing. Its 12 desktop and 360/390-pixel screenshots had no horizontal document overflow. Desktop Assets/Impact, mobile asset IDs/cards, mobile economics and both pages of the actual two-page A4 report were visually inspected. The actual YTD and January exports contained 2,812 and 188 records. October contained 284 records, including 225 completed devices and 1,050.49 kg completed recovery mass. The JSON's revenue less expenses matched its −Rp407,778 period contribution. These are authored operating-history records, not a claim about a connected external operation.

## Running and exact results

Run `npm run test:e2e` after installing Chromium with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed binary. Exact attempts, durations, failures and final reruns are recorded in `docs/V12_E2E_RESULTS.json`. Generated Playwright reports stay in `test-results/` during local verification and are excluded from the source archive.

## Final outcome

The final combined coverage is **19 distinct cases passed** on unchanged application source: the source-frozen complete run passed 17 cases, followed by a passing two-case rerun after correcting test-only timing and selector issues. This does not claim a single complete 19-case pass. All three scoped English 360 × 844 axe checks passed with zero matching violations. The initial historical feedback contrast and scroll-region focus issues were fixed before the frozen-source verification. Earlier failed attempts and the formatting/hot-reload-invalidated attempt remain documented in the machine-readable record. No further application edits or broad test repetitions were needed.
