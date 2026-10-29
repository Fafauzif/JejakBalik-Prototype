Version 1.3.1 adds a bootstrap and bounded recovery surfaces, separates the interactive map from the deferred WebGL renderer, and shares a monotonic timestamp for visual animation. See `V13_VISUAL_RELIABILITY.md` for the revision and `V13_VERIFICATION.json` for current evidence. The operational domain and tutorial decision authority described below are retained.

# Application architecture

Version 1.2 retains a separate continuous operations presentation model. `src/state/network-store.ts` owns an ephemeral monotonic live clock and Network live/tutorial switch; `src/domain/live-operations.ts` derives its bounded rolling fleet, workload, hub queues, and handoff feed. `src/state/store.ts` remains the authority for the user's explicit tutorial/exploration decisions and exports. Live operations is not a second authority for those decisions. Partner fleet profiles own vehicle forms, origins, delivery and backhaul roles. `src/domain/operating-history.ts` separately owns the immutable 2,812-device monthly ledger used by default Assets/Impact and historical passports. `src/domain/playback.ts` derives safe Next targets; the store clamps playback to fresh review checkpoints and guided interactions at every speed. Team subscribes to the shared live frame, while Household uses its own request/window context. See `CONTINUOUS_OPERATIONS.md` and `OPERATING_HISTORY.md`; the authored-session descriptions below refer to the Tutorial.

Jejak Balik is a browser-local React/TypeScript application built with Vite. Its authored operations run without an AI service, server, account, payment flow, or live telemetry. Operational decisions affect local scenario records; they do not authorize an external processor or book a real collection.

## Module boundaries

| Location                                   | Responsibility                                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `src/domain/data/`                         | Bundled, authored assets, requests, routes, vehicles, events, assumptions, expected results, and exploration templates |
| `src/domain/types.ts`                      | Shared entity, snapshot, decision, window, and exploration contracts                                                   |
| `src/domain/fixtures.ts`                   | Typed fixture exports; canonical records are treated as immutable inputs                                               |
| `src/domain/context.ts`                    | Canonical scenario selection, capacity overrides, eligible cohort, funding, and receiving capacities                   |
| `src/domain/engine.ts`                     | Pure reconstruction of an operational snapshot from seed, events, decisions, and story time                            |
| `src/domain/session.ts`                    | Exact-time checkpoints, review-token issuance, accepted local decisions, and stable context keys                       |
| `src/domain/routing.ts`                    | Axis-aligned route rebuilding and vehicle-position interpolation                                                       |
| `src/domain/metrics.ts`                    | Actual collected-cohort comparison, completed-outcome values, costs, and funding                                       |
| `src/domain/exploration.ts`                | Request validation, FIFO window allocation, calendar reservations, routes, and authored events                         |
| `src/domain/persistence.ts`                | Versioned import validation and safe CSV encoding                                                                      |
| `src/state/store.ts`                       | One active session, saved window sessions, preferences, actions, shared selectors, persistence, and export functions   |
| `src/features/`                            | Household registration/tracking, team artifacts, impact reporting, and the world container                             |
| `src/graphics/`                            | City, hub, and device rendering; visual transforms do not grant operational permissions                                |
| `src/app/`, `src/components/`, `src/i18n/` | Navigation, shared controls, layout, and localized content                                                             |

`src/domain/index.ts` is the public domain barrel. React workspaces consume `useAppStore`, `useSnapshot`, `useRequestDirectory`, or `useRequestView` from `src/state/store.ts`. They select IDs rather than maintaining separate operational copies.

## Snapshot algorithm

`deriveSnapshot(seed, events, decisions, cursor, scenarioId, context)` is a pure derivation. It does not mutate a progressively accumulated live snapshot.

1. Clamp story time to 0–180 seconds. Keep only decisions belonging to the selected scenario, batch, and window whose timestamp equals the associated canonical checkpoint and is not later than the cursor.
2. Derive submitted requests. The canonical hero remains a draft until its actual `submit_hero` decision becomes visible at 32 seconds.
3. Filter eligible, submitted assets; suppress deferred assets and the unapproved specialist route. Rebuild changed route cohorts using the same road rule and update collection timestamps to match stop arrivals.
4. Create fresh asset records from the seed. Apply timestamp overrides, sort events, and consume only the event prefix at or before the cursor.
5. Require the previous lifecycle state, submitted request, current-window inclusion, event guard, compatible route, safety approval, receiving destination, receiving capacity, and data clearance as applicable. A guard alone does not bypass shared preconditions.
6. Add accepted custody events once using the key `batchId/windowId/eventId`. Derive hold flags, unresolved checkpoints, and metrics from the resulting records.

Rewinding derives another prefix of the same immutable inputs. It neither removes saved decisions nor grants new ones. A later replay of the same decisions reconstructs identical custody IDs and totals. Capacity overrides also update the `AssetSnapshot.asset.collectionStorySecond` visible to inspectors.

## Session and permission scope

The session key is `scenarioId/batchId/windowId`. One selected `WindowSession` advances; other sessions remain paused history. The canonical batch is `canonical`, with window `2026-10-19`. Exploration batches use `EXP-1`, `EXP-2`, and so on, with stable window IDs such as `EXP-1-W1`.

| Gate       |  Story time | Accepted actions                               |
| ---------- | ----------: | ---------------------------------------------- |
| Hero       |  32 seconds | `submit_hero`                                  |
| Specialist |  74 seconds | `approve_specialist`, `retain_specialist_hold` |
| Data       | 130 seconds | `approve_data_release`, `retain_data_hold`     |

`reviewGate` pauses at the exact checkpoint, deletes decisions at that gate and later gates, increments the revision, and issues a token bound to gate, scenario, batch, window, and revision. `recordDecision` accepts only the corresponding action while paused at that checkpoint with the matching token. Acceptance consumes the token and increments the revision. Repeating an action, changing a decision after a seek, using a different window's token, or using a stale revision returns `needs_gate_review` without changing state.

The first playback arrival at an undecided checkpoint invokes review. Seeking never issues a token and invalidates any live token. Switching contexts invalidates the departing and arriving live review state while retaining accepted decision history. Import and restoration also discard tokens and pause playback.

## Clock and route movement

The store advances with elapsed wall-clock seconds multiplied by the chosen 0.5×, 1×, or 2× speed, not by frame count. Individual elapsed deltas are capped at 0.5 seconds. Hidden documents pause instead of producing an unbounded catch-up burst. Playback stops at unresolved checkpoints or 180 seconds.

Vehicle interpolation samples cumulative polyline distance between authored route start/end times. Collection events use those same stop-arrival timestamps; receipt requires the vehicle route to have ended. Coordinate units represent 0.1 km. A changed cohort removes empty stops, builds x-then-y legs from the hub through remaining stops and home, and resamples arrival times. Empty routes incur no dispatch fee.

## Exploration history and reservations

An exploration session allows six requests, each with one to three accepted template items. Additions go to the newest unstarted batch. Once a batch has started, any further request creates a new batch whose first date is strictly after every date reserved by earlier batches, including overflow windows. Canonical service/deferred dates through 20 October 2026 stay reserved. The first possible exploration date is 21 October, 09:00–11:00, Asia/Jakarta.

Allocation uses request creation order and item order. It checks available handling slots, physical vehicle limits, and destination slots. A request can therefore span classes and days. The global request directory aggregates each item's own window history, so a household stays partial until all its items complete. Returning to canonical history preserves exploration records. Explicit exploration reset clears its history and reservations together.

## Persistence and export

Local storage key: `jejak-balik.session.v1`. Schema version: `1`. Writes are coalesced and a page-hide write preserves the latest available state. If browser storage is unavailable, the in-memory application remains usable. Invalid or old saved data recovers to a fresh session with a recovery notice.

JSON contains preferences, active context, all saved sessions, scoped decisions, exploration records, reservations, service timezone, and save time. It never preserves a live review token. Import is bounded to 1 MB through the text entry point and validates structure, counts, dates, IDs, references, decision times, context scopes, template physical properties, capacity, and reservations. It reconstructs exploration creation and FIFO allocation from accepted templates and compares the reconstructed records before accepting them. Imported data is never executed.

CSV exports are generated from the selected snapshot's actual asset and custody rows. They use UTF-8 BOM, CRLF records, quote escaping, and a leading apostrophe for formula-like cell values. Runtime exports are distinct from source/brand deliverables.

## Current boundary

The canonical reduced-capacity scenario defers two devices to 20 October and excludes them from the current-window events and metrics. It does not provide a separately playable canonical 20 October session. Exploration overflow windows have separate selectable sessions and working progression. This boundary should be retained in technical handoff rather than describing canonical deferred devices as already served.

The domain tests do not establish browser rendering quality, mobile accessibility, WebGL recovery, FPS, or deployment. Those require separate integration evidence.
