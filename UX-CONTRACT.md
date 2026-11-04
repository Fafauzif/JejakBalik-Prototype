# JejakBalik 3.0 UX contract

## Product and business context

The owner approved an interactive network that matches electronics returns with available capacity on existing journeys across three fictional logistics providers. One editable local scenario owns requests, journeys, receivers, funding, approvals and simulated custody. Network, Requests, Decisions and Results are product surfaces. Bahasa Indonesia is default; English is supported. Times are minutes from 09:00 WIB, displayed with the appropriate locale. Monetary inputs are IDR scenario assumptions.

| Domain | Current authority | UI consequence |
|---|---|---|
| Intended service and provider roles | Owner-approved return-trip overhaul; `docs/V3_ARCHITECTURE.md` | Transport provider and downstream receiver are separate identities |
| Feasibility and costs | `src/recovery/model.ts`, `src/recovery/types.ts`, `src/recovery/seed.ts` | Calculate constraints before approval; show unmatched requests |
| Local permissions and custody | `approvePlan`, `advanceService`, `changeScenario` | Only explicit decisions authorize a matching revision; physical custody is not rewound by replanning |
| Privacy and persistence | `src/recovery/persistence.ts` | Store fictional local records; validate imports; no external booking or personal identity |
| Optional model assistance | `api/assistant.ts`, `server/assistant-core.ts` | Suggestions do not mutate assignments, consent, capacity, payments or outcomes |
| Theme and controls | `DESIGN.md`, runtime tokens and `src/components/ui.tsx` | Reuse one visual language and accessible shared primitives |

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native HTML select | This contract | OS owns popup geometry and keyboard behavior | Localized labels, keyboard and narrow viewport |
| Date | Display-only scenario time | Domain service-minute values | No calendar or live scheduling promise | Locale labels and consistent clock |
| Form | Request form in RecoveryApp; shared Button/Dialog | Domain input validation | Fictional sample request | Invalid input, create, focus and duplicate prevention |
| Scrollbar | `src/app/global.css` | DESIGN.md | Scene and dialog geometry exceptions | Computed colors and visible scrolling |
| Toast | Persistent local status region | RecoveryApp action result | Status and inline alert | Live region; errors remain actionable |
| CRUD | Scenario model and local persistence | Domain contracts | Add, inspect, revise, reset with confirmation | End-to-end scenario workflow |

There is no multi-selection or all-results bulk action. Table Selection is not applicable.

## Shared behavior

All workspaces read the same scenario. Selecting an object changes selection and inspection, never consent or approval. Previewing a route produces a proposal; approving it is an explicit separate action. Any relevant revision invalidates an unexecuted proposal. Replanning preserves recorded physical custody and outstanding work. Visual animation never creates a custody event.

A no-feasible-plan result remains visible with a cause. It is not silently removed from the denominator. Disabling a transport journey or reducing receiving capacity triggers new alternatives and retains affected records. Budget controls refer to modeled service costs, not real payments.

Data-bearing devices can have a collection plan while final disposition remains held pending explicit simulated consent/clearance. A review button records the fictional scenario decision; it does not sanitize media or create a certificate. Completion counts require the domain progression to support them.

## Routes and navigation

Primary routes are `/network`, `/requests`, `/decisions` and `/results`. Earlier `/twin`, `/team`, `/assets`, `/impact` and `/household` links resolve sensibly to current workspaces. Navigation preserves the scenario. The user-controlled guide keeps one task in focus; Next/Back never approve a plan automatically. Object inspection is a non-modal panel on desktop or an equivalent reachable narrow-screen surface. Escape and close preserve the underlying record.

## Forms, search and state

Product forms use `noValidate`, actual labels, text errors and corrective guidance. Invalid submission preserves values and focuses the relevant error. Native selects deliberately use OS-owned popups. Non-empty search has an accessible clear action. Filters and paging must not strand the list on an empty page. Material unsaved values remain local or are explicitly guarded before destructive navigation.

Reset is confirmed in the shared app-owned Dialog. No browser alert/confirm/prompt. The new storage namespace is separate from legacy version-1 records. Invalid imports or unreadable saved state produce a recoverable fresh scenario without executing imported content. Persistence is browser-local; this is not a multi-operator service or a shared transactional backend.

## Accessibility and motion

Use native semantic actions, visible focus, labels, status text, adequate contrast and a skip link. Every 3D selection has a list or map equivalent. Support reduced motion, pause and explicit play. No approval depends on watching animation. At narrow widths all forms, legends, controls and dialogue actions remain reachable; avoid horizontal page overflow. Dialogs reuse Radix focus behavior and the global safe-area treatment.

## Verification boundary

Current results belong in `docs/V3_VERIFICATION.json`. Historical tests and screenshots are not new verification. Software-rendered WebGL can establish scene rendering and interaction, but does not certify physical laptop or phone frame rate. No actual collection, carrier integration, signed receiving acceptance, field costs, outcome evidence or external deployment is established by this prototype.
