# JejakBalik 3.0 architecture

## Intended operating system

JejakBalik matches eligible electronics returns to available carrying capacity on existing journeys across fictional logistics providers. The proposed real service would operate within funded institutional/community collection programs. A provider supplies an existing journey and recovery capacity; a receiver specifies categories, capacity and receiving windows; an owner specifies the device and permission. The system proposes a feasible collection and receiving insertion. An operator reviews the proposal. Custody and unresolved work remain attached to each device.

The current software demonstrates that mechanism using authored scenario inputs. It does not book a carrier, create a contract, sanitize media, verify a facility, transfer money, or measure field outcomes.

## Module ownership

| Module | Responsibility |
|---|---|
| `src/recovery/types.ts` | Shared scenario, journey, request, receiver, plan, event and scene contracts |
| `src/recovery/seed.ts` | Fictional providers, fixed journey inputs, category properties and planning cost assumptions |
| `src/recovery/model.ts` | Deterministic insertion, constraints, approval and simulated custody progression |
| `src/recovery/persistence.ts` | Validated local scenario storage/import and export |
| `src/recovery/RecoveryApp.tsx` | Shared scenario controller, four workspaces, user actions and guidance |
| `src/recovery/usePlanning.ts`, `planning.worker.ts` | Background planning with exact-input/sequence matching and a disclosed fallback |
| `src/recovery/RecoveryWorld.tsx` | Immediate interactive map, deferred renderer and recovery |
| `src/recovery/world-scene.tsx` | Fixed miniature, original/planned paths, vehicle/hub/device inspection |
| `src/app/App.tsx` | Lazy loading and shared route recovery boundary |
| `api/assistant.ts`, `server/assistant-core.ts` | Optional bounded model suggestions; no domain write authority |

The earlier `src/domain` and `src/features` implementation remains in the source tree for compatibility and lineage. The current app entry loads RecoveryApp. The historical modules do not own the new scenario. Retaining them permits extract-and-replace installation without requiring a manual directory purge.

## Planning boundary

The fictional street network is a fixed complete orthogonal grid. Coordinates use 0.1 km per unit; scenario streets are separated by 12 coordinate units. Travel follows the road grid rather than drawing a direct diagonal. Routes do not add/remove buildings. Service minutes are offsets from 09:00 WIB. Travel speed, stop dwell, capacity, compensation and handling costs are planning assumptions, not traffic observations or quotations.

Journey origin, ordered forward stops and destination remain in the proposed route. Recovery pickup precedes receiving handoff. The planner searches insertions within the original stop sequence, checks each candidate and chooses deterministically. It is a bounded greedy insertion heuristic, not an exact/global optimum, learned traffic predictor or live carrier feed. New recovery work is assigned only before the relevant journey departs; this conservative boundary avoids reconstructing an already-traveled prefix from an invented live position. Recovery capacity is the capacity offered for this purpose, not a simulation of all forward parcel loads.

Constraints include consent, handling compatibility, pickup/receiving windows, available carrier and receiver, vehicle mass/slots, added-time limit, receiver allocation and program budget. Unmatched requests remain visible with reasons. No absence of a plan is converted into an invented successful outcome.

## Preview, approval and custody

A plan is a proposal for one scenario revision. Approval checks that the proposal still matches the scenario and the domain result. A changed relevant input invalidates unexecuted approval. Selecting a scene object or moving the visual clock does not approve a request or advance custody.

Simulated service progression records attributable scenario events in chronological order. Devices already physically represented as collected/received are not silently reassigned or rewound by a cancellation. Data-bearing items remain held before completed disposition until the explicit simulated clearance condition is met. Clearance is a demonstration decision, not data erasure. Unfinished work and its handling allowance remain visible.

## Cost and comparator boundary

Service cost consists of modeled incremental provider compensation and category handling allowances. Estimated device value is not platform cash income. The demonstration makes no profitability or guaranteed saving claim. Budget restrictions may reduce coverage; results show the resulting denominator.

The comparator groups the same accepted requests into dedicated scheduled handling-class rounds. It is an illustrative, transparent alternative rather than a measurement of any existing operator. Results need the common-workload, geography, time/cost and excluded-cost boundaries beside the comparison. The UI displays baseline feasibility and coverage and suppresses equivalent-service savings when that baseline is infeasible. Costs are nominal IDR planning assumptions; full organizational overhead, taxes, working capital and actual treatment quotations are not established.

## State, identity and privacy

A browser-local version-3 namespace keeps the new scenario separate from legacy records. JSON is validated as data. Invalid content does not replace a valid scenario. Imported or restored cached plans require fresh review and approval before further service progression. Accepted imported custody history is user-provided fictional data, not authenticated operational evidence. There is no operational multi-party authentication or shared transactional backend. Replacing a local file or approving a scene plan does not create a real partnership.

ID/EN presentation uses the existing locale provider. Real credentials remain server-only. Optional AI is presenter-controlled and supplementary; a dedicated USD 1 provider-side total cap is the budget boundary. Real paid-model quality and deployed behavior require their own actual checks.

## Verification

The release record is `docs/V3_VERIFICATION.json`. Unit checks establish bounded algorithm/state behavior. Browser checks establish the observed UI workflows and software-rendered scenes. They do not establish field viability, carrier permission, legal authorization, environmental impact, or physical-device FPS. The replace-all acceptance check overlays the final ZIP onto the source baseline and verifies the resulting build.
