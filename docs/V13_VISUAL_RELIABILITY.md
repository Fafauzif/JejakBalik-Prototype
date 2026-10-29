# Version 1.3.1 — visual stability and loading recovery

This revision responds to the reported desktop blank page and the flashing appearance of moving vehicles and annotations after version 1.2 introduced physical label occlusion. It retains the partner reverse-logistics model, continuous operations, monthly/YTD history, guided decisions, household tracking, and playback speeds through 30×.

## What changed

| Problem | Revised behavior |
| --- | --- |
| The page could remain blank while the application loaded or failed | A small bootstrap keeps an owned status/recovery surface available before React starts; application and route failures have recovery actions. |
| Loading the renderer blocked the scene | The interactive map is available first. Three.js loads separately; the map is replaced after a completed 3D frame. Download, startup timeout and graphics failures keep the map usable and expose retry. |
| Labels reacted to roads, foliage, passing traffic or their own entity | Only explicitly tagged opaque architecture blocks annotations. The label's own object is excluded. Physical vehicle meshes continue to use normal rendering depth independently. |
| Visibility changed abruptly at building edges and label collisions | Time-based settling, stable placement and short fades avoid rapid hide/show oscillation. Hidden annotations cannot receive pointer or keyboard interaction. The entity list preserves access. |
| Decorative road traffic teleported to the beginning | Traffic follows a complete closed perimeter path. |
| Hub actors popped between endpoints or changed docks | Handling follows continuous paths; vehicles keep a stable dock assignment across phase changes. Empty hub queues do not imply loaded cargo. |
| Vehicle/camera motion could correct backward after a delayed React update at high speed | Fleet, camera, hub and map read one monotonic source timestamp. Pause and speed changes materialize the current time before switching behavior. |

The warm palette, partner colors, typography and component owners remain the established design system. `DESIGN.md` and `UX-CONTRACT.md` record the annotation, recovery and motion decisions. No tutorial approvals, request lifecycle rules or historical impact totals were changed.

## Reproduce checks

```bash
npm ci
npm run format:check
node scripts/check-design-tokens.mjs
npm run typecheck
npm test
npm run build
npm run check:bundle
npx playwright install chromium
npm run test:e2e
```

The production bundle check counts unique static dependencies and rejects Three.js, Fiber, Drei or three-stdlib code in the initial app/Network chunks. This detects accidental loss of the renderer loading boundary. Compressed byte budgets are transfer measurements, not proof of network loading time or hardware FPS.

Current executed results are recorded in `V13_VERIFICATION.json`. Earlier V12 and V1.0 performance/workflow records are retained as historical evidence and do not establish this version's behavior. Actual integrated-GPU laptop and physical-phone performance still require target-device testing.

## Deployment

This ZIP is source for the existing Vercel project. Use the same project/root, `npm ci`, `npm run build`, and output directory `dist`. Do not upload the surrounding delivery directory as the app root. No environment variables or new services are required.

After deploying, check a direct refresh of `/network`, the city/hub/device tabs, a phone-sized layout, 30× and pause, the explicit 2D/retry controls, and household tracking. Updating the source ZIP does not change the currently hosted Vercel version by itself.
