---
version: alpha
name: 'Jejak Balik'
description: 'A warm, traceable circular-electronics workspace built around a cared-for miniature Jakarta.'
colors:
  canvas: '#F6F3EB'
  surface: '#FFFEFA'
  raised: '#FFFFFF'
  text: '#25352D'
  textSecondary: '#59675E'
  primary: '#2D6753'
  primaryText: '#FFFFFF'
  accent: '#A95135'
  accentText: '#FFFFFF'
  border: '#DDDCD2'
  successBackground: '#E5EFE6'
  successText: '#28563E'
  warningBackground: '#FBEDCC'
  warningText: '#78531A'
  dangerBackground: '#FAE8E1'
  dangerText: '#913E2A'
  infoBackground: '#E7EEF3'
  infoText: '#365B76'
  focus: '#226B55'
  sceneGround: '#E8E5D8'
  sceneRoad: '#D0D1C5'
  sceneWater: '#AFCBC4'
typography:
  body:
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif'
    fontSize: '15px'
    lineHeight: '1.5'
  utility:
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif'
    fontSize: '12px'
    lineHeight: '1.5'
rounded:
  control: '10px'
  card: '14px'
  panel: '18px'
  pill: '999px'
spacing:
  step-4: '4px'
  step-8: '8px'
  step-12: '12px'
  step-16: '16px'
  step-20: '20px'
  step-24: '24px'
  step-32: '32px'
  step-40: '40px'
  step-48: '48px'
  step-64: '64px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primaryText}'
    rounded: '{rounded.control}'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.card}'
  dialog:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.panel}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.control}'
  button-danger:
    backgroundColor: '{colors.dangerText}'
    textColor: '{colors.primaryText}'
    rounded: '{rounded.control}'
  icon-button:
    textColor: '{colors.text}'
    rounded: '{rounded.control}'
  chip-success:
    backgroundColor: '{colors.successBackground}'
    textColor: '{colors.successText}'
    rounded: '{rounded.pill}'
  chip-warning:
    backgroundColor: '{colors.warningBackground}'
    textColor: '{colors.warningText}'
    rounded: '{rounded.pill}'
  chip-danger:
    backgroundColor: '{colors.dangerBackground}'
    textColor: '{colors.dangerText}'
    rounded: '{rounded.pill}'
  chip-info:
    backgroundColor: '{colors.infoBackground}'
    textColor: '{colors.infoText}'
    rounded: '{rounded.pill}'
  metric:
    textColor: '{colors.text}'
    typography: '{typography.body}'
  entity-header:
    textColor: '{colors.text}'
    typography: '{typography.body}'
  tabs:
    textColor: '{colors.primary}'
    typography: '{typography.utility}'
  data-table:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.utility}'
  empty-state:
    textColor: '{colors.textSecondary}'
    typography: '{typography.body}'
  text-link:
    textColor: '{colors.primary}'
    typography: '{typography.utility}'
  loading-surface:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.textSecondary}'
    typography: '{typography.utility}'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.control}'
---

# Jejak Balik design system

## Overview

The creative reference is a cared-for miniature city with a helpful operating team. The main Network view presents an already active service day: vehicles, hub work, and recent activity continue on a repeating operational cadence. A separate guided tutorial tells one device's handoff story through the city, inspectors, team artifacts, household forms, and outcome records. The signature is the inhabitable little city and original expressive staff characters; operational content remains quiet and aligned.

This is a product workspace for Indonesian households and service operators, presented to judges as an existing circular-electronics service. Network, Team, Assets, and Impact use a product register. Household adds a warmer editorial introduction while retaining the same controls. The approved brief is recorded in `docs/brief/APPROVED_DECISIONS.md`; runtime boundaries are recorded in `docs/ARCHITECTURE.md`.

Bahasa Indonesia is the default; English is complete at the interface level. Both use one locally bundled, licensed Plus Jakarta Sans family. The setting is Jakarta with fictional neighborhoods and partners. No Japanese locale or Japan-market data contract applies. Household forms prioritize a phone; operational views must remain usable on a phone and a small laptop.

Borrow operational discipline from Shopify, object inspection and miniature scale from the supplied 3D references, and human warmth from the supplied constellation image. No Contra image was available; do not invent a Contra-specific visual analysis. Avoid dark command centers, generic gradient heroes, random neon, stock robot faces, oversized decorative metrics, and ornamental card grids.

### Token ownership

**Model B:** `src/app/design-tokens.json` is the canonical approved token source. This frontmatter mirrors it; it does not generate or overrule it. `src/app/global.css` adapts the accepted semantic values to CSS custom properties. Shared components in `src/components/ui.tsx` consume those properties. Feature CSS may define geometry, but must not redefine shared semantic meaning.

Run `node scripts/check-design-tokens.mjs` after changing the source, adapter, or this document. It checks every mirrored color, typography composite, radius, spacing step, and mapped runtime semantic value. It does not claim every raw illustration/3D material or historical feature literal is tokenized. Those coverage boundaries and remaining differences are explicit in `docs/DESIGN_RECONCILIATION.md`.

## Colors

Cream canvas and warm paper surfaces create a calm place to inspect small physical objects. Forest is the main safe action and selected-route color; clay is an expressive accent, never a universal error signal. Text and secondary text retain contrast on light surfaces. Success, warning, danger, and info each pair a pale fill with dark readable text and a label or icon. White text belongs on sufficiently dark primary/danger buttons, not pale status fills.

| Source/frontmatter role            | Runtime adapter                             | Primary consumers                                  |
| ---------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| canvas, surface, raised            | `--canvas`, `--surface`, `--surface-raised` | Shell, panels, dialogs                             |
| text, textSecondary                | `--text`, `--text-secondary`                | Headings, labels, explanatory copy                 |
| primary, accent, border            | `--forest`, `--clay`, `--border`            | Button, navigation, borders                        |
| successBackground, successText     | `--success-bg`, `--success`                 | Completed outcomes                                 |
| warningBackground, warningText     | `--warning-bg`, `--warning`                 | Holds, cautions                                    |
| dangerBackground, dangerText       | `--danger-bg`, `--danger`                   | Validation and destructive confirmation            |
| infoBackground, infoText           | `--info-bg`, `--info`                       | Pending/information states                         |
| focus                              | Global `:focus-visible` outline             | Every keyboard target                              |
| sceneGround, sceneRoad, sceneWater | Scene material vocabulary                   | City, route/map illustrations; not fully automated |

`--color-*` aliases in global CSS refer to existing semantic variables; they are compatibility names, not a second palette. Sage/sage-soft, scrollbar shades, hover colors, and shadow alpha are adapter extensions and must be reviewed with the primary palette. The supported theme is warm light. Forced-colors mode delegates operable controls and scrollbars to the platform. Do not imply that dark mode has been designed or tested.

## Typography

Plus Jakarta Sans 400, 500, 600, 700, and 800 are bundled through `@fontsource`, with `system-ui, sans-serif` fallback. The canonical body is 15px with a 1.5 line height; utility text is 12px. Main titles use a restrained 26–34px responsive scale. Section headings are 17–22px. Household editorial headings can be larger where their measure remains readable. Labels use medium/semibold deliberately; metric values use tabular numerals.

Use short, concrete sentence-case copy. Structural labels describe a real status or category; the Network page title stands alone without a decorative eyebrow. Long English text must wrap without removing an action or changing a device's operational meaning. Do not make the product feel polished by shrinking necessary labels. Existing dense captions below the 12px baseline are recorded as a follow-up in the reconciliation ledger rather than treated as a new standard.

## Layout

The approved rhythm is 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64px. Standard controls are 40px high on desktop and 44px on mobile. Dialog actions remain reachable above the safe area. Page content uses a bounded maximum width and natural document scrolling; only maps, data surfaces, and long dialog bodies own an internal scroller.

The shell becomes a compact top brand/language bar and fixed five-item bottom navigation on mobile. Main content reserves bottom navigation space. Household switches from a main column plus calm illustration/summary sidebar to a single readable stack. The request flow preserves selected items and edits when moving backward. Asset records use a semantic desktop table and stacked mobile records. Breakpoints in the token source are 600/1024/1440; implemented 760px and other content-specific transitions are recorded geometry exceptions and remain subject to viewport QA.

Network prioritizes the miniature city over introductory copy. The live surface uses a compact heading, an explicit Live operations/Tutorial switch, a quiet status-and-clock strip, and a narrow fleet/activity rail. Vehicle rows identify the route and its present task; tabular numerals keep the operational clock steady. The tutorial retains its own story timeline and checkpoints. On small screens the city remains first, and the rail follows in natural document flow; selection uses the shared sheet.

Images have stable containers and aspect ratios. Route loading uses the shared reserved loading surface with bounded recovery. The scene shows its interactive map immediately while 3D prepares, then swaps after the first completed 3D frame. Keep the recovery control compact and clear of scene annotations; a failed renderer leaves the map and entity controls usable. Keep controls reachable at short heights; do not copy a map's fixed-height contract onto a long form.

## Elevation & Depth

Use tonal layers and subtle borders first. Static cards share the quiet `--shadow`; inspectors and dialogs may use `--shadow-raised` or the maintained modal elevation. Do not give every component a separate shadow style. UI sits on opaque or nearly opaque warm surfaces, not unreadable glass above the city.

The scene uses soft directional light, restrained contact shadows, rounded edges, and simple physical materials. Road and ground contrast stays low so the active route and selected entity are legible. Keep scene labels compact and collision-aware: camera-to-anchor depth tests hide labels behind explicitly authored opaque architecture. Roads, foliage, passing vehicles and a label's own entity are not annotation blockers. Selected annotations obey building visibility too. Use wall-clock settling and brief fades to prevent repeated roof-edge hits and decluttering from making labels flash; selection priority applies only among available labels. Secondary labels yield when space is tight, and the equivalent entity list keeps every object reachable. Labels must remain inside the scene bounds and clear of its toolbar, location strip, and legend. Do not cover moving vehicles with a wall of permanent text. Never tie physical vehicle mesh visibility to annotation visibility. Traffic and hub cargo follow closed paths; dock assignment remains stable as vehicle phases change.

## Shapes

Canonical radii are control 10px, card 14px, panel 18px, and pill 999px. Buttons and fields share the control family; status chips use pills. The mobile dialog has a rounded upper edge and an open safe-area lower edge as a placement variant. Character silhouettes and device thumbnails are original expressive assets; they do not change the control grammar.

## Components

### Foundational states and ownership

`src/components/ui.tsx` owns Button, IconButton, Chip, Card, Metric, EntityHeader, Tabs, DataTable, EmptyState, Dialog, TextLink, and LoadingSurface. Do not copy equivalent control recipes into a new screen. `UX-CONTRACT.md` owns state, validation, focus, and workflow outcomes.

Primary buttons use forest fill, secondary actions use a paper surface and border, and tertiary actions use ghost treatment. Hover darkens or shades the same semantic surface; focus is a visible outline; press provides a small positional response. Disabled controls cannot fire. Busy controls announce their state; label and icon space must remain stable. Danger is reserved for the final destructive action, spatially separated from frequent safe actions.

Chips use label + semantic color; metrics have a specific label, units, and context/denominator. No ornamental sparkline without a useful series. Tables align numbers and identifiers with restrained dividers. Empty and no-results surfaces state the cause and offer a relevant action. Inspectors begin with identity and status, then grouped details and related actions.

### Forms and overlays

Fields have real labels, app-owned validation, associated textual errors, and preserved draft values. Single-select controls intentionally use native HTML select: the platform owns the open popup's geometry, scrolling, and selection interaction. The app owns options, labels, selected value, validation, and the closed trigger style. There is no authored calendar; service dates are allocated by the domain and displayed with the locale formatter.

Radix Dialog is the single modal owner with app styling, title/description, focus containment, Escape behavior, and focus restoration. On a phone it becomes a bottom sheet. The desktop network inspector is deliberately non-modal: the scene/entity list stays operable. On mobile, the normal inspector uses the shared focused Radix sheet; during the guided journey its details stay inline so they do not block Next or required artifact actions; closing it preserves selection and leaves View details available to reopen it. Routine status remains in a shared shell notice or persistent local result; there is no second floating toast system.

### Iconography, motion, and content

Use Lucide icons with a consistent stroke family, typically 16–20px, and text for important actions. Original logo, generated characters, device SVGs, city materials, guide, and report use the same palette. A tooltip may add context but never hide the only explanation.

Canonical motion values are 140ms feedback, 240ms panel, 800ms scene focus, and 1000ms scene transition. Animation communicates state or spatial relationship. Reduced motion removes decorative transforms and allows immediate inspection. Do not make essential progress depend on animation. Live city, hub and agent motions share pause and speed. Hub conveyor totes, operators and carts communicate work; one passing task caption keeps the seven-agent constellation readable. Reduced motion removes these decorative gestures. Next stage advances to meaningful states and always stops at explicit reviews; speeds are 0.5×, 1×, 2×, 5×, 10× and 30×.

Charts use a limited semantic palette with units, baselines, labels, and corresponding data tables. Format ID/EN dates, numbers, and rupiah through `useLocale`; calendar dates and displayed operational time use Asia/Jakarta. Partner identity is stable across roofs, vehicle/operator details and destination badges: Kembali Guna is sage/green (reuse), Sirkula Komponen purple (components), Pulih Material clay (material), and Jaga Residu ochre (specialist). A text role accompanies color; these scene materials are not action/status tokens.

Assets and Impact default to the authored January–October ledger, with a period selector and explicit Tutorial dataset. Year-to-date means the sum through 20 October, not a future annual projection. Report, CSV/JSON and passport selection use the same records and denominators. The Impact surface explains recovery and the service model without concealing operating costs.

Outcomes reflect actual current records: a request with one held device remains partial even if another device is complete.

## Do's and Don'ts

- **Do:** Keep the city and the chain of custody as the memorable visual story.
- **Do:** Reuse semantic controls and preserve consistent scoped state across Network, Team, Assets, Impact, and Household; explicitly distinguish live, history and tutorial datasets.
- **Do:** Use original local imagery and keep operational labels readable on a 360px phone.
- **Don't:** Invent a partnership, certification, completed outcome, or external action from visual treatment.
- **Don't:** Change approved tokens to conceal implementation drift; fix the adapter or record a deliberate approved exception.
- **Don't:** Add persistent technical caveats or assistant commentary to the product experience; keep implementation limits in the handoff documentation.
