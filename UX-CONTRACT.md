# Jejak Balik UX contract

## Product context

Jejak Balik serves Indonesian households and service operators through one connected circular-electronics workflow. The interface presents a fictional Jakarta service with authored records. It uses Bahasa Indonesia by default and an English toggle, Gregorian dates, Asia/Jakarta time, and IDR currency. Native-language editorial review is not claimed. The accessibility target is WCAG 2.2 AA; the present verification is scoped testing, not certification.

This build has no account, backend, AI call, payment, live route feed, or external booking. Decisions and submissions change browser-local authored state. Do not add a live-service implication to an export or outcome. Technical limits belong in project documentation; normal product copy explains the user's task.

## Business-context sources

This contract records UI consequences and points to the domain authority. It does not duplicate operational policy.

| Domain / scope                                          | Authoritative source                                                                                          | Source type                                          | Reviewed date |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------- |
| Product purpose, market, device scope, no-account entry | `docs/brief/APPROVED_DECISIONS.md`                                                                            | Approved brief                                       | 2026-10-16    |
| Local decision permissions and custody lifecycle        | `src/domain/session.ts`, `src/domain/engine.ts`, `src/domain/types.ts`; explanation in `docs/ARCHITECTURE.md` | Domain contract                                      | 2026-10-16    |
| Additional requests and capacity windows                | `src/domain/exploration.ts`, `src/domain/data/EXPLORATION_TEMPLATES.json`                                     | Domain contract                                      | 2026-10-16    |
| Persistence, import, reset, retention                   | `src/domain/persistence.ts`, `src/state/store.ts`                                                             | Versioned local-data contract                        | 2026-10-16    |
| Costs and impact, no payment execution                  | `src/domain/metrics.ts`, `docs/DATA_AND_METRICS.md`                                                           | Authored model                                       | 2026-10-16    |
| Partners and legal claims                               | `docs/brief/APPROVED_DECISIONS.md`                                                                            | Fictional-partner / no-external-verification scope   | 2026-10-16    |
| Continuous network cadence                              | `src/domain/live-operations.ts`, `src/state/network-store.ts`                                                 | Browser-local simulation, independent tutorial clock | 2026-10-16    |
| Operating history | `src/domain/operating-history.ts`, `docs/OPERATING_HISTORY.md` | Immutable authored monthly/YTD ledger; separate from tutorial | 2026-10-16 |
| Content and language                                    | `src/i18n/index.ts`, `src/i18n/id.json`, `src/i18n/en.json`; approved brief                                   | Locale/content policy                                | 2026-10-16    |

No user-role security model is implied by the visible agent team. A local safety/data gate must still be explicitly reviewed and accepted at its scoped checkpoint. A camera action, scene selection, seek, or imported token never grants that permission.

## Visual contract

Visual intent and token values live in `DESIGN.md`. Model B retains `src/app/design-tokens.json` as canonical; `src/app/global.css` is the semantic CSS adapter and `src/components/ui.tsx` owns foundational components. `node scripts/check-design-tokens.mjs` checks the documented mapping. Warm light is the supported theme. Changes to shared tokens must update the source, adapter, documentation, and verification together.

## Canonical UI Map

| Capability     | Canonical owner                                                      | Source of truth                         | Allowed variants                                                    | Verification                                        |
| -------------- | -------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| Select/Listbox | Native HTML select, global field styles, locale-owned options        | This contract and `DESIGN.md` Forms     | Native operating-system popup; closed trigger may vary by density   | Browser select/keyboard, ID/EN options, narrow form |
| Date           | `useLocale().date` and domain-allocated service windows              | Domain allocation + `src/i18n/index.ts` | Display-only date; allocated-window radio; no arbitrary date picker | Window domain tests and request browser flow        |
| Form           | `RequestForm` draft/validation flow; shared Button and global fields | This ledger + exploration API           | Additional request; fixed canonical hero                            | `tests/e2e/operations.spec.ts`, household evidence  |
| Scrollbar      | `src/app/global.css` global standards + WebKit baseline              | `DESIGN.md`                             | Table/map/dialog geometry only                                      | Static audit plus computed browser style            |
| Toast          | App shell `session-notice` and shared status semantics               | This feedback contract                  | Persistent status notice; inline alert; no floating toast queue     | Import/reset and form failure browser paths         |
| CRUD           | Store action API and route-owning feature                            | Domain contract + flow ledger           | Create→request tracking; scoped reset; explicit decision review     | `tests/e2e/operations.spec.ts`, domain tests        |

Table Selection is not applicable: the registry has no multi-select or bulk mutation. Future selection must define scope before adding checkboxes. The Date row intentionally describes a display capability, not an implemented calendar widget. A native select popup is platform-owned by design; the app does not promise custom popup geometry or locale for browser chrome.

## Routes and state

| Surface          | Route / selected state                                       | Navigation outcome                                                                   |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Network          | `/network` (`/` redirects; `/twin` alias), entity/mode query | Selection opens the matching desktop inspector or mobile modal sheet                 |
| Team             | `/team?agent=...`                                            | Stable agent identity and its artifacts                                              |
| Assets | `/assets` plus period/query/filter/sort/page and `dataset` | History passport at `/assets/JB26-…`; tutorial device opens matching Network context |
| Impact | `/impact` and implemented subroutes, period and `dataset` | Monthly/YTD history by default; `dataset=tutorial` uses active batch/window |
| Household        | `/household`                                                 | Saved requests and device-category entry points                                      |
| New request      | `/household/request`, optional category or `hero=1`          | Successful create opens actual `/household/requests/:id`                             |
| Request tracking | `/household/requests/:id`                                    | Its own batch/window history; explicit follow action activates the applicable window |

The default Network mode is Live operations: an already active, browser-local service day with a repeating fleet cadence. The visible clock, vehicle state, hub state, and recent activity come from that same operational model. Tutorial is an explicit separate mode; starting its guided journey begins from the opening scene and retains the existing review checkpoints. Live motion derives a separate rolling cohort; it must not submit the canonical hero request, accept a tutorial safety/data decision, or overwrite a saved tutorial session. Pausing live motion is available without entering the tutorial. The interface uses an operations register; provenance in project documentation makes clear that it is authored browser-local activity, not remote telemetry. Partner/community profiles determine distinct origins, normal delivery legs, compatible backhaul pickups and recovery handoffs. Live Team uses the same clock; its artifacts cannot grant tutorial permissions.

Locale changes preserve operational state and form edits. Browser Back retains URL-backed registry filters. The shell remains usable during route loading and reserves a shared loading surface. Unknown routes show the app-owned NotFoundPage with a return path; unknown device/request IDs give a usable empty state rather than fabricated content.

## Component behavior

| Component    | Default / hover                             | Focus / active                                 | Disabled / busy                                   | Failure                                        |
| ------------ | ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| Button       | Specific verb; same semantic color on hover | Visible outline; press response                | Native disabled, `aria-busy`, no duplicate action | Recovery stays in owning form/dialog           |
| IconButton   | Accessible localized label and title        | Native button keyboard                         | Same shared Button states                         | Contextual text explains unavailable action    |
| Input/select | Real label; native select popup             | Visible focus; selection preserved             | Read-only/disabled only when domain fixed         | Inline error, association, first-invalid focus |
| Search       | Immediate local filter and explicit clear   | Keyboard access, clear returns focus           | No remote loading state                           | No-results offers clear filters                |
| Tabs         | Selected state is textual + visual          | Arrow-key selection, real buttons              | No hidden essential content                       | Active content remains reachable               |
| List/table   | Bounded dataset, identified rows            | Real links/buttons                             | Stable rows while snapshot changes                | Empty/no-results distinction                   |
| Dialog       | Radix modal with title/description          | Focus containment, Escape, trigger restoration | Confirmation action does not repeat               | Keep corrective context visible                |

No password/token form exists. Do not add unmasked sensitive inputs. Product forms use `noValidate`; browser-native validation bubbles and `alert`, `confirm`, or `prompt` are not UI primitives. Textareas, if introduced, inherit resize-none and need a sufficient height or expansion path.

## Dataset navigation

The Assets registry defaults to 2,812 immutable authored historical devices across 40 January–October cohorts, with monthly/year-to-date selection. Historical passports retain stable IDs. The explicit Tutorial dataset derives records from the active snapshot. Both are bounded in-memory datasets, with client pagination, range/total, category/status/tab filters, and ID/mass sort. Committed period, dataset, `q`, category, status, tab, sort, and page are URL state. Filter changes reset page; display page clamps to the available range. Search is local and immediate, so it has no debounce, network race, retry, or loading fiction. Clearing is immediate and restores input focus.

The city/entity list and team roster are bounded fixtures. Household lists at most the canonical hero and six added requests. No unbounded infinite scrolling or select-all-results behavior is present. Each route owns document scrolling; the map, wide table, and long dialog body may own contained overflow. A long form must not inherit a table or scene's fixed viewport height.

## Flow ledger

| Operation                 | Trigger                                                  | Pending                                                      | Success destination / feedback                              | Failure recovery                                    | Focus outcome                                   | Source ref                                     |
| ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| Add request               | Review checkbox + Schedule pickup                        | Guard duplicate calls; shared busy/disabled state            | Actual request detail with allocated windows                | Preserve draft and show text error                  | First invalid checkbox/field; next step heading | `src/domain/exploration.ts`, `RequestForm.tsx` |
| Guided hero               | Explicit final submission at actual 32-second checkpoint | Final action disabled with short countdown before checkpoint | Canonical JB-R036 tracking; playback continues              | Remain in review; never auto-confirm                | Review heading / invalid checkbox               | `src/domain/session.ts`, `RequestForm.tsx`     |
| Free hero review          | Explicit hero form submit outside guided journey         | Review gate at canonical checkpoint                          | Same JB-R036 record                                         | Explain a failed review; retain form                | Owning request context                          | `src/state/store.ts`                           |
| Back/edit draft           | Step Back/Edit or return later                           | None                                                         | Prior fields preserved; additional draft saved locally      | Malformed draft returns to usable sample            | Changed step heading                            | `RequestForm.tsx`                              |
| Safety/data decision      | Open artifact, review checkpoint, choose approve/retain  | Exact-time scoped token; no implicit acceptance              | Same selected context, changed snapshot and related views   | Review again if token is invalid                    | Dialog closes to trigger                        | `src/domain/session.ts`, `GateDialog.tsx`      |
| Search/filter/sort        | Registry controls                                        | Immediate local derivation                                   | Matching list/range, URL updated                            | Clear/reset filters                                 | Clear returns to search                         | `AssetsPage.tsx`                               |
| Next stage | Guided/tutorial or request tracking Next | Derive next meaningful state for selected context | Stop at required checkpoint or guided artifact; explicit review/action remains required | Complete status or manual review in owning context | Required artifact/dialog; no permission from seeking | `src/domain/playback.ts`, `src/state/store.ts` |
| Follow pickup             | Request's follow action                                  | Select outstanding batch/window                              | Network with matching context; playback allowed             | Missing ID gives recoverable empty state            | Network context                                 | `RequestTracking.tsx`, store selectors         |
| Import session            | Settings file picker                                     | Read selected local JSON                                     | Valid import replaces local state, pauses, announces status | Invalid file preserves active session, inline alert | Settings/error or restored context              | `src/domain/persistence.ts`, `App.tsx`         |
| Export                    | Named JSON/CSV/report action                             | Local file generation                                        | Download contains actual current records                    | Existing state retained                             | Trigger stays available                         | Store/report modules                           |
| Restart active window     | Named app confirmation                                   | Synchronous scoped reset                                     | Current window resets; other sessions retained              | Cancel retains all state                            | Dialog trigger/context                          | `src/state/store.ts`, `App.tsx`                |
| Clear additional requests | Named app confirmation                                   | Synchronous local deletion                                   | Extra requests/reservations removed, canonical retained     | Cancel or prior session export                      | Settings/context                                | `src/state/store.ts`, `App.tsx`                |

## Validation, drafts, and recovery

Additional requests contain one to three valid catalog items and use the sample location by default. No camera, upload, account, phone number, precise geolocation, or personal information is mandatory. Six additional requests are the bound; a seventh is rejected by the domain and the form explains the limit with a return path. The capacity allocator owns dates; the UI must never invent a selectable free slot.

Draft changes are saved to a separate browser key and restored after navigation. No unsaved-change dialog is required while that durable local draft is available; a storage failure leaves only the in-memory draft and is a known limitation. Successful creation clears the draft. A duplicate-submit ref guard protects the synchronous mutation. App errors preserve values and focus the corrective control. Date/condition labels change with locale; category and condition identity remain stable.

A request is complete only when every included asset in every allocated window is completed. Safety/data holds and deferred items remain visible. Tracking, metrics, exports, and custody history must agree with the same scoped snapshot. An export is a record of authored local events, not a legal data-erasure certificate.

## Feedback and local lifecycle

Use persistent shell `role=status` for restored/imported sessions, inline `role=alert` for errors that require correction, and visible result state in the owning view. A transient notice must never be the only copy of a required decision or error. There is no remote mutation, authorization expiry, payment failure, or server conflict to simulate.

State is versioned in localStorage. Restoration and import pause playback and discard review tokens. Corrupt imports do not replace valid state. A reset is destructive within its named local scope, requires app-owned confirmation, and has no fake Undo; exporting beforehand is the recovery path. Local storage can be cleared by the browser/user. Cross-tab merge is not implemented; simultaneous tabs may overwrite persisted state. Do not promise multi-user synchronization.

## Accessibility and responsive behavior

Use native buttons for actions and links for navigation, visible focus, a skip link, meaningful headings, labeled form controls, text status, and sufficient contrast. Modal focus behavior comes from Radix. Network scene actions also have list controls so dragging or WebGL is never the only path. The desktop inspector is non-modal; normal mobile inspection uses a focused Radix sheet. During guided playback, mobile details remain inline so Next and artifact actions stay reachable. Closing the sheet preserves entity selection and exposes View details to reopen it. The explicit Clear selection action removes selection. The interactive SVG/list map is available while 3D loads and remains available after renderer download, initialization, frame timeout, or context-loss failure. Recovery controls provide an explicit retry. The shell and route loaders have bounded recovery instead of an indefinite blank surface. Reduced motion is available in Settings and follows the platform preference at initialization. World labels use explicitly tagged architecture as blockers and settle repeated occlusion/declutter changes before a brief fade. Hidden labels are noninteractive, including selected labels; list controls retain access. Annotation visibility never changes physical vehicle mesh visibility. Background traffic loops and stable hub dock assignments prevent artificial teleports. Shared live pause freezes hub, fleet and Team. Household tracking has an adjacent Happening now panel and its own scoped Next action. All playback contexts expose the same six speed choices; faster playback still clamps to review and artifact boundaries.

At 360/390px, forms, navigation, errors, window summaries, and outcomes must remain reachable without horizontal page overflow. Important touch controls target 44px. Mobile dialogs stay within safe-area bounds. Full OS/assistive-technology, virtual-keyboard, and 200% zoom coverage is a separate release verification, not inferred from desktop headless tests.

## Verification

`premium-ui.json` lists required runnable checks and real evidence paths. Run typecheck, unit tests, build, design-token drift check, DESIGN.md lint, and the strict installed premium audit. Browser tests live in `tests/e2e/operations.spec.ts`; in managed environments the documented same-process Vite/Playwright runner avoids network namespace isolation. `docs/TEST_EVIDENCE.md` and `docs/E2E_TESTING.md` record the reproducible scope.

Household browser checks on 2026-10-16 exercised real create, unchecked confirmation/focus, duplicate protection, back + English draft preservation, hero record creation, partial 1/2 safety hold, final 2/2 result, and a later EXP-2-1 batch. At 360/390px there was no horizontal page overflow, and the checked flows emitted no page errors. These observations do not assert universal accessibility conformance, real service execution, or integrated-GPU FPS. Current static findings and token exceptions remain in `docs/DESIGN_RECONCILIATION.md`.
