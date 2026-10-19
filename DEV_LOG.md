# Development Log

This is the working record of the WebGL experiments tried so far, including the practical lessons from iteration and manual playtesting. It complements `README.md`, which indexes the runnable files, and `DESIGN.md`, which captures the philosophy that emerged from the work.

The current pattern is clear: a first pass proves the idea, then a few focused iterations can turn a generic demo into a specific artifact. The strongest results happen when the implementation, visual language, controls, camera, HUD hierarchy, tuning hooks, and default state all express the same premise from the beginning.

The lesson from recent Composer comparisons is not to outsource taste. It is to make Codex carry the whole experience frame earlier: core loop, feel target, camera language, atmosphere, feedback, and visual tuning should be part of the first serious build, not a later rescue pass.

## Current Benchmarks

### Prismalith Engine

File: `holograph-particle-morphing-v2.html`

Prismalith is the strongest experiment so far and the benchmark for future visual systems. It evolved from the original holographic particle morphing sketch into a named particle instrument with a strong first frame, shader-driven form changes, readable density, a restrained bloom pipeline, constellation links, and controls that reshape the scene instead of merely toggling features.

Key lesson: particle engines become compelling when dense motion is still legible and every control deepens the identity of the artifact.

### Gravity Loom

File: `gravity-loom.html`

Gravity Loom was built as a direct test of the design philosophy after it had been written down. It succeeded visually: gorgeous default state, graphically solid construction, strong HUD, readable thread bundles, mass selection, shuttle traffic, and expressive controls for pulse, knot, unwind, strands, tension, gravity, and flow.

Playtesting produced an important nuance: the result is excellent craft, but the underlying idea is not as exciting as the best particle experiments. This is a useful distinction. Execution quality and concept strength are different axes, and future work should evaluate both after the visual system is working.

### Vector Bloom

Files: `vector-bloom.html`, `vector-bloom-grok.html`, `vector-bloom-composer.html`

Vector Bloom is the pinned idea from the post-Gravity Loom design discussion: take the Prismalith-level particle language and give it a real playable loop. The design question is whether shaping a beautiful particle field can become intrinsically fun, not just visually impressive.

First pass:

- Dense shader-rendered particle streams spawn from three emitters and flow toward three bloom gates.
- Five default field nodes shape the stream: attract, repel, split, dampen, and ignite.
- Field nodes are draggable on the canvas, and the active node can be retuned through compact controls.
- Gates charge when tuned flow reaches them; opening a gate produces score, bloom pulses, and log feedback.
- Overload wells build pressure when hot particles become messy, reducing stability until vented or corrected.
- Flow modes, flow rate, field radius, and gate tension provide immediate levers without turning the first version into a large ruleset.
- The particle layer uses custom shader points with circular fragment discard and hard-capped point size to avoid the recurring square-sprite failure mode.

Manual playtesting has not been recorded yet. The main acceptance question is whether the loop of dragging force nodes, opening gates, and managing overload feels alive enough to justify iteration.

Key lesson target: combine our strongest particle visual language with consequences, pressure, and tactile control.

Grok variant:

- Asked Grok Build to create its own Vector Bloom variant in `vector-bloom-grok.html`, keeping the original source intact for comparison.
- Initial static review found three concrete issues: `r` both selected Cascade and reset the game, selected-node type changes did not rebuild visuals so Vortex geometry could be stale, and resonance link draw ranges used component counts instead of vertex counts.
- A professional game-developer upgrade pass added clearer feedback for gates, combos, pressure spikes, milestones, and recovery advice; made unlinking discoverable; and kept the loop focused on shaping particle flow rather than adding a large ruleset.
- The remaining `Shift+R` reset conflict was fixed after the upgrade by returning before mode shortcuts run.
- Static checks confirmed the variant keeps custom shader particles with circular discard and capped point size, avoids raw `PointsMaterial`, preserves `window.__vectorBloomGrokReady`, and has no duplicate or missing queried IDs.

Key comparison lesson: external-agent variants are useful when reviewed like production code. Let the agent explore, then inspect for interaction conflicts, stale visual state, rendering invariants, and whether the upgrade strengthens the game loop instead of just adding surface polish.

Composer variant:

- Composer created `vector-bloom-composer.html` as a cinematic particle-instrument variant. It looks strong because it commits to a clear frame: camera shot presets, post-processing bloom and color grade, projected field labels, shader flow backdrop, film grain, letterboxing, and a quieter editorial HUD.
- Static inspection confirmed the variant keeps the good particle hygiene: custom shader points with circular `gl_PointCoord` discard, capped `gl_PointSize`, typed arrays for particle state, `window.__vectorBloomComposerReady`, and no missing queried IDs.
- The variant is less game-complete than Grok's pass: it does not add links, combo cadence, resonance mode, pause/help, unlink, or stronger milestone feedback. Its value is presentation and legibility, not necessarily deeper play.

Key framing lesson: camera, grade, labels, and editorial UI can act like design tools. They make a system feel directed, legible, and premium. Use them deliberately, but do not let cinematic polish substitute for feel, pressure, and consequences.

Key workflow lesson: comparison variants should have explicit frames. Grok tested professional game feedback; Composer tested cinematic presentation. The useful process is to harvest the best lesson from each frame, then decide what belongs in the main artifact.

### Kinetic Containment

Files: `ball-physics-simulation.html`, `ball-physics-simulation-v2.html`

Kinetic Containment is the second pass on the original ball physics demo. The original file was preserved for comparison, and v2 was built with the newer self-contained Three.js module pattern used by the polished experiments.

Iterations tried:

- Recast the old ball demo as a named artifact with a HUD, modes, raycast inspection, sparks, field particles, and postprocessing.
- Fixed the black-ball issue by giving bodies varied colors and radii.
- Added visible body-body collision behavior instead of only container bouncing.
- Set gravity to `0` by default so the simulation starts as a floating kinetic chamber.
- Reworked the palette after the first color pass felt boring.
- Shifted the bodies into varied shades of blue.
- Reduced ball size by roughly 50% after the dense version felt too large.
- Set the default population to 320 bodies and the maximum to 640.
- Kept manual playtesting as the source of truth for physics feel and visual density.

Key lesson: a functional simulation becomes more interesting when density, color, controls, diagnostics, and collision feedback all support the same premise.

### Barycentric Dawn

Files: `barycentric-dawn.html`, `barycentric-dawn-composer.html`, `barycentric-dawn-agy.html`

Barycentric Dawn explores a more physically grounded visual simulation: two luminous stars and one terrestrial planet in a scaled Newtonian three-body integration. The goal is to combine real orbital consequences with the strongest visual-system lessons from the particle experiments.

First pass:

- Three live bodies integrated in a barycentric frame with adjustable gravity and time scale.
- Two emissive stars with procedural corona glow and flare response.
- One terrestrial planet with procedural oceans, land, bump texture, cloud bands, troposphere scattering, aurora rings, and magnetosphere layers.
- Solar wind particles stream from both stars toward the planet.
- Magnetosphere particle flow, bow shock particles, particle-only gravity distortion, orbital trails, barycenter marker, labels, and starfield background expose the forces at work.
- Presets test stable circumbinary orbit, resonant pressure, close-binary flux, and deliberately unstable chaotic pass.

Manual-test iteration:

- The first version repeated the old giant fixed glowing-square particle problem. The cause was the unsafe use of textureless point sprites for visible glowing particle layers, plus loose point-size handling.
- The first mitigation with circular shader points was not enough in manual testing; the square persisted.
- The stronger fix removed `THREE.Points` from Barycentric Dawn entirely. Starfield now uses a canvas-textured sky sphere, while solar wind and bow shock use small instanced meshes.
- Particle richness was layered back in with instanced mesh effects instead of point sprites: stellar corona embers around both suns, ecliptic dust through the orbital plane, and ion/aurora sparks around the planet.
- Orbit readability was strengthened with clearly distinct body trails and a dedicated barycenter marker.
- Control surfaces were made 50% more transparent to reduce obstruction of the simulation.
- Spacetime distortion gained a live gravity-particle layer: shader-rendered particles with position, velocity, mass, and inverse-square attraction toward the three bodies and toward each other. They do not push the main celestial bodies back, preserving the readable three-body orbit while making the gravitational field visibly dynamic.
- Manual testing showed the first gravity-particle pass was not visible enough. Particle cores were enlarged, a translucent instanced halo layer was added, opacity was increased, and render order was raised.
- The gravity-particle layer still failed to read in manual testing, so visibility was made explicit: particle meshes now disable depth testing and frustum culling, use larger core/halo geometry, and seed some particles into the central orbital volume.
- Manual testing showed that line-based wake and filament attempts read as a haystack/spiderweb and violated the particle-only intent. Those line layers and the older local ring/grid curvature mesh were removed. The current spacetime-distortion layer is actual particles, seeded around the bodies and barycenter, then advanced by inverse-square gravity from the celestial bodies and from every other gravity particle.
- Manual testing still showed no visible particles, which means the implementation was technically present but visually invalid. A later attempt used large instanced sphere cores and halos; that caused black centers and frame drops because it combined expensive overdraw, multiple instanced layers, per-instance color hazards, and CPU pairwise gravity.
- The celestial connection lines were restored after being incorrectly removed during the cleanup. Those are a separate readability layer, not the old curvature mesh or filament web.
- The corrected approach mirrors Prismalith's rendering lesson: use one custom shader point field, discard outside a circular particle footprint, hard-cap `gl_PointSize`, and keep particle state in typed arrays. The current layer uses 420 desktop / 240 compact gravity particles, with pairwise gravity kept small enough to avoid destroying the frame rate.
- Manual testing showed that visible particles were still behaving like one loose dust pile, then like orbiting moths around each body. The gravity layer was changed into birth/death streamlines: particles spawn on an outer contour of each body's well, flow down the combined gravity-gradient surface, conform to the sagging spacetime sheet, brighten where wells overlap, interact through pairwise particle gravity, and respawn when they reach the inner well or expire.
- Manual testing then showed the streamlines still behaved like barycenter rain. The flow direction was corrected to remain source-body-local: particles spawn close to their source planet/star, flow toward that body's well, and other bodies only add tidal bend and overlap interaction instead of taking over the stream direction.
- Manual testing then showed source-body particles still behaved like separate fogs chasing moving bodies. The particle frame was corrected again: stream targets are now recomputed directly in body-local coordinates every frame, and pairwise gravity contributes bounded offsets from those targets. This preserves local well shape while still allowing overlap interaction.
- The planet-local magnetosphere force lines were replaced with continuous shader-particle flow. The particles advance from the dayside bow region, wrap around the planet in the solar-wind-aligned local frame, and stream into the magnetotail while the separate bow-shock particle layer remains intact.
- Manual tuning dimmed the starfield material opacity by 50% so the background supports the simulation without competing with the force and particle layers.
- Manual tuning made the spacetime gravity particles uniformly red and reduced their additive glow opacity by 50% to separate them from the cyan/green magnetosphere and solar-wind systems.
- Gravity-particle allocation now scales by each body's visual gravity-well size, using radius times cube-root mass. The primary sun gets the most particles, the companion gets fewer, and the planet keeps the smallest share without disappearing entirely.

Lessons learned:

- The visual reading of a simulation is the real acceptance test. The math can be plausible and the particles can technically exist, but if the scene reads as a square, fog, arrows, a spiderweb, or orbiting sparks, the implementation is wrong for the design.
- Particle systems need a declared semantic role. Barycentric Dawn has separate roles for orbital history, body relationship lines, solar wind, bow shock, magnetosphere flow, aurora/ion activity, and gravity-well distortion. Blurring those jobs produces noise.
- Replacing a mesh or line layer with particles means removing the old layer and letting particles carry the structure. Otherwise the particles become decoration and the old representation remains the actual visualization.
- Visibility needs to be designed at the start: circular particle footprint, capped point size, valid first-frame positions, clear opacity, depth/render-order choices, and enough default scale to read without touching controls.
- For force fields around moving bodies, the stable recipe is local-frame stream targets plus bounded perturbations. World-space particles lag and become chasing fog; unbounded attraction collapses into one sink.
- Continuous flow works better than static loops for this kind of force visualization. Particles should spawn, move through a readable field contour, fade or respawn, and create the impression of an active field rather than a frozen diagram.
- Particle count should match field importance. Equal or arbitrary allocation understated the suns and overrepresented the planet; scaling by visual gravity-well size made the hierarchy match the simulated system.
- Color and brightness are part of the physics language. Red gravity particles, cyan/green magnetosphere flow, dimmed starfield, and transparent UI panels reduced competition between layers.
- Performance failures often signal a bad representation, not just a need for optimization. The instanced core/halo attempt made the scene slower and less legible; the bounded shader-particle approach made it clearer and faster.
- The process worked because each manual-test failure was named precisely, then translated into a design constraint instead of treated as a random bug.

Key lesson: a realistic simulation can follow the artifact philosophy if the physics is visible, each force layer has one job, and visual effects clarify cause and effect instead of becoming decoration.

Comparison variants:

- `barycentric-dawn-composer.html` reframes the same simulation family as a cinematic observatory. It adds camera shot presets, bloom and grade controls, lens streaks, nebula backdrop, film grain, letterboxing, and composer-style HUD controls while preserving the core force-layer language.
- `barycentric-dawn-agy.html` was generated through Antigravity CLI as an external-agent comparison variant. It emphasizes an operator/observatory view with fixed-timestep regimes, probe injection, live telemetry, energy graphing, debug force arrows, luminance control, and mobile HUD toggling.

Key variant lesson: comparison variants are useful when their framing is explicit. Composer is a presentation test; AGY is an inspection/telemetry test. Both should be reviewed against the same physical-legibility and particle-hygiene constraints as the primary Barycentric Dawn.

## Particle And System Experiments

### Holograph Particle Morphing

File: `holograph-particle-morphing.html`

The original particle morphing prototype. This remains useful as lineage for Prismalith because it shows the baseline idea before the visual language, controls, bloom tuning, and named forms became deliberate.

Key lesson: preserve originals when the improved version teaches a clear before-and-after story.

### Causal Field

File: `causal-field.html`

Causal Field translates neural-system behavior into a spatial causal field: subsystem clouds, attention highways, memory loops, routing gates, safety pressure, tool paths, decoder convergence, evaluator feedback, labels, and activation injection.

What worked:

- Abstract system behavior became inspectable spatial structure.
- Modes changed behavior instead of only changing palette.
- Clickable subsystems created meaningful local response.
- HUD readouts helped reveal system state without explaining the interface.

Key lesson: abstract systems become stronger when they are mapped to visible structures with pressure, flow, and feedback.

### Signal City

File: `signal-city.html`

Signal City turns a system map into a miniature 3D environment. Districts represent ingestion, memory, models, agents, tools, risk, users, and output. Traffic, weather, load, failures, and recovery are visible as spatial behavior.

What worked:

- The city metaphor made system pressure easier to read.
- Buildings, routes, weather particles, and district labels reinforced the same premise.
- Click inspection and pulse/storm/reset controls created direct interaction with the model.

Key lesson: environmental metaphors can make complex systems feel concrete when each visual layer has a job.

## Game And Tactics Experiments

### Crownfield Chess

File: `chess.html`

Chess is solid and functional, but the concept is inherited rather than discovered. It is competent as a board game, but less distinctive than the strongest particle and systems experiments.

Future direction: improve material identity, piece motion, capture feedback, atmosphere, AI/analysis tools, and replay presentation without reducing board readability.

### Sente Garden

File: `go.webgl.html`

Go became Sente Garden, a more atmospheric version of the board-game direction. It is solid, and later visual upgrades improved its presentation.

Future direction: make territory, influence, captures, and rhythm feel more ritualized and spatially expressive.

### Crownline Checkers

File: `checkers.html`

Checkers is another solid board-game implementation. It is stable but similarly pedestrian compared with the best custom visual systems.

Future direction: strengthen forced-capture drama, move staging, crown identity, and capture feedback.

### Umbra Meridian Othello

File: `othello.html`

Othello follows the polished board-game line with a stronger named identity. It is a useful example of applying atmosphere and presentation to a known ruleset.

Future direction: make directional flips more satisfying and use the board state to drive stronger visual tension.

### Axiom Breach

File: `axiom-breach.html`

Axiom Breach explored deterministic tactics with a stronger identity than the board-game ports. It helped reinforce the value of compact HUDs, deliberate visual state, readable interaction, and action feedback.

Key lesson: for games, rules correctness is only the baseline. Tension, feedback, pacing, and readable consequences determine whether the loop has life.

### Rift Conductor

File: `rift-conductor.html`

Rift Conductor pushed the tactics direction into single-unit chain-reaction play. It combines an arena, signal routing, upgrades, enemy pressure, heat, core state, debug actions, and a signal log.

Key lesson: tactical experiments benefit from clear board state, obvious consequences, and event feedback that explains outcomes through the system rather than through instructions.

### Vesper Belt / Asteroids

Files: `asteroids.html`, `asteroids-composer.html`, `asteroids-claude.html`, `asteroids-fable.html`, `asteroids-gemini.html`, `asteroids-gpt-5.6-sol.html`, `asteroids-grok.html`, `asteroids-grok-4.6.html`, `asteroids-3d.html`, `gpt-5-asteroids.html`, `grok-4-asteroids.html`

Asteroids has had several versions and model-generated variants. The current visual direction is acceptable, but manual playtesting showed that movement, playability, powerups, combat feel, escalation, and recovery windows require more iteration.

The agent comparison set now has five distinct identity axes:

- Glassquall (`asteroids-claude.html`) — **time**: hitstop, combo heat, Phase Lance.
- Sunseed (`asteroids-fable.html`) — **light economy** on a spherical shell: kindling, eruption, lumen, flare.
- Coilwake (`asteroids-grok.html`) — **mass as weapon** on the planar wrap field: tether latch, sling, rock-on-rock cascade, charge/overcoil. No hitstop, no star-core.
- Gyrewake (`asteroids-grok-4.6.html`) — **guidance** on Coilwake's orbital ring: hold-to-lock seekers, corkscrew ion gyres, tempest dump. Gravity weapon removed. Blue-purple ice presentation. No hitstop, no star-core.
- AetherTwin (`asteroids-gemini.html`) — **duality as geometry** in a binary-pulsar belt: position a ship and quantum twin around threats, cleave with the live blade between them, swap endpoints to slice the traversal lane, and spend charge on Quad-Superposition.

Tempest Meridian (`asteroids-gpt-5.6-sol.html`) is a deep quality and fidelity iteration on the guidance axis rather than a sixth identity axis. Its revisions concentrated on projectile correctness and pooling, smarter and longer-lived seekers, a wider ring arena, true camera behavior, spacecraft and thruster presentation, asteroid motion and wrapping, a Polyphemus-inspired gas giant, mineral-colored rings, fractal storm detail, a richer Milky Way, and procedural orbiting moons.

Iterations tried:

- Initial Three.js Asteroids implementation.
- Added AI prompts to the Asteroids source.
- Added GPT-5 and Grok 4 variants for comparison.
- Added Glassquall, Sunseed, and Coilwake as full agent comparison variants with honest cameras, director consoles, and distinct signature verbs.
- Added Gyrewake (`asteroids-grok-4.6.html`) as the Grok 4.6 Coilwake successor: removed tether/sling/overcoil, restored missiles as a lock-and-seek verb (hold to paint, release corkscrew seekers, tempest dump), shifted the palette to ice blue-purple, and upgraded ship/giant/missile/lock presentation without mixing Glassquall time or Sunseed light.
- Added AetherTwin (`asteroids-gemini.html`) as the Gemini comparison variant: paired the player with a spring-following quantum twin, made the connecting Entanglement Blade the primary spatial weapon, turned Phase Swap into a traversal cleave and recovery move, and used Quad-Superposition as the charged cash-out. Entangled asteroid pairs, blade-seeking leeches, the fifth-wave Gemini Colossus, four cameras, touch controls, procedural WebAudio, and a live director console support that identity.
- Evolved the Grok 4.6 guidance baseline into Tempest Meridian (`asteroids-gpt-5.6-sol.html`) through repeated professional review and manual visual iteration. The pass fixed swept projectile collision and pool initialization, improved seeker targeting/range, removed weapon collisions at the arena edge, widened the ring field, restored full planet/ring/weather visibility, upgraded the world to a natural gas-giant palette, refined the storm and sky, and replaced the placeholder sun disc with three cratered orbiting moons.
- Created `asteroids-3d.html` as a byte-identical Tempest Meridian baseline and wrote `ASTEROIDS_3D_GAUNTLET.md` to govern its future conversion from a planar ring arena into coherent 3D flight combat. The prompt treats input, quaternion orientation, world topology, broadphase, swept collision, targeting, AI, cameras, HUD, VFX, and performance as coupled concerns with independent builder/critic loops.
- Upgraded the main Asteroids presentation into Vesper Belt.
- Compared Vesper Belt against the active Vesper Belt Composer variant. The composer file mostly keeps the same gameplay backbone while adding a stronger director layer: chase/wide/tight/drift camera shots, transparent compact HUDs, shader belt backdrop, nebula dome, color grading, film grain, letterboxing, and live bloom/grade tuning.
- Upgraded the main `asteroids.html` directly with those lessons instead of leaving them in the comparison variant: directed camera modes, atmospheric belt and nebula framing, transparent HUD surfaces, debug bloom/grade tuning, tighter thrust/drag tuning, and chain scoring for consecutive asteroid breaks.
- Manual playtesting flagged the circular map palette as too flat, the ship silhouette as underdesigned, and the nose vector as pointless. The follow-up pass enriched the field ring palette, sculpted the ship with stronger wings/tail/cockpit/engine pods, replaced the nose vector with a detached aiming reticule, and added a visible ship gravity aura that gently pulls powerups toward the player.
- Manual playtesting then flagged the ring map as too disco and the engines/explosions as underpowered. The follow-up pass moved the field palette into colder cyan/blue/ice/violet space colors, enlarged the engine pods, added stronger animated thruster cones and exhaust particles, and made destroyed asteroids burst into spinning triangular shard meshes plus cool shock rings.
- The camera pass replaced the old Tactical overhead framing with a true 1st-person cockpit camera, first-person-only crosshairs, hidden external ship geometry in that mode, and a clearer `3rd-Person` label for the external camera.

Lessons from the comparison:

- The composer variant is better presented, not automatically a better game. The core movement, combat, waves, pickups, heat, shields, and missiles still need the same feel-first playtesting.
- Camera is part of game design. A readable 3rd-person camera and alternate framing modes can make thrust, threat direction, and speed easier to judge.
- Transparent HUDs, environmental framing, and grading can dramatically raise perceived quality when they support the playfield instead of competing with it.
- Live visual tuning belongs in the workflow. Bloom, grade, opacity, and framing controls make taste testable instead of hardcoded.
- A weapon can be a spatial relationship rather than a projectile. AetherTwin works only when both endpoints, the dangerous line between them, and the consequence of swapping those endpoints stay legible under motion.
- The correct process lesson is to fold these principles into Codex-built first passes. External variants should challenge our approach, not become the place where taste lives.

Future priority: improve feel before adding more mechanics. Ship acceleration, drag, rotation, shooting cadence, collision feedback, powerup readability, camera readability, and scoring pressure matter more than feature count.

### Vectorwing: Rift Patrol

File: `starfox.html`

The Starfox-style experiment explored 3D flight combat and rail-shooter energy. It remains a useful reference for camera motion, spatial movement, and arcade presentation.

Future direction: tighten movement feel, target readability, enemy timing, and feedback.

## Audio And Visualizer Experiments

### 3D Audio Meter

File: `3d-audio-meter.html`

An early audio visualization experiment focused on a 3D meter concept. Useful as a simple baseline for audio-reactive WebGL.

Key lesson: audio tools need clear signal hierarchy and immediate readability before decorative effects.

### Matrix Audio Visualizer

File: `matrix-audio-visualizer.html`

A themed audio visualizer using a Matrix-inspired presentation. This tested how quickly a strong visual reference can give an otherwise simple visualizer identity.

Key lesson: theme can help, but the signal response still needs to feel tied to the audio rather than pasted on.

### Fractal Music Visualizer

File: `fractal-music-visualizer.html`

The original fractal/audio visualizer direction. It opened the path toward more expressive waveform and fractal engines.

Key lesson: fractal visuals become stronger when music response influences structure, not only brightness or scale.

### MandelTone Engine

File: `fractal-music-visualizer-v2.html`

MandelTone pushed the fractal visualizer into a more named, engine-like artifact with stronger presentation.

Key lesson: naming and interface polish can turn a visual effect into a more coherent instrument.

### Waveglyph Engine

File: `fractal-music-visualizer-v3.html`

Waveglyph continued the waveform-driven visualizer line and moved further toward expressive, named systems.

Key lesson: the best visualizers should feel like instruments, not screensavers.

### Auralith Mastering Console

File: `mastering-console-visualizer.html`

Auralith Mastering Console tested an audio-production metaphor: signal chain, mastering observatory, meters, and instrument-like diagnostics.

Key lesson: technical UI metaphors work best when the readouts are dense but organized and each metric has visible meaning.

## Earlier Baselines And Repository Hygiene

### Original Ball Physics

File: `ball-physics-simulation.html`

The original r128 global-script ball-physics container demo. It remains available for comparison against Kinetic Containment.

Key lesson: older baselines are valuable when preserved deliberately and not overwritten by polished variants.

### Source Location

The source of record should live in this git repository, especially under `webgl-games/`. Root-level duplicates caused confusion and were removed. Root workspace docs can describe the experiments, but runnable experiment source should stay in the repo unless there is a deliberate reason to do otherwise.

## Process Lessons So Far

- A few focused iterations can dramatically raise quality.
- Strong names help, but only when the scene, controls, motion, and HUD all support the same premise.
- Default-state excellence is the fastest quality test.
- Prismalith is the current benchmark for visual systems.
- Gravity Loom proves the process can produce a beautiful result, but also shows that beauty does not guarantee concept excitement.
- Board games are solid but need stronger identity to rise above competent implementations.
- Asteroids needs feel-first iteration before more feature expansion.
- For games, movement, timing, feedback, and recovery loops matter more than a long feature list.
- For Codex-built games, the first serious pass should include the director layer: camera grammar, atmospheric frame, transparent HUD hierarchy, feedback language, and tuning hooks.
- Comparison variants are useful when they expose principles we can absorb into our own process; they are not substitutes for making the main build good.
- For simulations, visible cause and effect matter more than raw object count.
- For visualizers, signal response should shape structure rather than decorate it.
- Manual playtesting remains the source of truth for feel and visual judgment unless browser automation is explicitly requested.

## Tempest Meridian 3D Gauntlet

File: `asteroids-3d.html`

The byte-identical Tempest Meridian baseline was converted from an annular XZ combat deck into a real 3D flight-combat shell without changing `asteroids-gpt-5.6-sol.html`.

Implemented spatial contract:

- Mouse-relative pitch/yaw, Q/E roll, coordinated banking, W thrust, S braking, Shift boost, drag, and speed limiting now drive a normalized quaternion orientation and full XYZ velocity. Pointer lock pauses cleanly on release, director/UI interaction suppresses accidental recapture, and drag steering remains available for coarse pointers or lock failure.
- The gas giant has a spherical atmosphere exclusion radius and a larger spherical outer boundary. Both use readable soft return forces, a bounded radial rebound, and pooled 3D boundary effects; the rings remain double-sided visual/navigation geometry only.
- Asteroids, Forge Cores, jammers, and breakup children spawn and move throughout the shell. Jammers use stand-off pursuit plus lateral and vertical offsets instead of collapsing into one planar chase ball.
- Rock collision uses a pooled three-axis spatial hash and full 3D sphere response. Guns and missiles use swept segment-sphere collision in XYZ, so XZ overlap with an altitude miss is rejected.
- Gun muzzles, barrel spread, inertial shot carry, forward-cone auto-fire, line of sight, all-sphere lock scoring, intercept prediction, missile helixes, splash damage, pickups, offscreen guidance, trajectory cones, drive ribbons, shards, sparks, and shock rings now preserve 3D direction.
- Pursuit, Sweep, and Drift inherit the ship quaternion mapped so camera −Z is ship +Z. Cockpit still looks along ship forward from the eye. Position damps; orientation snaps.
- The HUD adds thrust state, ship-relative climb, atmosphere altitude, and signed ring-plane depth. The director adds mouse sensitivity, pitch response, roll response, and the existing yaw/thrust/drag/speed/presentation controls.
- `window.__asteroids3DReady` is set only after initialization. `window.__asteroids3DDiagnostics.run()` reports orthonormal basis, pitched thrust, swept XYZ hit/miss, all-axis boundary, Y-separated spatial indexing, 3D aim cone, yaw-without-roll, camera look-axis, readiness, pool, and critical-scene invariants; the initialization result is retained as `window.__asteroids3DDiagnosticsLast`.

Gauntlet continuation after the Codex token stop (2026-08-31). A real builder/critic loop followed: hunters off world-Y, then chase/lock vs guns, then ship-basis cameras, then lathed ring volume. Feel is still unverified; no success declaration.

- Cockpit no longer copies `player.orientation` onto a −Z camera (that aimed aft). Exterior cameras use `orientationToCamera` (180° about ship Y). Cockpit looks along +Z from the eye.
- Mouse yaw no longer bakes coordinated roll into the quaternion. Q/E is the only roll.
- Guns travel along heading. Locks score heading + ship boresight + on-screen NDC.
- Jammers use per-hunter 3D orbit axes with comparable lateral and vertical drive.
- Rings are lathed equatorial shells with inner/outer walls, not a single pancake; dust occupies Y through the plane.
- Hull-loss keeps attitude and recovers on the current radial inside the combat shell.
- Shot collision uses the 3D rock hash; player vs rocks is swept.
- HUD Climb is ship-up velocity.

Static validation recorded on 2026-08-31 after the continuation wave:

- JavaScript module syntax: pass (`node --check` on extracted module).
- Embedded shaders: 22 total (11 vertex, 11 fragment), all with `main` and balanced braces, parentheses, and brackets.
- DOM structure: unique IDs, no duplicates or missing queried controls.
- Planar-runtime search: no remaining `DECK_Y`, planar delta/distance/spawn helpers, annular wrap functions, scalar player rotation, or forced zero-Y velocity. Remaining `xz` math is confined to equatorial ring rendering and the gas giant's visual ring shadow. The leftover `camera.lookAt` is the pre-player bootstrap pose only.
- Pinned imports remain Three.js `0.174.0`; visible point fields retain circular fragment discard and capped `gl_PointSize`; no raw `PointsMaterial` was introduced.
- Source baseline SHA-256 remains `d7b7665fa2e6035e7f7fa9145a908bfe3258d7b7d6323f1653539abd6032fb2f`.

Manual playtesting is still required for flight feel, camera comfort, live WebGL diagnostics output, representative-wave FPS/object counts, visual ring crossings, and the full guns/missiles/Tempest/waves/pickups/pause/reset/mobile regression path. Browser automation was intentionally not used because the gauntlet explicitly reserves those judgments for the user.

## Astra Meridian (2026-09-09)

File: `asteroids-3d-astra.html`; source: `asteroids-3d.html`.

Started with an exact copy (SHA-256 `827025e437eaf8a126139afb8c6b6ab8894206ea406b04ba37b010977bf9e011`), then developed a separate piloting/fire-control variant. The original, its world art, and its workbench remain intact.

- Rebuilt the control surface as transparent edge instruments: separate nose and velocity markers, exact intercept lead, limited contact brackets, heat and boost state, and mobile boost/camera controls.
- Added switchable flight assist, inertial turning, reserve-powered boost with smooth momentum retention, and independent all-vector braking. `S` deliberately remains retro thrust; `X` brakes.
- Added fixed 120 Hz simulation, cadence remainder preservation, real sphere-entry times, relative-motion sweeps, broadphase coverage for bosses and new fragments, and full-segment piercing. Guns converge on the predicted intercept within the assist cone; firing is explicit.
- Kept the giant, fractal storm, rings, moons, ice asteroid appearance, seeker/Tempest loop, upgrades, and pooled effects. Added speed-responsive camera FOV and a single-batch world-space dust layer, without another postprocessing pass.
- Split HUD and test work into independent ownership, then commissioned an independent baseline critic and fresh complete-artifact critic. Integration and verification results are tracked in [ASTRA_WORKBENCH.md](ASTRA_WORKBENCH.md).
- The complete-artifact review caught rearward missile painting, maximum-tier projectile-pool exhaustion, fallback click/focus behavior, mixed-input firing cancellation, and a mislabeled combo readout. The second independent pass reproduced their fixes, including complete salvos at every tier and 161/168 peak slots at MK7. Those checks are CPU/logic evidence, not rendered performance or visual approval.
- Final verification: 77 production-module Node regressions pass with zero failures/skips, plus JavaScript syntax, unique DOM IDs, and unchanged-source checksum checks. No browser automation or GPU playtesting was performed.

Lesson under test: precise piloting depends on agreement between motion, camera, targeting math, and instrumentation. Distinguish nose direction from velocity, and distinguish a tracked target from a valid firing solution. Production-module Node tests can protect those contracts; they cannot establish visual quality, GPU performance, or fun. Those judgments remain with manual playtesting.

### Astra Combat And Celestial Upgrade

- Added bounded multi-target gun selection and alternating/converging salvos, three simultaneous seeker locks at the initial tier, and up to six with upgrades. A separate pair of modeled wingtip Sidewinders launches with `R` or the desktop/touch control, selects distinct targets, and reloads each rack independently in 4.5 seconds. Failed pool acquisition must not consume a rack.
- Replaced planar missile launch/impact rings with pooled spherical shells. Tempest launches across a ship-oriented sphere; ordinary seekers spread through a 3D forward cone. Visible forward-facing RCS exhaust responds to retro thrust and forward-motion braking.
- Returning asteroids cross a 330-unit radius, reappear in the 152-238-unit near-planet region, preserve drift/spin, avoid immediate player/moon overlap, reset their swept-collision histories, and release stale missile locks. Contact identities retire on the same discontinuity.
- Reworked the HUD around persistent contact slots, per-target intercept cues, closing-speed/collision prediction, peripheral bearings, and individual rocket-rack readiness. Ranking/readouts are throttled to 20 Hz, layout measurement to 2 Hz, while projection follows every rendered frame. Contact counts are bounded at eight desktop/four compact or touch.
- Reworked the Milky Way, gas giant, ring profiles, and moon surfaces with cached procedural DataTextures, filtered sampling, and inexpensive runtime lighting/animation. Added time-based adaptive resolution, area/dimension caps, particle detail tiers, and slow recovery probes targeting 60 FPS. Kept the giant's visible sphere consistent with its collider.
- Replaced individual debris meshes with one instanced triangle batch. Pool transforms/colors/alpha remain CPU-inspectable; graphics tests must not mistake a populated buffer for validated GPU pixels.
- Independent integration review reproduced distorted wide-screen rim bearings, coincident lead-label overlap, ready styling during gun cooldown, and respawn exhaust stretching over 100 world units. All four were fixed and independently rechecked. The debris instancing review also caught missing distance fog, now restored using Three.js shader chunks.
- Final verification: 111 production-module regressions pass, zero failures/skips, independently rerun by the lead. The suite includes the review corrections, actual wing-rocket impacts, multi-target salvos, pool exhaustion/reuse, spherical effects, retro burns, warp history/lock invalidation, adaptive pixel budgets, instanced debris, and existing flight/input/collision contracts. Measured workloads and manual-only limits are recorded in [ASTRA_WORKBENCH.md](ASTRA_WORKBENCH.md).

Performance lesson: bound actual work and measure the actual production update path. Texture preparation costs startup time and memory but removes repeated fragment work; instancing reduces draw submissions; dynamic resolution reduces pixel load. None establishes a universal FPS guarantee. CPU-only timing, shader inspection, manual visual judgment, and real GPU frame timing are separate kinds of evidence.

### Wing Rocket Interception Follow-up

Manual testing found the new `R` rockets circling without hitting. Production probes reproduced zero impact damage against small stationary rocks at 6 and 30 units, plus a close off-axis rock. The prior impact test used large stationary targets straight ahead and missed this failure mode.

The fast wing rockets had inherited slower seekers' normalized direction interpolation and full-speed approach. Near targets, the guidance allowed repeated overshoots; exact opposite headings also make normalized interpolation stall. Wing rockets now have a short rack-clearance phase, bounded quaternion steering, speed-aware intercept prediction, and terminal deceleration that keeps the turning radius inside the approach. Physical collision sizes, damage, blast radius, lifetime, reloads, and ordinary seeker guidance are unchanged. New regressions require real impacts on small moving targets and cover rolled/pitched launches, rearward reacquisition, and native-health hunter kills followed by reacquisition, not just finite trajectories or eventual expiry.

Independent stress probes produced 394 real impacts from 402 launches in 201 scenarios, including all 72 against production hunters. Remaining misses involved target warps or abrupt reversals at minimum steering tuning. Terminal speed control can lengthen successful approaches; the critic measured about 1.16 seconds versus 0.53 seconds on a stationary 60-unit case. These CPU/geometry checks establish interception behavior, not visual approval or a promise that every possible target maneuver is hittable.

Lesson: test whether a homing weapon actually completes representative interceptions. A plausible trail and a hit on one large target are not sufficient evidence; close, small, crossing, and passed targets expose guidance failures that broad smoke tests miss.

### Gas Giant Cloud Structure

After positive manual playtesting, the user deferred the proposed 3D dogfighting encounter to focus on the planet. That idea is pinned in [ASTRA_WORKBENCH.md](ASTRA_WORKBENCH.md): one interceptor with readable attack runs, evasion, recovery, and combat above/below the rings, before adding missions or more enemy classes.

The cloud pass uses [NASA/Juno cloud imagery](https://www.jpl.nasa.gov/images/pia23610-mocha-swirls-in-jupiters-turbulent-atmosphere/) as a morphology reference while preserving the fictional blue-majority palette, tan/rust accents, and compact red storm. Unequal belts share cloud material with nested vortices, torn boundaries, branching crests, and folded dark channels. The first generated texture revealed overly regular eddy spacing; varied clusters, asymmetric deformation, and smaller daughter vortices replaced it. The red storm remains filled rather than becoming a dark pupil or a clean spiral overlay.

A cached signed flow texture animates that material with two staggered advection phases, bounding distortion and hiding resets. Shallow cloud-top normal relief adds lighting detail without changing the visible sphere or collider. Expensive fractal sampling stays in the startup texture bake; the added flow map costs 0.5 MiB of base texture storage and no additional render pass. This is an artistic flow approximation, not a physical atmosphere simulation. The rings, moons, sky, weapons, and flight rules are unchanged.

New nonbrowser checks cover texture budgets, longitude continuity, neutral polar flow, retained blue/warm material, and animation phase transitions. Raw texture inspection is useful for morphology, but cannot establish the final lighting, temporal appearance, or GPU frame rate. Full verification details and remaining manual checks are recorded in the workbench.

Lesson: natural-looking detail needs a hierarchy of unequal belts, sheared edges, nested eddies, and small cloud structure. Adding more noise or clean spiral lines does not establish that hierarchy. Distort the cloud material itself, preserve the planet's established palette, and evaluate the generated artifact rather than trusting the formula.

### Planet Pixelation Follow-up

Manual feedback approved the direction but found the planet pixelated. Preserve the new composition. The desktop cloud texture increased from 2048x1024 to 4096x2048, with a hardware-size cap and the original 2K budget on coarse-pointer devices. Mipmapped linear filtering remains; anisotropy is capped at the lesser of 4x and device support. Fine-grain contrast/frequency and cloud-height perturbation were reduced; narrow filaments no longer act as embossed height lines. The scene-wide resolution policy, rings, and other art remain unchanged.

The accompanying review also caught two concrete defects: latitude-only candidate culling omitted eddies reachable after earlier cloud deformation, and the shader blended encoded color instead of linear light. Candidate bounds now propagate prior deformation, and temporal color samples decode before blending. The storm's composition and bounded animation model are retained; residual ring-like contours and periodic blending softness remain appearance risks, not independently validated improvements.

The higher-resolution bake measured 3.54 seconds of CPU startup in the production harness. It adds 24 MiB of base cloud texture memory on desktop and no rendering pass. The focused rendering/scene checks pass; exact results and manual-only limits are in the workbench. This is a sampling correction with a measured startup/memory tradeoff, not a universal FPS guarantee or a substitute for judging the close-up planet in-game.

### Ring Striation, Overlap, And Flicker (2026-09-10)

Manual testing reported corduroy-like ring lines, rings apparently superimposed on the planet, and intermittent square flicker. The radial opacity profile contained two regular sine ripples, double-sided closed shells composited the pattern twice, and the planet sampled the same detailed profile as a sharp shadow. The fixes retain the broad color zones but replace the ripple pattern with quiet irregular variation, select one contributing shell surface, and bake a separate soft optical-density shadow. Camera-inside slabs use an exit face so unrestricted 3D flight does not make the rings disappear.

The planet's mipmapped shadow lookup was also inside nonuniform fragment branches, where implicit texture derivatives are undefined. It now samples unconditionally and applies branchless masks afterward, including bounds that prevent coarse mip-edge bleed. The shadow map adds 2 KiB of base storage; the ring draw count remains eight, with no extra postprocessing pass. Cloud resolution, colors, storm, flight, and weapon behavior are unchanged.

Independent review then reproduced two smaller but concrete failures. Float32 normalization could push a normal/view dot product just above one, giving fractional rim-lighting powers a negative base; planet, atmosphere, and spherical missile-pulse rim bases are now clamped. Circular inside/outside tests also disagreed with the ring's actual polygon walls in a thin radial strip; containment now follows those facets. New tests use production mesh normals and real ray intersections to retain both corrections.

Nonbrowser regressions cover profile roughness, shadow texture bounds and shader sampling contracts, actual front/back/inside ray intersections, and the distinction between legitimate foreground rings and far-side planetary occlusion. These identify and protect concrete data/geometry/shader contracts; they do not prove that the reported GPU flicker is gone. Final results and independent review are recorded in [ASTRA_WORKBENCH.md](ASTRA_WORKBENCH.md).

Lesson: translucent top/bottom layers can double a fine pattern, and a physically motivated shadow can still read like a decal if it copies the display texture exactly. Treat visible surface detail, integrated optical depth, and shadow softness as different representations. Keep derivative-dependent texture reads out of divergent fragment control flow; bound fractional powers even when normalized vectors are theoretically safe. A square artifact is not necessarily a particle sprite. Do not equate a passing CPU geometry or arithmetic test with rendered visual approval.

## AetherTwin: Singularity (Gemini 3.8 Flash)

File: `asteroids-gemini-3.8-flash.html`

AetherTwin: Singularity is built by Gemini 3.8 Flash as the ultimate frontier benchmark for asteroids combat in the repository. It evolves the **duality as geometry** identity into a complete, high-fidelity experience matching and surpassing the standard set by `asteroids-gpt-5.6-sol.html`.

Core Systems:
- **Binary Celestial System**: Features Pulsar Alpha (Cyan Magnetar) and Pulsar Omega (Magenta Singularity) with procedural corona, event horizon shaders, relativistic polar jets, a Doppler-beamed accretion disk, procedural starfields, and orbital dust lanes.
- **Duality Mechanics & Flight**: Player flies the Alpha Skiff while the Omega Twin is tethered via dynamic spring-damper harmonic physics. The live Entanglement Blade is a continuous multi-frequency quantum ribbon that slices asteroids and enemies with electric arcs and line-segment collision.
- **Phase Swap Traversal Cleave**: Spacebar / Right-Click / Shift triggers an instantaneous tachyon position swap between Alpha and Omega with a screen-warping flash, tachyon audio drop/rise, and an instantaneous high-energy cleave beam along the traversal vector.
- **Double-Helix Seekers**: Target locking launches twin cyan and magenta missiles corkscrewing around each other in true 3D double-helix flight paths.
- **Quad-Superposition Overdrive**: Full overdrive capacitor activates a 4-vessel tesseract laser cage with synchronized 360° spiral salvos.
- **Swept Continuous Collision Detection**: All projectile shots and ship hulls use continuous segment-sphere collision to prevent tunneling.
- **Procedural WebAudio Synthesizer**: Zero-dependency audio engine generating dynamic dual engine drone, FM blade buzz modulated by tension and cutting, sub-bass tachyon swap boom, stereo laser pulses, and multi-layer explosion debris.
- **Cameras & Presentation**: Pursuit (chase), Cockpit (1st-person with 3D reticle), Apex (tactical), and Drift (cinematic letterboxed).
- **Director Console & Deterministic Diagnostics**: Live tuning of flight physics, blade tension, optics, bloom, and audio; non-visual diagnostics suite under `window.__asteroidsGeminiDiagnostics.run()`.
- **Readiness Flags**: `window.__asteroidsGemini38FlashReady`, `window.__asteroidsGeminiReady`, and `window.__asteroids38FlashReady`.

## ARGON // Armillary (Gemini 4 Argon)

File: `asteroids-argon.html`; regressions: `tests/asteroids-argon.test.mjs`

Lineage, stated plainly: the engine is Astra Meridian's, assembled by an anchor-asserted build that copies Astra's module and edits it in place (every anchor must match exactly once or the build aborts). Flight, swept collisions, predictive guns, wingtip rockets, seekers, the combat HUD, celestial bakes, pools and adaptive budgets are Astra's. Earlier "Argon Wake" drafts were overwritten in place, never committed, and judged too close to other agents' variants; none of their claims (Hermite loft, analytic reflections, triplanar grain) describe this build.

Identity: **constellations**. Every authored system feeds one graph.

- **Ion wake**: a 72-node camera-facing ribbon. Rocks near recent nodes gain ion in proportion to proximity and wake strength, so threading close charges fastest. Iron hits that don't kill also ionize.
- **Tethers**: ionized rocks (ion ≥ 0.35) link shortest-first, within 54 u, at most 3 links each and 56 total. Union-find gives the components. Tethers render as twin plasma filaments that shift from cyan to violet as the web grows.
- **Z-Pinch** (`V`/`B`/`G`): every component of two or more rocks is drawn toward its centroid for 0.42 s, then implodes. Arc bolts, damage 9 to nodes, collateral damage to nearby rocks and quenchers, a bonus of `round(n² · 25)` scaled by wave, then a cooldown. The grade pass adds a gravitational lens: bend, Einstein ring and shock ripple at the projected centroid.
- **Lasso**: flying a closed loop (path ≥ 48 u, mean radius ≥ 6, closing gap < 7) fully ionizes and gathers everything inside.
- **Inheritance**: shattered ice is born charged (parent ion + 0.55, or 0.62 after a pinch), so each pinch seeds the next web. The Forge Core cannot be ionized; it takes pinch collateral instead.
- **Quenchers** (Astra hunters): drain nearby beacons, but crossing a live tether shears them.
- **Armillary Nova**: Excimer charge aligns three gimballed rings at radii 332–356. At full charge, `M` launches a lattice shell that implodes from the cage toward the planet and ionizes every rock it passes, then refreshes the pinch.
- **Presentation**:
  - an authored Lantern airframe: lathe fuselage, swept wings, fin, nacelles, a lantern ring, hull light pipes and a Cherenkov speed sheath;
  - six seeded clathrate-ice families with fracture veins that glow with ion;
  - alternating 488 nm cyan and 514 nm green argon lances;
  - a lilac gas giant with a cyan storm eye, polar aurora driven by charge and web size, and night-side lightning;
  - Lydian chimes that climb as beacons light;
  - a tactical overlay showing ion gauges, the pinch reticle and the lasso polygon.

### Visual pass (screenshot-tuned)

Tuned by screenshot at 1600×900, with the owner's approval, in Cursor's embedded Chromium.

Two bugs it found:

- **Tethers, arc bolts and quench arcs never rendered.** The beam shader builds each quad from a view-space cross product. That winds every quad clockwise, so front-face culling discarded the whole layer, which carries the game's core mechanic. The beam material is now double-sided, and a test asserts it.
- **White squares beside backlit ice.** Astra's grade clamped colour to 1 before ACES, so the bloom footprint of a single HDR specular firefly became a flat white block. The grade now passes unclipped HDR to the tone curve; a test asserts that the clamp stays out.

Material and lighting changes:

- **Reflection probe**: a small probe scene holds a sky with an argon nebula band, a soft sun, a banded giant and a ring disc. It is baked through PMREM into `scene.environment`, with the giant placed relative to the ship. It rebakes only when the giant's direction moves more than 0.16 rad or its distance changes more than 12%, so hull and ice reflect the giant they fly past. The test renderer is a stub, so the probe stays inert there.
- **Clathrate ice**: deep-blue glass with clearcoat and sheen.
  - Faceted families get more tessellation, plus a per-facet tint so cut planes read.
  - Four parallax planar cracks are ray-traced inside each rock in object space.
  - Translucency is confined to thin edges, and frost glints are cell-hashed.
  - Ion veins follow the crack fronts.
  - Iron and slag keep less translucency.
- **Shards** are lit by the sun and glint.
- **Gas giant**: richer bands, limb darkening, a softer terminator and atmospheric forward scatter.
- **Rings**: ringlet structure and optical depth, lit and transmitted faces, the planet's shadow and near-field glints, on a muted palette.
- **Armillary bands** are brushed metal with an anisotropic streak and engraved graduations. Their emission scales with alignment and the Nova.

Effects and framing:

- **Shield**: a front-face fresnel lattice. It stays nearly invisible at rest and flares on hits, replacing the glass dome.
- **Lantern ring**: energy scales with drive. The overdrive aura is hidden otherwise.
- **Cryo bursts** on every rock, quencher, crash and pinch release. These are 40 pooled, instanced, camera-facing impostors: wispy vapour, a small hot core, a shock rim and glitter motes, with a circular discard and premultiplied blending.
- **Screen shocks**: up to six projected blasts refract the grade.
- **Grade**: split-tone, log-space contrast, vignette and grain.
- **Nova shell**: rewritten as ridged, domain-warped plasma filaments on graduated great-circle cage lines. Back faces are dimmed so the sweep stays readable from outside the shell.
- **Start frame**: the start yaw now shows the giant's limb.

### First playtest fixes

The owner reported four problems, and each was traced to its source with screenshots:

- **Glowing, blinking squares**: two of the pass's own sparkle effects were the cause.
  - Ice frost glints and ring near-field glints each lit an entire hashed lattice cell and blinked on a sine. Ice glints are now round sparkles at random sites inside sparse cells. Each has its own facet normal, so they glint as the rock turns rather than on a timer, and they fade out before shrinking below a pixel.
  - The ring cell glints were removed; the ring dust particles already supply near-field sparkle.
  - The bloom high-pass also soft-limits peaks above 6 (toward about 8), so a one-pixel HDR spike can't bloom into a block on the coarse mips.
- **Jittering "soundwave" on the Armillary bands**: this was z-fighting.
  - The additive halo reused the band's geometry stretched across its width, so the two surfaces coincided and the depth test tore jagged dark glyphs that crawled as the rings turned. The halo now discards the inner 1/2.4 of its width, which is the band's own footprint.
  - Engraved ticks fade before their spacing drops to a few pixels, and the brushed-metal rows are prefiltered.
- **Blurry poles**: the equirectangular bake pinches at the poles, and its texture derivatives push lookups onto the blurriest mips. Poles now get a procedural cap in a stereographic frame, which has no singularity: eight circumpolar cyclones ring a counter-rotating central vortex, with footprint-faded gradient-noise clouds. The aurora is a thin curtain oval with a sharp lower hem; it is night-weighted and nearly dark until Excimer or the web lights it.
- **Pixelated storms**: the bake's value-noise level sets magnify into boxy terraces.
  - Cloud lookups are domain-warped by sub-texel gradient noise. They use `textureGrad` with the unwarped, seam-corrected UV gradients, so the warp neither blurs the mip choice nor draws the longitude seam.
  - An unsharp mask against a coarser mip makes the bake's filaments read crisp.
  - Fine gradient-noise grain is added to the albedo and to the cloud-top relief.
  - Every detail term fades out with its pixel footprint.

Verification:

- 15 Node tests drive the shipped module against Three.js r174: readiness, 19 diagnostics (Astra's 11 plus 8 Argon invariants), full `animate()` frames, airframe, ice families, wake ionization and tethers, pinch draw and release, refusal with no web, lasso, shatter inheritance, Nova, quencher shear and drain, gun and rocket intercepts, alternating lances, the presentation layers (double-sided beams, a cryo burst and projected screen shock on a kill, a quiet resting shield, the unclamped grade and an inert probe without a GPU), and rendering hygiene (halo discard, no world-cell ring glints, gradient-preserving giant lookups, the stereographic polar cap and the bloom peak limit).
- Every material was compiled through Three's real WebGL program builder against a fake WebGL2 context. That covers the `onBeforeCompile` hull and ice shaders, the lens grade, the probe scene and environment-mapped variants.
  - All 81 unique GLSL ES 3.00 shaders (42 programs) passed Khronos glslang 16.6. This check is not committed.
  - Three's common chunk declares `average()`, which glslang rejects as a redeclaration although browsers accept it, so it was renamed for validation only.
- Screenshots in the embedded browser cover the start frame, sunlit and backlit ice, a kill burst, a seven-node constellation, a 14-node pinch and a Nova sweep. Screenshots can lag the render by a frame, so take a second capture before judging a layer invisible.

Not verified: other GPUs, frame rate under load (the HUD read 60 fps in the embedded browser), mobile layout, pointer lock and whether the loop is fun.

Playtest questions:

- Is wake reach generous enough at combat speed?
- Does the wake read from the chase camera on straight runs? It trails toward the camera and fades within 4–15 u of it, so it should mainly show while turning or looping.
- Do tether webs read at range?
- Is the lens ring legible without hiding targets?
- Does the Nova's filament cage still overpower bloom on dimmer displays or at the Bloom slider's upper range?
- Do probe rebakes hitch on weaker GPUs? The default probe is 128 px and rebakes at most every 0.9 s.
- Are pinch cooldown and n² scoring the right pressure against the Forge Core?
