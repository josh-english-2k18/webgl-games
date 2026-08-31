# Asteroids 3D Gauntlet Prompt

You are the lead agent running an autonomous Gauntlet Loop.

## Goal

Transform `webgl-games/asteroids-3d.html` from Tempest Meridian's planar ring-arena
gameplay into a polished, genuinely three-dimensional space-flight combat game.

The rings remain a major visual and navigational landmark around the gas giant, but
they are no longer the playing surface or a hidden movement constraint. The player,
asteroids, enemies, shots, missiles, pickups, trails, and effects must occupy and
interact in real 3D space.

Desktop flight uses the mouse to control ship orientation and the keyboard for
thrust and supporting flight actions. The result should feel like a purpose-built
3D flight game, not the existing 2D game with vertical movement added.

Preserve and build upon the strongest current presentation: the blue gas giant,
fractal storm, chromatic rings, procedural Milky Way, orbiting cratered moons,
spacecraft model, particles, explosions, lock-and-seek missiles, Tempest ability,
audio, HUD hierarchy, camera variety, and live director controls.

## Baseline

- Source baseline: `webgl-games/asteroids-gpt-5.6-sol.html`
- Target artifact: `webgl-games/asteroids-3d.html`
- Baseline SHA-256 at creation:
  `d7b7665fa2e6035e7f7fa9145a908bfe3258d7b7d6323f1653539abd6032fb2f`
- The target was byte-identical to the baseline when this prompt was created.
- Never modify or overwrite `asteroids-gpt-5.6-sol.html`.
- Keep all implementation source inside the `webgl-games` git repository.

Read `AGENTS.md`, `DESIGN.md`, `DEV_LOG.md`, and the target source before changing
the implementation. Treat existing dirty files as user work and do not revert,
rewrite, or include them unless the task requires it.

## Quality Bar

The quality bar is a coherent modern 3D arcade flight experience with the immediate
readability of the current game and the spatial integrity expected from a flight
sim. Every subsystem must agree about position, orientation, velocity, aiming,
collision, and camera space.

### 1. Flight Model and Input

- Mouse motion controls pitch and yaw with stable, frame-rate-independent response.
- Use pointer lock on desktop when appropriate. Canvas activation, Escape release,
  pause, debug UI, focus loss, and pointer-lock failure must behave cleanly.
- Provide a usable non-pointer-lock drag fallback and a coherent coarse-pointer path.
- Ship orientation must use a quaternion or orthonormal basis. Do not accumulate
  unconstrained Euler angles or introduce gimbal lock.
- Keyboard thrust accelerates along the ship's actual 3D forward axis.
- Braking, rolling or coordinated banking, drag, boost, and maximum speed must form
  one deliberate flight model rather than a collection of independent rotations.
- Mouse sensitivity, pitch response, roll response, thrust, drag, and top speed must
  be live-tunable in the director console.
- The ship must be able to climb above the rings, dive below them, roll, reverse its
  vertical direction, and fly around the planet without being snapped to a plane.
- Motion must feel responsive at low speed, controllable at high speed, and readable
  in both pursuit and cockpit views.

### 2. Three-Dimensional World Topology

- Remove the rings as a collision rail or movement clamp. They remain visual world
  geometry and may provide navigation, hazards, or density cues.
- Establish a coherent 3D combat volume centered on the gas giant. A spherical shell
  is the strongest default model, but the builder may choose another model if direct
  evidence shows it is more playable and equally legible.
- The atmosphere/planet is a real inner exclusion boundary. The outer boundary must
  be understandable and must not silently flatten or erase velocity.
- Any wrapping, return force, teleport, or boundary transition must operate in three
  dimensions and have readable visual feedback.
- Asteroids and enemies spawn throughout a useful 3D volume with fair arrival paths.
  Avoid flat layers, arbitrary vertical scatter, unavoidable behind-camera hits, and
  spawns inside the player or planet.
- Pickups and mission-critical objects must remain findable in depth.

### 3. Spatial Math and Collision Integrity

- Replace all combat uses of `DECK_Y`, forced `velocity.y = 0`, XZ-only deltas,
  planar distance, planar spawn helpers, and radial ring wrapping.
- Player and entity transforms must preserve full XYZ velocity and orientation.
- Replace the XZ rock grid with a real 3D broadphase or another measured approach
  that scales with the active population.
- Projectile collision must use swept 3D segment-sphere or equivalent continuous
  collision detection. Fast shots must not tunnel.
- Player, asteroid, enemy, missile, pickup, blast-radius, and rock-on-rock checks must
  all use the same 3D spatial semantics.
- Explosion shards, trajectory indicators, shock effects, and trails must orient to
  arbitrary 3D velocity rather than assuming the ring plane.
- No collision may succeed merely because two objects overlap in XZ while separated
  significantly in Y.

### 4. Weapons, Targeting, and Enemy Behavior

- Guns fire along the ship's true forward axis from correctly transformed muzzles.
- The reticle and projectile path must agree at practical combat ranges.
- Auto-fire and target qualification use a real 3D forward cone and line-of-sight
  logic, not ring angle or planar proximity.
- Missile painting must prioritize targets by an intelligible combination of screen
  direction, forward alignment, range, threat, and existing locks.
- Missiles steer in full 3D, retain the current readable corkscrew identity, and do
  not collapse onto a shared plane.
- Tempest, splash damage, jamming, lock breakage, pickups, waves, and progression
  remain functional after the spatial conversion.
- Enemy pursuit and avoidance must work above and below the ring plane. Enemies must
  not simply point at the player and form a single converging ball.
- Offscreen and behind-player threats need accurate 3D guidance cues.

### 5. Cameras and Orientation Readability

- Pursuit and cockpit cameras must inherit the ship's full orientation without
  fighting mouse input or forcing a world-up horizon.
- Camera damping, look-ahead, speed response, roll response, collision avoidance,
  shake, and Tempest framing must remain coherent under arbitrary orientation.
- Keep four honest camera modes, adapted for 3D flight. `Tab` cycles them in order.
- Cockpit aiming uses a centered first-person crosshair only in cockpit mode.
- Exterior modes keep the ship, forward direction, target depth, planet, and ring
  landmark readable without turning into detached broadcast shots.
- Avoid nausea-inducing roll lag, horizon snapping, camera inversion, clipping into
  the ship, and abrupt up-vector flips near the poles.

### 6. Presentation and World Fidelity

- Preserve the gas giant, storm detail, rings, skybox, Milky Way, moons, lighting,
  ship detail, asteroid appearance, and particle hygiene unless a change is needed
  for 3D readability.
- Rings must read correctly from above, below, edge-on, and while crossing their
  plane. Fix one-sided, disappearing, or paper-thin presentation if encountered.
- Engine exhaust and ribbons follow the ship's actual 3D path and never become a
  solid rod or a disconnected cluster of dots.
- Asteroid trajectories communicate full 3D motion without becoming screen clutter.
- Explosions throw the existing geometric shards through 3D space.
- Retain circular, size-capped particle sprites. No fixed glowing squares, giant
  sprites, square points, haystack arrows, or unrelated decorative particle fog.
- Bloom remains selective. The planet, moons, rings, and sky must not become flat
  luminous discs.

### 7. HUD, Controls, and Accessibility

- Replace planar instructions, labels, and control hints with the actual 3D controls.
- The HUD must communicate speed, thrust state, lock state, missile state, shield,
  heat, Tempest charge, wave state, and relevant orientation/depth cues without
  becoming a cockpit spreadsheet.
- UI controls remain clickable without accidental firing or pointer recapture.
- Pause, reset, debug, camera cycling, keyboard state cleanup, visibility changes,
  and game-over recovery remain reliable.
- Desktop is primary, but the existing mobile layout must remain usable. Touch drag
  should provide coherent orientation control and touch thrust/fire/missile actions
  must still work.

### 8. Performance and Engineering Quality

- Preserve a smooth 60 FPS target on a normal desktop and a usable 30 FPS floor on
  supported mobile hardware at normal gameplay density.
- Avoid per-frame allocations in hot loops. Reuse vectors, quaternions, matrices,
  collision candidates, particle buffers, and pools.
- Keep adaptive render quality, capped pixel ratio, pooled effects, instancing, and
  draw-range discipline intact.
- Do not solve 3D collision by checking every object against every other object at
  unbounded population sizes.
- Keep the experiment self-contained in one HTML file and retain pinned Three.js
  `0.174.0` imports. Add no build system or runtime dependency.
- Expose `window.__asteroids3DReady = true` only after successful initialization.
- Add compact deterministic diagnostics under `window.__asteroids3DDiagnostics` for
  spatial invariants that can be tested without changing gameplay.

## Concrete Acceptance Scenarios

The finished artifact must satisfy all of these:

1. From a fresh run, pitch upward with the mouse and hold thrust. The ship gains Y
   position and velocity along its visible nose direction; releasing thrust produces
   controlled coast rather than planar snapping.
2. Roll and yaw while moving. The ship basis stays orthonormal, the camera remains
   stable, and subsequent thrust follows the new orientation.
3. Cross the ring plane in both directions and fly well above and below it. No entity
   is silently returned to `DECK_Y`.
4. Aim at an asteroid separated in altitude. Guns hit only when the 3D shot path
   intersects it. An XZ overlap with a large Y miss does not count.
5. Lock a target above, below, behind, and near the screen edge. Selection and HUD
   feedback correspond to its actual 3D direction, and a fired missile follows it in
   three dimensions.
6. Complete multiple waves using guns, missiles, pickups, jammers, and Tempest. Wave
   progression, scoring, upgrades, collision damage, and recovery remain intact.
7. Approach the planet and outer world boundary from several orientations. Boundary
   behavior is consistent, readable, and cannot trap or catapult the ship.
8. Cycle every camera with `Tab` while level, rolled, near the poles, near the rings,
   and during Tempest. No mode reintroduces planar aim or an unstable up vector.
9. Pause, open the director console, change flight and presentation controls, resume,
   lose focus, reset, and start a new run. Input state never sticks.
10. Inspect the world from both sides of the planet. Rings, weather, Milky Way, moons,
    trajectories, particles, and threat indicators remain coherent.

## Required Diagnostics and Repeatable Evidence

Add a small nonvisual diagnostic suite callable from the console. It should report
structured pass/fail results without mutating an active run. At minimum cover:

- Ship forward, right, and up vectors remain normalized and mutually orthogonal.
- Pitched forward thrust produces nonzero Y velocity with the expected sign.
- Swept 3D collision detects a true hit and rejects an XZ-only false positive.
- World-boundary logic accepts representative points on all three axes.
- 3D spatial indexing inserts and queries entities separated by Y correctly.
- A target inside the 3D aim cone is accepted and an out-of-cone target is rejected.
- Readiness flags, pools, and critical scene objects exist after initialization.

Run and record:

- JavaScript module syntax validation.
- Structural validation for every embedded shader.
- Diagnostics output.
- Searches for residual planar runtime assumptions, with each remaining occurrence
  classified as visual-only, intentional, or a defect.
- Object/pool counts and debug FPS during representative wave pressure when manual
  playtest evidence is available.
- Regression status for firing, missiles, Tempest, waves, pickups, pause, reset,
  cameras, resize, mobile controls, and particle-sprite safeguards.

## Hard Constraints

- Do not modify `asteroids-gpt-5.6-sol.html`.
- Do not modify unrelated dirty files or overwrite user changes.
- Do not remove the rings; remove their role as the 2D playing field.
- Do not replace the existing game with a minimal flight demo.
- Do not discard progression, weapons, enemies, particles, world art, or polish to
  make the spatial conversion easier.
- Do not use raw textureless `THREE.PointsMaterial` for visible glow particles.
- Do not add a framework, bundler, asset pipeline, physics dependency, or unpinned
  external script.
- Do not launch Chrome, run browser automation, or request permission to do so. The
  user performs all visual and gameplay testing manually.
- For visual and feel judgments, provide a short targeted manual test checklist and
  treat the user's observed result as authoritative evidence in the next loop.
- Static checks and deterministic nonvisual diagnostics do not replace manual feel
  testing, and manual confidence does not replace spatial correctness checks.
- Use `apply_patch` for source edits. Keep changes focused and inspect after each
  significant integration.

## Known Coupling Map

This is a risk map, not a prescribed architecture. Inspect before deciding how to
change it.

- `DECK_Y`, `setOnRing`, `wrapPosition`, `wrapAsteroidPosition`, `wrapDelta`,
  `planarDist`, `randomPlanarVector`, `ringRadius`, and `ringTheta` encode the arena.
- `player.rotation`, `getForward`, and `getRight` encode one-axis orientation.
- `updatePlayer`, muzzle placement, reticle placement, thruster ribbons, and the
  point light assume horizontal forward motion.
- Asteroid, hunter, pickup, missile, shot, shatter, and wave spawning force Y values.
- `projectileSegmentHitTime` and player impacts are XZ-only.
- `rockGrid` indexes X and Z only.
- Lock scoring, missile steering, splash damage, auto-fire, and threat indicators use
  planar deltas or planar positions.
- Pursuit, cockpit, sweep, and drift cameras reconstruct world-up views from planar
  heading and ring radius.
- Ring rails, ring plane, and some effects are intentionally planar visuals and may
  remain so after their gameplay coupling is removed.

## Gauntlet Operation

Own the approach. Do not wait for the user to prescribe architecture, decomposition,
or iteration count.

Split the work into the smallest important concerns that can be built and judged
independently. Strong initial candidates are flight/input, world topology and spawn,
3D collision/broadphase, weapons and AI, cameras and HUD, presentation/VFX, and
performance/regression. Revise this decomposition when evidence identifies a new
bottleneck.

For every important concern:

1. Assign a builder to inspect and improve the actual target artifact.
2. Run the strongest applicable static checks, diagnostics, or manual test evidence.
3. Assign a separate fresh-context critic that receives the goal, quality bar,
   constraints, artifact, and evidence, but not the builder's justification.
4. Have the critic identify failures and the single largest meaningful remaining gap.
5. Send that observed gap through another builder round.
6. Repeat while changes produce meaningful improvement.

The target is one large HTML file, so avoid conflicting simultaneous edits. Parallel
agents may independently audit, test, model alternatives, or prepare narrowly scoped
patches. The lead agent owns application order and must inspect the integrated source.

After each significant wave, use a fresh integration agent to inspect the complete
artifact for cross-system disagreement. In particular, verify that flight basis,
camera basis, shot direction, lock direction, collision space, effects, and HUD all
describe the same 3D reality.

Periodically ask a fresh whole-product critic:

> What is now the largest meaningful reason this 3D flight game still loses to the
> quality bar?

Do not accept agent summaries as evidence. Inspect code, diagnostics, logs, manual
playtest findings, and the integrated artifact. Preserve every verified win with a
repeatable check where practical.

Before declaring success, run a fresh final critic against the complete result using
this original prompt. The builder never grades itself.

## Workbench

Maintain `workbench.md` in the git repository root (`webgl-games/workbench.md` from
the workspace root) during the run. Keep it lightweight and current:

- Baseline and current target identity
- Active builder/critic loops
- Spatial diagnostics and static checks
- Manual playtest checkpoints and exact user observations
- Integration findings
- Verified regressions protected
- Largest unresolved gap
- Final critic verdict

The operating loop is:

**split -> fan out -> build -> independently judge -> find the largest gap -> improve
-> judge again -> integrate -> re-split as necessary**

Continue until the complete artifact meets the quality bar, improvement has genuinely
saturated, an external constraint prevents useful progress, or the user stops the run.
