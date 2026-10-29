# Guided journey v2

The guided experience is now an explanatory, user-paced five-step flow inside `/network`.

## Changes

- Replaced eight timed page transitions and three timed inspection pauses with five deliberate steps.
- Removed all clock-driven navigation, automatic playback, speed controls, and automatic modal opening from the guide.
- Added an inline sample request so the guided visitor does not need to leave for the full household form.
- Kept full household registration as a separate normal workspace flow.
- Step changes focus the city, hub, or sample device inside the network; optional exploration remains available.
- Back, Next, Skip, and Exit are explicit actions. Normal navigation away ends the guide without redirecting the visitor back.
- Ending the guide returns to the ongoing live operating view; clicking the optional outcome link is a deliberate move to the tutorial impact dataset.

## Authority and state

The guide moves the existing authored story cursor only in response to a user step action (including the explicit start action), pauses the story clock, and uses the existing state engine. It never grants specialist or data authorization implicitly. Sample submission is an explicit button that reviews and submits the sample request. Specialist/data choices use the existing GateDialog and its review token. Opening or closing the dialog alone does not rewind or erase existing decisions; the separately explained Review from checkpoint action establishes a fresh authorization when required.

Next is unavailable until the relevant actual decision is recorded. Keeping a hold is valid and allows explanation to continue; the final summary shows held devices rather than claiming successful recovery. Back/Next seeking preserves recorded decisions. A deliberate re-review has the existing documented consequence of clearing that gate and subsequent decisions.

The guide is supplemental to the authored operational model and continuous fictional live network. It neither dispatches real vehicles nor submits real household information.

## Files

- `src/features/journey/GuidedJourney.tsx`: accessible bilingual interface and user actions.
- `src/features/journey/journey-model.ts`: step metadata and guard logic.
- `src/app/App.tsx`: mounts the extracted component.
- `src/app/shell.css`: responsive presentation.
- `tests/domain/guided-journey.test.ts`: actual gate prerequisites, valid hold continuation, and stage bounds.
- `tests/e2e/guided-journey.spec.ts`: complete retained-hold flow and cancel/re-review preservation.
- Existing journey-specific E2E blocks updated to the self-paced behavior; ordinary workspace tests retained.

## Verification

The first focused Playwright browser run passed the complete retained-specialist/data-hold journey in Chromium (20.4 seconds). Unit step tests passed (3). TypeScript passed after extraction. Full release checks and additional red-team results are recorded by the main release process; these statements describe only checks executed during this component work.
