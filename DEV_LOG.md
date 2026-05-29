# Development Log

This is the working record of the WebGL experiments tried so far, including the practical lessons from iteration and manual playtesting. It complements `README.md`, which indexes the runnable files, and `DESIGN.md`, which captures the philosophy that emerged from the work.

The current pattern is clear: a first pass proves the idea, then a few focused iterations can turn a generic demo into a specific artifact. The strongest results happen when the implementation, visual language, controls, and default state all express the same premise.

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

Files: `asteroids.html`, `gpt-5-asteroids.html`, `grok-4-asteroids.html`

Asteroids has had several versions and model-generated variants. The current visual direction is acceptable, but manual playtesting showed that movement, playability, powerups, combat feel, escalation, and recovery windows require more iteration.

Iterations tried:

- Initial Three.js Asteroids implementation.
- Added AI prompts to the Asteroids source.
- Added GPT-5 and Grok 4 variants for comparison.
- Upgraded the main Asteroids presentation into Vesper Belt.

Future priority: improve feel before adding more mechanics. Ship acceleration, drag, rotation, shooting cadence, collision feedback, powerup readability, and scoring pressure matter more than feature count.

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
- For simulations, visible cause and effect matter more than raw object count.
- For visualizers, signal response should shape structure rather than decorate it.
- Manual playtesting remains the source of truth for feel and visual judgment unless browser automation is explicitly requested.
