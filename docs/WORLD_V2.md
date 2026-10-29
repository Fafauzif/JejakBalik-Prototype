# Miniature world upgrade — 29 October 2026

The warm procedural world is retained and detailed, without external model downloads, textures, or runtime services.

## Visual changes

- City architecture: post-clearance details add grounded shopfronts/lobbies, shophouse awnings, terracotta roof details, side glazing, floor ledges, parapets, and occasional rooftop utility/solar geometry. The details derive from surviving building footprints, so removing a building for a route also removes its decoration.
- Households: readable doors and windows supplement the miniature roof/body silhouette.
- Network: richer blue-green water, a layered diorama platform edge, and painted crossings add depth and familiar scale cues.
- Hub exterior: canopy, roof-mounted panels, staged crates, columns, and loading-area striping make the consolidation location easier to recognize.
- Recovery partners: facade columns, awnings, window sills, and rear staging crates strengthen their individual identities, using their existing semantic colors.
- Fleet: side glazing, mirrors, handles, rear reflectors/door details, a license plate shape, and roof panels remain in each vehicle's existing instanced batch.
- Hub interior: painted walking lanes, staging bollards and station floor bars share existing furniture batches; roof panels are visible only with the roof.
- Devices: richer circuit boards with contacts/traces and a more detailed laptop keyboard. Replaced per-key rounded meshes with instanced keys; board details also share one batch rather than individual chip meshes.
- Light: warm directional key, cooler unshadowed fill, and a reduced ambient wash give miniature forms clearer depth. Only the existing key light casts shadows.

## Preserved behavior

No changes to domain events, custody, labels/layout algorithms, UI selection callbacks, vehicle routing/positions, partner identity, data/safety holds, fallback behavior, or camera controls. The authored setting remains fictional rather than a surveyed model of Jakarta.

Low/lite mode keeps glazing/lobbies but omits roof equipment and most facade trim. Repeated decorative geometry uses instancing. No postprocessing, external assets, or new dependencies were added. Static geometry is not proof of handling or environmental outcomes; miniature solar panels are decorative rather than a claim about actual partner facilities.

## Verification

- Added two geometry tests for deterministic post-clearance footprint association and lower detail counts in low mode; observed missing-module failure before implementation, then both passed.
- `npm run typecheck`: passed after all world edits.
- Graphics regression command covering city detail, hub queues, label layout, label visibility and renderer startup: 5 files, 20 tests passed.
- Runtime screenshot review, full application regression and final bundle checks are performed by the parent integration workflow. This note does not claim measured GPU FPS or draw-call totals.
