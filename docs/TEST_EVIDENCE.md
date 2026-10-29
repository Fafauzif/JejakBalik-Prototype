> Current revision: **1.3.1**. Read `V13_VISUAL_RELIABILITY.md` and `V13_VERIFICATION.json` for the delivered changes and current executed results. Counts and observations below are retained historical evidence.

# Domain and shared-state test evidence

This document records executed unit/domain tests, not browser, GPU, mobile, accessibility, deployment, or print verification. Final application integration evidence belongs in the separate verification/performance documents.

Current v1.2 results are in `V12_VERIFICATION.json` and `V12_E2E_RESULTS.json`. The following detailed domain record is retained from version 1.0; its counts are historical.

## Original executed result

On 16 October 2026 the initial four domain suites passed **45 of 45 tests**. A subsequent review added two shared-precondition regressions: missing collection must block every downstream lifecycle event/data clearance, and routing must honor receiving slots and destination compatibility. That complete domain run passed **47 of 47 tests across four files**, with zero failures.

Command used for the final recorded run:

```sh
npm test -- tests/domain --reporter=json --outputFile=/tmp/jejak-domain-tests.json
```

The result summary and individual assertion names are retained in `docs/DOMAIN_TEST_RESULTS.json`. The temporary reporter file itself is not required to run the project.

| Suite                                     | Passing assertions | Scope                                                                                                                                                                              |
| ----------------------------------------- | -----------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/domain/canonical.test.ts`          |                 16 | Every expected branch metric, exact route cohort, seed reconstruction, receipt/collection timing, lifecycle preconditions, receiving constraints, and checkpoint-token regressions |
| `tests/domain/exploration.test.ts`        |                 14 | Request bounds, FIFO allocations, handling/receiving/mass limits, split windows, date reservations, route timing, relevant gates, and canonical/exploration separation             |
| `tests/domain/exploration-engine.test.ts` |                  8 | Actual progression and costs for exploration windows, held branches, scoped decisions, irrelevant-gate omission, and persistence compatibility                                     |
| `tests/domain/store-persistence.test.ts`  |                  9 | Shared clock, checkpoint arrival, seek/token invalidation, context switches, late batches, household history aggregation, reset, JSON, and CSV                                     |
| **Total**                                 |             **47** | **All passed**                                                                                                                                                                     |

## What was checked

### Canonical outcomes and finances

Each final branch is reconstructed from the seed, authored events, and accepted local checkpoint decisions. The tests iterate every key in `EXPECTED_BRANCH_METRICS.json`; they do not merely assert a few display-card totals. Numeric expectations are checked to two decimal places against the fixture precision, and disposition objects are compared exactly. Route IDs, included asset lists, and distances are checked separately.

The verified branches are positive 48/48 collected/completed; specialist hold 46/46 with two uncollected; data hold 48/30 with 18 retained at the hub; capacity deferral 46/46 current-window collected/completed, out of 48 batch assets. The positive branch reconciles Rp1,678,174 batch contribution and 75.2 versus 319.0 collection km.

### Reconstruction, shared preconditions, and custody

Repeated derive → rewind → derive cycles preserve the original seed and reproduce identical snapshots. Custody IDs use `batchId/windowId/eventId`; duplicates are rejected by the append operation and the tests verify ID uniqueness. CSV rereads after rewind/replay produce identical custody content.

Tests check vehicle position at every authored collection stop, return-to-hub endpoints, physical limits, and V01's sequential routes. All events for the two canonical deferred assets remain suppressed. New precondition tests remove every collection event and confirm there are no receipts, data clearances, completions, or collection charges; zero receiving capacity blocks completion, and an incompatible destination permits only its accepted disposition.

### Human decisions

The tests seek to 180 without decisions and confirm that no safety/data permission is invented and the hero remains a draft. They reject late approvals without review, direct-seek reversals, consumed tokens, stale revisions, wrong exact times, unpaused acceptance, cross-batch/window/scenario tokens, and fabricated decision timestamps. Explicit review clears the reviewed gate and downstream decisions. A held branch reaches 48 completions only after legitimate review, approval, and downstream review.

Store tests advance the actual shared clock through 32, 74, 130, and 180 seconds, confirming that each undecided checkpoint pauses and requires its own action. Context switching clears live tokens and preserves earlier accepted decisions.

### Exploration and reservations

Parameterized 18-item tests verify first-window counts of four large appliances, two batteries, and 12 phones, with remaining devices deferred. Tests reject a seventh request, unknown item/condition/address, and zero/four-item submissions without mutating history. Receiving limits across mixed classes, physical mass constraints, repeated-household stop collapse, split requests, and matching route/event timestamps are exercised.

A six-battery batch reserves 21–23 October; a request submitted after it starts begins on 24 October. A new request after canonical 180 seconds starts at exploration time zero. A further request after exploration begins creates a fresh future batch without rewinding the prior batch. Returning to canonical history preserves its expected metrics. Household directory tests remain partial after the first split window and become complete only after the later window's independently approved progression.

### Persistence and export

Actual mixed batches and reservation history round-trip through the validator. Restored/imported sessions pause and lose live tokens. Invalid schema/JSON, out-of-range cursors, changed physical templates, missing item references, and altered reservation dates are rejected. Validation also reconstructs the accepted creation order and capacity allocation instead of trusting imported fields.

The asset CSV at positive completion contains one header plus 48 current records. Custody CSV contains unique actual event rows. Tests check UTF-8 BOM, quoted comma/quote values, formula-like cell defense, stable repeated output, and the exact completed hero row.

## Evidence limits

- Passing domain tests proves the checked deterministic model and store behavior. It does not establish that every UI action is correctly connected until browser integration testing is complete.
- These tests do not measure rendering FPS, integrated-GPU performance, memory disposal, accessibility conformance, responsive layout, download reopening in a browser, or printed/PDF page layout.
- The physical mass regression temporarily lowers vehicle V03's mass capacity in a controlled test and restores it afterward; production fixture capacities remain unchanged.
- Canonical capacity deferrals are represented as a later schedule without a separately playable canonical later-window session. Exploration overflow windows have independent progression and tests.
- No real-world outcome, partner authorization, external publication, deployment, or user-data integration is inferred from these tests.
