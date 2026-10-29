> Current revision: **1.3.1**. Read `V13_VISUAL_RELIABILITY.md` and `V13_VERIFICATION.json` for the delivered changes and current executed results. Counts and observations below are retained historical evidence.

# Continuous service operations — version 1.2

Jejak Balik opens as an existing service in motion. Network and Team share the running operating frame; Assets and Impact default to month/year operating history; Household tracks the actual selected request beside its map. The explicit Tutorial modes preserve the original 180-second authored journey, three scenarios, saved decisions and human review checkpoints.

## Partner and neighborhood reverse logistics

The continuous fleet no longer portrays all vehicles as generic hub-dispatched pickup trucks. `src/domain/partner-logistics.ts` owns six fictional operating profiles, origins, vehicle shapes and roles:

| Vehicle | Operator / origin              | Role                                                                      |
| ------- | ------------------------------ | ------------------------------------------------------------------------- |
| V01     | Kembali Guna partner depot     | Partner van: ordinary delivery, then compatible backhaul pickup           |
| V02     | Sirkula Komponen partner depot | Component-delivery box vehicle: ordinary delivery, then return collection |
| V03     | Pulih Material partner depot   | Bulky truck: booked large-device collection                               |
| V04     | Tenggara neighborhood point    | Cargo bike: local delivery, then compatible small-device collection       |
| V05     | Jaga Residu specialist depot   | Specialist carrier: safety-conditioned, segregated recovery load          |
| V06     | Barat Daya community point     | Community pickup: shared neighborhood collection round                    |

Ordinary deliveries originate at a partner or neighborhood point, before the recovery pickup. Their illustrative parcels are separate from the 48 recovery devices and never count as collected devices, recovery outcomes or custody events. The hub receives, unloads, sorts and forwards recovery devices; it does not supply the ordinary consumer-delivery load. Recovered devices continue from the hub to their compatible destination. Each cadence ends at its own depot/neighborhood origin, which also starts the next cadence, avoiding a wrap teleport.

The named partners and logistics roles are authored fictional entities. They do not establish real agreements, carrier integrations, physical service execution or processing certificates.

## Cadence and source of truth

`src/domain/live-operations.ts` defines six staggered schedules over a repeating 360-second simulation cadence. Seven collection routes connect household stops to the hub; downstream and repositioning paths connect recovery destinations and the vehicle origins. Travel interpolates by path distance. Ordinary delivery stops, collection, hub unloading/processing and destination handoffs have separate dwell periods.

The service clock begins at 09:20 WIB on 20 October 2026 and advances ten service seconds per elapsed second at 1×. Schedules continue beyond 180 seconds, through subsequent shifts and days, without a story ending. This is an authored client-side continuous experience, not actual truck telemetry, a hosted backend job or a claim of real pickups.

`src/state/network-store.ts` owns the independent ephemeral elapsed clock, live/tutorial view, pause and live speed. The application advances from actual elapsed time, including catch-up after background-tab throttling. Navigation preserves state. Pause freezes the current view; resume excludes the paused period. Reload opens a fresh mid-shift cadence. This store is intentionally outside the persisted tutorial/exploration session schema.

The shared speed vocabulary is 0.5×, 1×, 2×, 5×, 10× and 30×. Network and Team control the same live pause/speed state. Tutorial and Household use the separate guarded session clock. Motion interpolation and hub animation honor the chosen live speed, pause and reduced-motion setting.

## Rolling workload and immutable history

The live frame contains 36 pre-registered requests and 48 existing sample asset identities. Each identity represents the current route workload and refreshes when its route begins another round. Counts fluctuate within this rolling cohort rather than accumulating unlimited annual assets or financial outcomes. The activity feed is bounded to eight entries, with the latest three in the overview. Custody is bounded to the current observed round.

One `LiveOperationsFrame` supplies fleet position, operator/role, ordinary forward parcels, recovery load, recent handoffs, hub queue, individual status/custody and Network metrics. Recovery load reconciles to collected/routed assets; hub load reconciles to received/triaged assets. Ordinary forward parcels remain excluded. Stable route/path references avoid reconstructing road geometry on every clock update.

The separate `src/domain/operating-history.ts` ledger gives Assets and Impact their long-running month/year view: 2,812 devices in 40 cohorts, January–October 2026, as of 20 October. Earlier cohorts are completed; the final cohort retains in-progress work. Records are deterministically authored once and recursively frozen. Historical IDs use `JB26-MM-#####`; `/assets/:id` opens their own passport. The annual option means year to date, with no future November/December outcomes or unexplained annual multiplier.

The Assets registry is bounded, searchable, filterable and paginated, with dataset, period and committed filters in URL state. Its CSV exports all matching selected-period records. Impact derives recovery mass, outcome mix, monthly trend, equal-work collection comparisons and service economics from the same selected ledger period. Device CSV, monthly-summary CSV, full period JSON and a bounded printable report contain the corresponding underlying records and aggregates. Full device detail stays in CSV/JSON rather than a thousand-row print appendix.

Gross recovered value belongs downstream; only the 20% platform share enters revenue. Cohort contract funding and community-access support, collection, completed-device processing and recorded clearance costs reconcile to period operating contribution. The comparison includes identical collected devices and household/handling classes, equal vehicle rates and dispatch fees, and the same home-to-hub boundary. See `docs/OPERATING_HISTORY.md` for full provenance, input formulas, capacity limits and exclusions. Neither this history nor the live rolling workload is a claim of observed operations or field-validated economics.

Historical prerequisites are authored into the independent live fixture. Observing live operations or history creates no current-user Decision object and calls none of the tutorial decide, submitHero, reviewGate, seek or import actions. Saved tutorial/exploration decisions and household requests retain their scope. Team offers Tutorial records explicitly; Assets and Impact offer Tutorial batch explicitly. Ending the guided journey returns the next Network visit to Live operations while opening its actual tutorial outcome at `/impact?dataset=tutorial`.

## World meaning, labels and depth

`src/graphics/partner-styles.ts` owns the shared destination vocabulary: reuse in green, components in purple, materials in clay and specialist handling in ochre, with matching role badges. Partner roofs, world labels, minimaps and entity lists reuse those meanings. Fleet profile colors and distinct vehicle geometry distinguish all six vehicles without turning the whole city into one green category. Color supplements names, roles and badges rather than being the only identifier.

`src/graphics/label-layout.ts` owns measured screen-space placement for native DOM WebGL labels and SVG compatibility labels. It prioritizes selection and hub/fleet identity, tries bounded stable nearby positions and yields lower-priority labels when space is exhausted. It rejects collisions, viewport edges, behind-camera anchors and scene/navigation overlays. Resizing, orbiting, vehicle movement, locale and font changes update placement.

`src/graphics/primitives.tsx` additionally tests depth against actual opaque scene geometry, including individual building instances. Raycasts and mesh discovery are throttled and shared; label priority never bypasses foreground occlusion. A selected vehicle's label can therefore disappear behind a building while the fleet rail and inspector remain available. The SVG renderer keeps its own coherent compatibility-map behavior; it is not evidence of physical 3D depth testing.

The selected vehicle can be followed through the city. Hub/device inspections remain available while the clock continues; pause supports close examination. Reduced motion removes ambient movement and interpolation while retaining meaningful state changes, lists, selection and immediate camera changes.

## Hub and Team activity

The hub's eight stations and derived queues retain stable device identity. Batched conveyor totes, six workers, two carts and handoffs make its receiving/sorting/forwarding work visible. Selectable moving device instances resolve to the actual asset. Fleet docks follow live vehicle poses and profiles. The clock, pause, live speed and reduced-motion preference govern the animation rather than an unrelated decorative timer.

Team defaults to the same live operating frame as Network. Its seven colleagues show derived task/status copy, active handoff links, subtle character motion and concrete related artifacts. The active route, hub queue, receiving capacity and recovery/data facts follow the selected live frame. Shared pause and six-speed controls freeze or accelerate those observations together. Explicit Tutorial mode retains the user's tutorial artifacts and checkpoints; live observation does not offer an approval as though the user had performed an earlier decision.

## Next, speed and household tracking

`src/domain/playback.ts` owns the six playback rates and next meaningful progression time. Guided Next and Tutorial Next stage respect submission, safety/data review and guided inspection points. At high speed the same guards remain mandatory; neither Next nor 30× accepts a request or approval. Retained holds remain valid outcomes.

Household tracking places its route map beside a Happening now panel on wide screens and stacks them readably on phones. The panel follows the actual request's batch and selected service window, showing current activity, collected/hub/completed counts, custody, route/vehicle context, pause/resume, all six speeds and Next stage. It distinguishes partial results, held devices, completed windows and later reserved windows. A map vehicle remains absent before a route is active, rather than implying collection already occurred. Multi-window navigation preserves the request's actual scope and can return to its saved inactive context.

## Design and evidence

The revision preserves the approved cream/forest identity and local Plus Jakarta Sans, shared Button/Chip/Tabs/Dialog controls, bilingual ID/EN content, native selects and mobile bottom navigation/focused sheets. It extends the existing city and chain-of-custody signature with meaningful role colors, depth-aware labels, visible hub work and shared Team activity.

Taste guidance was read from the supplied source snapshot. The earlier continuous revision retrieved Impeccable from its official `pbakaus/impeccable` repository at commit `6af45ac9a5eb8792f033d3242f52e99812fd91fa`; that historical tool/provenance record remains intact. Current production-design work follows the maintained design and interaction contracts.

Current executed commands, browser/graphics checks, actual period downloads and printable-report evidence are recorded in `docs/V12_VERIFICATION.json` and the current performance record. Older `UPDATED_E2E_RESULTS.json`, `NETWORK_UPDATE_VERIFICATION.json` and original-release evidence are dated history, not proof of this revision's runtime behavior. Software-rendered browser checks do not establish the unverified integrated-graphics laptop FPS target or physical-device acceptance.
