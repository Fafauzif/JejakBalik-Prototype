# Performance evidence and remaining validation

## Current version 1.3.1

The renderer remains deferred from the initial app and Network chunks. The entry bootstrap is small and recovery content exists before React loads. The scene renders an interactive map while 3D loads, and switches only after the first completed frame. No hidden animated compatibility map runs underneath a healthy 3D canvas. Auto starts at DPR 1 and lowers resolution/disables shadows when observed performance is low.

Actual WebGL layout and motion checks use a software renderer; they do not establish hardware FPS. See `V13_VERIFICATION.json` for current workflow/visual results and `V13_BUNDLE_BUDGET.json` for exact final compressed-byte measurements and module-boundary checks. Later sections preserve historical measurements. Physical-phone and integrated-laptop performance remain unverified.

## Historical version 1.2

Mixed partner vehicles, physical label occlusion and the moving hub were tested in actual Chromium 153 / ANGLE SwiftShader software WebGL. Ten integrated desktop/tablet/phone cases had no measured label overlaps, scene/page overflow, or overlay collisions. An independent camera ray hit building instance 169 between the camera and selected H01; that label became hidden, untabbable and non-clickable. The final hub checks confirm changing instance matrices during motion and identical matrices when paused or reduced motion is enabled. The physical live queues exclude devices still travelling on vehicles.

A short city interaction sample measured 134 draw calls and 80,958 triangles. A populated animated-hub sample measured 24 draw calls and 7,560 triangles, using batched handling meshes instead of the original 361-call scene. Actor/container counts vary with the actual rolling workload; empty handling containers have no device identity or inventory count. These short software-renderer observations establish rendering and bounded geometry only. They do not verify sustained FPS, target-laptop performance, physical phones or long-run GPU-memory behavior. Objective current evidence is in `V12_VERIFICATION.json`.

## Historical version 1.1 continuous Network update

The revised continuous city, hub, and label placement were verified with actual WebGL2 through Chromium 153 / ANGLE SwiftShader at desktop, tablet and phone viewports. A short interaction sample recorded **196 draw calls, 79,106 triangles, 101 geometries and three textures**, within the city draw-call and triangle budgets. It lasted approximately six seconds and is not a sustained benchmark. Hardware FPS, recurrent stalls, long-run GPU-memory behavior and physical phones remain unverified. Current objective evidence is in `NETWORK_UPDATE_VERIFICATION.json`; the build-size table is refreshed from the current clean build.

The measured 68.26-second FPS run and ten-category counters in the following sections are retained as **original version 1.0 historical evidence**. They do not establish frame rate or resource lifetime of the continuous version 1.1 experience.

Measured on 16 October 2026. **Actual WebGL2 rendering was verified through ANGLE SwiftShader software rendering**, after the original available browsers failed. City, populated hub, and all ten device categories were visually checked. A 68.26-second city sample measured 195 draw calls and 80,122 triangles, under the geometry budgets. Its 12.77 FPS average and 134.1 ms p95 frame time do not meet the 30 FPS / 50 ms target in this software-rendered environment. The 8 GB integrated-graphics laptop and physical-phone performance targets remain unverified. Final screenshots show actual 3D; separately named compatibility screenshots document the SVG fallback.

## Build sizes

Measured from a fresh isolated production build using Vite 8.3.4, Node 24.19.0, and `node:zlib.gzipSync` with its default options. KiB means 1,024 bytes. These are file-compression measurements, not a hosted network waterfall or a cold-cache load benchmark. Vite's own reported gzip output differs slightly because its compression settings differ.

| Asset group | Raw bytes | Gzip bytes | Gzip KiB | Budget/result |
|---|---:|---:|---:|---|
| Initial shell JavaScript: entry plus HTML modulepreloads | 521,107 | 145,088 | 141.7 | Under 300 KiB target |
| Additional lazy WorldCanvas entry | 1,036,090 | 277,728 | 271.2 | Under 700 KiB target |
| Network page JavaScript | 40,118 | 13,042 | 12.7 | Loaded by route |
| Network page CSS | 22,995 | 4,604 | 4.5 | Loaded by route |
| All JavaScript chunks across every route | 1,806,267 | 500,146 | 488.4 | Not an initial-transfer total |
| All CSS chunks across every route | 136,216 | 28,277 | 27.6 | Not an initial-transfer total |
| Five local Latin WOFF2 font weights | 60,456 | — | — | Already compressed format |

The current version 1.2 shell includes `index-DIIazTei.js`, `metrics-BCYbyYdb.js`. The lazy scene is `WorldCanvas-CjnZsffF.js`. Measurements come from a fresh extracted ZIP, lockfile installation and production build of the exact source; `PERFORMANCE_BUILD_BYTES.json` contains the bytes. Hosted cold-cache transfer, load time and the 2.5 MiB critical-transfer target remain unmeasured. Hub metadata stays separate from the lazy scene implementation.

## Measured procedural inventory

These numbers come from executing the actual `makeCity` generator through Vite's server-side module loader. They count object instances, not draw calls or visible triangles.

| City decoration | Standard / High / initial Auto | Lite / Low |
|---|---:|---:|
| Building bodies | 318 | 216 |
| Roof pieces | 318 | 216 |
| Window strips before route clearance | 378 | 245 |
| Tree crowns | 220 | 145 |
| Tree trunks | 220 | 145 |
| Park ground pieces | 4 | 4 |

The standard canonical snapshots at story seconds 0, 120, and 180 each retained 318 building bodies and 220 trees after active-route clearance; window strips became 375. Alternate user-created routes may remove decorative instances to preserve visible roadway access. Instance counts therefore intentionally vary with route geometry. Six batched geometry groups render repeated city decoration; this does not imply that the complete city has only six draw calls.

The city additionally contains 12 districts, 36 selectable household representations, one consolidation hub, four partner facilities, three landmark accents, arterial/local/elevated roads, a river with bridges, and six operational vehicles. Decorative traffic is visually subdued and is not a custody event. Operational vehicle positions and headings use `getVehiclePose` and snapshot route geometry. Vehicles remain staged before their actual departure, and the specialist route is absent until its required approval exists.

The hub has eight selectable zones and displays actual snapshot assets and queue counts. The device inspector renders one of ten procedural categories at a time. Exploded component counts were checked for all categories: phone 4, laptop 6, tablet 4, router 4, accessories 3, small appliance 4, monitor 5, printer 5, large appliance 5, battery 3. These are component counts, not mesh or triangle counts.

## Implemented rendering controls

- One principal React Three Fiber Canvas owns the active city, hub, or device scene. Inactive scene branches unmount. The SVG compatibility renderer uses no Canvas.
- Repeated building, roof, window, tree, trunk, and park geometry is instanced. Scene geometry is procedural and requires no external model, texture, or CDN request.
- One directional light casts realtime shadows. Standard uses a 1,024 × 1,024 shadow map; High uses 2,048 × 2,048. Lite disables shadows and antialiasing.
- Lite uses DPR 1; Standard and initial Auto cap DPR at 1.25; High uses 1.5. Auto reduces DPR to 0.85 after low measured frame rate and uses a separate recovery threshold/time to reduce oscillation. Auto currently adapts resolution; decorative density and shadow changes are controlled by the explicit quality tier.
- In v1.2 city and hub render continuously while unpaused and motion is enabled. Paused/reduced-motion scenes and the device use demand rendering. Camera and component transitions explicitly invalidate until settled. Reduced motion makes those transitions immediate and disables ambient animation.
- Vehicle animation derives position from story time. Camera interpolation and component transitions use delta time and reusable vectors/refs. Inspector state and simulation state remain in the DOM/domain layer.
- A Canvas error boundary and context-loss listener switch to an interactive SVG city, hub, and device renderer. Selection, inspection, route position, hub queues, and exploded component interaction remain available. The UI labels this compatibility state.

## Actual WebGL evidence

Environment: Linux x86_64; Playwright 1.64.1; Chromium 153 from the official `@sparticuz/chromium@153.0.0` package with its matching SwiftShader libraries. Renderer string:

```text
ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)
WebGL 2.0 (OpenGL ES 3.0 Chromium)
```

This is **software rendering on the container**, not a hardware GPU benchmark. CPU, physical GPU, RAM, and target laptop specifications were not established. Desktop viewport was 1,440 × 1,000; the principal Canvas viewport was 1,050 × 480. Device scale factor was 1. Auto began at DPR 1 and reduced to 0.85, then held that value. Mobile used an emulated 390 × 844 viewport; this is layout evidence, not physical-phone performance evidence.

The clean city run warmed for approximately five seconds, then collected twelve samples at approximately five-second intervals while ambient traffic animated, the timeline was sought to busy collection snapshots at seconds 80 and 100, and two mouse orbit gestures exercised the camera. The final counters are cumulative, including startup/warm-up; this is not a completed guided-playback benchmark. The last sample covered 68.2628 seconds and 872 rendered frames. It recorded:

| Measurement | Observed | Target / interpretation |
|---|---:|---|
| Average rendered FPS | 12.77 | Below 30 target in SwiftShader |
| p95 frame time | 134.1 ms | Above 50 ms target in SwiftShader |
| City draw calls | 195 | Below 220 target |
| City rendered triangles | 80,122 | Below 250,000 target |
| Geometries | 107 | Stable across this run |
| Textures | 3 | Stable across this run |
| DPR after adaptation | 0.85 | Held after low-frame-rate adaptation |
| Uncaught page errors | 0 | Clean post-fix run |

The first post-warm-up sample had a cumulative p95 of 246 ms; subsequent cumulative p95 values decreased to 134.1 ms. Individual stall events were not logged, so this evidence does not establish a maximum frame time or absence of recurrent >200 ms stalls. Exact samples are retained in `PERFORMANCE_SAMPLES.json`.

Initial city profiling found 221 draw calls. Batching elevated-road piers and loading-bay pieces reduced that to 195 while retaining the same triangle count. Actual WebGL testing also exposed a nested React-root cleanup race in Drei Html labels. Scene labels now use projected native DOM buttons with direct cleanup; five consecutive city → hub → device cycles produced no page errors, exactly one Canvas throughout, and stable label counts of 11 / 8 / 0. This establishes bounded Canvas/label lifetime in the tested loop; it is not a complete GPU-memory leak test.

The populated hub at story second 120 measured 6,360 rendered triangles and 361 draw calls. The brief sets a hub triangle budget of 180,000 but no specific hub draw-call limit. The 361 calls remain an optimization opportunity before hardware-target acceptance. Demand-rendered hub/device idle frame intervals are not continuous-FPS benchmarks and their reported average FPS is intentionally excluded here.

All ten categories were captured assembled and exploded and checked for fit and component selection controls. Measured exploded-state renderer counters:

| Device category | Components | Draw calls | Triangles |
|---|---:|---:|---:|
| Phone | 4 | 42 | 15,018 |
| Laptop | 6 | 108 | 63,482 |
| Tablet | 4 | 42 | 15,018 |
| Router | 4 | 34 | 7,682 |
| Accessories | 3 | 12 | 6,954 |
| Small appliance | 4 | 32 | 7,050 |
| Monitor | 5 | 34 | 9,090 |
| Printer | 5 | 38 | 11,146 |
| Large appliance | 5 | 36 | 7,298 |
| Battery | 3 | 16 | 3,842 |

Every observed category is below the 80,000-triangle device budget. Exact category and scene-switch records are in `GRAPHICS_DEVICE_QA.json`. The phone explosion was adjusted so all four assemblies are separately visible from the default camera. Mobile camera framing and progressive label density were reviewed at 390 px; document width remained exactly 390 px with no horizontal overflow. All categories, scene switches, final screenshots, TypeScript typecheck, and the fresh production build completed without uncaught application errors.

Final actual-3D captures are `city-final.png`, `hub-final.png`, `device-final.png`, `device-exploded-final.png`, and `city-mobile-final.png`. They use the real application and WebGL2 software renderer. The desktop images are 1,440 × 1,000; mobile is 390 px wide and full-page. Camera/label framing was refined after the timed run without changing the measured procedural geometry.

## Compatibility-renderer evidence

Before the matching Chromium/SwiftShader runtime became available, the managed browser and `/tmp/atma-chromium` failed with:

```text
THREE.WebGLRenderer: A WebGL context could not be created. Reason:
Could not create a WebGL context, VENDOR = 0xffff, DEVICE = 0xffff,
Sandboxed = no, Optimus = no, AMD switchable = no,
Reset notification strategy = 0x0000,
ErrorMessage = BindToCurrentSequence failed: .
```

The managed browser reported the same failure with `Sandboxed = yes`. ANGLE/SwiftShader flag retries with the original mismatched runtime failed identically. A separate official Chromium package with matching libraries resolved the initialization issue. These failures remain useful coverage of the error-boundary path: the city, populated hub, all ten exploded category component sets, and 390 px mobile layout worked through the interactive SVG fallback without uncaught page errors. The UI accurately labels compatibility mode. Files with `compatibility` in their names document that mode; their images and UI behavior are not GPU evidence.

## Required hardware acceptance run

Real integrated-laptop ≥30 FPS performance, p95 ≤50 ms, physical mobile performance, full guided-playback profiling, recurrent stalls, and long-run GPU-memory behavior remain **unverified**. The software-rendered FPS result does not establish either a pass or failure on the intended hardware.

`WorldCanvas` exposes an optional `onPerformance` callback and observational `window.__JEJAK_PERF` samples containing scene, draw calls, triangles, geometries, textures, frames, duration, average FPS, p95 frame time, DPR, viewport, and quality. It emits approximately once per rendered second. Demand-rendered idle frames must not be interpreted as continuous-FPS results.

On the target machine: record browser, OS, CPU/GPU, RAM, viewport and quality; warm the scene; run the busiest active guided segment plus orbit for at least 60 seconds; record the complete samples and individual stalls over 200 ms. Repeat for hub/device interaction and scene-switch/replay loops; compare settled geometry/texture counts to detect growth. Measure the final hosted cold-cache transfer waterfall. Repeat mobile workflows on available physical hardware and report each actual device independently.
