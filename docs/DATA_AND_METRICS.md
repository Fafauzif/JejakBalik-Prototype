# Data and metric definitions

All operational inputs in `src/domain/data/` are supplied authored scenario fixtures. They are not observed Jakarta operations, real household records, partner quotes, verified environmental results, or processor certifications. Fictional partner identities and locations are retained from the supplied `PARTNERS.json`. No avoided-carbon or pollution claim is calculated.

## Source records and boundaries

| Data                                             | Meaning                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `WORLD.json`                                     | Fictional Jakarta composition, sample household positions, hub, and 0.1 km coordinate scale           |
| `REQUESTS.json`, `ASSETS.json`                   | 36 requests and 48 devices across ten categories; the hero request initially remains draft            |
| `ROUTES.json`, `VEHICLES.json`                   | Seven route segments across six compatible vehicles; V01 has two sequential routes                    |
| `EVENTS.json`                                    | Authored milestones and checkpoints; contains no granted user approvals                               |
| `SCENARIOS.json`, `SCENARIO_PLAN_OVERRIDES.json` | Three experiences and concrete reduced-capacity route/event changes                                   |
| `FINANCIAL_ASSUMPTIONS.json`                     | Per-class collection rates, processing assumptions, funding, and platform share                       |
| `EXPLORATION_TEMPLATES.json`                     | Accepted item conditions, outcome mapping, physical properties, slots, timing, and reservation policy |
| `EXPECTED_BRANCH_METRICS.json`                   | Test expectations; these totals are not used as the metric implementation                             |

Service dates are separate from the compressed 180-second story clock. Canonical service is 19 October 2026, 09:00–11:00, Asia/Jakarta. Reduced-capacity deferrals are assigned 20 October. Exploration starts no earlier than 21 October and never reuses an earlier batch's reserved future dates.

## Cohorts and denominators

`batchAssets` counts all assets in submitted requests of the selected batch, including later-window items. `windowEligibleAssets` excludes deferred items. `collectedAssets` requires an eligible collection event. `completedAssets` additionally requires the full receiving, triage, routing, safety/data, and completion chain.

| Metric                     | Definition                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Submitted requests         | Unique submitted request IDs; excludes the canonical hero draft                         |
| Households served          | Unique households with at least one collected device                                    |
| Collected mass             | Sum of fixture mass for actually collected devices, in kg                               |
| Completed dispositions     | Completed assets grouped by their earned final disposition; sum equals completed assets |
| Value retained             | Completed reuse + repair + refurbishment assets                                         |
| Value-retention percentage | Value-retained count / completed assets × 100                                           |
| Collection coverage        | Collected assets / submitted batch assets × 100                                         |
| Current-window fulfillment | Collected assets / window-eligible submitted assets × 100                               |
| Custody completion         | Completed assets / collected assets × 100                                               |
| Data clearance             | Cleared devices and collected data-bearing devices are separate counts                  |
| Held at household / hub    | Uncollected safety-held devices / collected devices awaiting data clearance             |

Empty percentage denominators return `null`; display them as unavailable instead of 100%. Holds and deferrals are flags, not invented final dispositions. Planned disposition remains separate from an earned completed outcome.

## Equal-work collection comparison

`snapshot.routes` describes the currently eligible route plan. Report collection metrics recompute from devices already collected at the selected cursor. Before completion, the metrics therefore cover the realized collected cohort rather than every planned future pickup.

The grouped and dedicated comparison uses exactly that same collected cohort, the same handling classes, the same household-to-hub boundary, and the same vehicle rates. Each dedicated trip is a household/handling-class round trip. A household with ordinary and specialist items needs two compatible trips, but counts once in households served. Empty routes have no dispatch charge.

Grouped cost = sum of each active grouped route's distance × assigned vehicle rate + dispatch fee.

Dedicated cost = sum of each compatible household-class round trip's distance × that class's vehicle rate + dispatch fee.

Distance/cost reduction = (dedicated − grouped) / dedicated × 100. Negative results are not clamped away. Downstream legs are excluded on both sides of the comparison.

## Funding and contribution

Gross recovered value uses completed-device base value × outcome multiplier. Material recovery instead uses completed material mass × Rp9,000/kg. Specialist treatment has zero recovered value. The platform receives 20% of gross recovered value; gross value is not counted a second time as platform revenue.

Batch operating contribution = service-contract funding + community-access sponsor funding + platform recovered-value share − collection cost − completed-device processing cost − actual data-clearance cost.

The canonical authored batch has Rp1,800,000 service funding and Rp700,000 sponsor funding. Those are fixed per selected authored batch alternative; alternatives are not concurrent billed operations. Exploration funding is Rp0. Negative exploration contributions are retained. Contribution excludes corporate overhead, capital equipment, tax, working capital, and actual partner quotations, and is not company net profit.

Calculations retain source precision until presentation. Exported money totals round to whole rupiah. Metrics use fixture masses; no scale-measurement claim is made.

## Reconciled final branch totals

All four rows below were recomputed by the engine and checked against every supplied branch metric in automated tests.

| Quantity                         |   Positive | Specialist held | Data held | Capacity deferred |
| -------------------------------- | ---------: | --------------: | --------: | ----------------: |
| Batch assets                     |         48 |              48 |        48 |                48 |
| Window-eligible assets           |         48 |              48 |        48 |                46 |
| Collected / completed            |    48 / 48 |         46 / 46 |   48 / 30 |           46 / 46 |
| Households served                |         36 |              36 |        36 |                34 |
| Collected mass, kg               |     189.64 |          188.84 |    189.64 |            180.14 |
| Cleared data-bearing devices     |         18 |              18 |         0 |                18 |
| Grouped route segments           |          7 |               6 |         7 |                 7 |
| Grouped distance, km             |       75.2 |            67.0 |      75.2 |              74.4 |
| Dedicated trips                  |         41 |              39 |        41 |                39 |
| Dedicated distance, km           |      319.0 |           303.0 |     319.0 |             304.2 |
| Grouped collection cost, Rp      |    637,700 |         493,900 |   637,700 |           634,100 |
| Dedicated collection cost, Rp    |  2,738,900 |       2,454,900 | 2,738,900 |         2,622,300 |
| Gross recovered value, Rp        | 15,244,370 |      15,244,370 | 4,250,250 |        15,167,870 |
| Platform share, Rp               |  3,048,874 |       3,048,874 |   850,050 |         3,033,574 |
| Processing cost, Rp              |  3,170,000 |       3,040,000 | 1,700,000 |         3,140,000 |
| Data-clearance cost, Rp          |     63,000 |          63,000 |         0 |            63,000 |
| Batch operating contribution, Rp |  1,678,174 |       1,951,974 | 1,012,350 |         1,696,474 |
| Collection coverage              |       100% |         95.833% |      100% |           95.833% |
| Custody completion of collected  |       100% |            100% |     62.5% |              100% |

| Completed disposition | Positive | Specialist held | Data held | Capacity deferred |
| --------------------- | -------: | --------------: | --------: | ----------------: |
| Reuse                 |       12 |              12 |         6 |                12 |
| Repair                |       10 |              10 |         8 |                10 |
| Refurbishment         |        8 |               8 |         2 |                 8 |
| Parts                 |        6 |               6 |         4 |                 5 |
| Material              |       10 |              10 |         8 |                 9 |
| Specialist            |        2 |               0 |         2 |                 2 |

The higher short-window contribution under a safety hold comes from work and treatment costs not yet performed, not from an improved complete service outcome. Its two uncollected devices stay visible. The capacity branch has 46/46 current-window fulfillment but only 46/48 batch collection coverage. The two canonical deferred devices are scheduled, not counted as collected; separate playback of that canonical later window is outside the current implementation.

## Exploration capacity

Per-window available collection slots are 12 ordinary, four bulky, and two specialist, with physical vehicle mass/asset constraints also checked. Destination slots are P01 12, P02 six, P03 ten, and P04 two. Six three-item requests therefore produce these first-window results:

| Eighteen submitted items | First-window eligible | Deferred |
| ------------------------ | --------------------: | -------: |
| Large appliances         |                     4 |       14 |
| Batteries                |                     2 |       16 |
| Functional phones        |                    12 |        6 |

Each overflow window has its own session, decisions, events, and report. Request tracking aggregates the saved outcomes of its allocated windows. Canonical funding and totals never enter an exploration report.
