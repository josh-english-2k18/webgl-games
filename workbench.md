# Asteroids 3D Gauntlet Workbench

Lead executed real builder/critic waves on `asteroids-3d.html`. Playtest is user-owned (no Chrome). **No final success.**

## Baseline and target

- Source baseline: `asteroids-gpt-5.6-sol.html` — SHA-256 `d7b7665fa2e6035e7f7fa9145a908bfe3258d7b7d6323f1653539abd6032fb2f` (unchanged)
- Target: `asteroids-3d.html`

## Active loop

Stopped pending **user playtest**. Spatial critics can still find code misses after that.

Waves completed this run:

1. Whole-product + integration critics → hunters were a world-Y pack
2. Builder: `hunterOrbitFrame` per-hunter 3D axes; rim `z<0` behind
3. Re-judge → hunters closed; default chase/lock vs guns
4. Builder: boresight helper; lock without `camera.project`
5. Re-judge → boresight closed as “look at 8u tick”; rings paper-thin
6. Final critic → chase must **inherit ship orientation**, not look-at the tick; rings need real volume
7. Builder: `orientationToCamera` (ship +Z → camera −Z) for Pursuit/Sweep/Drift, snap orient, damp position; lock = heading + boresight + screen NDC; lathe annulus + wall shader + dust through Y=0

## Spatial diagnostics and static checks

- `node --check` pass
- 22 shaders, balanced
- No `DECK_Y` / planar wrap / `velocity.y = 0`
- No duplicate/missing DOM IDs
- Pinned `three@0.174.0` × 2, no `PointsMaterial`
- Extracted Three r174 tests: local pitch thrust +Y, yaw-without-roll, swept XYZ, spherical bounds, Y-separated hash, aim cone
- Live `__asteroids3DDiagnostics.run()` still needs a browser

## Manual playtest checkpoints

No user observations yet.

1. Pitch up + W: climb along visible nose; coast without planar snap
2. Mouse yaw only: no corkscrew; Q/E is roll
3. Cockpit: crosshair on a high/low rock, fire, hits match
4. Pursuit: diamond / nose / shots agree; camera does not look down at an 8u tick
5. Hold M: lock above, below, behind, screen-edge
6. Cross rings edge-on — they should read as a slab, not a disappearing card
7. Wave 3+ jammers: not a flat horizontal ring around the ship
8. Tab all four cameras while rolled, near rings, during Tempest
9. Planet/outer bounds from several attitudes; hull loss keeps nose
10. Pause, director, blur, New Run, touch CAM / drag

## Integration findings

- Flight, guns, swept collision, spherical bounds, 3D hunters, missiles: agree in source
- Cameras now share ship quaternion (Pursuit/Sweep/Drift inherit; cockpit still looks along +Z from the eye)
- Rings are lathed shells, not a single pancake
- Sweep/Drift offsets are still wide (formation, not nose cam)

## Verified regressions protected

- Baseline file untouched
- Three.js `0.174.0`
- No `PointsMaterial`

## Largest unresolved gap

Playtest 2026-08-31 (user): flight feel and combat HUD. Builder wave applied:

- Yaw inverted (mouse + A/D) to match camera −Z←+Z
- S is retro-rocket along −forward
- Top speed default 48
- Director invert-pitch checkbox
- Guns ~2× speed / longer life; auto-aim at scored forward target + fighter HUD brackets / lead pip
- Missiles faster, harder accel, longer lock range; HUD paints MSSL boxes
- Inner/outer ring bumper tori removed

Playtest follow-up: targeting squares were invisible (stale camera matrix + NDC z cull + tiny corners). HUD now uses view-space −Z, full boxes, z-index 21, paints forward-hemisphere contacts.

Planet/moon crash: player is no longer bounced off the atmosphere. Hitting the giant or a moon is lethal (shield ignored, explosion, lose a life). Flight shell expanded to 620 so moons are reachable; combat still spawns inside 286.

## Final critic verdict

**Partial.** Spatial conversion plus one playtest wave. Not declared complete.
