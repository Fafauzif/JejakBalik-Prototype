# Jejak Balik brand and product system

## Identity

The open return path represents a device moving back into productive use. A separate clay origin node gives the route a starting point and reinforces traceability. The symbol remains distinct from a conventional three-arrow recycling triangle. The horizontal lockup is the default; the mark alone is reserved for compact navigation and application icons.

Supporting line: **Mengalirkan kembali nilai elektronik.**

Household promise: **Penjemputan terjadwal, tanpa biaya.** Product copy must describe actual coverage and scheduled availability rather than imply an instant nationwide service.

## Source assets

`public/brand/logo.svg` and `mark.svg` are stable application paths. The SVG family has forest, dark, light and reverse versions in horizontal, stacked, mark-only and wordmark-only formats. All wordmarks use vector outlines for portable display. Raster exports preserve alpha. The minimum mark size is 20 CSS px; the full horizontal lockup is 128 CSS px. Keep one stroke-width (8 units for the 64-unit mark) of clear space.

## Tokens

Use `public/brand/tokens.json` as the portable token inventory. Canvas #F6F3EB and surface #FFFEFA provide warm backgrounds. Text #25352D and secondary text #59675E are readable against those backgrounds. Forest #2D6753 is the primary action; clay #A95135 is a restrained brand accent. Pale status fills always use the dark semantic text token. A character's palette is an identity cue, not an alarm severity.

Use a 4 px spacing base. Standard control height is 40 px on desktop and 44 px on touch layouts. Controls use 10 px radii, cards 14 px, panels 18 px, and pills fully rounded corners. Avoid stacking unnecessary card containers around content that can use a simple divider.

## Typography

Plus Jakarta Sans is locally packaged under the SIL Open Font License. Use regular for body, medium for labels and semibold/bold for headings and actions. Body copy is 14–16 px with a 1.4–1.6 line height. Keep labels at 12–13 px or larger. Use tabular numerals for comparable counts, costs and distances. The package retains WOFF2 for the frontend and TTF for editable documents.

## Components and behavior

- Buttons communicate a specific next action; use one primary action in a local decision group.
- Chips include readable labels. Never use color alone to communicate operational state.
- Tables align amounts and units; density must preserve readable rows and keyboard access.
- Inspectors begin with identity and status, then related data, then actions. Always provide a close/back path.
- Dialogs explain the consequence and provide clear cancel/confirm actions. Focus stays within the dialog until it closes.
- Empty states describe what is absent and offer the appropriate next step.
- Use the same Lucide stroke weight for a coherent icon family. Required icon notices are retained.

## Character system

Scout, Rute, Mitra, Pilah, Dampak, Jaga and Kendali are original generated artwork. `docs/CHARACTER_ASSETS.md` and `public/brand/character-manifest.json` record provenance. Display WebPs are 512 px with preserved alpha. UI states use lightweight halos, activity markers and transforms derived from the same application snapshot as the team's tasks. Do not imply that an illustration itself proves real AI execution.

## Miniature world

The world uses cream ground, softly shaded low-contrast roads, gentle directional light and restrained materials. Selectable objects, routes and operational statuses carry the emphasis. World selection, inspectors and KPI panels must refer to the same entity and state. Device inspection remains useful without camera animation.

## Motion and responsive layouts

Feedback 140 ms; panel transitions 240 ms; scene focus 800 ms; scene transitions 1000 ms. When reduced motion is enabled, use immediate state changes and static highlights while retaining all information. Mobile layouts stack detail, keep actions reachable, use 44 px targets and avoid horizontal page overflow.

## Voice

Prefer concise, specific copy: “Permintaan siap ditinjau”, “Tinjau penanganan baterai”, “Lihat rincian”. Describe what's happened and what can happen next. Localized labels must preserve operational meaning and layouts must accommodate both Indonesian and English.
