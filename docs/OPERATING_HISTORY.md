# Operating-history ledger (v1.2)

The default Assets and Impact views communicate a long-running service concept through an immutable, fictional authored operating scenario. They are not observed operating results, partner quotations, certificates, audited financials, or evidence of real collections. The interface intentionally keeps implementation provenance in this documentation rather than adding technical labels to every product interaction.

## Scope and separation

`src/domain/operating-history.ts` owns the deterministic ledger. Its explicit January–October 2026 monthly volumes are 188, 216, 240, 252, 276, 304, 328, 348, 376, and 284 devices: 2,812 devices, 40 service cohorts. The scenario's as-of date is 20 October 2026. This is an authored scene date, independent of the host clock. Four cohorts per month keep the history inspectable; the final 20 October cohort contains completed, collected, hub, routed, assigned, and scheduled devices. Earlier cohorts are complete. There are no November/December outcomes or annualized future totals. “2026 · year to date” is the sum of these ten months, not a full-year forecast.

The ledger is generated once from explicit month counts and bounded category/condition/mass variations, then recursively frozen. Stable IDs use `JB26-MM-#####`. Each device has its own category, mass, service date, request, household alias, pathway, custody events, and clearance state. Device templates provide plausible per-unit masses; mass does not scale with a display multiplier. The fictional named locality aliases contain no personal addresses.

The tutorial's 48 canonical devices, 47/48 branches, event guards, decisions, report, and store remain separate and unchanged. Viewing history neither accepts user safety/data approvals nor writes tutorial state. The explicit **Tutorial batch** dataset tab exposes the original scoped tutorial snapshot. Historical asset passports use `/assets/JB26-…`; original tutorial devices continue to open the Network inspector.

## Collection comparison

Both alternatives include exactly the same already-collected devices and handling classes, from household to hub. They exclude the equal downstream hub-to-destination leg. A household/class group stays together. The dedicated alternative makes one hub–household–hub trip per household and handling class. Grouped routes connect household stops in authored deterministic order and return to the same hub. Distances use Manhattan paths through the same kilometre coordinates.

| Class | Capacity, devices | Capacity, kg | Rate, IDR/km | Dispatch fee, IDR |
| --- | ---: | ---: | ---: | ---: |
| Ordinary | 12 | 80 | 4,500 | 25,000 |
| Bulky | 4 | 240 | 6,500 | 45,000 |
| Specialist | 6 | 30 | 6,000 | 50,000 |

For both alternatives, `collection cost = distance × class rate + dispatch count × class dispatch fee`. Dedicated distance and dispatch are summed from the identical household/class coverage; grouped dispatch is one per recorded grouped route. No emissions factor, avoided-carbon claim, or observed traffic claim is inferred from distance.

## Outcomes and economics

Completed recovery mass and outcome counts include only completed devices. Devices in progress are shown separately. “Returned to use” includes reuse, repair, and refurbishment, excluding component/material recovery and specialist treatment. Clearance cost is charged once per recorded cleared data-bearing device, including cleared in-progress devices.

Financial assumptions reuse the scenario's maintained `FINANCIAL_ASSUMPTIONS.json` processing costs, recovery multipliers, material rate, clearance cost and platform share. Each service cohort has an explicit funding entry: contract funding `500,000 + device count × 13,000 IDR`, and community-access funding `180,000 + floor(device count / 10) × 20,000 IDR`. These are scenario inputs attached to cohorts, not unexplained annual multipliers or real agreements.

Gross recovered value belongs downstream. Only the platform's 20% share enters revenue. Revenue and funding equal service-contract funding + community-access support + platform recovered-value share. Operating expenses equal grouped collection + processing of completed devices + recorded data-clearance costs. Operating contribution is their difference and excludes corporate overhead, capital equipment, tax and working capital. It is not net profit.

## Exports and verification

The Assets CSV exports the selected period and current filters, with one row per matching device. The Impact asset CSV includes all devices in its selected period; its monthly CSV provides the underlying monthly metric rows. Period JSON includes selected assets, cohorts, routes, funding entries, assumptions and derived metrics. The printable period report uses the same selection and includes outcomes, comparison boundaries, funding/costs and monthly totals. Original tutorial three-page reports remain in the existing report module.

`tests/domain/operating-history.test.ts` verifies deterministic bounds, frozen records, canonical isolation, per-unit mass ranges, passport resolution, complete monthly/year reconciliation, route capacity and equal household/class coverage, the 20% revenue share, and export/report consistency. Browser checks additionally verify actual downloads, dataset selection, period filtering and historical passport navigation.
