# Continuous Network browser verification

The updated suite retains the original eight browser workflows in `tests/e2e/operations.spec.ts` and adds five continuous-operation cases in `tests/e2e/live-network.spec.ts`. Original manual scenario workflows explicitly select **Tutorial** before using its 180-second slider. A full page reload intentionally opens the default live Network; the persistence checks select Tutorial again to inspect the restored authored session.

The five new cases verify:

1. A fresh Network opens in the middle of a staggered shift, exposes all six fleet vehicles, advances its own clock, changes rendered truck coordinates, and opens the working hub view. The case also scans the English live Network at 360 × 844 with axe for WCAG 2 A/AA and 2.1 A/AA rules.
2. The live view remains on Network after **26 virtual hours**, passes many rolling cadences without opening a tutorial checkpoint, and exports an unchanged canonical session with no granted decisions.
3. Pause freezes the observation clock and all rendered truck positions. Resume restores movement. Navigating to Team and back preserves the ongoing shift rather than restarting the vehicles.
4. Tutorial opens with the fleet parked at its authored origin. The guided request form remains disabled before the real 32-second checkpoint. Ending the guide returns to the live shift while preserving the story cursor and its empty decision history.
5. An explicitly submitted story request and pending specialist review remain unchanged after **six virtual hours** of observing live operations. The live UI offers no story approval. Returning to Tutorial still requires that review.

All operational changes use rendered controls, navigation, real form submission, downloaded JSON/CSV, or uploaded JSON. The new cases never import a store into the page, seed an approval, or inject operational state. Long observation periods use Playwright `clock.fastForward()` to test elapsed wall-time catch-up efficiently; short `clock.runFor()` intervals verify successive visible positions. These are virtual-duration checks, not physical 26-hour endurance or memory-leak measurements.

Run with `npm run test:e2e` after installing the browser normally with `npx playwright install chromium`. The executor used its existing `/tmp/atma-chromium` binary. The narrow test-server filesystem allow-list includes the project's resolved `node_modules` path so a shared dependency symlink can load local fonts; the application runtime Vite configuration is unchanged.

This Chromium cannot initialize WebGL, so these browser workflow checks exercise the operational SVG fallback. Separate graphics verification covers the real WebGL scenes, label layout, and camera behavior. Browser workflow passes do not establish target-device FPS or GPU performance. The exact run outcomes, including any failed attempts and their reasons, are preserved in `docs/UPDATED_E2E_RESULTS.json`; generated Playwright reports remain under `test-results/` during local verification.

The full updated run passed **all 13 cases** with no retries in approximately four minutes. After adding the scoped accessibility assertion to the fresh-Network case, its focused rerun passed with **zero matching axe violations**. The full run and focused final rerun are separately recorded rather than conflated. The original historical `docs/E2E_RESULTS.json` remains unchanged.
